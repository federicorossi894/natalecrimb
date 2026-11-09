import { useEffect, useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { testDemoEmail } from '@/lib/gift-email.functions';
import { Button } from '@/components/ui/button';
import { AuthBox } from './AuthBox';

/** Inline login keeps the gift/postcard mounted; authorization is rechecked on every server send. */
export function GiftEmailAccess({children}:{children:(authorized:boolean)=>ReactNode}) {
  const check=useServerFn(testDemoEmail);
  const [authorized,setAuthorized]=useState(false),[login,setLogin]=useState(false),[denied,setDenied]=useState(false);
  useEffect(()=>{
    let active=true;
    const verify=async()=>{
      try {
        const {data}=await supabase.auth.getSession();
        if(!data.session){if(active){setAuthorized(false);setDenied(false);}return;}
        await check({data:{}});
        if(active){setAuthorized(true);setDenied(false);setLogin(false);}
      }catch{if(active){setAuthorized(false);setDenied(true);}}
    };
    void verify();
    const {data}=supabase.auth.onAuthStateChange(()=>{setAuthorized(false);setTimeout(()=>void verify(),0);});
    return()=>{active=false;data.subscription.unsubscribe();};
  },[check]);
  return <div className="mt-8 border-t pt-6">
    <div className="mx-auto max-w-lg space-y-3">
      <h2 className="font-display text-2xl">Email di prova</h2>
      {!authorized && <><p className="text-sm text-muted-foreground">Per un visitatore normale in DEMO l’email reale è riservata ai tester. Puoi sempre usare WhatsApp o scaricare la cartolina. Solo la casella di Federico può ricevere la prova.</p><Button variant="outline" onClick={()=>setLogin(v=>!v)}>Accedi qui per la prova email</Button></>}
      {denied && <><p role="alert" className="text-sm">Questo account non è autorizzato. Usa federico.rossi@crimonza.org, non la password volontari.</p><Button variant="outline" onClick={()=>void supabase.auth.signOut()}>Esci dall’account non autorizzato</Button></>}
      {login && !authorized && !denied && <AuthBox title="Accedi: federico.rossi@crimonza.org" returnPath="/email-qa" roleName="QA email" loginOnly/>}
      {login && <p className="text-sm text-muted-foreground">Dopo l’accesso rimani qui: il regalo e la cartolina non si perdono. Nessun messaggio parte senza il tuo consenso e un clic.</p>}
    </div>
    {children(authorized)}
  </div>;
}