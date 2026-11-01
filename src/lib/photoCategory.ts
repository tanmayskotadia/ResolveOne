import { supabase } from './supabaseClient'
import { CATEGORIES } from './categories'
export interface PhotoCategoryResult {category:typeof CATEGORIES[number]|null;uncertain:boolean;evidence:string}
export async function preparePhoto(file:File):Promise<string>{
 const bitmap=await createImageBitmap(file)
 try{
  if(bitmap.width*bitmap.height>20000000||!bitmap.width||!bitmap.height)throw new Error('Choose a photo under 20 megapixels.')
  const scale=Math.min(1,768/Math.max(bitmap.width,bitmap.height))
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
  const context=canvas.getContext('2d');if(!context)throw new Error('Photo preparation is unavailable in this browser.')
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height)
  // Re-encoding removes EXIF metadata and sends a small image, not the original.
  const encoded=canvas.toDataURL('image/jpeg',0.82).split(',')[1]
  if(!encoded||encoded.length>1500000)throw new Error('Choose a smaller photo for analysis.')
  return encoded
 }finally{bitmap.close()}
}
export async function suggestPhotoCategory(image:string,signal:AbortSignal):Promise<PhotoCategoryResult>{
 const {data,error}=await supabase.functions.invoke('photo-category',{body:{image,mime_type:'image/jpeg',consent:true},signal})
 if(error||data?.error)throw new Error(data?.error||'Photo suggestions are unavailable or the free quota was reached. You can select a category manually.')
 if(!data||typeof data.uncertain!=='boolean'||typeof data.evidence!=='string'||data.evidence.length>300||!(data.category===null||CATEGORIES.some(category=>category===data.category)))throw new Error('Photo analysis did not return a usable category. Please select one manually.')
 return {category:data.uncertain?null:data.category,uncertain:data.uncertain||data.category===null,evidence:data.evidence}
}
