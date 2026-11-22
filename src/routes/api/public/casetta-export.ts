import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { casettaXlsx } from '@/lib/casetta-export-xlsx.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/** Private bearer URL emailed only to Manuela and Michela.
 * The 256-bit token expires after 7 days and is never stored in clear in DB.
 * No public file or permanent shared URL is created.
 */
const payload=z.object({
 date:z.string(),
 products:z.array(z.object({id:z.string(),label:z.string()})),
 rows:z.array(z.object({
  date:z.string(),firstName:z.string(),lastName:z.string(),amountCents:z.number().int(),
  method:z.enum(['cash','pos']),quantities:z.record(z.string(),z.number().int()),
 })),
});
export const Route=createFileRoute('/api/public/casetta-export')({
 staticData:{sitemap:false},
 server:{handlers:{
  GET:async({request})=>{
   const headers={
    'Cache-Control':'private, no-store, max-age=0',
    'Pragma':'no-cache',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'",
   };
   if(new URL(request.url).searchParams.get('health')==='1')
    return Response.json({service:'casetta-export',healthy:true},{headers});
   const token=new URL(request.url).searchParams.get('token')??'';
   if(!/^[a-f0-9]{64}$/.test(token))
    return new Response('Link non valido o scaduto.',{status:404,headers});
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
   const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   const client=supabaseAdmin as unknown as {
    rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown,error:{message:string}|null}>
   };
   const {data,error}=await client.rpc('casetta_export_sales',{_token_hash:hash});
   if(error)return new Response('Esportazione temporaneamente non disponibile.',{status:503,headers});
   if(!data)return new Response('Link scaduto o revocato.',{status:404,headers});
   const parsed=payload.safeParse(data);
   if(!parsed.success)return new Response('Errore nel file.',{status:503,headers});
   const workbook=casettaXlsx(parsed.data.rows,parsed.data.products);
   return new Response(new Uint8Array(workbook),{
    headers:{...headers,
     'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'Content-Disposition':'attachment; filename="casetta-vendite-'+parsed.data.date+'.xlsx"',
    },
   });
  },
 }},
});
