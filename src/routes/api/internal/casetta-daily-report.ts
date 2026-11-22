import { createFileRoute } from '@tanstack/react-router';
import { authenticateInternalScheduler } from '@/lib/internal-cron-auth.server';
import { dispatchCasettaReport } from '@/lib/casetta-report.server';

/** Cron-only. Not a public mail endpoint. Existing Supabase Vault token required. */
export const Route = createFileRoute('/api/internal/casetta-daily-report')({
  staticData: { sitemap:false },
  server:{handlers:{
    POST: async ({request})=>{
      const denied=await authenticateInternalScheduler(request);
      if(denied)return denied;
      try {
        const result=await dispatchCasettaReport();
        return Response.json(result,{headers:{'Cache-Control':'no-store'}});
      } catch {
        return Response.json({error:'Report non disponibile, verificare configurazione'},{status:503});
      }
    },
  }},
});
