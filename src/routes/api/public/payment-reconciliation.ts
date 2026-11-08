import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/payment-reconciliation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const text = await request.text();
          if (text.length > 256) return new Response("Invalid request", { status: 400 });
          z.object({ kind: z.literal("payment-reconciliation") })
            .strict()
            .parse(JSON.parse(text));
        } catch {
          return new Response("Invalid request", { status: 400 });
        }
        if (CAMPAIGN.demo || !CAMPAIGN.livePayments)
          return Response.json({ skipped: "payments-disabled", checked: 0 });
        try {
          const { recoverLivePayments } = await import("@/lib/payments.server");
          return Response.json(await recoverLivePayments());
        } catch {
          return new Response("Reconciliation unavailable", { status: 503 });
        }
      },
    },
  },
});
