import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';
const SENDER='natale@crimonza.org';
const FINANCE='amministrazione@crimonza.org';
const STOCK='monza.sviluppo@lombardia.cri.it';
const AUDIT_BCC='federico.rossi@crimonza.org';
const EMAIL_LOGO_URL='https://natale.crimonza.org/cri-monza-email-v2.png';
const finance=z.object({
 totalCents:z.number().int(),cashCents:z.number().int(),posCents:z.number().int(),transactions:z.number().int(),
 preUseCents:z.number().int().default(0),preUseUnits:z.number().int().default(0),
 preUseGroups:z.number().int().default(0),unallocatedCents:z.number().int().default(0),
});
const reportSchema=z.object({
 date:z.string(),finance,cumulativeCents:z.number().int(),
 stock:z.array(z.object({id:z.string(),label:z.string(),quantity:z.number().int(),totalCents:z.number().int()})),
 hourly:z.array(z.object({hour:z.number().int(),todayCents:z.number().int(),averageCents:z.number().int()})),
 daily:z.array(z.object({date:z.string(),totalCents:z.number().int()})),
});
const receiptSchema=z.object({
 id:z.string().uuid(),claim:z.string().uuid(),email:z.string().email(),mode:z.enum(['live','test']),firstName:z.string(),totalCents:z.number().int(),
 createdAt:z.string(),items:z.array(z.object({label:z.string(),quantity:z.number().int(),totalCents:z.number().int()})),
});
const inventoryRowSchema=z.object({
 id:z.string(),label:z.string(),openingQty:z.number().int().nullable(),
 receivedToday:z.number().int(),soldToday:z.number().int(),
 availableQty:z.number().int().nullable(),thresholdQty:z.number().int(),
 status:z.enum(['unknown','ok','low','out']),preUseSoldToday:z.number().int().default(0),preUsePending:z.number().int().default(0),
});
export type CasettaInventoryRow=z.infer<typeof inventoryRowSchema>;
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
 '<div style="padding:16px 20px;background:#fefefe;text-align:center">'+
 '<a href="https://natale.crimonza.org/" style="text-decoration:none;display:block">'+
 '<img src="'+EMAIL_LOGO_URL+'" alt="Croce Rossa Italiana — Comitato di Monza" width="540" height="121" border="0" style="display:block;width:100%;max-width:540px;height:auto;margin:0 auto;border:0" />'+
 '</a>'+
 '</div>'+
 '<div style="background:#173d30;color:white;padding:24px;text-align:center">'+
 '<div style="font-size:12px;letter-spacing:1px">CROCE ROSSA ITALIANA · COMITATO DI MONZA</div>'+
 '<div style="font-size:26px;font-weight:bold;margin-top:9px">🎄 Il Natale che fa bene</div></div>'+
 '<div style="padding:24px">'+body+'</div><div style="background:#f5f2e9;padding:16px 24px;color:#56675c;font-size:12px">'+
 'Croce Rossa Italiana · Comitato di Monza · natale.crimonza.org</div></div></body></html>';
}
function moneyRows(r:CasettaReport){
 const f=r.finance;
 const pairs:Array<[string,string]>=[
 ['Incasso della giornata',euro(f.totalCents)],['Contanti',euro(f.cashCents)],
 ['POS',euro(f.posCents)],
 ...(f.preUseCents>0?[
  ['Pre-utilizzo cassa · metodo non rilevato',euro(f.preUseCents)],
  ['Articoli da registro cartaceo',String(f.preUseUnits)]
 ] as Array<[string,string]>:[]),
 ['Operazioni registrate nella cassa',String(f.transactions)],
 ['Totale cumulativo campagna',euro(r.cumulativeCents)]
];
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

function stockAlertHtml(items:CasettaInventoryRow[]){
 const critical=items.filter(p=>p.status==='out'||p.status==='low')
  .sort((a,b)=>(a.status==='out'?0:1)-(b.status==='out'?0:1));
 const missing=items.filter(p=>p.status==='unknown');
 const pending=items.filter(p=>p.preUsePending>0);
 const alerts=critical.map(p=>{
  const out=p.status==='out';
  return '<tr><td style="padding:11px 8px;border-bottom:1px solid #ead8b6"><b>'+
   esc(p.label)+'</b></td><td align="center" style="padding:11px 8px;border-bottom:1px solid #ead8b6;font-size:20px"><b>'+
   String(p.availableQty??0)+'</b></td><td style="padding:11px 8px;border-bottom:1px solid #ead8b6"><b style="color:'+
   (out?'#a02018':'#915100')+'">'+(out?'ESAURITO':'SCORTA BASSA')+
   '</b><br><span style="font-size:12px">Soglia: '+p.thresholdQty+' pz</span></td></tr>';
 }).join('');
 const top=critical.length
  ?'<div style="padding:20px;background:#fff0d7;border:3px solid #b24c19;border-radius:12px;margin:0 0 24px">'+
   '<div style="color:#8b2e16;font-size:22px;font-weight:bold">⚠️ ATTENZIONE · SCORTE DA RIASSORTIRE</div>'+
   '<p style="color:#6b3a18;font-size:14px;line-height:1.6">Verificare oggi i prodotti sotto soglia e organizzare il rifornimento.</p>'+
   '<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th align="left">Prodotto</th><th>Rimasti</th><th align="left">Priorità</th></tr></thead><tbody>'+
   alerts+'</tbody></table></div>'
  :'<div style="padding:13px;background:#eaf4e8;border-radius:9px;margin:0 0 20px;color:#225b38"><b>✓ Nessun prodotto censito sotto soglia.</b></div>';
 return top+(pending.length?
  '<div style="padding:12px 16px;background:#fff3df;border-left:4px solid #b65f19;margin-bottom:20px;font-size:13px">'+
  '<b>Pre-utilizzo cassa · scorte da riconciliare:</b> '+
  pending.map(p=>esc(p.label)+' ('+p.preUsePending+' pz)').join(', ')+
  '. Le vendite storiche sono registrate, ma non sottratte automaticamente alle giacenze del 22/11.</div>':'')+(missing.length?
  '<div style="padding:12px 16px;background:#fff8e6;border-left:4px solid #bd7b12;margin-bottom:20px;font-size:13px">'+
  '<b>Giacenze ancora da censire:</b> '+missing.map(p=>esc(p.label)).join(', ')+
  '. Per questi prodotti non è possibile stabilire se serva un riordino.</div>':'');
}

function inventoryHtml(items:CasettaInventoryRow[]){
 const low=items.filter(p=>p.status==='low').length;
 const out=items.filter(p=>p.status==='out').length;
 const unknown=items.filter(p=>p.status==='unknown').length;
 const summary=out||low
  ?'<p style="padding:12px;background:#fff0d7;border:1px solid #e9c389;border-radius:8px;color:#75451a"><b>Da controllare:</b> '+out+' prodotti esauriti, '+low+' sotto soglia.</p>'
  :'<p style="padding:12px;background:#eaf4e8;border-radius:8px;color:#2a5d3d">Nessun prodotto sotto soglia'+(unknown?' tra quelli già censiti':'')+'.</p>';
 const statusText=(p:CasettaInventoryRow)=>p.status==='unknown'?'Da censire':
   p.status==='out'?'ESAURITO':
   p.status==='low'?'SCORTA BASSA (≤ '+p.thresholdQty+')':'OK';
 const rows=items.map(p=>{
  const highlight=p.status==='out'?'#ffe4dc':p.status==='low'?'#fff0d7':'transparent';
  const qty=p.availableQty===null?'—':String(p.availableQty);
  const pending=p.preUsePending>0
   ?'<span style="display:block;font-size:11px;color:#9a5b12">Pre-utilizzo: '+p.preUsePending+' pz da riconciliare</span>':'';
  return '<tr style="background:'+highlight+'">'+
   '<td style="padding:10px 5px;border-bottom:1px solid #e4e6de">'+esc(p.label)+pending+'</td>'+
   '<td style="padding:10px 5px;text-align:center;border-bottom:1px solid #e4e6de"><b>'+qty+'</b></td>'+
   '<td style="padding:10px 5px;text-align:center;border-bottom:1px solid #e4e6de">−'+p.soldToday+' / +'+p.receivedToday+'</td>'+
   '<td style="padding:10px 5px;border-bottom:1px solid #e4e6de;font-size:12px"><b>'+esc(statusText(p))+'</b></td></tr>';
 }).join('');
 return '<h2 style="margin-top:30px;font-size:21px">📦 Magazzino · giacenze residue</h2>'+
  '<p style="color:#526557;font-size:13px;line-height:1.5">Giacenza teorica = magazzino iniziale + rifornimenti/correzioni − vendite LIVE − vendite pre-utilizzo già riconciliate. Per i prodotti senza magazzino iniziale la disponibilità resta sconosciuta. Le prove DEMO non scalano nulla.</p>'+
  summary+
  '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
  '<thead><tr style="background:#e7efe8"><th align="left" style="padding:9px 5px">Prodotto</th>'+
  '<th style="padding:9px 5px">Rimasti</th><th style="padding:9px 5px">Oggi: vend. / car.</th>'+
  '<th align="left" style="padding:9px 5px">Stato</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="4" style="padding:12px">Giacenze non ancora configurate</td></tr>')+
  '</tbody></table>'+
  (unknown?'<p style="color:#9a5b12;font-size:13px"><b>'+unknown+' prodotti ancora da censire.</b> Comunicare le quantità iniziali prima di usare questi numeri per i riordini.</p>':'')+
  '<p style="color:#647267;font-size:12px">Le soglie sono impostate inizialmente a 5 confezioni per prodotto, modificabili su richiesta. Verificare sempre con un conteggio fisico.</p>';
}

export function reportHtml(r:CasettaReport,audience:Audience,exportUrl?:string,inventory?:CasettaInventoryRow[]){
 const stock=audience==='stock'?
 '<h2 style="margin-top:26px;font-size:19px">Prodotti venduti</h2>'+
 '<table style="width:100%;border-collapse:collapse">'+
 (r.stock.map(p=>'<tr><td style="padding:9px 4px;border-bottom:1px solid #e4e6de">'+esc(p.label)+
 '</td><td style="padding:9px 4px;text-align:right;border-bottom:1px solid #e4e6de"><b>'+
 p.quantity+' pz</b></td></tr>').join('')||'<tr><td>Nessuna vendita</td></tr>')+'</table>'+
 '<p style="font-size:12px;color:#647267">Quantità vendute, non giacenze di magazzino. Le vendite cartacee prive di orario non compaiono nel grafico orario.</p>'+
 hourlyChart(r):'';
 return frame('<h1 style="font-size:25px;margin-top:0">'+(audience==='finance'?'Riepilogo economico':'Vendite e riassortimento')+
 '</h1><p>Giornata del <b>'+esc(r.date)+'</b> · Orario italiano.</p>'+
 (audience==='stock'?stockAlertHtml(inventory??[]):'')+
 '<table style="width:100%;border-collapse:collapse">'+moneyRows(r)+'</table>'+
 stock+(audience==='stock'?inventoryHtml(inventory??[]):'')+dailyChart(r)+
 (exportUrl?'<div style="margin-top:25px;padding:20px;border:1px solid #dce6d8;border-radius:12px;background:#f1f7ef;text-align:center">'+
 '<p style="margin:0 0 12px;color:#173d30;font:700 17px/1.5 Arial,sans-serif">Registro completo dei pagamenti</p>'+
 '<p style="margin:0 0 15px;color:#43594b;font:14px/1.5 Arial,sans-serif">Scarica l'Excel con vendite LIVE e pre-utilizzo cassa chiaramente distinti. Per le registrazioni cartacee del 21/11 nome, orario esatto e metodo di pagamento restano non rilevati.</p>'+
 '<a href="'+esc(exportUrl)+'" style="display:inline-block;padding:14px 20px;background:#236343;border-radius:9px;color:white;text-decoration:none;font:700 15px Arial,sans-serif">Scarica Excel vendite</a>'+
 '<p style="margin:12px 0 0;color:#65746b;font:12px/1.5 Arial,sans-serif">Link personale valido 7 giorni. Contiene dati dei clienti: non inoltrare.</p></div>':'')+
 '<p style="margin-top:22px;font-size:12px;color:#647267">I dati della cassa non sostituiscono la riconciliazione con contanti e terminale POS.</p>');
}

/** Customer-only Christmas receipt.
 * The email uses a single, compact PNG lockup generated from the original
 * official CRI mark with only transparent margins removed and a separate
 * Arial Regular territorial label. Avoids Gmail's inconsistent negative
 * margins and preserves alignment on mobile.
 */
export function receiptHtml(r:z.infer<typeof receiptSchema>){
 const date=new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(r.createdAt));
 const logo=EMAIL_LOGO_URL;
 const rows=r.items.map(p=>'<tr>'+
  '<td style="padding:11px 0;border-bottom:1px solid #e8e0d0;font:15px/1.45 Arial,sans-serif;color:#294738">'+
  p.quantity+' × '+esc(p.label)+'</td>'+
  '<td align="right" style="padding:11px 0;border-bottom:1px solid #e8e0d0;font:700 15px/1.45 Arial,sans-serif;color:#294738;white-space:nowrap">'+
  euro(p.totalCents)+'</td></tr>').join('');
 const demoNote=r.mode==='test'
   ?'<div style="background:#fff0c5;border:2px solid #b75b00;padding:15px;margin-bottom:18px;text-align:center;color:#6d3100;font:700 16px/1.5 Arial,sans-serif">SIMULAZIONE / DEMO — Non è una vendita reale. Nessun pagamento o acquisto è stato registrato.</div>'
   :'';
 return '<!doctype html><html lang="it"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
  '<body style="margin:0;padding:0;background:#f5f0e7;color:#203c30;font-family:Arial,sans-serif">'+
  '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">'+
  'Un grazie speciale dalla Casetta di Natale di Croce Rossa Monza. Ecco il riepilogo del tuo acquisto.'+
  '</div>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f0e7">'+
  '<tr><td align="center" style="padding:22px 12px 32px">'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">'+
  '<tr><td align="center" style="padding:18px 18px 16px;background:#ffffff">'+
  '<a href="https://natale.crimonza.org/" style="text-decoration:none;display:block">'+
 '<img src="'+logo+'" alt="Croce Rossa Italiana — Comitato di Monza" width="540" height="121" border="0" style="display:block;width:100%;max-width:540px;height:auto;border:0" />'+
 '</a>'+
  '</td></tr>'+
  '<tr><td align="center" style="padding:34px 26px 37px;background:#173d30;color:#fff9e9">'+
  '<p style="margin:0 0 14px;color:#e8ca8d;font:700 11px/1.6 Arial,sans-serif;letter-spacing:2px">✦ IL NATALE CHE FA BENE ✦</p>'+
  demoNote+
  '<h1 style="margin:0;color:#fff9e9;font:normal 37px/1.13 Georgia,serif">Grazie, '+esc(r.firstName||'davvero')+'.</h1>'+
  '<p style="margin:15px 0 0;color:#f5e8cf;font:18px/1.5 Georgia,serif">Anche un piccolo acquisto può portare<br />un po’ di calore molto lontano. ✨</p>'+
  '</td></tr>'+
  '<tr><td style="padding:31px 28px 34px">'+
  '<p style="margin:0 0 15px;color:#294738;font:19px/1.5 Georgia,serif">Che bello averti incontrato alla nostra Casetta di Natale!</p>'+
  '<p style="margin:0 0 22px;color:#43584d;font:15px/1.75 Arial,sans-serif">'+
  'Tra luci, sorrisi e piccoli doni, hai scelto di sostenere le attività della '+
  '<strong>Croce Rossa Italiana – Comitato di Monza</strong>. '+
  'È grazie a gesti come il tuo che questo Natale può fare davvero bene.</p>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf6ee;border:1px solid #e8ddc8;border-radius:12px">'+
  '<tr><td style="padding:23px 20px 18px">'+
  '<p style="margin:0 0 5px;color:#8a652e;font:700 11px/1.4 Arial,sans-serif;letter-spacing:1.5px">IL TUO ACQUISTO</p>'+
  '<p style="margin:0 0 15px;color:#607166;font:13px/1.5 Arial,sans-serif">'+esc(date)+'</p>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">'+rows+
  '<tr><td style="padding:18px 0 0;color:#173d30;font:700 18px/1.3 Arial,sans-serif">Totale</td>'+
  '<td align="right" style="padding:18px 0 0;color:#173d30;font:700 24px/1.3 Arial,sans-serif;white-space:nowrap">'+euro(r.totalCents)+'</td></tr>'+
  '</table></td></tr></table>'+
  '<p style="margin:14px 0 27px;color:#66736a;font:12px/1.65 Arial,sans-serif">'+
  '<strong>Conferma informativa non fiscale.</strong> Questo messaggio non sostituisce uno scontrino o una ricevuta fiscale '+
  'e non certifica una donazione detraibile.</p>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2e7d2;border-radius:12px">'+
  '<tr><td align="center" style="padding:25px 19px 27px">'+
  '<p style="margin:0 0 9px;color:#80602e;font:700 11px/1.4 Arial,sans-serif;letter-spacing:1.5px">UN ALTRO MODO DI FARE DEL BENE</p>'+
  '<h2 style="margin:0 0 11px;color:#234434;font:normal 25px/1.3 Georgia,serif">La magia può continuare.</h2>'+
  '<p style="margin:0 0 20px;color:#45564b;font:15px/1.65 Arial,sans-serif">'+
  'Vuoi continuare a fare del bene? Visita il nostro sito di Natale: scopri il progetto, i regali solidali e come sostenere le attività di Croce Rossa Monza.</p>'+
  '<a href="https://natale.crimonza.org/" style="display:inline-block;padding:14px 22px;border-radius:9px;background:#236343;color:#ffffff;font:700 15px/1.4 Arial,sans-serif;text-decoration:none">Scopri il Natale che fa bene 🎄</a>'+
  '</td></tr></table>'+
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;background:#f4f7ed;border:1px solid #dde8d7;border-radius:12px">'+
  '<tr><td align="center" style="padding:23px 20px 26px">'+
  '<p style="margin:0 0 8px;color:#617b55;font:700 11px/1.4 Arial,sans-serif;letter-spacing:1.2px">UN PICCOLO GESTO OGNI GIORNO</p>'+
  '<h2 style="margin:0 0 10px;color:#234434;font:normal 24px/1.3 Georgia,serif">Il Calendario della Gentilezza ✨</h2>'+
  '<p style="margin:0 0 19px;color:#45564b;font:15px/1.65 Arial,sans-serif">Ogni giorno una nuova occasione per regalare un sorriso: scopri il nostro Calendario della Gentilezza e porta un po’ di magia anche fuori dalla Casetta.</p>'+
  '<a href="https://natale.crimonza.org/calendario" style="display:inline-block;padding:13px 20px;border-radius:9px;background:#e6eedc;border:1px solid #a1b99e;color:#173d30;font:700 15px/1.4 Arial,sans-serif;text-decoration:none">Apri il Calendario della Gentilezza</a>'+
  '</td></tr></table>'+
  '<p style="margin:27px 0 0;text-align:center;color:#234434;font:italic 19px/1.5 Georgia,serif">Ti auguriamo un Natale pieno di piccoli gesti belli.</p>'+
  '<p style="margin:8px 0 0;text-align:center;color:#53685a;font:14px/1.5 Arial,sans-serif">I volontari di Croce Rossa Monza ❤️</p>'+
  '</td></tr>'+
  '<tr><td align="center" style="padding:20px 24px;background:#f3efe6;border-top:1px solid #e8e0d2">'+
  '<p style="margin:0 0 8px;color:#526557;font:12px/1.5 Arial,sans-serif">Croce Rossa Italiana · Comitato di Monza</p>'+
  '<p style="margin:0 0 8px;color:#526557;font:12px/1.5 Arial,sans-serif">'+
  '<a href="https://natale.crimonza.org" style="color:#236343">natale.crimonza.org</a> · '+
  '<a href="https://natale.crimonza.org/privacy" style="color:#236343">Privacy</a></p>'+
  '<p style="margin:0;color:#738074;font:11px/1.5 Arial,sans-serif">Ricevi questa email perché è stato inserito il tuo indirizzo al momento dell’acquisto alla Casetta. Non è un’iscrizione a newsletter.</p>'+
  '</td></tr></table></td></tr></table></body></html>';
}

async function sendMail(to:string,subject:string,html:string,ref:string,bcc?:string):Promise<Delivery>{
 const key=process.env['GOOGLE_MAIL_API_KEY_1'],auth=process.env['LOVABLE_API_KEY'];
 if(!key||!auth)return {state:'failed'};
 const raw=b64url(['From: Croce Rossa Monza Natale <'+SENDER+'>','To: <'+to+'>',
 ...(bcc?['Bcc: <'+bcc+'>']:[]),
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
 if(hour<19)return {date,status:'before_close'};
 const {data,error}=await db.rpc('casetta_daily_report',{_day:date});
 if(error)throw new Error('Report unavailable');
 const report=reportSchema.parse(data);
 const outcomes:Record<string,string>={};
 for(const [audience,to] of [['finance',FINANCE],['stock',STOCK]] as const){
  const claim=await db.rpc('casetta_claim_report',{_day:date,_audience:audience});
  if(claim.error){outcomes[audience]='claim_failed';continue;}
  if(!claim.data){outcomes[audience]='already_processed';continue;}
  const claimId=z.string().uuid().parse(claim.data);
  // A separate 256-bit bearer token for each internal recipient, SHA-256 only in DB.
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const issued=await db.rpc('casetta_create_export',{_token_hash:tokenHash,_day:date,_audience:audience});
  if(issued.error||issued.data!==true){
   await db.rpc('casetta_finish_report',{_day:date,_audience:audience,_claim:claimId,_state:'failed',_message_id:null});
   outcomes[audience]='export_unavailable';continue;
  }
  let inventory:CasettaInventoryRow[]|undefined;
  if(audience==='stock'){
   const snapshot=await db.rpc('casetta_inventory_snapshot',{_day:date});
   const parsed=z.array(inventoryRowSchema).safeParse(snapshot.data);
   if(snapshot.error||!parsed.success){
    await db.rpc('casetta_finish_report',{_day:date,_audience:audience,_claim:claimId,_state:'failed',_message_id:null});
    outcomes[audience]='inventory_unavailable';continue;
   }
   inventory=parsed.data;
  }
  const exportUrl='https://natale.crimonza.org/api/public/casetta-export?token='+token;
  const sent=await sendMail(to,'CRI Monza · Casetta '+date+' · '+
   (audience==='finance'?'Riepilogo economico':'Vendite e prodotti'),
   reportHtml(report,audience,exportUrl,inventory),'casetta-'+audience+'-'+date,audience==='stock'?AUDIT_BCC:undefined);
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
  const sent=await sendMail(r.email,(r.mode==='test'?'[DEMO] ':'')+'Grazie dalla Casetta di Natale · Croce Rossa Monza',
   receiptHtml(r),'casetta-ricevuta-'+r.id);
  const finished=await db.rpc('casetta_finish_receipt',{
   _id:r.id,_claim:r.claim,_state:sent.state,_message_id:sent.messageId??null,
  });
  outcomes[r.id]=finished.error?'needs_review':sent.state;
 }
 return {processed:pending.length,outcomes};
}
