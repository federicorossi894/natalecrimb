import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import { officialEmailReady } from "@/lib/email-readiness";
import { authenticateInternalScheduler } from "@/lib/internal-cron-auth.server";

export const Route = createFileRoute("/api/public/christmas-gift-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateInternalScheduler(request);
        if (denied) return denied;
        const text = await request.text();
        if (text.length > 256) return new Response("Invalid request", { status: 400 });
        let body: unknown;
        try { body = JSON.parse(text); } catch { return new Response("Invalid request", { status: 400 }); }
        // No arbitrary single-donation endpoint: only the bounded DB-selected
        // due queue can initiate a Christmas email. Staff retries remain separate.
        const parsed = z.object({ kind: z.literal("due-gifts") }).strict().safeParse(body);
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        if (CAMPAIGN.demo)
          return Response.json({ state: "blocked", reason: "live_not_active" });
        if (!officialEmailReady())
          return Response.json({ state: "blocked", reason: "email_live_not_verified" });
        const { processDueChristmasGiftEmails } = await import("@/lib/donation-email.server");
        try {
          return Response.json(await processDueChristmasGiftEmails());
        } catch {
          return new Response("Consegne Natale da verificare", { status: 503 });
        }
      },
    },
  },
});
