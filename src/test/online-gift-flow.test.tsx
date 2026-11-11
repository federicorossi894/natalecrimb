import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const call=vi.hoisted(()=>vi.fn());
vi.mock('@tanstack/react-start',()=>({useServerFn:()=>call}));
vi.mock('@tanstack/react-router',()=>({Link:({children}:{children:React.ReactNode})=><a>{children}</a>}));
vi.mock('@/lib/online-gift.functions',()=>({createOnlineGift:()=>undefined}));
vi.mock('@/lib/tree-store',()=>({clientId:()=> '00000000-0000-4000-8000-000000000001'}));
vi.mock('@/components/xmas/TreeExperience',()=>({TreeExperience:()=>null}));
vi.mock('@/components/xmas/SolidarityShare',()=>({SolidarityShare:()=> <div data-testid="social-share">Social story</div>}));
vi.mock('@/components/xmas/PostDonation',()=>({PostcardStudio:({selfThanks,msg,from,onShared}:{selfThanks?:boolean;msg:string;from:string;onShared?:()=>void})=><div data-testid={selfThanks?'thanks-card':'card'}>private:{msg} · {from}{onShared && <button onClick={onShared}>Complete sharing</button>}</div>}));
vi.mock('@/components/xmas/GiftMailForm',()=>({GiftMailForm:({receipt,onAccepted}:{receipt?:boolean;onAccepted?:()=>void})=><div data-testid={receipt?'receipt':'mail'}>{onAccepted && <button onClick={onAccepted}>Accept email</button>}</div>}));
import { OnlineGiftFlow } from '@/components/xmas/OnlineGiftFlow';
import { PROJECTS } from '@/lib/data';
import { clearGiftSession, loadGiftSession } from '@/lib/online-gift-session';
const project=PROJECTS[0]!;
const doneId='00000000-0000-4000-8000-000000000002';
const renderGift=async()=>{
  call.mockResolvedValue({id:doneId,thankYou:'Grazie, il tuo gesto porta vicinanza a Monza.'});
  render(<OnlineGiftFlow project={project} amount={5} onBack={()=>undefined}/>);
  await screen.findByRole('button',{name:'Continua'});
};
const pay=async()=>{
  fireEvent.click(screen.getByRole('button',{name:'Continua'}));
  fireEvent.click(screen.getByRole('button',{name:'Conferma 5 €'}));
  await screen.findByTestId('receipt');
};
afterEach(()=>{cleanup();sessionStorage.clear();clearGiftSession();vi.clearAllMocks();});

it('person gift uses the same private message and signature for the tree only with explicit consent',async()=>{
  await renderGift();
  expect(screen.getByRole('button',{name:/Regalo a una persona/})).toHaveAttribute('aria-pressed','true');
  fireEvent.change(screen.getByLabelText('Destinatario'),{target:{value:'Pino'}});
  fireEvent.change(screen.getByLabelText('Mittente'),{target:{value:'Federico'}});
  fireEvent.change(screen.getByLabelText('Messaggio privato'),{target:{value:'Buon Natale, Pino'}});
  expect(screen.queryByLabelText('Dedica pubblica sull’albero')).toBeNull();
  fireEvent.click(screen.getByLabelText('Pubblica dedica e firma sull’albero'));
  expect(screen.getByLabelText('Usa la stessa dedica e firma del regalo')).toBeChecked();
  await pay();
  expect(call).toHaveBeenCalledOnce();
  expect(call.mock.calls[0]?.[0]?.data).toMatchObject({dedica:'Buon Natale, Pino',firma:'Federico',consent:true});
  expect(screen.getByTestId('delivery-step')).toHaveTextContent('Invia il regalo a Pino');
  expect(screen.getByTestId('card')).toHaveTextContent('Buon Natale, Pino');
  expect(screen.queryByTestId('social-share')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Complete sharing'}));
  expect(screen.getByTestId('donor-thanks')).toHaveTextContent('Grazie');
  expect(screen.getByTestId('social-share')).toBeInTheDocument();
  expect(loadGiftSession(project.id)?.reusePublicText).toBe(true);
});

it('allows different public message and signature while keeping the recipient text private',async()=>{
  await renderGift();
  fireEvent.change(screen.getByLabelText('Mittente'),{target:{value:'Federico'}});
  fireEvent.change(screen.getByLabelText('Messaggio privato'),{target:{value:'Per te e solo per te'}});
  fireEvent.click(screen.getByLabelText('Pubblica dedica e firma sull’albero'));
  fireEvent.click(screen.getByLabelText('Usa la stessa dedica e firma del regalo'));
  fireEvent.change(screen.getByLabelText('Dedica pubblica sull’albero'),{target:{value:'Un dono per Monza'}});
  fireEvent.change(screen.getByLabelText('Firma pubblica'),{target:{value:'F.'}});
  await pay();
  expect(call.mock.calls[0]?.[0]?.data).toMatchObject({dedica:'Un dono per Monza',firma:'F.',consent:true});
  expect(screen.getByTestId('card')).toHaveTextContent('Per te e solo per te');
  expect(screen.getByTestId('card')).toHaveTextContent('Federico');
  expect(loadGiftSession(project.id)?.reusePublicText).toBe(false);
});

it('does not publish any private content without publication opt-in',async()=>{
  await renderGift();
  fireEvent.change(screen.getByLabelText('Mittente'),{target:{value:'Federico'}});
  fireEvent.change(screen.getByLabelText('Messaggio privato'),{target:{value:'Un segreto'}});
  await pay();
  expect(call.mock.calls[0]?.[0]?.data).toMatchObject({dedica:'',firma:'',consent:false});
  expect(screen.getByTestId('card')).toHaveTextContent('Un segreto');
});

it('Monza gift has no recipient delivery, but accepts public dedication, gives thanks and social story',async()=>{
  await renderGift();
  fireEvent.click(screen.getByRole('button',{name:/Regalo a Monza/}));
  expect(screen.queryByLabelText('Destinatario')).toBeNull();
  fireEvent.click(screen.getByLabelText('Pubblica dedica e firma sull’albero'));
  fireEvent.change(screen.getByLabelText('Dedica pubblica sull’albero'),{target:{value:'Per la città'}});
  fireEvent.change(screen.getByLabelText('Firma pubblica'),{target:{value:'Una famiglia'}});
  await pay();
  expect(call.mock.calls[0]?.[0]?.data).toMatchObject({dedica:'Per la città',firma:'Una famiglia',consent:true});
  expect(screen.queryByTestId('delivery-step')).toBeNull();
  expect(screen.getByTestId('donor-thanks')).toHaveTextContent('Grazie');
  expect(screen.getByTestId('social-share')).toBeInTheDocument();
  expect(loadGiftSession(project.id)?.gift).toBe(false);
});

it('email acceptance completes the person gift and restores social story on reload',async()=>{
  await renderGift();
  await pay();
  fireEvent.click(screen.getByRole('radio',{name:'Email'}));
  fireEvent.click(screen.getByRole('button',{name:'Accept email'}));
  expect(loadGiftSession(project.id)?.sharingComplete).toBe(true);
  cleanup();
  render(<OnlineGiftFlow project={project} amount={5} onBack={()=>undefined}/>);
  expect(await screen.findByTestId('social-share')).toBeInTheDocument();
  expect(call).toHaveBeenCalledOnce();
});

it('new gift rotates the idempotency key and resets public choice',async()=>{
  await renderGift();
  await pay();
  const first=call.mock.calls[0]?.[0]?.data.requestId;
  fireEvent.click(screen.getByRole('button',{name:'Nuovo regalo o donazione'}));
  expect(screen.getByRole('button',{name:/Regalo a una persona/})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getByRole('button',{name:'Continua'}));
  fireEvent.click(screen.getByRole('button',{name:'Conferma 5 €'}));
  await waitFor(()=>expect(call).toHaveBeenCalledTimes(2));
  expect(call.mock.calls[1]?.[0]?.data.requestId).not.toBe(first);
});
