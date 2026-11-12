import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthBox } from "@/components/xmas/AuthBox";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { Button } from "@/components/ui/button";
import { newDonationAccess, saveDonationAccess, loadDonationAccess } from "@/lib/payment-device";
import { startPaymentQa, checkPaymentQa, paymentQaSummary, schedulePaymentQaChristmas } from "@/lib/payment-qa.functions";
type Provider = "sumup"|"paypal";
type Summary = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof paymentQaSummary>>>>;
export const Route=createFileRoute("/collaudo-pagamenti")({
  validateSearch:z.object({d:z.string().uuid().optional(),token:z.string().optional(),PayerID:z.string().optional(),annullato:z.coerce.number().optional()}),
  head:()=>({meta:[
    {title:"Collaudo riservato · Pagamenti CRI Monza"},
    {name:"robots",content:"noindex,nofollow,noarchive"},
    {name:"referrer",content:"no-referrer"},
  ]}),
  component:PaymentQaPage,
});

function PaymentQaPage(){
  const {d}=Route.useSearch();
  const start=useServerFn(startPaymentQa);
  const check=useServerFn(checkPaymentQa);
  const summary=useServerFn(paymentQaSummary);
  const schedule=useServerFn(schedulePaymentQaChristmas);
  const [state,setState]=useState<"loading"|"signed-out"|"denied"|"allowed">("loading");
  const [items,setItems]=useState<Awaited<ReturnType<typeof summary>>>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [paid,setPaid]=useState<{status:string;ornamentId:string|null;ornaments:number;receipt:string}|null>(null);
  const checking=useRef(false);
  const refresh=async()=>{try{setItems(await summary({data:{}}));}catch{setError("Registro dei pagamenti di prova non disponibile.");}};
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const {data}=await supabase.auth.getSession();
      if(!active)return;
      if(!data.session){setState("signed-out");return;}
      try{await summary({data:{}});if(active)setState("allowed");}
      catch{if(active)setState("denied");}
    };
    void load();
    const {data}=supabase.auth.onAuthStateChange(()=>void load());
    return()=>{active=false;data.subscription.unsubscribe();};
  },[summary]);

  useEffect(()=>{if(state==="allowed")void refresh();},[state]);
  const verify=async()=>{
    if(!d || checking.current)return;
    const access=loadDonationAccess(d);
    if(!access){setError("Apri il risultato sullo stesso dispositivo usato per il checkout.");return;}
    checking.current=true;setError("");
    try{
      const r=await check({data:access});
      setPaid(r);setMessage(r.status==="paid"?"Incasso verificato presso il provider.":"Verifica ancora in corso: non effettuare un secondo pagamento.");
      if(r.status==="paid")await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Esito del pagamento da verificare.");}
    finally{checking.current=false;}
  };
  useEffect(()=>{
    if(state!=="allowed"||!d||paid?.status==="paid")return;
    void verify();
    const timer=window.setInterval(()=>void verify(),15000);
    return()=>window.clearInterval(timer);
  },[state,d,paid?.status]);

  const pay=async(provider:Provider)=>{
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const access=newDonationAccess();
      saveDonationAccess(access);
      const result=await start({data:{provider,id:access.id,accessToken:access.accessToken}});
      window.location.assign(result.url);
    }catch(e){setError(e instanceof Error?e.message:"Checkout non disponibile. Non ripetere automaticamente la donazione.");setBusy(false);await refresh();}
  };
  const queue=async()=>{
    if(!d)return;
    const access=loadDonationAccess(d);
    if(!access){setError("Credenziali del pagamento non disponibili sul dispositivo.");return;}
    setBusy(true);setError("");
    try{
      const result=await schedule({data:access});
      setMessage(`Invio programmato: ${new Intl.DateTimeFormat("it-IT",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Rome"}).format(new Date(result.dueAt))}. Non partirà prima.`);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Programmazione da verificare.");}
    finally{setBusy(false);}
  };
  const used=(p:Provider)=>items.some(i=>i.provider===p);
  return <Shell hidePiazzaPill>
    <PageHead kicker="COLLAUDO RISERVATO · INCASSI VERI" title="Due prove da 5 €"/>
    <section className="mx-auto max-w-2xl space-y-6 px-4 pb-16">
      <p className="rounded-2xl border border-gold/40 bg-secondary p-4 text-sm">
        Questa pagina è riservata al personale CRI autorizzato. Ogni provider può ricevere un solo
        pagamento reale da 5 €. Il pubblico continua a usare la DEMO. Non condividere questo accesso.
      </p>
      {state==="loading"&&<p role="status">Verifico l'autorizzazione…</p>}
      {state==="signed-out"&&<AuthBox title="Accedi con l’account CRI autorizzato" returnPath="/collaudo-pagamenti" roleName="collaudo pagamenti" loginOnly/>}
      {state==="denied"&&<div role="alert"><p>Account non autorizzato. Accedi con l'account personale CRI già usato per il collaudo delle email.</p><Button onClick={()=>void supabase.auth.signOut()} variant="outline" className="mt-3">Esci</Button></div>}
      {state==="allowed"&&<>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["sumup","paypal"] as const).map(provider=><div key={provider} className="rounded-2xl border border-gold/40 bg-secondary/50 p-5">
            <h2 className="font-display text-2xl">{provider==="sumup"?"SumUp":"PayPal"}</h2>
            <p className="my-3 text-sm">Donazione vera di <strong>5,00 €</strong> al progetto Calore.</p>
            <Button className="w-full" disabled={busy||used(provider)} onClick={()=>void pay(provider)}>
              {used(provider)?"Prova già avviata":`Paga 5 € con ${provider==="sumup"?"SumUp":"PayPal"}`}
            </Button>
          </div>)}
        </div>
        {items.length>0&&<section className="rounded-2xl border border-border p-4">
          <h2 className="font-display text-xl">Registro delle prove</h2>
          {items.map(i=><div key={i.provider} className="mt-3 border-t pt-3 text-sm">
            <strong>{i.provider==="sumup"?"SumUp":"PayPal"}</strong> · {i.status} · {i.settlement}
            <p>Palline: {i.ornaments} · Conferma email: {i.receipt} · Natale: {i.christmas}</p>
            <Button size="sm" variant="outline" className="mt-2" disabled={busy}
              onClick={()=>window.location.assign(`/collaudo-pagamenti?d=${i.id}`)}>Verifica questo pagamento</Button>
          </div>)}
        </section>}
        {d&&<section className="rounded-2xl border border-gold/40 p-5">
          <h2 className="font-display text-2xl">Risultato del pagamento</h2>
          {paid?.status==="paid"?<>
            <p className="mt-2 text-sm font-semibold">Incasso confermato dal provider: 5,00 €.</p>
            <p className="mt-2 text-sm">Palline create: {paid.ornaments} · Conferma Gmail: {paid.receipt}.</p>
            {items.some(i=>i.provider==="paypal"&&i.id===d&&i.christmas==="not_requested")&&
              <Button className="mt-4" disabled={busy} onClick={()=>void queue()}>Programma email di collaudo per Natale</Button>}
          </>:<Button className="mt-3" variant="outline" disabled={busy} onClick={()=>void verify()}>Riprova soltanto la verifica, non il pagamento</Button>}
        </section>}
        <Button variant="outline" onClick={()=>void refresh()}>Aggiorna il registro</Button>
      </>}
      {message&&<p role="status" className="text-sm text-gold">{message}</p>}
      {error&&<p role="alert" className="rounded-xl border border-red-500/30 p-3 text-sm text-primary">{error}</p>}
    </section>
  </Shell>;
}
