import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

export const DEMO_QA_SUBJECT = "[DEMO — NESSUN PAGAMENTO] Prova email · CRI Monza";
function DemoQaEmail() {
  return (
    <Html lang="it">
      <Head />
      <Preview>[DEMO — NESSUN PAGAMENTO] Prova manuale autorizzata.</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", padding: "28px 24px" }}>
          <Text>Croce Rossa Italiana – Comitato di Monza</Text>
          <Heading>[DEMO — NESSUN PAGAMENTO]</Heading>
          <Text>Prova manuale autorizzata dell’email della campagna Il Natale che fa bene.</Text>
          <Text>
            Nessuna donazione o transazione è stata creata. Nessun importo è stato incassato.
          </Text>
          <Text>Questo messaggio non è una ricevuta né un documento fiscale.</Text>
        </Container>
      </Body>
    </Html>
  );
}
export const template = {
  component: DemoQaEmail,
  subject: DEMO_QA_SUBJECT,
  displayName: "Prova manuale DEMO (personale autorizzato)",
  previewData: {},
} satisfies TemplateEntry;
