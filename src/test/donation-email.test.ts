import { describe, expect, it, vi } from "vitest";
import {
  donorConfirmationSchema,
  giftDeliverySchema,
  maySendDonationEmail,
  donationEmailKey,
  giftDeliveryTime,
} from "@/lib/donation-email-policy";
import { assertCampaignDeployment, ACTIVE_CAMPAIGN_MODE } from "@/lib/campaign";
import {
  assertOfficialEmailReady,
  officialEmailReady,
  OFFICIAL_EMAIL_READINESS,
} from "@/lib/email-readiness";
import { DEMO_EMAIL_QA } from "@/lib/demo-email-qa.server";
import {
  deliverDonationEmail,
  DefiniteEmailRefusal,
  type DeliveryPorts,
} from "@/lib/donation-email-delivery";
const id = "00000000-0000-4000-8000-000000000001";
const record = { id, status: "paid", settlement_state: "completed", requested: true };
function ports(): DeliveryPorts {
  let claimed = false;
  return {
    ready: true,
    demo: false,
    claim: vi.fn(async () => {
      if (claimed) return null;
      claimed = true;
      return "claim";
    }),
    send: vi.fn(async () => ({ sent: true })),
    finish: vi.fn(async () => {}),
  };
}
describe("Separate private donor opt-in", () => {
  it("no opt-in discards any address, including invalid input", () =>
    expect(donorConfirmationSchema.parse({ requested: false, email: "invalid" })).toEqual({
      requested: false,
    }));
  it("opt-in requires an email and normalizes it", () =>
    expect(
      donorConfirmationSchema.parse({ requested: true, email: " Donor@Example.org " }),
    ).toEqual({ requested: true, email: "donor@example.org" }));
  it.each(["", "wrong", "a@", "a@b", "a@b.org\nBcc:x@y.org"])(
    "rejects invalid opted-in email %s",
    (email) =>
      expect(donorConfirmationSchema.safeParse({ requested: true, email }).success).toBe(false),
  );
  it("gift timing and recipient never alter the independent donor decision", () => {
    for (const mode of ["now", "christmas"] as const) {
      const gift = giftDeliverySchema.parse({
        mode,
        to: "gift@example.org",
        donor: "",
        toName: "",
        msg: "",
        recipientExpected: true,
      });
      expect(gift.to).toBe("gift@example.org");
      expect(donorConfirmationSchema.parse({ requested: false })).toEqual({ requested: false });
    }
  });
  it("requires recipient expectation, not implicit marketing consent", () =>
    expect(
      giftDeliverySchema.safeParse({
        mode: "now",
        to: "x@example.org",
        donor: "",
        toName: "",
        msg: "",
        recipientExpected: false,
      }).success,
    ).toBe(false));
  it("Christmas is 25 December 00:05 Rome, not the device timezone", () =>
    expect(giftDeliveryTime("christmas", new Date("2026-11-08T11:03:00Z"))).toBe(
      "2026-12-24T23:05:00.000Z",
    ));
  it("does not silently schedule into a past Christmas", () =>
    expect(() => giftDeliveryTime("christmas", new Date("2026-12-25T00:00:00Z"))).toThrow());
});
describe("Paid-only, idempotent delivery orchestration with mocked IO", () => {
  it("fake DEMO never claims or sends a receipt", async () => {
    const p = ports();
    p.demo = true;
    await deliverDonationEmail(record, "receipt", p);
    expect(p.claim).not.toHaveBeenCalled();
    expect(p.send).not.toHaveBeenCalled();
  });
  it("donor can decline without any send", async () => {
    const p = ports();
    await deliverDonationEmail({ ...record, requested: false }, "receipt", p);
    expect(p.send).not.toHaveBeenCalled();
  });
  it.each(["pending", "failed", "cancelled", "refunded"])("never sends for %s", (status) =>
    expect(maySendDonationEmail({ status, settlement_state: "completed" }, true, false)).toBe(
      false,
    ),
  );
  it.each(["denied", "reversed", "pending", "unknown"])(
    "never sends for settlement %s",
    (settlement_state) =>
      expect(maySendDonationEmail({ status: "paid", settlement_state }, true, false)).toBe(false),
  );
  it("concurrent webhook/return/refresh requests submit exactly one mocked receipt", async () => {
    const p = ports();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => deliverDonationEmail(record, "receipt", p)),
    );
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.state === "accepted")).toHaveLength(1);
    expect(p.finish).toHaveBeenCalledWith(id, "receipt", "claim", "accepted");
  });
  it("stable purpose key does not contain donor personal information", () => {
    expect(donationEmailKey(id, "receipt")).toBe(`natale:${id}:receipt:v1`);
    expect(donationEmailKey(id, "gift")).not.toBe(donationEmailKey(id, "receipt"));
  });
  it("missing sender blocks even paid donation before any claim", async () => {
    const p = ports();
    p.ready = false;
    expect((await deliverDonationEmail(record, "receipt", p)).state).toBe("blocked");
    expect(p.claim).not.toHaveBeenCalled();
  });
  it("suppression is terminal and never retried", async () => {
    const p = ports();
    p.send = vi.fn(async () => ({ sent: false, reason: "recipient_suppressed" }));
    await deliverDonationEmail(record, "receipt", p);
    await deliverDonationEmail(record, "receipt", p, true);
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(p.finish).toHaveBeenCalledWith(id, "receipt", "claim", "suppressed");
  });
  it("definite refusal is durable failed without affecting donation", async () => {
    const p = ports();
    p.send = vi.fn(async () => {
      throw new DefiniteEmailRefusal("refused");
    });
    expect((await deliverDonationEmail(record, "receipt", p)).state).toBe("failed");
    expect(p.finish).toHaveBeenCalledWith(id, "receipt", "claim", "failed");
    expect(record.status).toBe("paid");
  });
  it("ambiguous timeout keeps permanent claim instead of risking duplicate", async () => {
    const p = ports();
    p.send = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect((await deliverDonationEmail(record, "receipt", p)).state).toBe("claimed");
    expect(p.finish).not.toHaveBeenCalled();
    await deliverDonationEmail(record, "receipt", p, true);
    expect(p.send).toHaveBeenCalledTimes(1);
  });
});
describe("Official sender hard gate and protected QA", () => {
  it("DEMO remains active and can initialize without email", () => {
    expect(ACTIVE_CAMPAIGN_MODE).toBe("DEMO");
    expect(() => assertCampaignDeployment("DEMO")).not.toThrow();
  });
  it.each(["BASIC", "ADVANCED_1", "ADVANCED_2"] as const)(
    "mode-only switch to %s is rejected",
    (mode) =>
      expect(() => assertCampaignDeployment(mode)).toThrow(
        "ATTENZIONE: le email LIVE devono essere collaudate su donazioni pagate prima dell’attivazione pubblica.",
      ),
  );
  it("official LIVE sender stays unavailable independently of manual Gmail QA", () => {
    expect(officialEmailReady()).toBe(false);
    expect(DEMO_EMAIL_QA.confirmedRecipients).toEqual(["natale@crimonza.org"]);
    expect(DEMO_EMAIL_QA.enabled).toBe(true);
  });
  const ready = {
    ...OFFICIAL_EMAIL_READINESS,
    mailboxApproved: true,
    domainVerified: true,
    managedSenderConfigured: true,
    receiptImplementedAndVerified: true,
    giftNowImplementedAndVerified: true,
    giftChristmasScheduleVerified: true,
  };
  it("rejects a gala or personal sender even with all verification flags", () =>
    expect(() => assertOfficialEmailReady({ ...ready, sender: "gala@example.org" })).toThrow());
  it.each([
    "mailboxApproved",
    "domainVerified",
    "managedSenderConfigured",
    "receiptImplementedAndVerified",
    "giftNowImplementedAndVerified",
    "giftChristmasScheduleVerified",
  ] as const)("missing %s blocks LIVE", (key) =>
    expect(officialEmailReady({ ...ready, [key]: false })).toBe(false),
  );
});
