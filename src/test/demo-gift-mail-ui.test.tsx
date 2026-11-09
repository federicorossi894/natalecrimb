import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { it,expect,vi,afterEach } from 'vitest';
const call=vi.hoisted(()=>vi.fn());
vi.mock('@tanstack/react-start',()=>({useServerFn:()=>call}));
vi.mock('@tanstack/react-router',()=>({Link:({children}: {children:React.ReactNode})=><a>{children}</a>}));
vi.mock('@/lib/demo-gift-mail.functions',()=>({sendDemoGiftMail:vi.fn()}));
import { DemoGiftMail } from '@/components/xmas/DemoGiftMail';
const props={authorized:true,ornamentId:'00000000-0000-4000-8000-000000000001',giftRequestId:'00000000-0000-4000-8000-000000000002',client:'00000000-0000-4000-8000-000000000003',donor:'Federico',toName:'Giulia',msg:'Privata'};
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('receipt never sends on mount or without optin; accepted is not delivered and repeated click blocked',async()=>{
  call.mockResolvedValue({state:'accepted'});render(<DemoGiftMail {...props} receipt/>);
  expect(call).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Invia ora email di prova'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Invia ora email di prova'}));
  await waitFor(()=>expect(call).toHaveBeenCalledOnce());expect(call.mock.calls[0]?.[0]?.data).toMatchObject({ornamentId:props.ornamentId,giftRequestId:props.giftRequestId,client:props.client,donor:props.donor,toName:props.toName,msg:props.msg,kind:'receipt',approved:true,recipient:'federico.rossi@crimonza.org'});
  expect(await screen.findByRole('status')).toHaveTextContent('ricezione in casella non ancora verificata');expect(screen.getByRole('button',{name:'Invia ora email di prova'})).toBeDisabled();
});
it('foreign recipient blocks before send',()=>{render(<DemoGiftMail {...props}/>);fireEvent.change(screen.getByLabelText('Email regalo DEMO'),{target:{value:'other@example.org'}});fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Invia via email'})).toBeDisabled();expect(call).not.toHaveBeenCalled();});
it('Christmas carries actual private payload and unknown never becomes success',async()=>{call.mockResolvedValue({state:'unknown'});render(<DemoGiftMail {...props}/>);fireEvent.change(screen.getByLabelText('Quando inviare'),{target:{value:'christmas_simulation'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Invia via email'}));await waitFor(()=>expect(call).toHaveBeenCalledOnce());expect(call.mock.calls[0]?.[0]?.data).toMatchObject({kind:'christmas_simulation',msg:'Privata'});expect(await screen.findByRole('status')).toHaveTextContent('Esito incerto');});