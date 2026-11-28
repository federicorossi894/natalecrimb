/** Email templates only. No send operation exists in the preview.
 * When the service opens, send via the verified natale@crimonza.org
 * connection after an authoritative booking creation and idempotent claim.
 */
import type {SantaBooking} from './santa-planner';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const euro=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
export const SANTA_SENDER='natale@crimonza.org';
function wrap(body:string){
 return '<!doctype html><html lang="it"><head><meta charset="utf-8"></head>'+
 '<body style="margin:0;padding:24px;background:#f7f6f0;font-family:Arial,Helvetica,sans-serif;color:#173d30">'+
 '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:610px;width:100%;margin:0 auto;background:white;border-radius:20px;overflow:hidden">'+
 '<tr><td style="padding:24px 25px;text-align:center;border-bottom:1px solid #e5e7df">'+
 '<img src="https://natale.crimonza.org/cri-emblema-email-192.png" width="48" height="48" alt="Croce Rossa Italiana" style="display:inline-block;vertical-align:middle;margin-right:12px"/>'+
 '<span style="display:inline-block;vertical-align:middle;color:#c40000;font-size:18px;font-weight:700">Croce Rossa Italiana<br><small style="font-size:14px;font-weight:400">Comitato di Monza</small></span>'+
 '</td></tr><tr><td style="padding:30px 28px">'+body+'</td></tr>'+
 '<tr><td style="padding:18px 28px;background:#f1f6ef;text-align:center;font-size:12px;color:#53695b">Il Natale che fa bene · Volontari della Croce Rossa Italiana, Comitato di Monza</td></tr></table></body></html>';
}
export function santaRequestEmail(b:Pick<SantaBooking,'nome'|'cognome'|'quotaOffertaCents'|'slotPreferito'>){
 const subject='🎅 Gli aiutanti di Babbo Natale hanno ricevuto la tua richiesta!';
 const html=wrap(
 '<p style="font-size:12px;letter-spacing:2px;color:#a87526">LA MAGIA SI AVVICINA</p>'+
 '<h1 style="font:normal 31px/1.2 Georgia,serif;color:#173d30">Ho ho ho! Una richiesta è arrivata al Polo Nord.</h1>'+
 '<p>Ciao <strong>'+esc(b.nome)+'</strong>,</p>'+
 '<p>gli aiutanti di Babbo Natale di Croce Rossa Monza hanno registrato la tua richiesta per la sera della <strong>Vigilia, 24 dicembre</strong>.</p>'+
 '<p style="padding:16px;border-left:4px solid #b48835;background:#f8f3e6"><strong>Attenzione:</strong> questa email conferma soltanto che abbiamo ricevuto la richiesta. <strong>La visita non è ancora prenotata né confermata.</strong></p>'+
 '<p>Stiamo organizzando le squadre e i percorsi. Se riusciremo a inserire la vostra famiglia nel giro, riceverai una seconda email dagli aiutanti di Babbo Natale con l’orario confermato.</p>'+
 '<p>Fascia preferita: <strong>'+esc(b.slotPreferito)+'</strong> · Offerta indicata: <strong>'+euro(b.quotaOffertaCents)+'</strong>.</p>'+
 '<p>L’offerta indicata non è un pagamento: <strong>non ti abbiamo addebitato nulla</strong>.</p>'+
 '<p>Se la visita verrà confermata, ricorda: i regali andranno lasciati <strong>già incartati fuori dalla porta</strong> poco prima dell’arrivo di Babbo Natale. Non serve portarli alla sede.</p>'+
 '<p>Per qualsiasi dubbio scrivici a <a href="mailto:natale@crimonza.org">natale@crimonza.org</a>.</p>'+
 '<p>Un abbraccio natalizio dagli aiutanti di Babbo Natale! 🎄</p>');
 return {from:SANTA_SENDER,subject,html};
}
export function santaConfirmedEmail(b:Pick<SantaBooking,'nome'|'quotaOffertaCents'|'slotAssegnato'|'indirizzo'|'localita'>){
 if(!b.slotAssegnato)throw new Error('Non inviare conferme senza orario assegnato.');
 return {from:SANTA_SENDER,
 subject:'🎅 Babbo Natale sta arrivando: la tua visita è confermata!',
 html:wrap(
 '<h1 style="font:normal 31px/1.2 Georgia,serif">La sorpresa è in arrivo!</h1>'+
 '<p>Ciao <strong>'+esc(b.nome)+'</strong>, abbiamo una buona notizia: la visita di Babbo Natale è stata <strong>confermata</strong> per il 24 dicembre.</p>'+
 '<p><strong>Orario indicativo:</strong> '+esc(b.slotAssegnato)+'<br><strong>Indirizzo:</strong> '+esc(b.indirizzo+', '+b.localita)+'</p>'+
 '<p>Prepara e incarta i regali, poi lasciali fuori dalla porta poco prima dell’arrivo della squadra. I nostri volontari li raccoglieranno prima di bussare.</p>'+
 '<p>Per qualsiasi domanda: <a href="mailto:natale@crimonza.org">natale@crimonza.org</a>.</p>'+
 '<p>A presto, gli aiutanti di Babbo Natale!</p>')};
}
