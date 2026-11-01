import { act,cleanup,fireEvent,render,screen } from '@testing-library/react'
import { beforeEach,afterEach,test,expect,vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DuplicateCheck } from '../src/components/DuplicateCheck'
import { FollowedIssuePage } from '../src/pages/citizen/FollowedIssuePage'
import type { ComplaintData } from '../src/types/complaint'
const mocks=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn()}))
vi.mock('../src/context/ThemeContext',()=>({useTheme:()=>({theme:'light'})}))
vi.mock('../src/lib/supabaseClient',()=>({supabase:{functions:{invoke:mocks.invoke},rpc:mocks.rpc}}))
const data:ComplaintData={language:'English',category:'Road Damage/Potholes',description:'There are deep potholes near the school',source:'text',lat:0,lng:0,address:'School road',photoFile:null,photoUrl:null}
const match={code:'CC-TEST',category:data.category,status:'in-progress',created_at:'2026-11-01T00:00:00Z',distance_m:25,ticket:'signed-ticket'}
beforeEach(()=>vi.clearAllMocks())
afterEach(cleanup)
const wrap=(value:React.ReactNode)=><MemoryRouter>{value}</MemoryRouter>
test('shows real matches and follows without submitting a complaint',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:{quality:'usable',matches:[match],limited:false},error:null})
 .mockImplementationOnce((_name,{body})=>Promise.resolve({data:{token:body.token},error:null}))
 render(wrap(<DuplicateCheck data={data}/>))
 await screen.findByText('A similar issue is already reported nearby.')
 fireEvent.click(screen.getByRole('button',{name:'Follow this issue'}))
 const link=await screen.findByRole('link',{name:'View status and save your private link'})
 expect(link.getAttribute('href')).toMatch(/^\/citizen\/follow\?token=/)
 expect(mocks.rpc).not.toHaveBeenCalled()
 expect(mocks.invoke.mock.calls[1][1].body.action).toBe('follow')
 expect(screen.getByText('Following this issue. No new complaint was created.')).toBeTruthy()
})
test('failure is optional and retry recovers',async()=>{
 mocks.invoke.mockResolvedValueOnce({data:null,error:{message:'Offline'}}).mockResolvedValueOnce({data:{quality:'usable',matches:[],limited:false},error:null})
 render(wrap(<DuplicateCheck data={data}/>))
 await screen.findByText(/Nearby duplicate checking is unavailable/)
 fireEvent.click(screen.getByRole('button',{name:'Retry duplicate check'}))
 await screen.findByText(/No close matches found/)
})
test('unclear text asks for details without accusing the citizen of spam',async()=>{
 mocks.invoke.mockResolvedValue({data:{quality:'unclear',matches:[],limited:false},error:null})
 render(wrap(<DuplicateCheck data={data}/>))
 await screen.findByText(/Add specific details/)
 expect(screen.queryByRole('button',{name:'Follow this issue'})).toBeNull()
})
test('older responses cannot replace the latest location results',async()=>{
 let finish!:(value:unknown)=>void
 mocks.invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve})).mockResolvedValueOnce({data:{quality:'usable',matches:[],limited:false},error:null})
 const view=render(wrap(<DuplicateCheck data={data}/>))
 view.rerender(wrap(<DuplicateCheck data={{...data,lat:1}}/>))
 await screen.findByText(/No close matches found/)
 await act(async()=>finish({data:{quality:'usable',matches:[match],limited:false},error:null}))
 expect(screen.queryByText('A similar issue is already reported nearby.')).toBeNull()
})
test('citizens can dismiss a possible duplicate and retain their own submission',async()=>{
 mocks.invoke.mockResolvedValue({data:{quality:'usable',matches:[match],limited:true},error:null})
 render(wrap(<DuplicateCheck data={data}/>))
 fireEvent.click(await screen.findByRole('button',{name:'Submit my complaint anyway'}))
 expect(screen.getByText(/You can submit your own complaint/)).toBeTruthy()
 expect(screen.getByText(/only the latest 100/)).toBeTruthy()
 expect(mocks.rpc).not.toHaveBeenCalled()
})
test('follow page reads only through a private capability',async()=>{
 const token='12345678-1234-4234-8234-123456789abc'
 mocks.rpc.mockResolvedValue({data:{code:'CC-TEST',category:'Streetlights',status:'resolved',created_at:'2026-11-01T00:00:00Z'},error:null})
 render(<MemoryRouter initialEntries={['/citizen/follow?token='+token]}><FollowedIssuePage/></MemoryRouter>)
 await screen.findByText('resolved')
 expect(mocks.rpc).toHaveBeenCalledWith('get_followed_complaint',{p_token:token})
})
test('invalid follow link does not query private data',async()=>{
 render(<MemoryRouter initialEntries={['/citizen/follow?token=bad']}><FollowedIssuePage/></MemoryRouter>)
 await screen.findByRole('alert')
 expect(mocks.rpc).not.toHaveBeenCalled()
})
