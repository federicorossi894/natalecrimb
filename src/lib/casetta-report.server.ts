/** Server-only daily casetta recap. Does not send unless recipients are configured. */
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';

const REPORT_SENDER = 'natale@crimonza.org';
const financeSchema = z.object({
  totalCents:z.number().int(),cashCents:z.number().int(),posCents:z.number().int(),transactions:z.number().int(),
});
const reportSchema = z.object({
  date:z.string(), finance:financeSchema,
  stock:z.array(z.object({id:z.string(),label:z.string(),quantity:z.number().int(),totalCents:z.number().int()})),
});
export type CasettaReport = z.infer<typeof reportSchema>;
type Audience = 'finance'|'stock';
const db = supabaseAdmin as unknown as {
  rpc:(name:string,params:Record<string,unknown>)=>PromiseLike<{data:unknown,error:{message:string}|null}>;
};
const euro = (cents:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
const b64=(s:string)=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
const base64url=(s:string)=>b64(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function recipients(audience:Audience):Promise<string[]> {
  const client=supabaseAdmin as unknown as {
    from:(table:string)=>{select:(columns:string)=>{eq:(column:string,value:string)=>PromiseLike<{data:{email:string}[]|null,error:unknown}>}};
  };
  const {data,error}=await client.from('casetta_report_recipients').select('email').eq('audience',audience);
  if(error||!data)return [];
  return [...new Set(data.map(row=>row.email))].slice(0,8);
}
export function previousRomeDate(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const read=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  const utc=Date.UTC(read('year'),read('month')-1,read('day'))-86400000;
  return new Date(utc).toISOString().slice(0,10);
}
export function reportHtml(report:CasettaReport,audience:Audience) {
  const {finance,stock}=report;
  const financial=[
    ['Totale vendite',euro(finance.totalCents)],['Contanti',euro(finance.cashCents)],
    ['POS',euro(finance.posCents)],['Operazioni',String(finance.transactions)],
  ];
  const rows=financial.map(([label,value])=>`<tr><td style="padding:11px;border-bottom:1px solid #ddd">${esc(label!)}</td><td style="padding:11px;text-align:right;border-bottom:1px solid #ddd"><b>${esc(value!)}</b></td></tr>`).join('');
  const stockRows=stock.map(p=>`<tr><td style="padding:11px;border-bottom:1px solid #ddd">${esc(p.label)}</td><td style="padding:11px;text-align:right;border-bottom:1px solid #ddd"><b>${p.quantity}</b></td></tr>`).join('');
  return `<!doctype html><html lang="it"><body style="margin:0;padding:26px;background:#f5f2e9;color:#173d30;font:16px/1.5 Arial,sans-serif">
  <div style="max-width:650px;margin:auto;padding:26px;background:#fff;border-radius:14px">
  <p style="font-size:12px;letter-spacing:1px;color:#9c172b"><b>CROCE ROSSA ITALIANA · COMITATO DI MONZA</b></p>
  <h1 style="font-size:29px">Casetta di Natale · ${audience==='finance'?'Riepilogo economico':'Vendite e prodotti'}</h1>
  <p>Giornata del <b>${esc(report.date)}</b> · Orario di riferimento: Europa/Roma.</p>
  <table style="width:100%;border-collapse:collapse">${rows}</table>
  ${audience==='stock'?`<h2 style="margin-top:28px">Prodotti venduti</h2><table style="width:100%;border-collapse:collapse">${stockRows||'<tr><td>Nessun prodotto venduto</td></tr>'}</table><p>Quantità vendute, non giacenze effettive: per calcolare il riordino servono scorte iniziali e carichi di magazzino.</p>`:''}
  <p style="margin-top:25px;font-size:13px;color:#5c6b62">Dati delle vendite registrate nella cassa digitale. Non equivalgono a un estratto conto bancario o a un documento fiscale.</p>
  </div></body></html>`;
}
async function send(audience:Audience,day:string,report:CasettaReport,to:string[]) {
  const key=process.env['GOOGLE_MAIL_API_KEY_1'],auth=process.env['LOVABLE_API_KEY'];
  if(!key||!auth)return {state:'failed' as const};
  const subject=`CRI Monza · Casetta ${day} · ${audience==='finance'?'Riepilogo amministrazione':'Vendite e riassortimento'}`;
  const raw=base64url([
    `From: CRI Monza Natale <${REPORT_SENDER}>`,
    `To: ${to.map(a=>`<${a}>`).join(', ')}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Message-ID: <casetta-${audience}-${day}@crimonza.org>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',b64(reportHtml(report,audience)),
  ].join('\r\n'));
  try{
    const response=await fetch('https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send',{
      method:'POST',headers:{Authorization:`Bearer ${auth}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'},
      body:JSON.stringify({raw}),signal:AbortSignal.timeout(15000),
    });
    if(!response.ok)return {state:response.status>=500?'unknown' as const:'failed' as const};
    const body=await response.json() as {id?:string};
    return body.id?{state:'accepted' as const,messageId:body.id}:{state:'unknown' as const};
  }catch{return {state:'unknown' as const};}
}
export async function dispatchCasettaReport(day:string=previousRomeDate()) {
  if(!/^2026-(11|12)-\d{2}$|^2027-01-0[1-6]$/.test(day)) throw new Error('Data fuori campagna');
  const {data,error}=await db.rpc('casetta_daily_report',{_day:day});
  if(error)throw new Error('Report non disponibile');
  const report=reportSchema.parse(data);
  const outcomes:Record<string,string>={};
  for(const audience of ['finance','stock'] as const){
    const to=await recipients(audience);
    if(!to.length){outcomes[audience]='not_configured';continue;}
    const claim=await db.rpc('casetta_claim_report',{_day:day,_audience:audience});
    if(claim.error){outcomes[audience]='claim_error';continue;}
    if(!claim.data){outcomes[audience]='already_processed';continue;}
    const id=z.string().uuid().parse(claim.data);
    const result=await send(audience,day,report,to);
    const finished=await db.rpc('casetta_finish_report',{
      _day:day,_audience:audience,_claim:id,_state:result.state,_message_id:'messageId' in result?result.messageId:null,
    });
    outcomes[audience]=finished.error?'needs_reconciliation':result.state;
  }
  return {day,outcomes};
}
