import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { createPhotoHandler } from './handler.ts'
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false,autoRefreshToken:false}})
const quota=async(req:Request)=>{
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('photo-category:'+secret+':'+ip))
 const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
 const {data,error}=await db.rpc('duplicate_quota',{p_key:key})
 return !error&&data===true
}
Deno.serve(createPhotoHandler({apiKey:(Deno.env.get('GEMINI_API_KEY')||'').trim(),freeTierConfirmed:(Deno.env.get('GEMINI_FREE_TIER_CONFIRMED')||'').trim().toLowerCase()==='true',quota,providerFetch:fetch}))
