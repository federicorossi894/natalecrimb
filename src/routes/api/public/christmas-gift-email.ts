import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import { officialEmailReady } from "@/lib/email-readiness";

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
        const parsed = z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("due-gifts") }).strict(),
          z.object({ kind: z.literal("single-gift"), donationId: z.string().uuid() }).strict(),
        ]).safeParse(body);
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        if (CAMPAIGN.demo || !officialEmailReady())
          return Response.json({ state: "blocked", reason: "official_sender_not_configured" });
        const { processDueChristmasGiftEmails, processDonationEmail } = await import("@/lib/donation-email.server");
        try {
          if (parsed.data.kind === "single-gift")
            return Response.json(await processDonationEmail(parsed.data.donationId, "gift"));
          return Response.json(await processDueChristmasGiftEmails());
        } catch {
          return new Response("Consegne Natale da verificare", { status: 503 });
        }
      },
    },
  },
});
