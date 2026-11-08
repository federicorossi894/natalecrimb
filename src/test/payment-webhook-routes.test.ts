import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CAMPAIGN } from '@/lib/campaign';
import { Route as Paypal } from '@/routes/api/public/paypal-webhook';
import { Route as Sumup } from '@/routes/api/public/sumup-webhook';

const mocks = vi.hoisted(() => ({ paypal: vi.fn(), sumup: vi.fn() }));
vi.mock('@/lib/payments.server', () => ({ handlePaypalWebhook: mocks.paypal, handleSumupWebhook: mocks.sumup }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
type Handler = (input: { request: Request }) => Promise<Response>;
const routes = [Paypal, Sumup].map(route => (route.options as unknown as { server: { handlers: { POST: Handler } } }).server.handlers.POST);
const request = () => new Request('https://example.test/api/public/webhook', { method: 'POST', body: '{foreign event or arbitrary garbage' });
beforeEach(() => { vi.clearAllMocks(); CAMPAIGN.demo = true; CAMPAIGN.livePayments = false; });
afterEach(() => { CAMPAIGN.demo = true; CAMPAIGN.livePayments = false; });
it('DEMO acknowledges shared-app foreign notifications without payload parsing or payment work', async () => {
  CAMPAIGN.livePayments = true; // Hard DEMO gate wins even against an inconsistent readiness value.
  for (const handler of routes) expect((await handler({ request: request() })).status).toBe(204);
  expect(mocks.paypal).not.toHaveBeenCalled(); expect(mocks.sumup).not.toHaveBeenCalled();
});
it('unready live deployment also safely acknowledges without processing', async () => {
  CAMPAIGN.demo = false;
  for (const handler of routes) expect((await handler({ request: request() })).status).toBe(204);
  expect(mocks.paypal).not.toHaveBeenCalled(); expect(mocks.sumup).not.toHaveBeenCalled();
});
it('ready live processing errors request retry, not a false acknowledgment', async () => {
  CAMPAIGN.demo = false; CAMPAIGN.livePayments = true;
  mocks.paypal.mockRejectedValue(new Error('private')); mocks.sumup.mockRejectedValue(new Error('private'));
  for (const handler of routes) {
    const response = await handler({ request: request() });
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('private');
  }
});