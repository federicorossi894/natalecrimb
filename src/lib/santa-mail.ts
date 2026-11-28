/** CRI Monza — emails della Vigilia. Tabelle e CSS inline per Gmail/iPhone.
 * I dati della famiglia non finiscono in URL pubblici, log o contenuti promozionali.
 */
import type {SantaBooking} from './santa-planner';
export const SANTA_SENDER='natale@crimonza.org';
const SITE='https://natale.crimonza.org';
const cream='#fffaf0',forest='#173d30',gold='#d9ae62',muted='#586b5f',red='#c8102e';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=(c:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(c/100);
const p=(content:string,opts='')=>'<p style="margin:0 0 18px;font:15px/1.75 Arial,Helvetica,sans-serif;color:'+forest+';'+opts+'">'+content+'</p>';
function button(label:string,href:string,color=forest){
 return '<a href="'+esc(href)+'" style="display:inline-block;background:'+color+';border-radius:12px;color:#fffaf0;padding:14px 24px;font:bold 14px Arial,Helvetica,sans-serif;text-decoration:none;text-align:center">'+label+' &rsaquo;</a>';
}
function promo(){
 const items=[
  ['🎄','Un regalo sotto l’Albero','Scopri i progetti solidali e accendi una pallina sull’Albero di Monza.',SITE+'/regali'],
  ['✨','Il Calendario dell’Avvento','Apri ogni giorno una casellina del nostro Calendario della Gentilezza.',SITE+'/calendario'],
  ['🎁','La nostra casetta di Natale','Vieni a trovarci: panettoni, sorprese e regali che fanno bene.',SITE+'/casetta'],
 ];
 return '<tr><td style="padding:20px 28px 28px;background:#f2f5ea">'+
  '<p style="margin:0 0 8px;font:bold 11px Arial;letter-spacing:2px;text-transform:uppercase;color:#9b6a29">C’è ancora tanta magia da scoprire</p>'+
  '<h2 style="margin:0 0 13px;color:'+forest+';font:normal 25px/1.25 Georgia,serif">Un Natale che fa bene a Monza.</h2>'+
  items.map(([emoji,label,description,href])=>'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 9px;border:1px solid #e2e5d7;border-radius:12px;background:#ffffff"><tr>'+
   '<td width="46" valign="middle" style="padding:12px 0 12px 13px;font-size:24px">'+emoji+'</td>'+
   '<td style="padding:11px 8px;color:'+forest+'"><a href="'+href+'" style="font:bold 14px Arial;text-decoration:none;color:'+forest+'">'+label+'</a>'+
   '<p style="margin:5px 0 0;font:12px/1.5 Arial;color:'+muted+'">'+description+'</p></td>'+
   '<td width="24" valign="middle" style="padding:12px;color:#ac874f;font-size:21px">›</td>'+
   '</tr></table>').join('')+'</td></tr>';
}
function wrap(heroLabel:string,title:string,intro:string,body:string,heroDetail?:string){
 return '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
 '<body style="margin:0;padding:0;background:#ecefe8;color:'+forest+'">'+
 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecefe8"><tr><td align="center" style="padding:18px 9px 36px">'+
 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:'+cream+';border-radius:20px;overflow:hidden">'+
 '<tr><td style="padding:15px 20px;background:#ffffff;text-align:center;border-bottom:3px solid '+red+'">'+
 '<img src="'+SITE+'/cri-emblema-email-192.png" alt="Emblema Croce Rossa" width="52" height="52" style="display:inline-block;vertical-align:middle;margin-right:9px;width:52px;height:52px;border:0"/>'+
 '<span style="display:inline-block;vertical-align:middle;text-align:left;color:'+red+';font:bold 18px/1.1 Arial,Helvetica,sans-serif">Croce Rossa Italiana<br><span style="font:normal 13px/1.5 Arial;color:'+red+'">Comitato di Monza</span></span>'+
 '</td></tr>'+
 '<tr><td style="padding:29px 27px 31px;background:'+forest+';color:#fffaf0">'+
 '<p style="margin:0 0 12px;color:'+gold+';font:bold 11px/1.5 Arial;letter-spacing:2px;text-transform:uppercase">'+heroLabel+'</p>'+
 '<h1 style="margin:0 0 14px;font:normal 34px/1.13 Georgia,Times,serif;color:#fffaf0">'+title+'</h1>'+
 '<p style="margin:0;font:15px/1.6 Arial,Helvetica,sans-serif;color:#e9efe7">'+intro+'</p>'+
 (heroDetail?'<p style="margin:17px 0 0;font:bold 18px Arial;color:'+gold+'">'+heroDetail+'</p>':'')+
 '<p style="margin:19px 0 0;font:24px/1 Arial;color:'+gold+';letter-spacing:8px" aria-hidden="true">✦ ✧ ✦</p>'+
 '</td></tr>'+
 '<tr><td style="padding:27px 28px 13px">'+body+'</td></tr>'+
 promo()+
 '<tr><td style="background:'+forest+';text-align:center;padding:22px 25px;color:#e0eadd">'+
 '<p style="margin:0 0 6px;font:13px/1.5 Arial;color:#fffaf0">Con affetto, gli aiutanti di Babbo Natale<br>Volontari della Croce Rossa Italiana · Comitato di Monza</p>'+
 '<p style="margin:0;font:12px/1.5 Arial"><a href="'+SITE+'" style="color:'+gold+';text-decoration:none">natale.crimonza.org</a> · <a href="mailto:'+SANTA_SENDER+'" style="color:'+gold+';text-decoration:none">'+SANTA_SENDER+'</a></p>'+
 '</td></tr></table></td></tr></table></body></html>';
}
export function santaRequestEmail(b:Pick<SantaBooking,'nome'|'quotaOffertaCents'>){
 const body=
 p('Ciao <strong>'+esc(b.nome)+'</strong>, la tua richiesta per una visita di Babbo Natale a domicilio nella sera del <strong>24 dicembre</strong> è arrivata ai nostri aiutanti!')+
 '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5edd7;border-radius:14px;margin:0 0 23px"><tr><td style="padding:18px 19px;border-left:5px solid #bc8b39">'+
 '<p style="margin:0 0 7px;font:bold 18px/1.4 Georgia,serif;color:'+forest+'">Richiesta ricevuta, sorpresa in preparazione!</p>'+
 '<p style="margin:0;font:14px/1.6 Arial;color:'+forest+'">La visita <strong>non è ancora confermata</strong>. Riceverai una seconda email con la conferma, l’orario e le istruzioni per il pagamento.</p>'+
 '</td></tr></table>'+
 p('Le visite sono previste indicativamente <strong>dalle 19:00 a mezzanotte</strong>. L’offerta libera che hai scelto è di <strong>'+money(b.quotaOffertaCents)+'</strong>.')+
 p('<strong>Nessun pagamento adesso.</strong> Il contributo andrà versato in anticipo solo dopo la conferma del servizio. Ti suggeriremo il pagamento direttamente sul sito (PayPal o carta e, se disponibili, Apple Pay e Google Pay); resterà possibile il bonifico.')+
 p('Un piccolo segreto: la sera della Vigilia tieni i regali già incartati <strong>fuori dalla porta</strong> poco prima dell’arrivo. Babbo Natale e i suoi aiutanti penseranno al resto.')+
 '<p style="margin:24px 0;text-align:center">'+button('Scopri il Natale che fa bene',SITE)+'</p>';
 return {from:SANTA_SENDER,subject:'🎅 Abbiamo ricevuto la tua richiesta per Babbo Natale!',
  html:wrap('24 dicembre · Una sorpresa in arrivo','La magia comincia da qui.','Gli aiutanti di Babbo Natale si stanno preparando.',body)};
}
export function santaConfirmedEmail(b:Pick<SantaBooking,'nome'|'confirmedTime'|'indirizzo'|'localita'|'piano'|'dettagliAccesso'>,paymentUrl?:string){
 if(!b.confirmedTime)throw new Error('Non inviare conferma senza orario assegnato.');
 const address=[b.indirizzo,b.localita,b.piano?'Piano '+b.piano:'',b.dettagliAccesso??''].filter(Boolean).join(' · ');
 const safe=paymentUrl&&/^https:\/\/(natale\.crimonza\.org|id-preview--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e\.lovable\.app)\/babbo-natale\/pagamento\?token=[0-9a-f-]{36}$/.test(paymentUrl)
  ?paymentUrl:undefined;
 const body=
 p('Ciao <strong>'+esc(b.nome)+'</strong>, la visita di Babbo Natale a casa vostra è <strong>confermata</strong>!')+
 '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eef3e7;border-radius:14px;margin:0 0 21px"><tr><td style="padding:21px 18px;text-align:center">'+
 '<p style="margin:0 0 5px;font:bold 11px Arial;letter-spacing:2px;color:#68806a">IL VOSTRO ORARIO</p>'+
 '<p style="margin:0 0 8px;font:normal 37px Georgia,serif;color:'+forest+'">'+esc(b.confirmedTime)+'</p>'+
 '<p style="margin:0 0 7px;font:13px/1.6 Arial;color:'+muted+'">24 dicembre · La Vigilia<br>Orario indicativo, con possibili variazioni di circa 15 minuti.</p>'+
 '<p style="margin:0;font:13px/1.6 Arial;color:'+forest+'">'+esc(address)+'</p>'+
 '</td></tr></table>'+
 '<h2 style="margin:5px 0 10px;font:normal 23px Georgia;color:'+forest+'">Manca solo un piccolo gesto.</h2>'+
 p('Per completare la prenotazione ti chiediamo di versare <strong>in anticipo</strong> l’offerta concordata. Il modo più semplice è dal nostro sito, con PayPal o carta (e, quando disponibili, Apple Pay o Google Pay). In alternativa è possibile scegliere il bonifico.')+
 (safe?'<p style="margin:13px 0 22px;text-align:center">'+button('Completa il contributo sul sito',safe,red)+'</p>':
 p('Riceverai le istruzioni per il pagamento dai nostri organizzatori. Puoi scriverci se preferisci effettuare un bonifico.'))+
 p('<strong>Preferisci un bonifico?</strong> Rispondi a questa email per ricevere le coordinate bancarie e la causale corretta.')+
 '<div style="border-top:1px solid #e4e4d5;padding-top:18px">'+
 '<h2 style="margin:0 0 11px;font:normal 22px Georgia;color:'+forest+'">Un aiutino per Babbo Natale</h2>'+
 p('Rispondi a questa email con <strong>una foto o il testo della letterina</strong> e con <strong>l’elenco dei regali</strong> che hai preparato o acquisterai. Sarà il nostro piccolo segreto!')+
 p('Poco prima della visita lascia i regali già incartati appena fuori dalla porta: i volontari li recupereranno senza farsi notare.')+
 '</div>';
 return {from:SANTA_SENDER,subject:'🎅 La visita di Babbo Natale è confermata!',
  html:wrap('Visita confermata · Vigilia del 24 dicembre','Babbo Natale sta arrivando!','Il giro è pronto. Mancate solo voi!',body,'Alle '+esc(b.confirmedTime))};
}
