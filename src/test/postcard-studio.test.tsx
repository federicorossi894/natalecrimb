import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const renderer=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/postcard-share',()=>({renderPostcardImage:renderer,postcardText:()=> 'Message https://natalecrimb.lovable.app/albero',INVITE_LINE:''}));
vi.mock('@tanstack/react-router',()=>({Link:({children}:{children:React.ReactNode})=><a>{children}</a>}));
import { PostcardStudio } from '@/components/xmas/PostDonation';
import { PROJECTS } from '@/lib/data';
const project=PROJECTS[0];if(!project)throw Error('project');
afterEach(()=>{cleanup();vi.restoreAllMocks();renderer.mockReset();});
it.each([null,'rejection'])('renderer failure %s exposes retry, not indefinite spinner',async failure=>{
  if(failure===null)renderer.mockResolvedValueOnce(null);else renderer.mockRejectedValueOnce(Error('canvas'));
  render(<PostcardStudio project={project} to="" from="" msg=""/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('non è stata generata');
  const file=new File(['png'],'card.png',{type:'image/png'});renderer.mockResolvedValueOnce(file);
  URL.createObjectURL=vi.fn(()=> 'blob:card');URL.revokeObjectURL=vi.fn();
  fireEvent.click(screen.getByRole('button',{name:'Riprova cartolina'}));
  await screen.findByTestId('postcard-image');expect(screen.getByRole('button',{name:/^Scarica cartolina$/})).toBeEnabled();
});
it('prepared native share carries PNG and text; unsupported fallback opens composer without claiming send',async()=>{
  const file=new File(['png'],'card.png',{type:'image/png'});renderer.mockResolvedValue(file);
  URL.createObjectURL=vi.fn(()=> 'blob:card');URL.revokeObjectURL=vi.fn();
  const share=vi.fn().mockResolvedValue(undefined),canShare=vi.fn(()=>true);
  Object.defineProperty(navigator,'share',{value:share,configurable:true});Object.defineProperty(navigator,'canShare',{value:canShare,configurable:true});
  const open=vi.spyOn(window,'open').mockImplementation(()=>null);
  render(<PostcardStudio project={project} to="" from="" msg="" selfThanks/>);await screen.findByTestId('postcard-image');
  fireEvent.click(screen.getByRole('button',{name:'Condividi su WhatsApp'}));await waitFor(()=>expect(share).toHaveBeenCalledWith(expect.objectContaining({files:[file],text:expect.stringContaining('https://')})));expect(open).not.toHaveBeenCalled();
  canShare.mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'Condividi su WhatsApp'}));expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text='),'_blank','noopener,noreferrer');
});