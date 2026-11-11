import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import { officialEmailReady } from "@/lib/email-readiness";

/** Protected scheduler: the bearer token is generated/stored only in Supabase Vault.
 * The comparison runs in a service-role-only RPC. No secret belongs in GitHub.
 */
async function authenticateChristmasScheduler(request: Request): Promise<Response | null> {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return new Response("Unauthorized", { status: 401 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const verify = await supabaseAdmin.rpc("verify_natal_cron_token", { p_token: match[1] });
  if (verify.error) return new Response("Scheduler configuration unavailable", { status: 503 });
  if (verify.data !== true) return new Response("Unauthorized", { status: 401 });
  return null;
}

export const Route = createFileRoute("/api/public/christmas-gift-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateChristmasScheduler(request);
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
