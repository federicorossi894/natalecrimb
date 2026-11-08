import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertGiftEmailService, type GiftEmailOutcome } from "./gift-email-policy";
import { donationAccessSchema } from "./payment-policy";
import { giftDeliverySchema, giftDeliveryTime } from "./donation-email-policy";
import { assertOfficialEmailReady } from "./email-readiness";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CAMPAIGN } from "./campaign";

/** No recipient input or side effects until sender setup and verified paid-gift ownership exist. */
export const giftEmailAvailability = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ mode: z.enum(["now", "christmas"]) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }): Promise<GiftEmailOutcome> => {
    try {
      assertGiftEmailService(data.mode);
    } catch {
      return { state: "unavailable", reason: "sender_not_configured" };
    }
    // Readiness flags alone must never turn a missing integration into success.
    return { state: "unavailable", reason: "live_service_not_implemented" };
  });

/** Feature-specific request: one owned paid donation, one expected recipient, one immutable gift. */
export const requestPaidGiftEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    donationAccessSchema.extend({ gift: giftDeliverySchema }).strict().parse(data),
  )
  .handler(async ({ data }) => {
    assertOfficialEmailReady();
    assertGiftEmailService(data.gift.mode);
    const { loadDonation } = await import("./payments.server");
    const d = await loadDonation(data.id, data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: record, error } = await supabaseAdmin
      .from("live_donations")
      .select("status,settlement_state,gift_email_state")
      .eq("id", d.id)
      .single();
    if (error || record?.status !== "paid" || record.settlement_state !== "completed")
      throw new Error("Donazione non confermata.");
    const due = giftDeliveryTime(data.gift.mode, new Date());
    const result = await supabaseAdmin
      .from("live_donations")
      .update({
        gift_email_private: data.gift.to,
        gift_email_data: { donor: data.gift.donor, toName: data.gift.toName, msg: data.gift.msg },
        gift_email_due_at: due,
        gift_email_state: "blocked",
      })
      .eq("id", d.id)
      .eq("gift_email_state", "not_requested")
      .select("id");
    if (result.error || !result.data?.length)
      throw new Error(
        "Richiesta regalo già presente o non salvata. Non è stato inviato un nuovo messaggio.",
      );
    if (due) return { state: "blocked" as const }; // Never say scheduled until a managed single-event schedule is registered.
    const { processDonationEmail } = await import("./donation-email.server");
    return processDonationEmail(d.id, "gift");
  });

/** Private opt-out on the donor's originating device. No address returned to the browser. */
export const cancelDonationEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    donationAccessSchema
      .extend({ kind: z.enum(["receipt", "gift"]) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (CAMPAIGN.demo) return { state: "cancelled" as const };
    const { loadDonation } = await import("./payments.server");
    await loadDonation(data.id, data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const field = data.kind === "receipt" ? "donor_email_state" : "gift_email_state";
    const update =
      data.kind === "receipt"
        ? {
            donor_email_requested: false,
            donor_email_private: null,
            donor_email_state: "cancelled",
          }
        : { gift_email_private: null, gift_email_data: null, gift_email_state: "cancelled" };
    const result = await supabaseAdmin
      .from("live_donations")
      .update(update)
      .eq("id", data.id)
      .in(field, ["not_requested", "blocked", "failed"])
      .select("id");
    if (result.error || !result.data?.length)
      throw new Error("Invio già preso in carico: annullamento non garantito.");
    return { state: "cancelled" as const };
  });

export const retryDonationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ id: z.string().uuid(), kind: z.enum(["receipt", "gift"]) })
      .strict()
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const allowed = await context.supabase.rpc("is_moderator");
    if (allowed.error || !allowed.data) throw new Error("Operazione riservata.");
    assertOfficialEmailReady();
    const { processDonationEmail } = await import("./donation-email.server");
    return processDonationEmail(data.id, data.kind, true);
  });

/** Read-only QA check is independent of the official LIVE mailbox gate. */
export const testDemoEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({}).strict().parse(data))
  .handler(async ({ context }) => {
    const allowed = await context.supabase.rpc("is_moderator");
    if (allowed.error || !allowed.data)
      throw new Error("Prova riservata al personale autorizzato.");
    const { gmailQaIdentity } = await import("./demo-email-qa.server");
    const identity = CAMPAIGN.demo && (await gmailQaIdentity());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const audit = await supabaseAdmin
      .from("staff_qa_attempts")
      .select("id", { count: "exact", head: true });
    return {
      ready: identity && !audit.error,
      identityVerified: identity,
      auditReady: !audit.error,
    };
  });

/** Manual staff consent, fixed three templates; never callable by public DEMO flows. */
export const sendDemoEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["receipt", "gift_now", "christmas_simulation"]),
        requestId: z.string().uuid(),
        approved: z.literal(true),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const allowed = await context.supabase.rpc("is_moderator");
    if (allowed.error || !allowed.data)
      throw new Error("Prova riservata al personale autorizzato.");
    const { DEMO_EMAIL_QA, gmailQaIdentity, runDemoEmailQa, sendGmailQa } =
      await import("./demo-email-qa.server");
    const identity = CAMPAIGN.demo && (await gmailQaIdentity());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runDemoEmailQa({
      authorized: true,
      demo: CAMPAIGN.demo,
      enabled: DEMO_EMAIL_QA.enabled,
      senderVerified: identity,
      claim: async () => {
        const r = await supabaseAdmin.rpc("claim_staff_gmail_qa", {
          p_actor: context.userId,
          p_request: data.requestId,
          p_kind: data.kind,
        });
        if (r.error) throw new Error("Registro QA non disponibile: nessun invio.");
        return r.data;
      },
      send: (_recipient, attempt) => sendGmailQa(data.kind, attempt),
      finish: async (attempt, r) => {
        const f = await supabaseAdmin.rpc("finish_staff_gmail_qa", {
          p_id: attempt,
          p_state: r.state,
          ...(r.messageId ? { p_message: r.messageId } : {}),
          ...(r.status !== undefined ? { p_status: r.status } : {}),
        });
        if (f.error)
          throw new Error(
            "Esito non registrato: non ripetere, verificare la casella e il registro.",
          );
      },
    });
  });
