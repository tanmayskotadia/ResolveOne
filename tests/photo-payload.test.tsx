import { afterEach,expect,test,vi } from 'vitest'
import { preparePhoto } from '../src/lib/photoCategory'
vi.mock('../src/lib/supabaseClient',()=>({supabase:{functions:{invoke:vi.fn()}}}))
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
test('image is resized and re-encoded rather than forwarding the original file',async()=>{
 const close=vi.fn();const bitmap={width:1600,height:1200,close}
 vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap))
 const context={fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()}
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
 const encode=vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,resized-data')
 const result=await preparePhoto(new File(['original EXIF metadata'],'photo.jpg',{type:'image/jpeg'}))
 expect(result).toBe('resized-data');expect(encode).toHaveBeenCalledWith('image/jpeg',0.82)
 expect(context.drawImage).toHaveBeenCalledWith(bitmap,0,0,768,576)
 expect(close).toHaveBeenCalledTimes(1)
})
test('oversize decoded images are closed and never encoded',async()=>{
 const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:6000,height:5000,close}))
 const encode=vi.spyOn(HTMLCanvasElement.prototype,'toDataURL')
 await expect(preparePhoto(new File(['photo'],'photo.jpg'))).rejects.toThrow('20 megapixels')
 expect(encode).not.toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1)
})
