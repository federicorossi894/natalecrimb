import { onlineDedication } from "./online-gift-session";

/** Keep these limits aligned with the private email, client-session and public-tree schemas.
 * Do not silently truncate a message the donor has written.
 */
export const PRIVATE_GIFT_MESSAGE_MAX = 90;
export const PUBLIC_TREE_MESSAGE_MAX = 90;

type Draft = {
  gift: boolean;
  to: string;
  from: string;
  msg: string;
  publicFields: { dedica: string; firma: string; consent: boolean };
};

const disallowed = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;
const emailLinks = /(https?:|www\.|@|[a-z0-9-]+\.(com|it|net|org|io|ly|me|info|xyz|ru|co)\b)/iu;

export function giftDraftIssue(d: Draft): string | null {
  if (d.gift) {
    if (d.to.trim().length > 40) return "Il nome del destinatario può contenere al massimo 40 caratteri.";
    if (d.from.trim().length > 40) return "La firma privata può contenere al massimo 40 caratteri.";
    if (d.msg.trim().length > PRIVATE_GIFT_MESSAGE_MAX)
      return `La dedica per la persona può contenere al massimo ${PRIVATE_GIFT_MESSAGE_MAX} caratteri. Accorciala per continuare.`;
    if (disallowed.test(d.to) || disallowed.test(d.from) || disallowed.test(d.msg))
      return "Non inserire caratteri speciali o codici nei campi del regalo.";
    if (emailLinks.test(d.to) || emailLinks.test(d.from) || emailLinks.test(d.msg))
      return "Non inserire link o indirizzi email nei campi del regalo.";
  }
  if (d.publicFields.dedica.length > PUBLIC_TREE_MESSAGE_MAX)
    return `La dedica sull'albero può contenere al massimo ${PUBLIC_TREE_MESSAGE_MAX} caratteri.`;
  if (d.publicFields.firma.length > 40) return "La firma sull'albero può contenere al massimo 40 caratteri.";
  if (!onlineDedication.safeParse(d.publicFields).success)
    return "Controlla la dedica e la firma dell'albero: alcuni caratteri non sono ammessi.";
  return null;
}
