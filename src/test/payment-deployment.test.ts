import { describe, expect, it } from "vitest";
import { paymentOrigin, PAYPAL_WEBHOOK_EVENTS } from "@/lib/payment-deployment";
import { donationCheckoutSchema } from "@/lib/payment-policy";

describe("Actual deployment and ordinary donation boundaries", () => {
  it("uses the official custom domain for return URLs and webhook links", () => {
    expect(paymentOrigin("https://natale.crimonza.org/_serverFn/checkout")).toBe("https://natale.crimonza.org");
    expect(paymentOrigin("https://natale.crimonza.org/_serverFn/checkout", "https://natale.crimonza.org")).toBe("https://natale.crimonza.org");
  });
  it.each([
    "http://natale.crimonza.org",
    "https://natale.crimonza.org.evil.test",
    "https://natalecrimb.lovable.app",
    "https://project--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app",
    "http://natalecrimb.lovable.app",
    "https://natalecrimb.lovable.app.evil.test",
    "https://id-preview--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app",
    "https://example.test",
    "https://user:password@natalecrimb.lovable.app",
  ])("rejects unverified or impersonated origin %s", (url) => {
    expect(() => paymentOrigin(url)).toThrow();
  });
  it("cannot send callbacks to a different origin even through server configuration", () => {
    expect(() =>
      paymentOrigin(
        "https://natale.crimonza.org/start",
        "https://natalecrimb.lovable.app",
      ),
    ).toThrow();
  });
  it("includes the official order approval reversal event, separately from capture reversal", () => {
    expect(PAYPAL_WEBHOOK_EVENTS).toContain("CHECKOUT.PAYMENT-APPROVAL.REVERSED");
    expect(PAYPAL_WEBHOOK_EVENTS).toContain("PAYMENT.CAPTURE.REVERSED");
    expect(PAYPAL_WEBHOOK_EVENTS).toContain("PAYMENT.CAPTURE.REFUNDED");
  });
  it("a client QA flag never lowers the public whole-euro 5 EUR minimum", () => {
    const input = {
      provider: "paypal",
      kind: "calore",
      accessToken: "a".repeat(64),
      requestId: "00000000-0000-4000-8000-000000000001",
      qa: true,
    };
    expect(donationCheckoutSchema.safeParse({ ...input, amount: 5 }).success).toBe(true);
    for (const amount of [1, 4, 4.99, 5.01])
      expect(donationCheckoutSchema.safeParse({ ...input, amount }).success).toBe(false);
  });
});
