import { Body, Container, Head, Heading, Html, Preview, Text, Link } from '@react-email/components';
import type { TemplateEntry } from './registry';
export interface GiftProps { donor?: string; toName?: string; project?: string; msg?: string; ornamentId?: string; demo?: boolean }
export function GiftEmail({ donor = 'Qualcuno che ti vuole bene', toName = '', project = 'Monza', msg = '', ornamentId, demo = false }: GiftProps) {
  const href = ornamentId && /^[a-f0-9-]{36}$/i.test(ornamentId) ? `https://natalecrimb.lovable.app/albero?addobbo=${ornamentId}` : 'https://natalecrimb.lovable.app/albero';
  return <Html lang="it"><Head /><Preview>Un gesto di solidarietà dedicato a te.</Preview><Body style={body}><Container style={container}>
    <Text>Croce Rossa Italiana – Comitato di Monza</Text>
    {demo && <Heading>[DEMO — NESSUN PAGAMENTO]</Heading>}
    <Heading>{toName ? `${toName}, c’è un regalo per te` : 'C’è un regalo per te'}</Heading>
    <Text>{demo ? `${donor} sta provando una dedica per ${project}. Nessuna donazione o pagamento reale.` : `${donor} ha dedicato a te un gesto di solidarietà per ${project}.`}</Text>
    {msg && <Text>{msg}</Text>}<Link href={href}>Il tuo addobbo sull’Albero di Monza</Link>
    <Text>Con gratitudine, Croce Rossa Italiana – Comitato di Monza.</Text>
  </Container></Body></Html>;
}
export const template = { component: GiftEmail, subject: 'Un regalo per te sull’Albero di Monza · CRI Monza', displayName: 'Email regalo', previewData: { donor: 'Un donatore DEMO', toName: 'Una persona cara', project: 'Calore', demo: true } } satisfies TemplateEntry<GiftProps>;
const body = { backgroundColor: '#ffffff', color: '#232323', fontFamily: 'Arial, sans-serif' };
const container = { maxWidth: '600px', padding: '28px 24px', borderTop: '4px solid #c8102e' };