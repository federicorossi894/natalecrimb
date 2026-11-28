/** CRI Monza — Babbo Natale. The same template is used in demo and LIVE.
 * Delivery is restricted on the server (demo mails only to invited testers).
 */
import type {SantaBooking} from './santa-planner';
export const SANTA_SENDER='natale@crimonza.org';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const euro=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
const url='https://natale.crimonza.org';
function pill(label:string,href:string){
 return '<a href="'+href+'" style="display:block;padding:12px 16px;margin:8px 0;border:1px solid #d6e0d5;border-radius:13px;color:#174835;text-decoration:none;font-weight:bold">'+label+' &rsaquo;</a>';
}
function promo(){
 return '<div style="margin-top:30px;padding:22px;border-radius:18px;background:#f3f7f0">'+
 '<h2 style="font:normal 23px Georgia,serif;margin:0 0 9px;color:#173d30">Nel frattempo, il Natale continua…</h2>'+
 '<p style="margin:0 0 14px;line-height:1.6">Anche un piccolo gesto può accendere un sorriso. Scopri il nostro <strong>Natale che fa bene</strong>!</p>'+
 pill('Fai un regalo solidale e accendi una pallina sull’Albero di Monza',url+'/regali')+
 pill('Guarda i regali e le palline sull’Albero di Monza',url+'/albero')+
 pill('Apri le caselline del Calendario dell’Avvento: il Calendario della Gentilezza',url+'/calendario')+
 pill('Vieni a trovarci alla casetta e scegli panettoni e regali solidali',url+'/casetta')+
 '</div>';
}
function wrap(body:string){
 return '<!doctype html><html lang="it"><head><meta charset="utf-8"></head>'+
 '<body style="margin:0;padding:22px 10px;background:#f7f6f0;font-family:Arial,Helvetica,sans-serif;color:#173d30">'+
 '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;margin:0 auto;background:white;border-radius:20px;overflow:hidden">'+
 '<tr><td style="padding:24px 25px;text-align:center;border-bottom:1px solid #e5e7df">'+
 '<img src="'+url+'/cri-emblema-email-192.png" width="54" height="54" alt="Emblema Croce Rossa" style="display:inline-block;vertical-align:middle;margin-right:12px"/>'+
 '<span style="display:inline-block;vertical-align:middle;color:#c40000;font-size:19px;line-height:1.2;font-weight:700">Croce Rossa Italiana<br><small style="font-size:14px;font-weight:400">Comitato di Monza</small></span>'+
 '</td></tr><tr><td style="padding:32px 28px;font-size:15px;line-height:1.65">'+body+
 promo()+'</td></tr><tr><td style="padding:21px 28px;background:#f1f6ef;text-align:center;font-size:12px;line-height:1.6;color:#53695b">'+
 'Gli aiutanti di Babbo Natale · Volontari Croce Rossa Italiana – Comitato di Monza<br>'+
 '<a href="'+url+'" style="color:#174835">'+url+'</a> · <a href="mailto:natale@crimonza.org" style="color:#174835">natale@crimonza.org</a>'+
 '</td></tr></table></body></html>';
}
export function santaRequestEmail(b:Pick<SantaBooking,'nome'|'quotaOffertaCents'>){
 const subject='🎅 Abbiamo ricevuto la tua richiesta per Babbo Natale!';
 const html=wrap(
 '<p style="font-size:12px;letter-spacing:2px;color:#a87526;font-weight:bold">LA MAGIA SI AVVICINA</p>'+
 '<h1 style="font:normal 31px/1.2 Georgia,serif;color:#173d30">Ho ho ho! Gli aiutanti hanno ricevuto la tua richiesta.</h1>'+
 '<p>Ciao <strong>'+esc(b.nome)+'</strong>!</p>'+
 '<p>La tua richiesta per una visita di <strong>Babbo Natale a domicilio nella sera della Vigilia, 24 dicembre</strong> è arrivata agli aiutanti della Croce Rossa Italiana – Comitato di Monza.</p>'+
 '<div style="padding:17px 19px;border-left:5px solid #ba8934;background:#fcf5e7;border-radius:0 12px 12px 0">'+
 '<strong>Abbiamo ricevuto la richiesta. La visita non è ancora confermata.</strong><br>'+
 'Stiamo organizzando le squadre di volontari. Riceverai un’altra email con la conferma e <strong>l’orario definitivo</strong> della visita.</div>'+
 '<p>La visita si svolgerà indicativamente <strong>tra le 19 e mezzanotte</strong>. L’offerta libera da te indicata è di <strong>'+euro(b.quotaOffertaCents)+'</strong>: non è un pagamento né un addebito.</p>'+
 '<p>Quando sarà il momento, ricorda di lasciare i regali <strong>già incartati fuori dalla porta</strong>, poco prima dell’arrivo della squadra. I volontari li raccoglieranno prima di bussare.</p>'+
 '<p>Per dubbi o comunicazioni scrivici a <a href="mailto:natale@crimonza.org" style="color:#174835">natale@crimonza.org</a>.</p>'+
 '<p>A presto, dagli aiutanti di Babbo Natale! 🎄</p>'
 );
 return {from:SANTA_SENDER,subject,html};
}
export function santaConfirmedEmail(b:Pick<SantaBooking,'nome'|'confirmedTime'|'indirizzo'|'localita'|'piano'|'dettagliAccesso'>){
 if(!b.confirmedTime)throw new Error('Non inviare conferma senza orario definitivo.');
 return {from:SANTA_SENDER,
  subject:'🎅 Babbo Natale arriva da voi! Visita confermata',
  html:wrap(
   '<p style="font-size:12px;letter-spacing:2px;color:#a87526;font-weight:bold">LA GRANDE SORPRESA</p>'+
   '<h1 style="font:normal 31px/1.2 Georgia,serif;color:#173d30">Babbo Natale sta arrivando!</h1>'+
   '<p>Ciao <strong>'+esc(b.nome)+'</strong>, la vostra visita per il 24 dicembre è <strong>confermata!</strong></p>'+
   '<div style="padding:18px;background:#f2f7ec;border-radius:14px;font-size:18px">'+
   '<strong>Orario definitivo: '+esc(b.confirmedTime)+'</strong><br>'+
   '<span style="font-size:14px">Indirizzo: '+esc([
    b.indirizzo,b.localita,b.piano?'Piano '+b.piano:'',b.dettagliAccesso??''
   ].filter(Boolean).join(' · '))+'</span></div>'+
   '<p>Per rendere la sorpresa ancora più speciale, <strong>rispondi a questa email</strong> con due piccoli aiuti per i nostri volontari:</p>'+
   '<ol style="padding-left:20px;line-height:1.8">'+
   '<li><strong>La letterina a Babbo Natale:</strong> puoi inviare una fotografia della letterina, oppure scriverci il suo contenuto o i desideri principali.</li>'+
   '<li><strong>I regali che hai scelto per i bambini:</strong> mandaci un breve elenco dei doni che acquisterai o hai già preparato, così Babbo Natale saprà cosa consegnare.</li>'+
   '</ol>'+
   '<p>Queste informazioni ci aiuteranno a preparare la visita: non occorre caricarle sul sito.</p>'+
   '<p>Poco prima dell’arrivo lascia i regali già incartati appena fuori dalla porta: i nostri volontari, nei panni di Babbo Natale e degli aiutanti, li recupereranno prima di bussare.</p>'+
   '<p>Vi auguriamo una Vigilia piena di magia! Per qualsiasi comunicazione: <a href="mailto:natale@crimonza.org">natale@crimonza.org</a>.</p>'
  )};
}
