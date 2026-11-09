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
      {!authorized && <Button variant="outline" onClick={()=>setLogin(v=>!v)}>Email · accesso riservato</Button>}
      {denied && <><p role="alert" className="text-sm">Questo account non è autorizzato all’invio.</p><Button variant="outline" onClick={()=>void supabase.auth.signOut()}>Cambia account</Button></>}
      {login && !authorized && !denied && <AuthBox title="Accedi" returnPath="/email-qa" roleName="email" loginOnly/>}
    </div>
    {authorized && children(authorized)}
  </div>;
}