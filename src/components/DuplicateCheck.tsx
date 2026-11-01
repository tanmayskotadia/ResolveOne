import { useEffect,useRef,useState } from 'react'
import { Link } from 'react-router-dom'
import { duplicateRequest,followUrl,type DuplicateCheck as Check,type DuplicateMatch } from '../lib/duplicates'
import type { ComplaintData } from '../types/complaint'
import { hasCoordinates } from '../lib/complaintLogic'
import { useTheme } from '../context/ThemeContext'

export function DuplicateCheck({data,disabled=false}:{data:ComplaintData;disabled?:boolean}){
 const {theme}=useTheme();const dark=theme==='dark'
 const [result,setResult]=useState<Check|null>(null)
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0)
 const [following,setFollowing]=useState('');const [followed,setFollowed]=useState<Record<string,string>>({})
 const [followError,setFollowError]=useState('');const [dismissed,setDismissed]=useState(false)
 const followLock=useRef(false);const tokens=useRef<Record<string,string>>({});const generation=useRef(0)
 const {description,lat,lng}=data
 useEffect(()=>{
   const current=++generation.current;const controller=new AbortController()
   setResult(null);setError('');setDismissed(false);setFollowError('');setFollowed({});setFollowing('')
   if(!hasCoordinates({lat,lng})||description.trim().length<12){setBusy(false);return ()=>{generation.current++;controller.abort()}}
   setBusy(true)
   const timer=setTimeout(()=>controller.abort(),25000)
   duplicateRequest<Check>({action:'check',description,lat,lng},controller.signal).then(value=>{
     if(current!==generation.current)return
     if(!Array.isArray(value.matches)||!['usable','unclear'].includes(value.quality))throw new Error('Invalid response')
     setResult(value)
   }).catch(()=>{if(current===generation.current)setError('Nearby duplicate checking is unavailable right now. You can still submit your complaint.')})
    .finally(()=>{clearTimeout(timer);if(current===generation.current)setBusy(false)})
   return ()=>{generation.current++;clearTimeout(timer);controller.abort()}
 },[description,lat,lng,attempt])
 async function follow(match:DuplicateMatch){
   if(followLock.current||disabled)return
   followLock.current=true;const current=generation.current
   setFollowing(match.code);setFollowError('')
   const token=tokens.current[match.code]??=crypto.randomUUID()
   try{
     const response=await duplicateRequest<{token:string}>({action:'follow',ticket:match.ticket,token},AbortSignal.timeout(15000))
     if(response.token!==token)throw new Error('Invalid follow reference')
     if(current===generation.current)setFollowed(old=>({...old,[match.code]:token}))
   }catch{if(current===generation.current)setFollowError('Could not follow this issue. Retry or check for matches again if the suggestion has expired.')}
   finally{followLock.current=false;if(current===generation.current)setFollowing('')}
 }
 const panel=`rounded-xl border p-4 space-y-3 ${dark?'bg-navy-900 border-navy-800 text-slate-300':'bg-white border-slate-200 text-slate-700'}`
 if(!hasCoordinates({lat,lng})||description.trim().length<12)return null
 return <section className={panel} aria-label="Similar nearby issues" aria-busy={busy}>
   <h3 className="font-semibold text-sm">Similar nearby issues</h3>
   {busy&&<p role="status" className="text-sm">Checking recent reports nearby… You can submit while we check.</p>}
   {error&&<div><p role="status" className="text-sm">{error}</p><button type="button" disabled={disabled||busy} onClick={()=>setAttempt(n=>n+1)} className="text-primary underline text-sm mt-2">Retry duplicate check</button></div>}
   {result?.quality==='unclear'&&<p className="text-sm">Add specific details about the civic problem and location for a useful duplicate check. This check cannot verify whether a report is true or spam.</p>}
   {result?.quality==='usable'&&!result.matches.length&&<p className="text-sm">No close matches found in the reports checked. This does not guarantee the issue is new.</p>}
   {result&&result.matches.length>0&&!dismissed&&<>
     <p className="text-sm font-medium">A similar issue is already reported nearby.</p>
     <p className="text-xs">Possible matches within 250 m from the last 30 days. Please compare before following; similarity is not confirmation.</p>
     {result.matches.map(match=><div key={match.code} className={`rounded-lg border p-3 space-y-2 ${dark?'border-navy-700':'border-slate-200'}`}>
       <p className="text-sm font-semibold break-words">{match.category} · {match.code}</p>
       <p className="text-xs">{match.status.replaceAll('-',' ')} · about {match.distance_m} m away · {new Date(match.created_at).toLocaleDateString('en-IN')}</p>
       {followed[match.code]?<div className="text-sm"><p>Following this issue. No new complaint was created.</p><Link className="text-primary underline" to={followUrl(followed[match.code])}>View status and save your private link</Link></div>:<button type="button" disabled={disabled||!!following} className="text-primary underline text-sm disabled:opacity-50" onClick={()=>void follow(match)}>{following===match.code?'Following…':'Follow this issue'}</button>}
     </div>)}
     <button type="button" disabled={disabled} className="text-primary underline text-sm" onClick={()=>setDismissed(true)}>Submit my complaint anyway</button>
   </>}
   {dismissed&&<p className="text-sm">You can submit your own complaint using the button below.</p>}
   {followError&&<p role="alert" className="text-sm text-danger">{followError}</p>}
   {result?.limited&&<p className="text-xs">Busy area: only the latest 100 nearby open reports were checked. Older reports might also match.</p>}
 </section>
}
