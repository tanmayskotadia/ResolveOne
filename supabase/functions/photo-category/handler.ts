import { MODEL,PROMPT,RESPONSE_SCHEMA,validImage,validateSuggestion } from './logic.ts'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
interface Dependencies { apiKey:string;freeTierConfirmed:boolean;quota:(request:Request)=>Promise<boolean>;providerFetch:typeof fetch }
export function createPhotoHandler(deps:Dependencies){
 return async(req:Request):Promise<Response>=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  const enabled=!!deps.apiKey&&deps.freeTierConfirmed
  if(req.method==='GET')return reply({enabled,model:MODEL,configuration:{key_present:!!deps.apiKey,free_tier_confirmed:deps.freeTierConfirmed}})
  if(req.method!=='POST')return reply({error:'Method not allowed'},405)
  if(!enabled)return reply({error:'Photo suggestions are not configured. Please choose the category manually.'},503)
  try{
   // Bound streamed requests, including requests without Content-Length.
   const reader=req.body?.getReader();if(!reader)return reply({error:'Photo required'},400)
   const chunks:Uint8Array[]=[];let size=0
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1600000){await reader.cancel();return reply({error:'Choose a smaller image.'},413)}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   let body:Record<string,unknown>
   try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply({error:'Invalid image request.'},400)}
   if(!validImage(body))return reply({error:'Choose a valid JPEG, PNG or WebP image and confirm analysis.'},422)
   if(!await deps.quota(req))return reply({error:'The free photo-check limit has been reached. Please choose a category manually or retry later.'},429)
   // One request only: no retries, no alternate model, no paid fallback or tools.
   const response=await deps.providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':deps.apiKey},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({systemInstruction:{parts:[{text:PROMPT}]},contents:[{role:'user',parts:[{inlineData:{mimeType:body.mime_type,data:body.image}},{text:'Suggest the category based only on visible civic damage.'}]}],generationConfig:{temperature:0,maxOutputTokens:512,responseMimeType:'application/json',responseSchema:RESPONSE_SCHEMA}})
   })
   if(response.status===429)return reply({error:'The free AI quota is currently exhausted. Please select the category manually.'},429)
   if(!response.ok)return reply({error:'Photo suggestions are temporarily unavailable. Please select the category manually.'},503)
   const result=await response.json()
   const candidates=result.candidates
   if(!Array.isArray(candidates)||candidates.length!==1||candidates[0].finishReason!=='STOP')return reply({category:null,uncertain:true,evidence:'This photo could not be categorized reliably. Please select a category manually.'})
   const parts=candidates[0].content?.parts
   const texts=Array.isArray(parts)?parts.filter((part:{text?:unknown;thought?:boolean})=>typeof part.text==='string'&&!part.thought).map((part:{text:string})=>part.text):[]
   if(texts.length!==1)throw new Error('Invalid response')
   return reply(validateSuggestion(JSON.parse(texts[0])))
  }catch{return reply({error:'Photo analysis could not finish. Please select the category manually.'},503)}
 }
}
