import { useEffect,useRef,useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { preparePhoto,suggestPhotoCategory,type PhotoCategoryResult } from '../lib/photoCategory'
import { useTheme } from '../context/ThemeContext'

export function PhotoCategorySuggestion({photo,onApply}:{photo:File;onApply:(category:string,description?:string)=>void}){
 const {theme}=useTheme();const dark=theme==='dark'
 const [enabled,setEnabled]=useState(false);const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false)
 const [result,setResult]=useState<{photo:File;value:PhotoCategoryResult}|null>(null);const [error,setError]=useState('')
 const request=useRef<AbortController|null>(null);const generation=useRef(0);const lock=useRef(false)
 useEffect(()=>{
  const controller=new AbortController()
  void (async()=>{try{
   const {data,error}=await supabase.functions.invoke('photo-category',{method:'GET',signal:controller.signal})
   if(!controller.signal.aborted&&!error)setEnabled(data?.enabled===true)
  }catch{/* Configuration is optional; manual selection remains available. */}})()
  return ()=>controller.abort()
 },[])
 useEffect(()=>{
  generation.current++;request.current?.abort();lock.current=false
  setResult(null);setError('');setBusy(false);setConsent(false)
  return ()=>{generation.current++;request.current?.abort()}
 },[photo])
 async function analyze(){
  if(!consent||lock.current)return
  lock.current=true;const current=++generation.current;const controller=new AbortController();request.current=controller
  const timer=setTimeout(()=>controller.abort(),25000)
  setBusy(true);setError('');setResult(null)
  try{
   const image=await preparePhoto(photo)
   if(controller.signal.aborted||current!==generation.current)return
   const value=await suggestPhotoCategory(image,controller.signal)
   if(!controller.signal.aborted&&current===generation.current)setResult({photo,value})
  }catch{if(current===generation.current)setError('Photo suggestions could not finish or the free quota was reached. You can choose the category manually or try again later.')}
  finally{clearTimeout(timer);if(current===generation.current){lock.current=false;setBusy(false)}}
 }
 if(!enabled)return null
 const suggestion=result?.photo===photo?result.value:null
 return <section aria-label="Photo category suggestion" aria-busy={busy} className={`rounded-xl border p-4 space-y-3 ${dark?'bg-navy-900 border-navy-800 text-slate-300':'bg-white border-slate-200 text-slate-700'}`}>
  <h3 className="text-sm font-semibold">Photo category suggestion (optional)</h3>
  <p className="text-xs">A resized photo is sent to Google Gemini. Google’s free tier may use it to improve its products. Avoid photos containing personal or sensitive information.</p>
  <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>I agree to send this photo to Google for category suggestions.</span></label>
  <button type="button" disabled={!consent||busy} onClick={()=>void analyze()} className="text-primary underline text-sm disabled:opacity-50">{busy?'Checking photo…':'Suggest category'}</button>
  {error&&<p role="status" className="text-sm">{error}</p>}
  {suggestion&&<div className="text-sm space-y-2">
   <p>{suggestion.uncertain?'The category is uncertain. Please select it manually.':`Suggested category: ${suggestion.category}`}</p>
   <p>{suggestion.evidence}</p>
   {!suggestion.uncertain&&suggestion.category&&<button type="button" className="text-primary underline" onClick={()=>onApply(suggestion.category!,suggestion.evidence)}>Apply suggestion</button>}
   <p className="text-xs">Review the photo yourself. This suggestion does not verify the complaint or prove authenticity.</p>
  </div>}
 </section>
}
