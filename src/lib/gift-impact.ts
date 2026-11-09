import type { OrnamentKind } from './data';

/** Approved project facts shared by donor thanks and email; no amount-to-object promises. */
export const GIFT_IMPACT: Record<OrnamentKind, string> = {
  calore: 'Il gesto sostiene le uscite in strada di Croce Rossa Monza: ascolto, vicinanza e beni di conforto per chi è in difficoltà, per una città che non lascia sole le persone.',
  dae: 'Il gesto sostiene la diffusione dei defibrillatori e la formazione al primo soccorso di Croce Rossa Monza, aiutando la città a essere più preparata a soccorrere.',
  prossimita: 'Il gesto sostiene il progetto dell’Unità Mobile di Prossimità, che Croce Rossa Monza intende acquistare e allestire per avvicinare i servizi alle persone più fragili della città.',
  cuore: 'Il gesto sostiene le attività sanitarie e sociali di Croce Rossa Monza dove il bisogno è più urgente, aiutando il Comitato a prendersi cura della città ogni giorno.',
};