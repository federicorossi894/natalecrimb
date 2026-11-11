// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  DEMO_EMAIL_QA,
  runDemoEmailQa,
  type QaPorts,
  qaRawMessage,
  sendGmailQa,
} from "@/lib/demo-email-qa.server";

function ports(): QaPorts {
  let claimed = false;
  return {
    authorized: true,
    demo: true,
    senderVerified: true,
    enabled: true,
    claim: vi.fn(async () => {
      if (claimed) return null;
      claimed = true;
      return "mock-attempt";
    }),
    send: vi.fn(async () => ({ state: "accepted" as const })),
    finish: vi.fn(async () => {}),
  };
}
describe("Manual DEMO QA, mocked delivery only", () => {
  it("uses only the exact owner-confirmed server destination", async () => {
    const p = ports();
    await runDemoEmailQa(p);
    expect(p.send).toHaveBeenCalledWith("natale@crimonza.org", "mock-attempt");
  });
  it("ordinary visitors and volunteers cannot claim or send", async () => {
    const p = ports();
    p.authorized = false;
    await expect(runDemoEmailQa(p)).rejects.toThrow("riservata");
    expect(p.claim).not.toHaveBeenCalled();
    expect(p.send).not.toHaveBeenCalled();
  });
  it.each(["senderVerified", "enabled", "demo"] as const)(
    "missing %s blocks before claim or send",
    async (key) => {
      const p = ports();
      p[key] = false;
      expect((await runDemoEmailQa(p)).state).toBe("unavailable");
      expect(p.claim).not.toHaveBeenCalled();
      expect(p.send).not.toHaveBeenCalled();
    },
  );
  it("concurrent attempts require a single durable claim and audit result", async () => {
    const p = ports();
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => runDemoEmailQa(p)));
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(outcomes.filter((v) => v.state === "rate_limited")).toHaveLength(5);
    expect(p.finish).toHaveBeenCalledWith("mock-attempt", { state: "accepted" });
  });
  it("definite refusal is audited, not automatically retried", async () => {
    const p = ports();
    p.send = vi.fn(async () => ({ state: "failed" as const, status: 403 }));
    expect((await runDemoEmailQa(p)).state).toBe("failed");
    expect(p.finish).toHaveBeenCalledWith("mock-attempt", { state: "failed", status: 403 });
  });
  it("ambiguous send retains claim and reports unknown", async () => {
    const p = ports();
    p.send = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect((await runDemoEmailQa(p)).state).toBe("unknown");
    expect(p.finish).toHaveBeenCalledWith("mock-attempt", { state: "unknown" });
    expect((await runDemoEmailQa(p)).state).toBe("rate_limited");
    expect(p.send).toHaveBeenCalledTimes(1);
  });
  it("QA readiness is independent of absent official LIVE mailbox", () => {
    expect(DEMO_EMAIL_QA.sender).toBe("natale@crimonza.org");
    expect(DEMO_EMAIL_QA.enabled).toBe(true);
  });
  it.each(["receipt", "gift_now", "christmas_simulation"] as const)(
    "fixed sender and recipient for %s",
    (kind) => {
      const raw = Buffer.from(qaRawMessage(kind, "mock-id"), "base64url").toString("utf8");
      expect(raw).toContain("From: natale@crimonza.org\r\nTo: natale@crimonza.org");
      const body = Buffer.from(raw.split("\r\n\r\n")[1] ?? "", "base64").toString("utf8");
      expect(body).toContain("[DEMO — NESSUN PAGAMENTO]");
      if (kind === "christmas_simulation") expect(body).toContain("SIMULAZIONE ORARIO");
    },
  );
  it("provider acceptance is not labelled delivery", async () => {
    vi.stubEnv("GOOGLE_MAIL_API_KEY_1", "mock");
    vi.stubEnv("LOVABLE_API_KEY", "mock");
    const f = vi.fn(
      async () => new Response(JSON.stringify({ id: "mock-provider-id" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    expect(await sendGmailQa("gift_now", "mock-id")).toEqual({
      state: "accepted",
      messageId: "mock-provider-id",
      status: 200,
    });
    expect(f).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
