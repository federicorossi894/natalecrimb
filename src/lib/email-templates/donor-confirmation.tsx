import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
export interface DonorConfirmationProps {
  project?: string;
  amount?: string;
  date?: string;
  reference?: string;
  method?: string;
  demo?: boolean;
}
export function DonorConfirmationEmail({
  project = "Il Natale che fa bene",
  amount = "",
  date = "",
  reference = "",
  method = "",
  demo = false,
}: DonorConfirmationProps) {
  return (
    <Html lang="it">
      <Head />
      <Preview>Grazie per il tuo gesto di solidarietà per Monza.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text>Croce Rossa Italiana – Comitato di Monza</Text>
          {demo && (
            <Heading>
              [DEMO — NESSUN PAGAMENTO]
              <br />
              SIMULAZIONE, NON VALIDA COME RICEVUTA
            </Heading>
          )}
          <Heading>Grazie per la tua donazione</Heading>
          <Text>
            Il tuo gesto sostiene {project} e ciò che Croce Rossa può fare per la nostra città.
          </Text>
          <Text>
            {demo ? "Importo scelto (non incassato)" : "Importo della donazione"}: {amount}
            <br />
            Data: {date}
            <br />
            Metodo: {method}
            <br />
            Riferimento: {reference}
          </Text>
          <Link href="https://natalecrimb.lovable.app/albero">L’Albero di Monza</Link>
          <Hr />
          <Text>
            Questa è una conferma informativa, non un documento fiscale. Non attesta automaticamente
            il diritto a detrazioni o deduzioni; conserva i documenti del pagamento e verifica i
            requisiti con il tuo consulente fiscale.
          </Text>
          {demo && <Text>Nessuna transazione reale, nessun importo incassato.</Text>}
        </Container>
      </Body>
    </Html>
  );
}
export const template = {
  component: DonorConfirmationEmail,
  subject: "Conferma della tua donazione · CRI Monza",
  displayName: "Conferma donazione (informativa)",
  previewData: {
    project: "Calore",
    amount: "5,00 €",
    date: "8 novembre 2026",
    reference: "DEMO",
    method: "Simulatore",
    demo: true,
  },
} satisfies TemplateEntry<DonorConfirmationProps>;
const body = { backgroundColor: "#ffffff", color: "#232323", fontFamily: "Arial, sans-serif" };
const container = { maxWidth: "600px", padding: "28px 24px", borderTop: "4px solid #c8102e" };
