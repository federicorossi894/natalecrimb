# Diagnosi QA PayPal (sola lettura) — nulla da marcare come superato

## Cosa ho verificato
- Database: QA PayPal pagata/completata con ordine e capture registrati, ricevuta donatore accettata. `webhook_verified_at` è vuoto. Email di Natale `not_requested` (nessuna programmazione).
- SumUp: webhook verificato alle 23:48:36, email regalo `not_requested`.
- Log del server: nessuna chiamata a `/api/public/paypal-webhook` nell'ultima ora, né sul sito pubblicato né sull'anteprima.

## (a) Webhook PayPal registrato e PAYPAL_WEBHOOK_ID
NON VERIFICABILE. Non ho accesso in lettura alla lista dei webhook PayPal LIVE (le credenziali PayPal sono protette e non passano dal connettore) e il valore del segreto non è leggibile nel mio ambiente.

## (b) Consegne PayPal per ordine 8RP761515L497884D / capture 6WC26235FY884804K
NON VERIFICABILE lato PayPal. Lato nostro: nessuna richiesta ricevuta → nessun esito HTTP registrato.

## (c) Perché il campo resta vuoto
Il campo si scrive solo dopo che PayPal conferma la firma (SUCCESS). Il pagamento è stato chiuso dal ritorno del browser, che non tocca quel campo. Visto che non è arrivata nessuna richiesta, le cause probabili sono, in ordine:
1. webhook non registrato sull'app LIVE, oppure con un URL diverso da `https://natale.crimonza.org/api/public/paypal-webhook`;
2. eventi `PAYMENT.CAPTURE.COMPLETED` / `CHECKOUT.ORDER.APPROVED` non abilitati;
3. consegna di PayPal in ritardo o in coda.
Se invece la richiesta arrivasse con un ID diverso, la verifica fallirebbe e il server risponderebbe 503. Non risulta nessun 503.

## (d) Cosa manca per chiudere la QA
1. Federico apre PayPal Developer → app LIVE → Webhooks e verifica URL esatto, eventi e che l'ID corrisponda a PAYPAL_WEBHOOK_ID. Poi controlla «Webhook events» per quel capture e guarda lo stato della consegna e il codice HTTP.
2. Usa «Resend» sull'evento; dopo serve una nuova lettura per vedere `webhook_verified_at` compilato.
3. Email regalo immediata (SumUp): non provata (`not_requested`).
4. Programmazione Natale (PayPal): non provata (`gift_email_due_at` vuoto).
5. TV/telefono: nessuna prova in questa diagnosi. Solo 1 pallina live registrata per PayPal.
