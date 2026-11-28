import type {SantaBooking,SantaChild} from './santa-planner';

/** Format personal details only in private organizer views and exports. */
export function santaChildLine(child:SantaChild){
 const name=[child.nome,child.cognome].filter(Boolean).join(' ');
 const nickname=child.soprannome.trim()? ' (“'+child.soprannome.trim()+'”)':'';
 const age=child.eta===null?'': ' · '+child.eta+(child.eta===1?' anno':' anni');
 return name+nickname+age;
}
export function santaChildrenLines(b:Pick<SantaBooking,'bambini'|'bambiniDettagli'>){
 if(b.bambiniDettagli?.length)return b.bambiniDettagli.map(santaChildLine);
 return b.bambini; // Legacy requests: no fabricated surname or age.
}
export function santaAddress(b:Pick<SantaBooking,'indirizzo'|'localita'|'piano'|'dettagliAccesso'>){
 return [b.indirizzo,b.localita,b.piano?'Piano '+b.piano:'',b.dettagliAccesso??'']
  .filter(Boolean).join(' · ');
}
