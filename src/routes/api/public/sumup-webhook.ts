import { createFileRoute } from "@tanstack/react-router";
import { CAMPAIGN } from "@/lib/campaign";
export const Route = createFileRoute("/api/public/sumup-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (CAMPAIGN.demo && Date.now()>=Date.parse("2026-11-16T00:00:00Z"))
          return new Response(null,{status:204});
        if (!CAMPAIGN.demo && !CAMPAIGN.livePayments) return new Response(null,{status:204});
        try {
          const { handleSumupWebhook } = await import("@/lib/payments.server");
          await handleSumupWebhook(request, CAMPAIGN.demo);
          return new Response(null, { status: 204 });
        } catch {
          return new Response("Notification not processed; retry required", { status: 503 });
        }
      },
    },
  },
});
