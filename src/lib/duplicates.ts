import { supabase } from './supabaseClient'
export interface DuplicateMatch { code:string; category:string; status:string; created_at:string; distance_m:number; ticket:string }
export interface DuplicateCheck { quality:'usable'|'unclear'; matches:DuplicateMatch[]; limited:boolean }
export interface FollowedIssue { code:string;category:string;status:string;created_at:string;updated_at:string }
export async function duplicateRequest<T>(body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 const {data,error}=await supabase.functions.invoke('duplicate-check',{body,signal})
 if(error||!data||data.error)throw new Error(data?.error||'The duplicate check is unavailable. You can still submit your complaint.')
 return data as T
}
export const followUrl=(token:string)=>`/citizen/follow?token=${encodeURIComponent(token)}`
