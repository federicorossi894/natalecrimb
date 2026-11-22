import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';
const SENDER='natale@crimonza.org';
const FINANCE='amministrazione@crimonza.org';
const STOCK='Michela.cirla@crimonza.org';
const finance=z.object({totalCents:z.number().int(),cashCents:z.number().int(),posCents:z.number().int(),transactions:z.number().int()});
const reportSchema=z.object({
 date:z.string(),finance,cumulativeCents:z.number().int(),
 stock:z.array(z.object({id:z.string(),label:z.string(),quantity:z.number().int(),totalCents:z.number().int()})),
 hourly:z.array(z.object({hour:z.number().int(),todayCents:z.number().int(),averageCents:z.number().int()})),
 daily:z.array(z.object({date:z.string(),totalCents:z.number().int()})),
});
const receiptSchema=z.object({
 id:z.string().uuid(),claim:z.string().uuid(),email:z.string().email(),totalCents:z.number().int(),
 createdAt:z.string(),items:z.array(z.object({label:z.string(),quantity:z.number().int(),totalCents:z.number().int()})),
});
export type CasettaReport=z.infer<typeof reportSchema>;
type Audience='finance'|'stock';
type Delivery={state:'accepted'|'failed'|'unknown';messageId?:string};
const db=supabaseAdmin as unknown as {
 rpc:(name:string,params:Record<string,unknown>)=>PromiseLike<{data:unknown,error:{message:string}|null}>;
};
const euro=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
const b64=(s:string)=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
const b64url=(s:string)=>b64(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function romeClock(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',
  day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=(key:string)=>parts.find(p=>p.type===key)?.value??'';
 return {date:[get('year'),get('month'),get('day')].join('-'),hour:Number(get('hour'))};
}
function frame(body:string){
 return '<!doctype html><html lang="it"><body style="margin:0;padding:24px 10px;background:#f4f1e9;font-family:Arial,sans-serif;color:#173d30">'+
 '<div style="max-width:630px;margin:0 auto;background:white;border-radius:18px;overflow:hidden">'+
 '<div style="background:#173d30;color:white;padding:24px;text-align:center">'+
 '<div style="font-size:12px;letter-spacing:1px">CROCE ROSSA ITALIANA · COMITATO DI MONZA</div>'+
 '<div style="font-size:26px;font-weight:bold;margin-top:9px">🎄 Il Natale che fa bene</div></div>'+
 '<div style="padding:24px">'+body+'</div><div style="background:#f5f2e9;padding:16px 24px;color:#56675c;font-size:12px">'+
 'Croce Rossa Italiana · Comitato di Monza · natale.crimonza.org</div></div></body></html>';
}
function moneyRows(r:CasettaReport){
 const f=r.finance;
 const pairs=[['Incasso della giornata',euro(f.totalCents)],['Contanti',euro(f.cashCents)],
 ['POS',euro(f.posCents)],['Vendite registrate',String(f.transactions)],
 ['Totale cumulativo campagna',euro(r.cumulativeCents)]];
 return pairs.map(([label,value],i)=>'<tr'+(i===0?' style="background:#e5f2e8"':'')+'>'+
 '<td style="padding:11px;border-bottom:1px solid #e4e6de">'+esc(label!)+'</td>'+
 '<td style="padding:11px;text-align:right;border-bottom:1px solid #e4e6de"><b>'+esc(value!)+'</b></td></tr>').join('');
}
function bar(value:number,max:number,color:string){
 const width=Math.max(value>0?2:0,Math.round(100*value/Math.max(max,1)));
 return '<div style="width:'+width+'%;height:11px;background:'+color+';border-radius:5px"></div>';
}
function dailyChart(r:CasettaReport){
 const max=Math.max(1,...r.daily.map(p=>p.totalCents));
 return '<h2 style="margin-top:26px;font-size:19px">Andamento ultimi 7 giorni</h2>'+
 '<table style="width:100%;border-collapse:collapse">'+r.daily.map(p=>
 '<tr><td style="padding:6px 4px;width:72px;font-size:13px">'+esc(p.date.slice(5))+'</td>'+
 '<td style="width:60%;padding:6px 5px">'+bar(p.totalCents,max,'#2c8056')+'</td>'+
 '<td style="padding:6px 4px;text-align:right;white-space:nowrap;font-size:13px"><b>'+
 euro(p.totalCents)+'</b></td></tr>').join('')+'</table>';
}
function hourlyChart(r:CasettaReport){
 const max=Math.max(1,...r.hourly.flatMap(p=>[p.todayCents,p.averageCents]));
 return '<h2 style="margin-top:26px;font-size:19px">Vendite per orario · Oggi vs media</h2>'+
 '<p style="font-size:12px;color:#647267">Verde: oggi · Beige: media delle giornate precedenti</p>'+
 '<table style="width:100%;border-collapse:collapse">'+r.hourly.map(p=>
 '<tr><td style="width:45px;font-size:12px;padding:5px 4px">'+String(p.hour).padStart(2,'0')+':00</td>'+
 '<td style="padding:5px 8px">'+bar(p.todayCents,max,'#2c8056')+'<div style="height:3px"></div>'+
 bar(p.averageCents,max,'#d5b57a')+'</td>'+
 '<td style="width:65px;text-align:right;font-size:12px;white-space:nowrap">'+euro(p.todayCents)+'</td></tr>').join('')+'</table>';
}
export function reportHtml(r:CasettaReport,audience:Audience){
 const stock=audience==='stock'?
 '<h2 style="margin-top:26px;font-size:19px">Prodotti venduti</h2>'+
 '<table style="width:100%;border-collapse:collapse">'+
 (r.stock.map(p=>'<tr><td style="padding:9px 4px;border-bottom:1px solid #e4e6de">'+esc(p.label)+
 '</td><td style="padding:9px 4px;text-align:right;border-bottom:1px solid #e4e6de"><b>'+
 p.quantity+' pz</b></td></tr>').join('')||'<tr><td>Nessuna vendita</td></tr>')+'</table>'+
 '<p style="font-size:12px;color:#647267">Quantità vendute, non giacenze di magazzino.</p>'+
 hourlyChart(r):'';
 return frame('<h1 style="font-size:25px;margin-top:0">'+(audience==='finance'?'Riepilogo economico':'Vendite e riassortimento')+
 '</h1><p>Giornata del <b>'+esc(r.date)+'</b> · Orario italiano.</p>'+
 '<table style="width:100%;border-collapse:collapse">'+moneyRows(r)+'</table>'+
 stock+dailyChart(r)+
 '<p style="margin-top:22px;font-size:12px;color:#647267">I dati della cassa non sostituiscono la riconciliazione con contanti e terminale POS.</p>');
}
export function receiptHtml(r:z.infer<typeof receiptSchema>){
 const date=new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(r.createdAt));
 const rows=r.items.map(p=>'<tr><td style="padding:9px 4px;border-bottom:1px solid #e4e6de">'+
 p.quantity+' × '+esc(p.label)+'</td><td style="padding:9px 4px;border-bottom:1px solid #e4e6de;text-align:right">'+
 euro(p.totalCents)+'</td></tr>').join('');
 return frame('<h1 style="font-size:25px;margin-top:0">Grazie per essere passato a trovarci! ❤️</h1>'+
 '<p>Con il tuo acquisto alla Casetta di Natale sostieni le attività della Croce Rossa Italiana – Comitato di Monza.</p>'+
 '<h2 style="font-size:19px">Riepilogo del tuo acquisto</h2><p>Data: '+esc(date)+'</p>'+
 '<table style="width:100%;border-collapse:collapse">'+rows+
 '<tr><td style="padding:13px 4px"><b>Totale</b></td><td style="padding:13px 4px;text-align:right"><b>'+
 euro(r.totalCents)+'</b></td></tr></table>'+
 '<p style="font-size:13px;color:#647267"><b>Conferma informativa non fiscale.</b> Questa email non è uno scontrino né una ricevuta fiscale e non attesta una donazione detraibile.</p>'+
 '<div style="margin-top:25px;padding:18px;background:#f3eee2;border-radius:12px">'+
 '<h2 style="font-size:20px;margin-top:0">La magia può continuare 🎁</h2>'+
 '<p>Scopri i nostri regali solidali online: un altro modo per fare del bene, anche a distanza.</p>'+
 '<a href="https://natale.crimonza.org/regali" style="display:inline-block;padding:13px 18px;border-radius:9px;background:#236343;color:white;text-decoration:none;font-weight:bold">Scopri i regali solidali</a></div>');
}
async function sendMail(to:string,subject:string,html:string,ref:string):Promise<Delivery>{
 const key=process.env['GOOGLE_MAIL_API_KEY_1'],auth=process.env['LOVABLE_API_KEY'];
 if(!key||!auth)return {state:'failed'};
 const raw=b64url(['From: Croce Rossa Monza Natale <'+SENDER+'>','To: <'+to+'>',
 'Subject: =?UTF-8?B?'+b64(subject)+'?=','Message-ID: <'+ref+'@crimonza.org>',
 'MIME-Version: 1.0','Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: base64','',
 b64(html)].join('\r\n'));
 try{
  const response=await fetch('https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send',{
   method:'POST',headers:{Authorization:'Bearer '+auth,'X-Connection-Api-Key':key,'Content-Type':'application/json'},
   body:JSON.stringify({raw}),signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)return {state:response.status>=500?'unknown':'failed'};
  const result=await response.json() as {id?:string};
  return result.id?{state:'accepted',messageId:result.id}:{state:'unknown'};
 }catch{return {state:'unknown'};}
}
export async function dispatchCasettaReports(){
 const {date,hour}=romeClock();
 if(hour<20)return {date,status:'before_close'};
 const {data,error}=await db.rpc('casetta_daily_report',{_day:date});
 if(error)throw new Error('Report unavailable');
 const report=reportSchema.parse(data);
 const outcomes:Record<string,string>={};
 for(const [audience,to] of [['finance',FINANCE],['stock',STOCK]] as const){
  const claim=await db.rpc('casetta_claim_report',{_day:date,_audience:audience});
  if(claim.error){outcomes[audience]='claim_failed';continue;}
  if(!claim.data){outcomes[audience]='already_processed';continue;}
  const claimId=z.string().uuid().parse(claim.data);
  const sent=await sendMail(to,'CRI Monza · Casetta '+date+' · '+
   (audience==='finance'?'Riepilogo economico':'Vendite e prodotti'),
   reportHtml(report,audience),'casetta-'+audience+'-'+date);
  const finished=await db.rpc('casetta_finish_report',{
   _day:date,_audience:audience,_claim:claimId,_state:sent.state,_message_id:sent.messageId??null,
  });
  outcomes[audience]=finished.error?'needs_review':sent.state;
 }
 return {date,outcomes};
}
export async function dispatchCasettaReceipts(){
 const {data,error}=await db.rpc('casetta_claim_receipts',{_limit:8});
 if(error)throw new Error('Receipt queue unavailable');
 const pending=z.array(receiptSchema).parse(data);
 const outcomes:Record<string,string>={};
 for(const r of pending){
  const sent=await sendMail(r.email,'Grazie dalla Casetta di Natale · Croce Rossa Monza',
   receiptHtml(r),'casetta-ricevuta-'+r.id);
  const finished=await db.rpc('casetta_finish_receipt',{
   _id:r.id,_claim:r.claim,_state:sent.state,_message_id:sent.messageId??null,
  });
  outcomes[r.id]=finished.error?'needs_review':sent.state;
 }
 return {processed:pending.length,outcomes};
}
