import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePaymentQa } from "./payment-qa-auth.server";
import { donationAccessSchema } from "./payment-policy";

const checkoutInput = donationAccessSchema.extend({provider:z.enum(["sumup","paypal"])}).strict();

export const startPaymentQa = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(data=>checkoutInput.parse(data))
  .handler(async ({data,context})=>{
    const actor=await requirePaymentQa(context);
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:existing,error:lookupError}=await supabaseAdmin.from("natale_payment_qa_2026")
      .select("donation_id,actor").eq("provider",data.provider).maybeSingle();
    if(lookupError)throw new Error("Registro collaudo non disponibile.");
    if(existing){
      if(existing.actor!==actor || existing.donation_id!==data.id)
        throw new Error("La prova di questo provider è già stata avviata. Non fare un secondo pagamento.");
      const {loadDonation}=await import("./payments.server");
      const row=await loadDonation(data.id,data.accessToken);
      if(!row.checkout_url)throw new Error("Prova già avviata: checkout da verificare. Non riprovare.");
      return {url:row.checkout_url,id:data.id};
    }
    const {error:permitError}=await supabaseAdmin.from("natale_payment_qa_2026")
      .insert({actor,provider:data.provider,donation_id:data.id});
    if(permitError)throw new Error("Prova già prenotata o registro non disponibile.");
    const {tokenHash,createProviderCheckout}=await import("./payments.server");
    const {error:dbError}=await supabaseAdmin.from("live_donations").insert({
      id:data.id,provider:data.provider,kind:"calore",amount_cents:500,
      access_hash:await tokenHash(data.accessToken),
      donor_email_requested:true,donor_email_private:"natale@crimonza.org",
      donor_email_state:"blocked",
    });
    if(dbError)throw new Error("Registro incassi non disponibile: non tentare un altro checkout.");
    const checkout=await createProviderCheckout(data.provider,data.id,500,getRequest().url,true);
    const {error:saveError}=await supabaseAdmin.from("live_donations")
      .update({provider_id:checkout.providerId,checkout_url:checkout.url,status:"pending"})
      .eq("id",data.id).eq("status","creating");
    if(saveError)throw new Error("Checkout avviato ma registrazione incompleta. Non creare un'altra donazione.");
    return {url:checkout.url,id:data.id};
  });

export const checkPaymentQa = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(data=>donationAccessSchema.strict().parse(data))
  .handler(async ({data,context})=>{
    const actor=await requirePaymentQa(context);
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:permit,error:permitError}=await supabaseAdmin.from("natale_payment_qa_2026")
      .select("provider,actor,expires_at").eq("donation_id",data.id).maybeSingle();
    if(permitError || !permit || permit.actor!==actor || new Date(permit.expires_at).getTime()<=Date.now())
      throw new Error("Prova riservata non autorizzata.");
    const {loadDonation,reconcileDonation}=await import("./payments.server");
    const row=await loadDonation(data.id,data.accessToken);
    if(row.provider!==permit.provider || row.amount_cents!==500)
      throw new Error("Importo o provider non corrispondente.");
    const result=await reconcileDonation(row,true,true);
    if(result.status!=="paid" || !result.ornamentId)
      return {status:result.status,ornamentId:null,ornaments:0,receipt:"not_sent"};
    const {count,error:countError}=await supabaseAdmin.from("live_ornaments")
      .select("id",{count:"exact",head:true}).eq("donation_id",data.id);
    if(countError || count!==1)throw new Error("Verifica della pallina fallita.");
    let receipt="blocked";
    try{
      const {processDonationEmail}=await import("./donation-email.server");
      const delivered=await processDonationEmail(data.id,"receipt",false,true);
      receipt=delivered.state;
    }catch{receipt="review";}
    return {status:"paid",ornamentId:result.ornamentId,ornaments:count,receipt};
  });

export const paymentQaSummary = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(data=>z.object({}).strict().parse(data))
  .handler(async ({context})=>{
    const actor=await requirePaymentQa(context);
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:items,error}=await supabaseAdmin.from("natale_payment_qa_2026")
      .select("provider,donation_id").eq("actor",actor);
    if(error)throw new Error("Registro collaudo non disponibile.");
    const out=[];
    for(const q of items??[]){
      const {data:don,error:dError}=await supabaseAdmin.from("live_donations")
        .select("status,settlement_state,donor_email_state,gift_email_state")
        .eq("id",q.donation_id).maybeSingle();
      if(dError)throw new Error("Lettura del pagamento non disponibile.");
      const {count,error:oError}=await supabaseAdmin.from("live_ornaments")
        .select("id",{count:"exact",head:true}).eq("donation_id",q.donation_id);
      if(oError)throw new Error("Lettura pallina non disponibile.");
      out.push({provider:q.provider,id:q.donation_id,status:don?.status??"creating",
        settlement:don?.settlement_state??"unknown",
        receipt:don?.donor_email_state??"not_requested",
        christmas:don?.gift_email_state??"not_requested",ornaments:count??0});
    }
    return out;
  });
