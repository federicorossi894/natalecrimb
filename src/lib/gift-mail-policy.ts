import { z } from 'zod';
/** No links, addresses or markup in visitor text: the email cannot be used to spread links from our sender. */
const LINKY = /(https?:|www\.|@|[a-z0-9-]+\.(com|it|net|org|io|ly|me|info|xyz|ru|co)\b|<|>)/iu;
const field = (max: number) => z.string().trim().max(max).refine(v => !/[\u0000-\u001f]/u.test(v) && !LINKY.test(v), 'Niente link o indirizzi nel testo');
export const giftMailInput = z.object({
  ornamentId: z.string().uuid(), giftRequestId: z.string().uuid(), client: z.string().uuid(),
  kind: z.enum(['receipt', 'gift_now', 'gift_christmas']),
  to: z.string().trim().toLowerCase().max(254).email('Indirizzo email non valido').refine(v => !/[\s<>,;"]/.test(v), 'Indirizzo email non valido'),
  from: field(40), toName: field(40), msg: field(90),
}).strict();
export type GiftMailInput = z.infer<typeof giftMailInput>;
