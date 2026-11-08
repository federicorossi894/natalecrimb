import { createFileRoute } from '@tanstack/react-router';
import { CAMPAIGN } from '@/lib/campaign';
export const Route = createFileRoute('/api/public/paypal-webhook')({
  server: { handlers: { POST: async ({ request }) => {
    // Same PayPal app may deliver gala events here. Disabled deployment acknowledges
    // without reading payload, loading payment code, accessing data or calling providers.
    if (CAMPAIGN.demo || !CAMPAIGN.livePayments) return new Response(null, { status: 204 });
    try {
      const { handlePaypalWebhook } = await import('@/lib/payments.server');
      await handlePaypalWebhook(request);
      return new Response(null, { status: 204 });
    } catch { return new Response('Notification not processed; retry required', { status: 503 }); }
  } } },
});