import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Shell, PageHead } from '@/components/xmas/Shell';
import { EmailQa } from '@/components/xmas/EmailQa';
import { AuthBox } from '@/components/xmas/AuthBox';
import { supabase } from '@/integrations/supabase/client';
import { testDemoEmail } from '@/lib/gift-email.functions';
import { Button } from '@/components/ui/button';
import { CAMPAIGN } from '@/lib/campaign';
export const Route=createFileRoute('/email-qa')({head:()=>({meta:!CAMPAIGN.demo ? [
  {title:'Pagina non disponibile · Il Natale che fa bene · CRI Monza'},
  {name:'description',content:'La pagina richiesta non è disponibile.'},
  {property:'og:title',content:'Pagina non disponibile · CRI Monza'},
  {property:'og:description',content:'La pagina richiesta non è disponibile.'},
  {property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},
  {name:'robots',content:'noindex,nofollow,noarchive'},
] : [
  {title:'Prove email riservate · Il Natale che fa bene · CRI Monza'},
  {name:'description',content:'Accesso autorizzato alle tre prove email DEMO, esclusivamente da e a natale@crimonza.org.'},
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
  return <Shell hidePiazzaPill><PageHead kicker="DEMO · Accesso riservato" title="Prove email · natale@crimonza.org"/><section className="mx-auto max-w-2xl px-4">
    <p className="mb-4">Le prove partono e arrivano alla casella natale@crimonza.org. Accesso solo con l’account verificato federico.rossi@crimonza.org o personale già autorizzato. Non usare la password condivisa volontari.</p>
    {state==='signed-out' && <AuthBox title="Accedi: federico.rossi@crimonza.org" returnPath="/email-qa" roleName="QA email" loginOnly/>}
    {state==='denied' && <div><p role="alert">Questo account non è autorizzato alle prove email. Nessuna email inviata.</p><p className="mt-3 text-sm text-muted-foreground">Esci e accedi con l’account CRI verificato federico.rossi@crimonza.org, non con l’account privato né con la password volontari.</p><Button className="mt-4" variant="outline" onClick={()=>void supabase.auth.signOut()}>Esci</Button></div>}
    {state==='allowed' && <EmailQa/>}
    {state==='loading' && <p>Verifica accesso…</p>}
  </section></Shell>;
}