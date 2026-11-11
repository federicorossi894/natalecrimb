import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const checkout=vi.hoisted(()=>vi.fn());
vi.mock("@tanstack/react-start",()=>({useServerFn:()=>checkout}));
vi.mock("@/lib/payments.functions",()=>({startDonationCheckout:()=>undefined}));
vi.mock("@tanstack/react-router",()=>({Link:({children}:{children:React.ReactNode})=><a>{children}</a>}));
import { LiveGiftFlow } from "@/components/xmas/LiveGiftFlow";
import { CAMPAIGN } from "@/lib/campaign";
import { PROJECTS } from "@/lib/data";
import { clearGiftSession, loadGiftSession } from "@/lib/online-gift-session";
const project=PROJECTS[0]!;
const snapshot={...CAMPAIGN,liveOnlineProviders:[...CAMPAIGN.liveOnlineProviders]};
afterEach(()=>{
  cleanup();sessionStorage.clear();localStorage.clear();clearGiftSession();checkout.mockReset();
  Object.assign(CAMPAIGN,snapshot);
});
it("keeps real checkout disabled until provider verification is complete",()=>{
  render(<LiveGiftFlow project={project} amount={5} onBack={()=>undefined}/>);
  expect(screen.getByRole("button",{name:/Procedi alla donazione di 5/})).toBeDisabled();
  expect(checkout).not.toHaveBeenCalled();
});
it("keeps private card separate from public bauble before external checkout",async()=>{
  Object.assign(CAMPAIGN,{livePayments:true,liveOnlineProviders:["sumup"]});
  checkout.mockRejectedValue(new Error("Test: redirect intentionally blocked"));
  render(<LiveGiftFlow project={project} amount={5} onBack={()=>undefined}/>);
  fireEvent.change(screen.getByLabelText("Destinatario"),{target:{value:"Pino"}});
  fireEvent.change(screen.getByLabelText("Mittente"),{target:{value:"Federico"}});
  fireEvent.change(screen.getByLabelText("Messaggio privato"),{target:{value:"Un regalo per te"}});
  fireEvent.click(screen.getByLabelText("Pubblica dedica e firma sull’albero"));
  fireEvent.click(screen.getByRole("button",{name:/Procedi alla donazione di 5/}));
  await waitFor(()=>expect(checkout).toHaveBeenCalledOnce());
  const sent=checkout.mock.calls[0]?.[0]?.data;
  expect(sent).toMatchObject({amount:5,kind:project.ornament,provider:"sumup",donorConfirmation:{requested:false}});
  expect(sent).not.toHaveProperty("msg"); // Private postcard stays on original device only.
  expect(sent).not.toHaveProperty("dedica"); // Public fields are applied ONLY after payment.
  const session=loadGiftSession(project.id);
  expect(session).toMatchObject({gift:true,to:"Pino",from:"Federico",msg:"Un regalo per te",dedica:"Un regalo per te",firma:"Federico",consent:true,id:null});
  expect(screen.getByRole("alert")).toHaveTextContent("Test: redirect intentionally blocked");
});
it("gifting to Monza stores no private recipient details and keeps public text opt-in",async()=>{
  Object.assign(CAMPAIGN,{livePayments:true,liveOnlineProviders:["sumup"]});
  checkout.mockRejectedValue(new Error("Test: no transaction"));
  render(<LiveGiftFlow project={project} amount={7} onBack={()=>undefined}/>);
  fireEvent.click(screen.getByRole("button",{name:/Regalo a Monza/}));
  expect(screen.queryByLabelText("Destinatario")).toBeNull();
  fireEvent.click(screen.getByLabelText("Pubblica dedica e firma sull’albero"));
  fireEvent.change(screen.getByLabelText("Dedica pubblica sull’albero"),{target:{value:"Grazie Monza"}});
  fireEvent.click(screen.getByRole("button",{name:/Procedi alla donazione di 7/}));
  await waitFor(()=>expect(checkout).toHaveBeenCalledOnce());
  expect(loadGiftSession(project.id)).toMatchObject({gift:false,to:"",from:"",msg:"",dedica:"Grazie Monza",consent:true,id:null});
});
