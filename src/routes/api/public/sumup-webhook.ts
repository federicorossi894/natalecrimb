import { createFileRoute } from '@tanstack/react-router';
import { CAMPAIGN } from '@/lib/campaign';
export const Route = createFileRoute('/api/public/sumup-webhook')({
  server: { handlers: { POST: async ({ request }) => {
    if (!CAMPAIGN.livePayments) return new Response('Payments disabled', { status: 503 });
    try {
      const { handleSumupWebhook } = await import('@/lib/payments.server');
      await handleSumupWebhook(request);
      return new Response(null, { status: 204 });
    } catch { return new Response('Notification not verified', { status: 400 }); }
  } } },
});