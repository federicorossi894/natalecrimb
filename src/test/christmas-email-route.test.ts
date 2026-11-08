// @vitest-environment node
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ denied: null as Response | null, send: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (o: unknown) => ({ options: o }) }));
vi.mock('@/integrations/supabase/cron-auth', () => ({ authenticateCronRequest: async () => mocks.denied }));
vi.mock('@/lib/donation-email.server', () => ({ processDonationEmail: mocks.send }));
import { Route } from '@/routes/api/public/christmas-gift-email';
const post = (Route.options as unknown as { server: { handlers: { POST: (arg: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
it('unauthorized schedule cannot send', async () => {
  mocks.denied = new Response('Unauthorized', { status: 401 });
  expect((await post({ request: new Request('https://example.org', { method: 'POST' }) })).status).toBe(401);
  expect(mocks.send).not.toHaveBeenCalled(); mocks.denied = null;
});
it('DEMO callback is blocked and does not send even with a valid donation id', async () => {
  const r = await post({ request: new Request('https://example.org', { method: 'POST', body: JSON.stringify({ donationId: '00000000-0000-4000-8000-000000000001' }) }) });
  expect(await r.json()).toEqual({ state: 'blocked', reason: 'official_sender_not_configured' }); expect(mocks.send).not.toHaveBeenCalled();
});
it('cannot use scheduled callback as arbitrary recipient or template endpoint', async () => {
  expect((await post({ request: new Request('https://example.org', { method: 'POST', body: JSON.stringify({ donationId: '00000000-0000-4000-8000-000000000001', to: 'victim@example.org' }) }) })).status).toBe(400);
  expect(mocks.send).not.toHaveBeenCalled();
});