import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const send=vi.hoisted(()=>vi.fn());
vi.mock('@tanstack/react-start',()=>({useServerFn:()=>send}));
vi.mock('@/lib/gift-mail.functions',()=>({sendOnlineGiftMail:()=>undefined}));
import { GiftMailForm } from '@/components/xmas/GiftMailForm';
afterEach(()=>{cleanup();send.mockReset();});
it.each(['accepted','unknown','limited','failed'])('only accepted email completes gift: %s',async state=>{
  const onAccepted=vi.fn();send.mockResolvedValue({state,message:state});
  render(<GiftMailForm ornamentId="00000000-0000-4000-8000-000000000001" giftRequestId="00000000-0000-4000-8000-000000000002" client="00000000-0000-4000-8000-000000000003" from="Luca" toName="Anna" msg="Buone feste" onAccepted={onAccepted}/>);
  fireEvent.change(screen.getByLabelText('Email del destinatario'),{target:{value:'anna@example.it'}});
  fireEvent.click(screen.getByRole('button',{name:'Invia ora'}));await waitFor(()=>expect(send).toHaveBeenCalledOnce());
  await screen.findByRole(state==='accepted'?'status':'alert');expect(onAccepted).toHaveBeenCalledTimes(state==='accepted'?1:0);
});