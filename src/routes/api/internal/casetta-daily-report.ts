import { createFileRoute } from '@tanstack/react-router';
import { authenticateInternalScheduler } from '@/lib/internal-cron-auth.server';
import { dispatchCasettaReports,dispatchCasettaReceipts } from '@/lib/casetta-report.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/** Authenticated internal cron. Never a public email sending API. */
export const Route=createFileRoute('/api/internal/casetta-daily-report')({
 staticData:{sitemap:false},
 server:{handlers:{
  POST:async({request})=>{
   const denied=await authenticateInternalScheduler(request);
   if(denied)return denied;
   try{
    const {data,error}=await supabaseAdmin.rpc('casetta_catalog');
    if(error||!data)return Response.json({error:'Cassa unavailable'},{status:503});
    const catalog=data as {mode:'test'|'live'};
    if(catalog.mode!=='live')return Response.json({status:'test_mode_no_mail'});
    const receipts=await dispatchCasettaReceipts();
    const reports=await dispatchCasettaReports();
    return Response.json({receipts,reports},{headers:{'Cache-Control':'no-store'}});
   }catch{
    return Response.json({error:'Invio non disponibile: verificare il log del server'},{status:503});
   }
  },
 }},
});
