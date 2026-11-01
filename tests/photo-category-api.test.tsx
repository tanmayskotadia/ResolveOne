import { test,expect,vi } from 'vitest'
import { createPhotoHandler } from '../supabase/functions/photo-category/handler'
import { CATEGORIES,validateSuggestion } from '../supabase/functions/photo-category/logic'
import { CATEGORIES as appCategories } from '../src/lib/categories'
const image=btoa('\xff\xd8\xff'+'0'.repeat(20))
const request=(body:unknown={image,mime_type:'image/jpeg',consent:true})=>new Request('https://example.test/photo-category',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
const providerResult=(value:unknown)=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}),{status:200})
const good={category:'Road Damage/Potholes',uncertain:false,evidence:'The road surface has a visible pothole.'}
function setup(overrides:Record<string,unknown>={}){
 const providerFetch=vi.fn().mockResolvedValue(providerResult(good));const quota=vi.fn().mockResolvedValue(true)
 return {providerFetch,quota,handler:createPhotoHandler({apiKey:'test-key',freeTierConfirmed:true,quota,providerFetch,...overrides})}
}
test('category taxonomy stays aligned with the reporting form',()=>expect(CATEGORIES).toEqual(appCategories))
test('missing key or free-tier confirmation disables calls',async()=>{
 for(const options of [{apiKey:''},{freeTierConfirmed:false}]){
  const {handler,providerFetch}=setup(options)
  expect(await (await handler(new Request('https://example.test',{method:'GET'}))).json()).toMatchObject({enabled:false})
  expect((await handler(request())).status).toBe(503)
  expect(providerFetch).not.toHaveBeenCalled()
 }
})
test('valid image is sent once with server key in header and structured schema',async()=>{
 const {handler,providerFetch}=setup()
 const response=await handler(request());expect(response.status).toBe(200);expect(await response.json()).toEqual(good)
 expect(providerFetch).toHaveBeenCalledTimes(1)
 const [url,options]=providerFetch.mock.calls[0]
 expect(url).toContain('gemini-3.5-flash-lite:generateContent')
 expect(url).not.toContain('test-key');expect(options.headers['x-goog-api-key']).toBe('test-key')
 const body=JSON.parse(options.body)
 expect(body.generationConfig.responseMimeType).toBe('application/json')
 expect(body.tools).toBeUndefined()
 expect(body.systemInstruction.parts[0].text).toContain('untrusted data')
})
test('quota exhaustion makes no provider request',async()=>{
 const {handler,providerFetch}=setup({quota:vi.fn().mockResolvedValue(false)})
 expect((await handler(request())).status).toBe(429);expect(providerFetch).not.toHaveBeenCalled()
})
test('provider quota and server failure never retry or fall back',async()=>{
 for(const status of [429,500,403]){
  const {handler,providerFetch}=setup();providerFetch.mockResolvedValue(new Response('{}',{status}))
  const response=await handler(request());expect(response.status).toBe(status===429?429:503)
  expect(providerFetch).toHaveBeenCalledTimes(1)
 }
})
test('provider errors and credentials never leak to browser',async()=>{
 const {handler,providerFetch}=setup();providerFetch.mockRejectedValue(new Error('private-key user-data'))
 const response=await handler(request());expect(response.status).toBe(503);expect(await response.text()).not.toMatch(/private-key|user-data|test-key/)
})
test.each([
 {image,mime_type:'image/jpeg',consent:false},
 {image:'not-an-image',mime_type:'image/jpeg',consent:true},
 {image,mime_type:'text/html',consent:true},
 {image:btoa('this is just text and not a jpeg'),mime_type:'image/jpeg',consent:true},
])('invalid image/consent cannot invoke provider %#',async body=>{
 const {handler,providerFetch}=setup();expect((await handler(request(body))).status).toBe(422);expect(providerFetch).not.toHaveBeenCalled()
})
test('oversize input is rejected before quota or inference',async()=>{
 const {handler,quota,providerFetch}=setup();expect((await handler(request({image:'x'.repeat(1600001)}))).status).toBe(413)
 expect(quota).not.toHaveBeenCalled();expect(providerFetch).not.toHaveBeenCalled()
})
test.each([
 {...good,category:'invented'}, {...good,uncertain:'false'}, {...good,evidence:'x'.repeat(301)}, {...good,confidence:0.99},
])('invalid model response is refused %#',async value=>{
 const {handler,providerFetch}=setup();providerFetch.mockResolvedValue(providerResult(value))
 expect((await handler(request())).status).toBe(503)
})
test('uncertainty cannot produce an applyable category',()=>{
 expect(validateSuggestion({...good,uncertain:true})).toMatchObject({uncertain:true,category:null})
 expect(validateSuggestion({...good,category:null})).toMatchObject({uncertain:true,category:null})
})
test('blocked or truncated responses abstain',async()=>{
 const {handler,providerFetch}=setup();providerFetch.mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:'MAX_TOKENS'}]})))
 expect(await (await handler(request())).json()).toMatchObject({uncertain:true,category:null})
})
