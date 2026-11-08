import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CAMPAIGN,
  ACTIVE_CAMPAIGN_MODE,
  LIVE_READINESS,
  LIVE_PROVIDER_READINESS,
} from "@/lib/campaign";
import { Route } from "@/routes/api/public/payment-reconciliation";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), recover: vi.fn() }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: mocks.auth }));
vi.mock("@/lib/payments.server", () => ({ recoverLivePayments: mocks.recover }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
const handler = (
  Route.options as unknown as {
    server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } };
  }
).server.handlers.POST;
const run = (body = '{"kind":"payment-reconciliation"}') =>
  handler({
    request: new Request("https://example.test/api/public/payment-reconciliation", {
      method: "POST",
      body,
    }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  CAMPAIGN.demo = true;
  mocks.auth.mockResolvedValue(null);
  mocks.recover.mockResolvedValue({ checked: 0, paid: 0, manual: 0, errors: 0 });
});
afterEach(() => {
  CAMPAIGN.livePayments = false;
  CAMPAIGN.demo = true;
});

it("unauthorized calls never invoke recovery even with simulated readiness", async () => {
  CAMPAIGN.livePayments = true;
  mocks.auth.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
  expect((await run()).status).toBe(401);
  expect(mocks.recover).not.toHaveBeenCalled();
});
it("authenticated DEMO calls remain disabled", async () => {
  CAMPAIGN.livePayments = true;
  const result = await run();
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ skipped: "payments-disabled", checked: 0 });
  expect(mocks.recover).not.toHaveBeenCalled();
});
it("invalid or oversized bodies cannot invoke recovery", async () => {
  CAMPAIGN.livePayments = true;
  for (const body of [
    "{}",
    '{"kind":"other"}',
    '{"kind":"payment-reconciliation","limit":1000}',
    "x".repeat(257),
  ])
    expect((await run(body)).status).toBe(400);
  expect(mocks.recover).not.toHaveBeenCalled();
});
it("authorized simulated LIVE request invokes the bounded worker once", async () => {
  CAMPAIGN.demo = false;
  CAMPAIGN.livePayments = true;
  expect((await run()).status).toBe(200);
  expect(mocks.recover).toHaveBeenCalledTimes(1);
});
it("recovery failure requests retry without exposing internal errors", async () => {
  CAMPAIGN.demo = false;
  CAMPAIGN.livePayments = true;
  mocks.recover.mockRejectedValue(new Error("internal"));
  const result = await run();
  expect(result.status).toBe(503);
  expect(await result.text()).not.toContain("internal");
});
it("deployment mode and payment verification flags stay explicitly off", () => {
  expect(ACTIVE_CAMPAIGN_MODE).toBe("DEMO");
  expect(LIVE_READINESS.payments).toBe(false);
  expect(LIVE_PROVIDER_READINESS.sumup.webhookVerified).toBe(false);
  expect(LIVE_PROVIDER_READINESS.paypal.webhookVerified).toBe(false);
});
