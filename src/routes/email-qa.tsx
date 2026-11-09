import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Shell, PageHead } from '@/components/xmas/Shell';
import { EmailQa } from '@/components/xmas/EmailQa';
import { AuthBox } from '@/components/xmas/AuthBox';
import { supabase } from '@/integrations/supabase/client';
import { testDemoEmail } from '@/lib/gift-email.functions';
import { Button } from '@/components/ui/button';
export const Route=createFileRoute('/email-qa')({head:()=>({meta:[
  {title:'Prove email riservate · Il Natale che fa bene · CRI Monza'},
  {name:'description',content:'Accesso autorizzato alle tre prove email DEMO, esclusivamente da e a Federico.'},
  {property:'og:title',content:'Prove email riservate · CRI Monza'},
  {property:'og:description',content:'Tre prove DEMO protette, nessun pagamento reale.'},
  {property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}, {name:'robots',content:'noindex,nofollow'}
]}),component:EmailQaPage});
function EmailQaPage(){
  const check=useServerFn(testDemoEmail);
  const [state,setState]=useState<'loading'|'signed-out'|'denied'|'allowed'>('loading');
  useEffect(()=>{
    let active=true;
    const load=async()=>{const {data}=await supabase.auth.getSession();if(!active)return;if(!data.session){setState('signed-out');return;}try{await check({data:{}});if(active)setState('allowed');}catch{if(active)setState('denied');}};
    void load();const {data}=supabase.auth.onAuthStateChange(()=>void load());return()=>{active=false;data.subscription.unsubscribe();};
  },[check]);
  return <Shell hidePiazzaPill><PageHead kicker="DEMO · Accesso riservato" title="Prove email a Federico"/><section className="mx-auto max-w-2xl px-4">
    {state==='signed-out' && <AuthBox title="Accesso staff autorizzato" returnPath="/email-qa" roleName="moderatore"/>}
    {state==='denied' && <div><p role="alert">Sessione autentica, ma senza autorizzazione staff per le email. Nessuna email inviata.</p><p className="mt-3 text-sm text-muted-foreground">Gmail collegato non assegna permessi al tuo account del sito. Serve un accesso già autorizzato o una delega esplicita dell’amministratore; la password condivisa non concede questo accesso.</p><Button className="mt-4" variant="outline" onClick={()=>void supabase.auth.signOut()}>Esci</Button></div>}
    {state==='allowed' && <EmailQa/>}
    {state==='loading' && <p>Verifica accesso…</p>}
  </section></Shell>;
}