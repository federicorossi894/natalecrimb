import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import { officialEmailReady } from "@/lib/email-readiness";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
/** One managed callback per paid gift, not a bulk dispatcher. No schedule is registered yet. */
export const Route = createFileRoute("/api/public/christmas-gift-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const text = await request.text();
        if (text.length > 256) return new Response("Invalid request", { status: 400 });
        const result = z
          .object({ donationId: z.string().uuid() })
          .strict()
          .safeParse(
            (() => {
              try {
                return JSON.parse(text);
              } catch {
                return null;
              }
            })(),
          );
        if (!result.success) return new Response("Invalid request", { status: 400 });
        if (CAMPAIGN.demo || !officialEmailReady())
          return Response.json({ state: "blocked", reason: "official_sender_not_configured" });
        const { processDonationEmail } = await import("@/lib/donation-email.server");
        return Response.json(await processDonationEmail(result.data.donationId, "gift"));
      },
    },
  },
});
