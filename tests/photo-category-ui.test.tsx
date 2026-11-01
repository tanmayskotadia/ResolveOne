import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,beforeEach,expect,test,vi } from 'vitest'
import { PhotoCategorySuggestion } from '../src/components/PhotoCategorySuggestion'
import { Step3Photo } from '../src/pages/citizen/components/Step3Photo'
import type { ComplaintData } from '../src/types/complaint'
const mocks=vi.hoisted(()=>({invoke:vi.fn(),prepare:vi.fn(),suggest:vi.fn()}))
vi.mock('../src/context/ThemeContext',()=>({useTheme:()=>({theme:'light'})}))
vi.mock('../src/lib/supabaseClient',()=>({supabase:{functions:{invoke:mocks.invoke}}}))
vi.mock('../src/lib/photoCategory',()=>({preparePhoto:mocks.prepare,suggestPhotoCategory:mocks.suggest}))
const photo=new File(['photo'],'pothole.png',{type:'image/png'})
const good={category:'Road Damage/Potholes',uncertain:false,evidence:'There is visible road damage.'}
beforeEach(()=>{vi.clearAllMocks();mocks.invoke.mockResolvedValue({data:{enabled:true},error:null});mocks.prepare.mockResolvedValue('encoded-photo');mocks.suggest.mockResolvedValue(good)})
afterEach(cleanup)
test('unconfigured service adds no broken assistant panel',async()=>{
 mocks.invoke.mockResolvedValue({data:{enabled:false},error:null})
 render(<PhotoCategorySuggestion photo={photo} onApply={()=>{}}/>)
 await waitFor(()=>expect(mocks.invoke).toHaveBeenCalled())
 expect(screen.queryByRole('button',{name:'Suggest category'})).toBeNull();expect(mocks.suggest).not.toHaveBeenCalled()
})
test('explicit consent and action are required; category applies only on confirmation',async()=>{
 const apply=vi.fn();render(<PhotoCategorySuggestion photo={photo} onApply={apply}/>)
 const button=await screen.findByRole('button',{name:'Suggest category'}) as HTMLButtonElement
 expect(button.disabled).toBe(true);expect(mocks.suggest).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(button)
 await screen.findByText('Suggested category: Road Damage/Potholes')
 expect(apply).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Apply suggestion'}));expect(apply).toHaveBeenCalledExactlyOnceWith(good.category,good.evidence)
})
test('uncertain images leave manual selection and expose no apply button',async()=>{
 mocks.suggest.mockResolvedValue({...good,uncertain:true,category:null})
 render(<PhotoCategorySuggestion photo={photo} onApply={()=>{}}/>)
 await screen.findByRole('button',{name:'Suggest category'});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Suggest category'}))
 await screen.findByText('The category is uncertain. Please select it manually.')
 expect(screen.queryByRole('button',{name:'Apply suggestion'})).toBeNull()
})
test('a late response for an old photo is ignored and consent resets',async()=>{
 let finish!:(value:unknown)=>void;mocks.suggest.mockReturnValue(new Promise(resolve=>{finish=resolve}))
 const view=render(<PhotoCategorySuggestion photo={photo} onApply={()=>{}}/>)
 await screen.findByRole('button',{name:'Suggest category'});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Suggest category'}))
 await waitFor(()=>expect(mocks.suggest).toHaveBeenCalled())
 view.rerender(<PhotoCategorySuggestion photo={new File(['new'],'new.png',{type:'image/png'})} onApply={()=>{}}/>)
 await act(async()=>finish(good))
 expect(screen.queryByRole('button',{name:'Apply suggestion'})).toBeNull()
 expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
 expect(mocks.suggest.mock.calls[0][1].aborted).toBe(true)
})
test('quota or network failure preserves manual workflow',async()=>{
 mocks.suggest.mockRejectedValue(new Error('quota exhausted'))
 render(<PhotoCategorySuggestion photo={photo} onApply={()=>{}}/>)
 await screen.findByRole('button',{name:'Suggest category'});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Suggest category'}))
 await screen.findByText(/Photo suggestions could not finish/)
 expect((screen.getByRole('button',{name:'Suggest category'}) as HTMLButtonElement).disabled).toBe(false)
})
test('Step3Photo applies suggestion updates to both category and description',async()=>{
 const data:ComplaintData={language:'English',description:'road damage',category:'Other',source:'text',lat:0,lng:0,address:'',photoFile:photo,photoUrl:null}
 const onChange=vi.fn()
 render(<Step3Photo data={data} onChange={onChange} onNext={()=>{}} onBack={()=>{}}/>)
 const button=await screen.findByRole('button',{name:'Suggest category'})
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(button)
 await screen.findByText(`Suggested category: ${good.category}`)
 fireEvent.click(screen.getByRole('button',{name:'Apply suggestion'}))
 expect(onChange).toHaveBeenCalledWith({category:good.category,description:good.evidence})
})
