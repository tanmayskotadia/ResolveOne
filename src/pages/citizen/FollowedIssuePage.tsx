import { useEffect,useState } from 'react'
import { useSearchParams,Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { FollowedIssue } from '../../lib/duplicates'
import { useTheme } from '../../context/ThemeContext'
export function FollowedIssuePage(){
 const [params]=useSearchParams();const token=params.get('token')||''
 const [issue,setIssue]=useState<FollowedIssue|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [attempt,setAttempt]=useState(0)
 const {theme}=useTheme();const dark=theme==='dark'
 useEffect(()=>{
   let active=true;setBusy(true);setIssue(null);setError('')
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)){setError('This private follow link is invalid.');setBusy(false);return}
   void (async()=>{try{
     const {data,error}=await supabase.rpc('get_followed_complaint',{p_token:token})
     if(error)throw error
     if(active){if(data)setIssue(data as FollowedIssue);else setError('This follow link was not found or the issue was removed.')}
   }catch{if(active)setError('Status could not be loaded. Please retry.')}finally{if(active)setBusy(false)}})()
   return ()=>{active=false}
 },[token,attempt])
 return <div className={`min-h-screen py-12 px-4 ${dark?'bg-navy-950':'bg-slate-50'}`}><div className={`max-w-xl mx-auto rounded-xl border p-6 space-y-4 ${dark?'bg-navy-900 border-navy-800 text-slate-300':'bg-white border-slate-200 text-slate-700'}`}>
 <h1 className="text-xl font-bold">Followed issue</h1>
 <p className="text-sm">Bookmark this private link to return to the issue’s status. Anyone with the link can view this limited summary.</p>
 {busy&&<p role="status">Loading status…</p>}
 {error&&<p role="alert">{error}</p>}
 {issue&&<dl className="space-y-3"><div><dt className="text-xs">Complaint code</dt><dd className="font-mono">{issue.code}</dd></div><div><dt className="text-xs">Category</dt><dd>{issue.category}</dd></div><div><dt className="text-xs">Current status</dt><dd>{issue.status.replaceAll('-',' ')}</dd></div><div><dt className="text-xs">Reported</dt><dd>{new Date(issue.created_at).toLocaleDateString('en-IN')}</dd></div></dl>}
 <button type="button" disabled={busy} onClick={()=>setAttempt(n=>n+1)} className="text-primary underline text-sm">Refresh status</button>
 <Link to="/citizen/report" className="block text-primary underline text-sm">Report another issue</Link>
 </div></div>
}
