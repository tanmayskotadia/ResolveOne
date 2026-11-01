import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false,autoRefreshToken:false}})
const MODEL_URL = 'https://resolveone-duplicates.onrender.com'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const encoder = new TextEncoder()
async function sign(value:string) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('')
}
function equal(a:string,b:string) { if(a.length!==b.length)return false; let diff=0; for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0 }
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try {
  const raw=await req.text(); if(raw.length>10000)return reply({error:'Request too large'},413)
  const input=JSON.parse(raw)
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()
  const quotaKey=await sign('rate:'+ip)
  const {data:allowed,error:quotaError}=await db.rpc('duplicate_quota',{p_key:quotaKey})
  if(quotaError)return reply({error:'Duplicate check is temporarily unavailable.'},503)
  if(!allowed)return reply({error:'Too many checks. Please retry in a minute.'},429)
  if(input.action==='follow'){
    if(typeof input.ticket!=='string'||input.ticket.length>300||!uuid.test(input.token||''))return reply({error:'Invalid follow request'},400)
    const [id,expiry,signature]=input.ticket.split('.')
    if(!uuid.test(id)||!Number.isFinite(Number(expiry))||Number(expiry)<Date.now()||Number(expiry)>Date.now()+11*60000||!equal(signature||'',await sign(id+'.'+expiry)))return reply({error:'This suggestion expired. Check for matches again.'},409)
    const {data,error}=await db.rpc('follow_duplicate',{p_id:id,p_token:input.token})
    if(error)return reply({error:'This issue changed or is no longer open. Check for matches again.'},409)
    return reply({token:data})
  }
  if(typeof input.citizen_hash!=='string'||!/^[0-9a-f]{64}$/.test(input.citizen_hash))return reply({error:'Citizen identification is required for duplicate checking.'},422)
  if(input.action!=='check'||typeof input.description!=='string'||input.description.trim().length<12||input.description.length>4000||typeof input.lat!=='number'||typeof input.lng!=='number'||!Number.isFinite(input.lat)||!Number.isFinite(input.lng)||Math.abs(input.lat)>90||Math.abs(input.lng)>180)return reply({error:'Add a location and a description of at least 12 characters.'},422)
  const {data:rows,error}=await db.rpc('duplicate_candidates',{p_lat:input.lat,p_lng:input.lng,p_hash:input.citizen_hash})
  if(error)return reply({error:'Nearby reports could not be checked.'},503)
  const limited=(rows||[]).length>100
  const candidates=(rows||[]).slice(0,100)
  // Always run the model, even without candidates, to provide the same quality guidance.
  const response=await fetch(MODEL_URL+'/match',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:input.description,lat:input.lat,lng:input.lng,candidates}),signal:AbortSignal.timeout(20000)})
  if(!response.ok)return reply({error:'Duplicate matching is warming up or unavailable. You can still submit.'},503)
  const result=await response.json()
  if(!Array.isArray(result.matches)||!['usable','unclear'].includes(result.quality))throw new Error('Invalid model response')
  const matches=[];const seen=new Set<string>()
  for(const match of result.matches.slice(0,3)){
    const row=candidates.find((candidate:{id:string})=>candidate.id===match.id)
    if(!row||seen.has(row.id)||typeof match.score!=='number'||!Number.isFinite(match.score)||match.score<0.84||match.score>1.001)continue
    seen.add(row.id)
    const expiry=Date.now()+10*60000;const payload=row.id+'.'+expiry
    const rad=Math.PI/180
    const a=Math.sin((row.lat-input.lat)*rad/2)**2+Math.cos(row.lat*rad)*Math.cos(input.lat*rad)*Math.sin((row.lng-input.lng)*rad/2)**2
    matches.push({code:row.complaint_code,category:row.category,status:row.status,created_at:row.created_at,distance_m:Math.round(2*6371000*Math.asin(Math.sqrt(Math.min(1,a)))/25)*25,ticket:payload+'.'+await sign(payload)})
  }
  return reply({quality:result.quality,matches:result.quality==='usable'?matches:[],limited})
 }catch{return reply({error:'Duplicate matching could not finish. You can still submit your complaint.'},503)}
})
