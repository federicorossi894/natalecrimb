// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DEMO_EMAIL_QA, runDemoEmailQa, type QaPorts } from "@/lib/demo-email-qa.server";

function ports(): QaPorts {
  let claimed = false;
  return {
    authorized: true, demo: true, senderVerified: true, enabled: true,
    claim: vi.fn(async () => { if (claimed) return null; claimed = true; return "mock-attempt"; }),
    send: vi.fn(async () => ({ sent: true })),
    finish: vi.fn(async () => {}),
  };
}
describe("Manual DEMO QA, mocked delivery only", () => {
  it("uses only the exact owner-confirmed server destination", async () => {
    const p = ports();
    await runDemoEmailQa(p);
    expect(p.send).toHaveBeenCalledWith("federico.rossi@crimonza.org", "mock-attempt");
  });
  it("ordinary visitors and volunteers cannot claim or send", async () => {
    const p = ports(); p.authorized = false;
    await expect(runDemoEmailQa(p)).rejects.toThrow("riservata");
    expect(p.claim).not.toHaveBeenCalled(); expect(p.send).not.toHaveBeenCalled();
  });
  it.each(["senderVerified", "enabled", "demo"] as const)("missing %s blocks before claim or send", async (key) => {
    const p = ports(); p[key] = false;
    expect((await runDemoEmailQa(p)).state).toBe("unavailable");
    expect(p.claim).not.toHaveBeenCalled(); expect(p.send).not.toHaveBeenCalled();
  });
  it("concurrent attempts require a single durable claim and audit result", async () => {
    const p = ports();
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => runDemoEmailQa(p)));
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(outcomes.filter((v) => v.state === "rate_limited")).toHaveLength(5);
    expect(p.finish).toHaveBeenCalledWith("mock-attempt", "accepted");
  });
  it("suppression is audited, not retried", async () => {
    const p = ports(); p.send = vi.fn(async () => ({ sent: false }));
    expect((await runDemoEmailQa(p)).state).toBe("suppressed");
    expect(p.finish).toHaveBeenCalledWith("mock-attempt", "suppressed");
  });
  it("ambiguous send never clears its claim or automatically retries", async () => {
    const p = ports(); p.send = vi.fn(async () => { throw new Error("timeout"); });
    await expect(runDemoEmailQa(p)).rejects.toThrow("timeout");
    expect(p.finish).not.toHaveBeenCalled();
    expect((await runDemoEmailQa(p)).state).toBe("rate_limited");
    expect(p.send).toHaveBeenCalledTimes(1);
  });
  it("actual delivery remains off pending domain, adapter and durable rate/audit verification", () => {
    expect(DEMO_EMAIL_QA.enabled).toBe(false);
    expect(DEMO_EMAIL_QA.senderVerified).toBe(false);
    expect(DEMO_EMAIL_QA.managedAdapterVerified).toBe(false);
    expect(DEMO_EMAIL_QA.durableRateAuditVerified).toBe(false);
  });
});