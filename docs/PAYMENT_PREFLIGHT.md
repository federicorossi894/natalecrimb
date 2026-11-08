# CRI Monza — pre-collaudo 8 novembre 2026
> Aggiornamento vincolante successivo del proprietario: **STOP pagamenti; nessuno staging/secondo progetto, rotazione o listener ora**. Il runbook storico sotto non è più un'autorizzazione operativa. Eventuale futuro test 5 €/provider sul progetto principale solo dopo autorizzazione e app PayPal dedicata dopo riunione. Vedi EMAIL_PREFLIGHT_2026-11-08.md per lo stato corrente.

## Esito effettivo
DEMO resta attiva. BASIC e ADVANCED_1/2 non sono operativi; readiness globale e webhook restano false. Nessuna pubblicazione, capture, ordine, rimborso, messaggio o modifica del progetto cena. Nessuna chiave ruotata.

## Verifica PayPal e raggiungibilità
Autenticazione server con credenziali Natale esistenti: HTTP 200; **GET /v1/notifications/webhooks: HTTP 200**. Un solo listener: `https://grangala.crimonza.org/api/public/paypal-webhook`, ID `3FS74346151620425`, eventi APPROVED, CAPTURE COMPLETED/DENIED/PENDING. Nessun listener Natale; nessun `PAYPAL_WEBHOOK_ID` nel Natale. L'ID della cena non è stato copiato.

Sonde esterne anonime, senza eventi:
- `https://id-preview--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app/api/public/paypal-webhook`: GET 401; `/pagamento`: 401. Non accessibile a PayPal come verificato.
- `https://project--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e-dev.lovable.app/api/public/paypal-webhook`: GET/OPTIONS 200 **HTML della pagina**, non risposta del callback; `/pagamento`: 403. Non è uno staging verificato.
- `https://natalecrimb.lovable.app/api/public/paypal-webhook`: GET 404; `/pagamento`: 404. Il codice corrente non è stato pubblicato.

**Non è stato registrato alcun nuovo listener su un URL inattivo.** Un 200 HTML o un test localhost non dimostrano consegna webhook. Nessuna opzione client/URL sblocca QA, BASIC o gli incassi.

## Implementato e verificato
- Callback SumUp/PayPal in DEMO o con pagamenti indisponibili: 204/no-op prima di caricare gli handler, leggere il payload, accedere ai dati o chiamare provider. Nessun retry causato da eventi della cena; l'implementazione resta in preview, non nel dominio pubblicato.
- In LIVE: firma PayPal verificata, ordine estraneo ignorato senza capture/scritture. Capture/refund senza order_id cercano solo l'identità capture già appartenente al Natale. Il payload non dimostra pagamento o rimborso.
- Supporto separato a `CHECKOUT.PAYMENT-APPROVAL.REVERSED` (ordine: GET senza capture) e `PAYMENT.CAPTURE.REVERSED`/`REFUNDED` (capture: stato server). Shape di notifiche reali di rimborso/reversal ancora da verificare operativamente; ID mancanti non autorizzano scritture.
- SumUp PAID richiede identità transazione; non usa più ID checkout come ID pagamento e rifiuta transazioni esplicitamente fallite.
- Return/cancel/return_url derivano dal dominio **effettivo della richiesta**, validato con allowlist server esatta. Preview protetta e domini contraffatti sono respinti prima di creare righe/provider checkout. `PAYMENT_PUBLIC_ORIGIN`, se valorizzato, deve coincidere con l'origine effettiva autorizzata; non è un bypass.
- PayPal capture con risposta senza custom_id: nuovo GET ordine per ottenere evidenza completa, mai riferimento inventato. Claim persistente e Request-Id stabile restano invariati.
- Ritorno pagato: dedica e cartolina locale riusano l'addobbo confermato; dati privati accessibili solo al dispositivo con token. Verifiche non sovrapposte, interrotte dopo esito terminale. Annullamento browser non è prova di mancato pagamento.
- Telefono e TV usano lo stesso albero e aggiornamento a **15 secondi** in tutte le tre modalità LIVE: test applicativo con due lettori e una pallina, non prova hardware o pagamento reale.
- Test PostgreSQL in memoria applicano le migrazioni 0010–0012: minimo, unica claim, conferma ripetuta/concorrente serializzata, unica pallina, dediche private, revoca esito, permessi anon/authenticated e recupero lease/esaurimento. Non dimostrano contesa multi-worker su Cloud; nessuna riga finta in Cloud.

## Recupero automatico
Endpoint autenticato `POST /api/public/payment-reconciliation`, corpo `{"kind":"payment-reconciliation"}`. In DEMO restituisce 200 con `skipped: payments-disabled`, zero chiamate provider; senza autenticazione 401. Il lotto corrente è max 5 record, 8 tentativi per record, lease 5 minuti e retry orario. Otto tentativi esauriti richiedono procedura manuale descritta in CAMPAIGN_MODES.

Elenco schedule vuoto. **Non attivato:** il target pubblicato non esiste, e una lavorazione con più OAuth/GET/capture da 10 secondi per chiamata non ha budget verificato per callback HTTP gestito. Non promettiamo un recupero autonomo funzionante. Alla disponibilità del target occorre collaudare durata e ridurre/dividere lavoro con meccanismo supportato prima della registrazione. Un backstop orario farebbe 24 controlli/giorno, fino a circa un'ora di ritardo, con possibile costo ricorrente Cloud. Non è stato creato un job che fallisce contro il pubblico.

## Runbook per il solo collaudo finanziario futuro
1. Rendere disponibile un'origine HTTPS **isolata e verificata**, con accesso staff server-side per checkout e TV/telefono, callback pubblici firmati e dati separati dal pubblico. Nessun override pubblico o client. Questa sessione non dispone di una preview anonima provider-accessibile verificata; non è stata pubblicata un'app alternativa né creato un ambiente a pagamento. La condivisione della preview non prova da sola il supporto webhook/ritorno senza cookie.
2. Prima del listener: su tale origine verificare GET salute del callback specifico e POST firmato provider in ambiente isolato, return `/pagamento`, `/albero`, `/albero-live`. Solo dopo aggiungere **un nuovo** PayPal webhook senza toccare quello gala; salvare il nuovo ID in `PAYPAL_WEBHOOK_ID`. Eventi da controllare contro catalogo API: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED/PENDING/DENIED, CHECKOUT.PAYMENT-APPROVAL.REVERSED, PAYMENT.CAPTURE.REVERSED/REFUNDED. SumUp riceve il callback per singolo checkout via return_url: nessuna registrazione globale.
3. Coordinare rotazione chiavi compromesse in **entrambi** i progetti e verifica sola autenticazione, senza interrompere gala. Non revocare unilateralmente le chiavi condivise.
4. Con esplicita autorizzazione finanziaria, testare **5 EUR per provider**: non esiste un bypass 1 EUR sicuro/isolato in questa versione. Mantenere pubblico DEMO, usare conti/dispositivi autorizzati e stessa logica dei tre livelli. Non dichiarare pronto BASIC prima di questo risultato.
5. Telefono A crea una sola donazione; attendere evidenza provider/capture server, quindi una sola pallina. Telefono B e TV sull'origine isolata devono leggere stesso ID/conteggio entro un ciclo di 15s, persistenza dopo ricarica e dedica non pubblica prima di consenso/moderazione. Replay e cancellazione non creano una seconda pallina. Nessuna ricevuta fiscale inventata.
6. Validare tempi del recupero e attivare il backstop autenticato solo sul target verificato. Readiness pubblica e ACTIVE_CAMPAIGN_MODE restano separatamente soggetti ad autorizzazione; non cambiarli come parte del collaudo.

## Tre dipendenze residue, non una promessa di «solo pagamento finale»
1. **Origine di collaudo isolata raggiungibile**, accesso staff e callback/return verificati; quindi listener Natale e recupero schedulato con budget validato. Le sonde hanno provato che gli indirizzi attuali non bastano.
2. **Rotazione coordinata delle credenziali condivise** prima dell'uso pubblico, senza interrompere gala.
3. **Collaudo finanziario autorizzato 5 EUR SumUp + 5 EUR PayPal e verifica due telefoni/TV.** I mock non dimostrano incasso reale.

## Verifiche registrate
Suite: **232 test in 21 file**, 37 aggiuntivi rispetto ai 195 precedenti. Lint dei file modificati: zero errori; compilazione automatica OK. Browser DEMO desktop e 390px: checkout SumUp/PayPal simulato, nessuna chiamata provider, nessun errore pagina/overflow; callback locali 204, recupero anonimo 401. Cloud readonly: zero donazioni e zero palline LIVE. Uniche chiamate finanziarie esterne: OAuth per poter leggere il catalogo listener, poi GET LIST; nessuna operazione di incasso.