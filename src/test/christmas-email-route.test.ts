// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),send:vi.fn(),dispatch:vi.fn()}));
vi.mock("@tanstack/react-router",()=>({createFileRoute:()=> (o:unknown)=>({options:o})}));
vi.mock("@/integrations/supabase/client.server",()=>({supabaseAdmin:{rpc:mocks.auth}}));
vi.mock("@/lib/donation-email.server",()=>({
  processDonationEmail:mocks.send,processDueChristmasGiftEmails:mocks.dispatch,
}));
import { Route } from "@/routes/api/public/christmas-gift-email";
const post=(Route.options as unknown as {server:{handlers:{POST:(arg:{request:Request})=>Promise<Response>}}}).server.handlers.POST;
const request=(body:unknown,auth=true)=>new Request("https://natale.crimonza.org/api/public/christmas-gift-email",{
  method:"POST",
  headers:auth?{authorization:`Bearer ${"a".repeat(64)}`}:undefined,
  body:JSON.stringify(body),
});
beforeEach(()=>{mocks.auth.mockReset().mockResolvedValue({data:true,error:null});mocks.send.mockReset();mocks.dispatch.mockReset();});
it("unauthorized jobs never reach the sender",async()=>{
  expect((await post({request:request({kind:"due-gifts"},false)})).status).toBe(401);
  expect(mocks.auth).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});
it("a valid Vault token is checked BEFORE accepting the job body",async()=>{
  const r=await post({request:request({kind:"due-gifts"})});
  expect(mocks.auth).toHaveBeenCalledWith("verify_natal_cron_token",{p_token:"a".repeat(64)});
  expect(await r.json()).toEqual({state:"blocked",reason:"official_sender_not_configured"});
  expect(mocks.send).not.toHaveBeenCalled();
});
it("forged tokens are rejected",async()=>{
  mocks.auth.mockResolvedValue({data:false,error:null});
  expect((await post({request:request({kind:"due-gifts"})})).status).toBe(401);
});
it("will not process an individual gift ID even for an authenticated scheduler",async()=>{
  const r=await post({request:request({kind:"single-gift",donationId:"00000000-0000-4000-8000-000000000001"})});
  expect(r.status).toBe(400);
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.dispatch).not.toHaveBeenCalled();
});
it("cannot supply arbitrary email addresses or recipient templates to scheduled runner",async()=>{
  const r=await post({request:request({kind:"single-gift",donationId:"00000000-0000-4000-8000-000000000001",to:"victim@example.org"})});
  expect(r.status).toBe(400);
  expect(mocks.send).not.toHaveBeenCalled();
});
