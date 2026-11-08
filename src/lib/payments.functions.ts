import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertCampaignAction, assertCampaignPayment } from "./campaign";
import { donationAccessSchema, donationCheckoutSchema } from "./payment-policy";
import {
  createProviderCheckout,
  liveTreeEnabled,
  loadDonation,
  reconcileDonation,
  tokenHash,
} from "./payments.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { paymentOrigin } from "./payment-deployment";

export const startDonationCheckout = createServerFn({ method: "POST" })
  .inputValidator((data) => donationCheckoutSchema.parse(data))
  .handler(async ({ data }) => {
    assertCampaignPayment(data.provider, "live");
    const requestUrl = getRequest().url;
    paymentOrigin(requestUrl, process.env["PAYMENT_PUBLIC_ORIGIN"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accessHash = await tokenHash(data.accessToken);
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("live_donations")
      .select("id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (lookupError) throw new Error("Registro non disponibile. Non ripetere il pagamento.");
    if (existing) {
      const d = await loadDonation(existing.id, data.accessToken);
      if (d.provider !== data.provider || d.amount_cents !== data.amount * 100)
        throw new Error("Richiesta non corrispondente.");
      if (!d.checkout_url) throw new Error("Richiesta in verifica. Non ripetere il pagamento.");
      return { id: d.id, url: d.checkout_url };
    }
    const { error } = await supabaseAdmin.from("live_donations").insert({
      id: data.requestId,
      access_hash: accessHash,
      provider: data.provider,
      kind: data.kind,
      amount_cents: data.amount * 100,
      donor_email_requested: data.donorConfirmation.requested,
      donor_email_private: data.donorConfirmation.requested ? data.donorConfirmation.email : null,
      donor_email_state: data.donorConfirmation.requested ? 'blocked' : 'not_requested',
    });
    if (error) throw new Error("Richiesta già in corso o non disponibile.");
    const checkout = await createProviderCheckout(
      data.provider,
      data.requestId,
      data.amount * 100,
      requestUrl,
    );
    const { error: updateError } = await supabaseAdmin
      .from("live_donations")
      .update({ provider_id: checkout.providerId, checkout_url: checkout.url, status: "pending" })
      .eq("id", data.requestId);
    if (updateError)
      throw new Error("Richiesta da verificare. Non procedere a una nuova donazione.");
    return { id: data.requestId, url: checkout.url };
  });
export const checkDonationPayment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    donationAccessSchema.extend({ capture: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data }) => {
    assertCampaignAction("onlinePayment");
    const d = await loadDonation(data.id, data.accessToken);
    assertCampaignPayment(d.provider, "live");
    return reconcileDonation(d, data.capture);
  });
/** Private paid-gift details only for the originating device; never public text. */
export const paidDonationDetails = createServerFn({ method: "POST" })
  .inputValidator((data) => donationAccessSchema.parse(data))
  .handler(async ({ data }) => {
    liveTreeEnabled();
    const d = await loadDonation(data.id, data.accessToken);
    if (d.status !== "paid") throw new Error("Pagamento non confermato.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("live_ornaments")
      .select("id,kind")
      .eq("donation_id", d.id)
      .single();
    if (error || !row) throw new Error("Addobbo non disponibile.");
    return row;
  });
export const livePublicTree = createServerFn({ method: "GET" }).handler(async () => {
  liveTreeEnabled();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("live_public_tree");
  if (error) throw new Error("Albero non disponibile.");
  return data ?? [];
});
export const updatePaidDedication = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    donationAccessSchema
      .extend({
        firma: z
          .string()
          .trim()
          .max(40)
          .regex(/^[\p{L}\p{N} .,'’!-]*$/u),
        dedica: z.string().trim().max(90),
        consent: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    liveTreeEnabled();
    const d = await loadDonation(data.id, data.accessToken);
    if (d.status !== "paid") throw new Error("Pagamento non confermato.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = data.consent && (data.firma || data.dedica) ? "pending" : "approved";
    const { data: ornament, error } = await supabaseAdmin
      .from("live_ornaments")
      .update({
        firma: data.consent ? data.firma : null,
        dedica: data.consent ? data.dedica : null,
        publish_consent: data.consent,
        status,
      })
      .eq("donation_id", d.id)
      .select("id,status")
      .single();
    if (error || !ornament) throw new Error("Dedica non aggiornata.");
    return ornament;
  });
export const liveDedicationModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        status: z.enum(["approved", "rejected"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    liveTreeEnabled();
    const { data: allowed, error: roleError } = await context.supabase.rpc("is_moderator");
    if (roleError || !allowed) throw new Error("Operazione non autorizzata.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id && data.status) {
      const { error } = await supabaseAdmin
        .from("live_ornaments")
        .update({ status: data.status })
        .eq("id", data.id);
      if (error) throw new Error("Moderazione non completata.");
    }
    const { data: rows, error } = await supabaseAdmin
      .from("live_ornaments")
      .select("id,kind,firma,dedica,status,publish_consent,created_at")
      .eq("publish_consent", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Lettura non disponibile.");
    return rows ?? [];
  });
