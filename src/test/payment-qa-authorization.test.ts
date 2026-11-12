// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CAMPAIGN } from "@/lib/campaign";
import { requirePaymentQa } from "@/lib/payment-qa-auth.server";
const mocks=vi.hoisted(()=>({url:"https://natale.crimonza.org/_serverFn/qa"}));
vi.mock("@tanstack/react-start/server",()=>({getRequest:()=>new Request(mocks.url)}));
const owner=(email:string,confirmed=true)=>({supabase:{auth:{getUser:vi.fn(async()=>({data:{user:{
  id:"owner",email,email_confirmed_at:confirmed?"2026-11-10":null
}},error:null}))}},userId:"owner"});
const demo=CAMPAIGN.demo;
beforeEach(()=>{CAMPAIGN.demo=true;mocks.url="https://natale.crimonza.org/_serverFn/qa";});
afterEach(()=>{CAMPAIGN.demo=demo;});
it("permits exactly the confirmed individual CRI QA account on the official domain",async()=>{
  await expect(requirePaymentQa(owner("federico.rossi@crimonza.org"))).resolves.toBe("owner");
  await expect(requirePaymentQa(owner("natale@crimonza.org"))).resolves.toBe("owner");
});
it("rejects personal accounts and unconfirmed CRI email",async()=>{
  await expect(requirePaymentQa(owner("unrelated@example.org"))).rejects.toThrow("riservato");
  await expect(requirePaymentQa(owner("federico.rossi@crimonza.org",false))).rejects.toThrow("riservato");
});
it("rejects all preview or forged domains",async()=>{
  mocks.url="https://natalecrimb.lovable.app/_serverFn/qa";
  await expect(requirePaymentQa(owner("federico.rossi@crimonza.org"))).rejects.toThrow("natale.crimonza.org");
});
it("locks closed when the public site is no longer DEMO",async()=>{
  CAMPAIGN.demo=false;
  await expect(requirePaymentQa(owner("federico.rossi@crimonza.org"))).rejects.toThrow("chiuso");
});
