import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
const calls = vi.hoisted(() => ({check:vi.fn(),send:vi.fn()}));
vi.mock("@tanstack/react-start",()=>({useServerFn:(fn:unknown)=>fn}));
vi.mock("@/lib/gift-email.functions",()=>({testDemoEmail:calls.check,sendDemoEmail:calls.send}));
import { EmailQa } from "@/components/xmas/EmailQa";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("readiness alone does not send; explicit approval sends only selected kind and replay ID",async()=>{
 calls.check.mockResolvedValue({ready:true}); calls.send.mockResolvedValue({state:"accepted"});
 render(<EmailQa/>);
 expect(screen.getByRole("button",{name:"Invia prova al QA"})).toBeDisabled();
 fireEvent.click(screen.getByRole("button",{name:"Verifica Gmail"}));
 await waitFor(()=>expect(calls.check).toHaveBeenCalledTimes(1));
 expect(calls.send).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText("Tipo di prova"),{target:{value:"christmas_simulation"}});
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.click(screen.getByRole("button",{name:"Invia prova al QA"}));
 await waitFor(()=>expect(calls.send).toHaveBeenCalledTimes(1));
 expect(calls.send.mock.calls[0]?.[0]).toEqual({data:{kind:"christmas_simulation",approved:true,requestId:expect.any(String)}});
 expect(screen.getByRole("button",{name:"Invia prova al QA"})).toBeDisabled();
});
it("missing integration cannot send",async()=>{
 calls.check.mockResolvedValue({ready:false});render(<EmailQa/>);
 fireEvent.click(screen.getByRole("button",{name:"Verifica Gmail"}));
 await waitFor(()=>expect(calls.check).toHaveBeenCalledTimes(1));
 expect(screen.getByRole("checkbox")).toBeDisabled();expect(calls.send).not.toHaveBeenCalled();
});
