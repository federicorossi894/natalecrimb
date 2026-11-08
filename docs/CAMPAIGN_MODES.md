# Modalità campagna — CRI Monza

## Impostazione unica
In `src/lib/campaign.ts` cambiare **solo** `ACTIVE_CAMPAIGN_MODE` da `'DEMO'` a `'BASIC'`, `'ADVANCED_1'` oppure `'ADVANCED_2'`. Attuale: **DEMO**. Non esistono override URL, localStorage o pannelli pubblici. Il valore è compilato sia nel sito sia nelle funzioni server: una modifica richiede verifica e successiva pubblicazione esplicitamente autorizzata.

## Matrice richiesta
| Capacità | DEMO | BASIC | ADVANCED_1 | ADVANCED_2 |
|---|---|---|---|---|
| Simulatori, demo volontari, preview TV/presentazione | sì | no | no | no |
| Donazioni online reali | no | se pronte | se pronte | se pronte |
| Donazioni in presenza, QR e addobbo confermato da volontario | simulato | no | se pronto | se pronto |
| Acquisto prodotti → QR augurio | simulato | no | no | se pronto |
| Muro pubblico e TV, scrittura monouso, moderazione auguri | demo protetta | no | no | se pronto |
| Calendario, Accademia, casetta informativa, cause e TV | sì | sì | sì | sì |
| Conferma provider → addobbo persistente e crescita TV/smartphone | simulata | implementata, verifica operativa pendente | come BASIC | come BASIC |
| Dedica e cartolina WhatsApp locale | sì | sì, dopo regalo confermato | come BASIC | come BASIC |
| Email reale subito / Natale | simulata | quando servizio pronto | come BASIC | come BASIC |
| Diploma | sì | sì | sì | sì |
| Biscotto di cortesia, tap sul telefono del visitatore | esempio visibile | opzione indipendente OFF | opzione indipendente OFF | opzione indipendente OFF |
| Babbo Natale a domicilio | simulato visibile | opzione indipendente OFF | opzione indipendente OFF | opzione indipendente OFF |

**BASIC è la campagna completa e autonoma, non una versione ridotta.** Le capacità di donazione online, addobbi persistenti, dediche, cartoline, email, calendario, Accademia/diploma e TV sono richieste in tutti i livelli. Le guardie di indisponibilità attuali indicano servizi non implementati/verificati, non esclusioni da BASIC. Non vengono rimossi progetti, selettore importi o accesso al checkout. Le aggiunte dei livelli ADVANCED riguardano soltanto i flussi volontari e poi gli auguri.

## Opzioni indipendenti
In `src/lib/campaign.ts`, `CAMPAIGN_OPTIONS.santaHomeVisitsEnabled=false` nasconde in LIVE menu, sezione home e pagina `/babbo-natale`, anche con URL diretto. L'Accademia a tema Babbo Natale rimane disponibile. La DEMO conserva illustrazione, animazione e prenotazione simulata. Una futura approvazione cambia una sola opzione, ma non rende reali le prenotazioni: `OPTIONAL_SERVICE_READINESS.santaBookings` richiede servizio implementato, disponibilità/contributo confermati e gestione operativa. Tutto il codice è conservato.

`CAMPAIGN_OPTIONS.courtesyBiscuitAvailable=false` mantiene il premio indisponibile in LIVE, senza togliere giochi o diploma. DEMO mostra un ritiro simulato. Quando approvato: il volontario tocca **Biscotto ritirato** sul telefono del visitatore, nessun login/portale/QR, nessun legame con acquisti o donazioni. Il `claimedAt` resta nel localStorage esistente e il diploma resta leggibile; quel diploma non propone un secondo ritiro. **Limite:** altro telefono/browser, cancellazione o modifica dello storage possono aggirarlo; storage bloccato perde lo stato dopo la visita. Non è una verifica dell'identità né un sistema antifrode.

## Email: predisposizione e blocco esplicito
Mittente previsto **natale@crimonza.org**, casella ancora da creare. Verifica del 8 novembre 2026: nessun dominio email configurato. Non è stato creato un mittente fittizio né collegato il Gmail personale. Le regole in `gift-email-policy.ts` fissano 25 dicembre **00:05 Europe/Rome** (2026: `2026-12-24T23:05:00.000Z`), chiave di idempotenza derivata dall'evento regalo e stati unavailable/sent/scheduled/suppressed/failed. `gift-email.functions.ts` espone soltanto disponibilità senza destinatari o scritture: nega invii non pronti e non dichiara successo neppure se qualcuno altera soltanto i flag. L'EmailStudio non può completare una simulazione fuori DEMO.

**Non ancora implementati:** invio reale, registrazione della consegna differita, gestione esiti/retry e collegamento all'evento pagato. Il dominio va configurato attraverso Lovable Emails; solo dopo si può generare il sistema di template React Email e collegare l'invio fisso all'evento regalo verificato. Il servizio gestito possiede retry/suppression/unsubscribe: non creare code o tabelle email locali. Verificare il supporto alla programmazione del singolo evento prima di prometterla; non effettuare invii a liste o campagne massive. Nessuna schedulazione è stata registrata in questa sessione.

## Verifica pagamenti effettiva
### Implementazione isolata — 8 novembre 2026
Nessun pulsante Stripe/Paddle è necessario per queste API personalizzate: il precedente blocco dichiarato era errato. Credenziali esistenti riutilizzate senza stamparle o modificarle.

**Implementato:** checkout ospitato SumUp tramite connessione protetta; ordini PayPal LIVE/capture server-side idempotente; callback SumUp verificato rileggendo il checkout; verifica firma PayPal tramite API ufficiale; confronto riferimento/importo/valuta/stato finale. Il ritorno del browser non è mai una prova di pagamento.

Dati separati `live_donations` e `live_ornaments`, conferma service-only con lock di riga e UNIQUE donation_id: una sola pallina persistente. Token di accesso del telefono da 256 bit, solo hash salvato, mai inserito nell'URL; dedica modificabile solo dopo pagamento. Lettura pubblica include palline pagate, ma testo soltanto approvato e consentito. Moderazione dediche protetta dal ruolo anche in BASIC (indipendente dal muro); TV e telefono leggono lo stesso albero ogni 15 secondi.

**Stato:** DEMO attiva. `implemented=true`, `configured=true` per entrambi i provider; `liveData=true`; `payments=false` e `webhookVerified=false` finché manca verifica operativa. Tutte e tre le modalità LIVE usano il medesimo checkout verificato, non simulatori. Nessun pagamento reale, ordine reale, pubblicazione o nuova credenziale richiesta.

**Aggiornamento vincolante 8 novembre:** vedere [PAYMENT_PREFLIGHT.md](./PAYMENT_PREFLIGHT.md) per evidenze attuali, indirizzi non raggiungibili e runbook. I passi seguenti non costituiscono staging già disponibile.

**Passaggi manuali prima degli incassi:**
1. Coordinare la rotazione delle chiavi incollate in chat in Natale **e gala**, senza revocarle unilateralmente.
2. Rendere raggiungibile un'origine isolata solo con autorizzazione. SumUp riceve automaticamente return_url sull'origine effettiva validata; nessuna registrazione globale. Merchant code letto dal conto autenticato, non inventato.
3. Registrare un listener PayPal Natale solo su URL verificato raggiungibile; non riusare ID gala. Includere anche `CHECKOUT.PAYMENT-APPROVAL.REVERSED`, separato dagli eventi capture reversal/refund; salvare ID esatto in `PAYPAL_WEBHOOK_ID`. Al controllo API esiste soltanto listener gala.
4. Prova finale autorizzata ≥5 €: checkout, ritorno/capture, webhook, replay, annullamento, stessa pallina su telefono B e TV. Solo dopo aggiornare readiness globale e provider verificati e attivare la modalità richiesta. I mock non dimostrano operatività in produzione.

**Limiti residui:** nessun addebito/test provider reale; conferma SQL verificata anche con PostgreSQL in memoria, non contesa multi-worker Cloud. Recupero implementato ma non schedulato/operativo; creazioni PayPal senza ID e capture ambigue richiedono revisione manuale come sotto. Cartolina collegata al ritorno LIVE verificato; email reale resta non configurata. Cancellare lo storage perde accesso privato ma non la pallina persistente. Nessuna ricevuta fiscale inventata. Minimo 5 €, euro interi fino a 1000 €.

### Hardening pre-LIVE: capture e recupero (8 novembre 2026)
**BASIC non pronto.** DEMO attiva, `LIVE_READINESS.payments=false`, entrambi i `webhookVerified=false`. Non sono state chiamate API reali, creati ordini, letti/ruotati segreti o attivati job.

- `CHECKOUT.ORDER.APPROVED`: firma verificata tramite API ufficiale, lookup univoco provider ID, GET ordine, verifica ID/custom_id/unità unica/importo/EUR, claim SQL atomico, capture con `PayPal-Request-Id=capture-<donation UUID>`, evidenza finale e conferma SQL con una sola pallina. Browser, webhook e recupero condividono la stessa claim.
- Claim permanente: un timeout/crash non autorizza una seconda capture. Richieste concorrenti perdenti non emettono POST capture; ulteriori tentativi rileggono l'ordine. Una capture riuscita seguita da errore DB viene riconfermata da GET, senza nuovo addebito.
- Notifiche COMPLETED/PENDING/DENIED/REVERSED: rilettura capture server-to-server; stati terminali verificati anche sull'ordine. Nessuna conferma dal payload. Denied/reversed conservano traccia senza cancellare dati; la lettura dell'albero esclude transazioni segnalate denied/reversed. Rimborsi parziali e contestazioni restano una procedura amministrativa da definire, non un rimborso automatico.
- Errori webhook restituiscono 503 per consentire retry, mai un falso 204 dopo errore DB. Le chiamate provider hanno timeout 10 secondi; non vengono ritentate ciecamente.
- Recupero protetto: `POST /api/public/payment-reconciliation`, autenticazione gestita `authenticateCronRequest`, corpo esatto `{"kind":"payment-reconciliation"}`. Massimo 5 record per esecuzione, 8 tentativi per record, intervallo minimo un'ora, lease di 5 minuti e selezione atomica SKIP LOCKED; nessun checkout viene creato dal recupero.
- Per SumUp `creating` senza ID: cerca via checkout_reference; collega soltanto un risultato unico con importo/valuta/riferimento verificati. Zero/multipli/errori richiedono verifica manuale, mai una nuova creazione automatica. Per PayPal senza ID non esiste nel codice una ricerca affidabile dell'ordine: non ripetere POST create, anche se il Request-Id originario è noto (finestra di idempotenza non garantita).

**Scheduler realmente disponibile ma NON attivato:** helper gestito presente; elenco schedule letto e vuoto. L'endpoint è predisposto, non una promessa di recupero autonomo già in esecuzione. Dopo autorizzazione e verifica LIVE, registrare tramite strumenti gestiti un unico backstop orario (24 controlli/giorno, ritardo fino a circa un'ora; può aumentare i costi Cloud). Non aggiungere segreti manuali né usare URL di chiamata non autenticati. Validare prima il budget di durata del callback gestito: più letture provider possono superarlo; in tal caso ridurre il lotto e usare la procedura manuale autenticata, non attendere nel callback. Nessuna schedulazione in DEMO.

**Procedura operativa manuale per transazioni ambigue** (solo operatori autorizzati, prima di qualunque nuova donazione):
1. Leggere in Cloud `live_donations` con `status` creating/pending e `recovery_note`, `recovery_attempts>=8` oppure `capture_claimed_at` valorizzato; non toccare tabelle DEMO. Annotare UUID, provider, importo, ID ordine/checkout se presente.
2. Consultare il conto commerciante del provider, filtrando riferimento UUID/importo/data. Per PayPal cercare custom_id o dettagli transazione; non usare ritorno browser/email del visitatore come prova. Se il risultato è assente/ambiguo, lasciare in verifica e contattare l'assistenza del provider: NON chiedere al visitatore un secondo pagamento.
3. Con ID univoco e importo EUR verificati, un operatore con accesso privilegiato associa l'ID al record originario (vincolo UNIQUE); non crea nuova donazione né pallina manuale. Il successivo recupero/rilettura server conferma solo evidenza reale. Per record esauriti, dopo revisione, un operatore può reimpostare recovery_attempts/recovery_after per consentire sole riletture, senza cancellare capture_claimed_at.
4. Claim PayPal persistente ma ordine ancora APPROVED: verificare sul provider se capture è già in corso/completata. Non cancellare automaticamente la claim; un eventuale intervento di capture manuale sul conto commerciante richiede distinta autorizzazione finanziaria e riconciliazione successiva. Questo caso resta bloccato in sicurezza invece di rischiare doppia capture.
5. Denied/reversed: revisione amministrativa dell'esito; nessun rimborso automatico, nessuna pallina nuova. Registrare l'esito e mantenere evidenze per l'amministrazione.

Migrazione additiva `0012_live_payment_capture_claim_and_recovery.sql`: colonne di claim/recovery/esito, indice e RPC service-only; nessun record DEMO mutato, nessuna cancellazione. Mock non provano il comportamento effettivo dei provider o del runtime pubblicato: prova operativa autorizzata, configurazione eventi e verifica tempi restano obbligatorie.

**Verifiche di questo hardening:** 195 test in 16 file (41 nuovi test di recupero/protezione), soltanto mock provider. Compilazione automatica verificata; browser DEMO senza chiamate provider, entrambi webhook 503, endpoint recupero senza autorizzazione 401. Schema e permessi RPC verificati in lettura: anon/autenticati esclusi, servizio autorizzato; zero donazioni/palline LIVE. Concorrenza SQL effettiva e schedule pubblicato non collaudati.

## Confini e stato realmente implementato
- Le azioni DEMO esistenti passano da `campaign-rpc.ts` alle funzioni server; il server controlla modalità e allowlist. Le operazioni staff verificano sessione e ruolo con il client dell'operatore; il dispatcher DB ripete la verifica dell'attore.
- La migrazione `0008_campaign_demo_server_boundary.sql` revoca l'esecuzione diretta a pubblico/anon/autenticati di tutte le RPC albero, contanti e auguri, senza eliminarle né cambiare righe. Il dispatcher è eseguibile solo dal servizio server; mantiene validazioni, consenso, scadenze e lock originali.
- La migrazione `0009_campaign_demo_moderation_server_only.sql` revoca anche l'accesso diretto staff alle tabelle DEMO: letture e moderazione passano da `demoModeration`, con modalità e ruolo verificati server-side; lo staff conserva la gestione dei contenuti editoriali sotto le RLS esistenti.
- **Compatibilità sito già pubblicato:** i permessi Cloud sono condivisi tra preview e pubblicato. Una versione pubblicata precedente che chiama direttamente le vecchie RPC non può più leggere/scrivere albero o auguri né moderare quelle tabelle. Non è stata pubblicata questa versione; per ripristinare quei flussi sul sito pubblico serve autorizzazione alla pubblicazione del nuovo codice, senza cambiare DEMO.
- I dati esistenti in `demo_ornaments`, `cash_requests`, `wish_tokens`, `wishes` sono **DEMO**, mai evidenza di un pagamento reale. Fuori DEMO non sono letti dal sito né trasmessi in TV. I testi calendario e gli eventi confermati sono contenuti editoriali indipendenti.
- Le pagine non pertinenti sono bloccate dal `beforeLoad` centrale prima del montaggio. Il menu usa lo stesso criterio. TV non seleziona/renderizza il muro senza capacità; gli esempi non sono inseriti fuori DEMO.
- Il checkout LIVE è implementato ma resta indisponibile fino alla verifica operativa: non raggiunge una conferma simulata. Prenotazioni Babbo Natale e invii email restano simulatori solo DEMO, non servizi LIVE.
- La casetta resta una vetrina: nessun checkout prodotti; una vendita **non** produce automaticamente un addobbo. Non è implementato il collegamento a una vendita reale per l'emissione QR auguri.

## Prerequisiti mancanti prima del LIVE
1. **Pagamenti:** codice checkout/conferma presente; completare configurazione webhook, prova operativa, riconciliazione autonoma e procedura ricevute. Pubblicare gli endpoint solo con autorizzazione, quindi configurarli presso i provider. Non basta impostare `LIVE_READINESS.payments` a true.
2. **Dati LIVE separati:** tabelle create e protette; nessuna conversione automatica dei dati DEMO. Letture/creazione addobbi esclusivamente dopo prova di pagamento o attestazione staff autorizzata. Non usare il dispatcher DEMO per LIVE.
3. **Contanti/POS:** flusso LIVE e procedura amministrativa di incasso, account volontari individuali, ruoli validati, audit, anti-abuso e prove QR doppio uso/scadenza. L'attuale schema manuale richiede esplicitamente un passaggio simulato: non è una registrazione LIVE.
4. **Acquisti/auguri:** riferimento verificato a vendita reale alla casetta, emissione unica legata alla vendita (non alla donazione), nessun addobbo, codice opaco monouso/scadenza, consumo atomico, consenso e moderation preventiva. Attuale `create_wish_token()` non dimostra una vendita.
5. **Auth/sicurezza:** operatori reali e ruoli assegnati, prove autorizzato/non autorizzato, RLS/grant, throttling robusto per richieste pubbliche e revisioni privacy. I limiti attuali basati su client UUID non sono un anti-spam LIVE sufficiente.
6. **Moderazione:** personale e procedura disponibili; test end-to-end pending/approvato/rifiutato e revoca da TV. Le letture/modifiche dirette staff alle tabelle DEMO restano sotto RLS e non sono migrate a un servizio LIVE.
7. **Pubblicazione/TV:** solo con autorizzazione, verificare URL definitivo e QR sul telefono e sullo schermo fisico, fallback WebGL, regia e apertura calendario alle 12:00 Europe/Rome, una volta al giorno. I 24 testi calendario attendono revisione staff.

Solo dopo implementazione e prove dei servizi corrispondenti aggiornare `LIVE_READINESS`; questi valori documentano evidenza e non rendono operativo codice assente. **Architettura e checkout LIVE presenti, operatività ancora da verificare.**

## Test di ciascuna modalità
- Eseguire `bunx vitest run`; `src/test/campaign.test.ts` verifica matrice, prerequisiti, deep link, metodi di pagamento e allowlist server; i test esistenti coprono importi/QR/scadenze/date/regia.
- In un ambiente isolato cambiare l'unico valore, senza pubblicare: visitare home, `/regali/calore`, `/casetta`, `/albero`, `/calendario`, `/volontari`, `/auguri`, `/augurio/demo`, `/tv-preview` su 390px e desktop. LIVE: niente demo/menu muro/QR acquisto in BASIC o ADVANCED_1, deep link non operativo, checkout indisponibile e nessuna modifica ai contatori.
- Verificare chiamata diretta alle vecchie RPC con chiave pubblica: permission denied. Funzione pubblica non può richiamare operazioni staff; funzione staff senza sessione/ruolo deve negare.
- DEMO: simulazione donazione → addobbo DEMO; demo volontari resta in memoria; preview mantiene tutte le scene. Per prove di scrittura usare ambiente di test, non effettuare transazioni reali.
- Questa sessione non cambia la modalità attiva e non pubblica. Le prove browser delle altre modalità e quelle con operatori reali non sono automaticamente equivalenti ai test unitari; registrare separatamente ciò che si è davvero verificato.
- I risultati delle verifiche precedenti non equivalgono a prove LIVE. Le modalità inattive sono testate con capacità iniettate nei test, senza cambiare la singola impostazione di deploy.

### Checklist due telefoni e TV (da eseguire prima del LIVE)
- Telefono A: almeno 5 € online, provider realmente confermato; annullamento/errore non deve creare palline. Replay webhook deve restituire lo stesso evento/addobbo.
- Telefono B e TV: stessa pallina persistente, stesso conteggio/crescita, dedica privata non esposta; approvazione e revoca si propagano. Provare fallback WebGL e QR fisico.
- BASIC/ADVANCED_1: nessuna CTA/menu/scena muro, deep link auguri negato; tutte le scene indipendenti presenti. Calendario apre alle 12:00 Europe/Rome una volta al giorno dal 1 al 24 dicembre, non alle 10:00.
- Santa OFF: home/menu/deep link non offrono visite; Accademia sempre presente. Santa ON ma non pronta: nessuna conferma di prenotazione reale.
- Biscotto approvato: una missione → diploma → tap ritiro su A → ricarica, diploma presente e pulsante assente; B ha stato distinto (limite previsto).
- ADVANCED_1/2: account autorizzato e non autorizzato, doppia scansione, scadenza e revoca. ADVANCED_2: QR legato a vendita vera, non donazione, nessun addobbo dalla vendita, consenso e premoderazione.
- Email: dominio verificato, regalo pagato verificato, invio singolo subito/Natale, duplicato stesso evento, suppression/errore e retry visibili senza falsa conferma. Non eseguire test finanziari o invii reali senza autorizzazione.

## Informazione fiscale
Approfondimento generale espandibile vicino alle informazioni donazione, senza percentuali, massimali, IBAN o condizioni di altri Comitati. Le simulazioni non generano benefici/ricevute; per applicazione locale e gestione ricevute è necessaria verifica amministrativa. Nessuna promessa automatica per contanti o acquisti.

## Verifiche del completamento — 8 novembre 2026
- 118 test passati in 12 file, inclusi matrice completa, opzioni indipendenti, route/allowlist e guardie server, minimo 5 €, calendario/TV e ritiro persistente del biscotto.
- Compilazione automatica OK. Browser 1280×1800 e smartphone simulato 390×844: home Santa DEMO presente, checkout simulatore accessibile senza confermarlo, otto scene preview incluse muro/calendario; ritiro biscotto su stato locale di prova, ricarica, pulsante assente e stesso diploma. Nessun overflow orizzontale o errore pagina osservato. Nessun dato personale inserito né scrittura Cloud effettuata.
- Verificati i permessi correnti di dispatcher e RPC campione: pubblico/autenticato non possono invocare direttamente, servizio server sì. Le altre modalità sono test di capacità/policy, non attivazioni del sito; account staff autorizzati, due telefoni e TV fisica non esercitati.
- Nessuna pubblicazione, modifica di modalità, nuova migrazione o transazione reale in questo intervento. I permessi Cloud modificati nel precedente intervento restano condivisi col pubblicato: permane il limite della vecchia versione pubblicata descritto sopra.
- Restano da implementare i servizi LIVE, non soltanto da inserire credenziali: pagamento/provider→pallina separata, invio/programmazione email, donazioni volontari LIVE e vendita→QR auguri verificata. Non dichiarare BASIC LIVE pronto in base a questi test.
## Verifica pagamenti di questo intervento
154 test passati in 14 file; 17 nuovi test degli adattatori con fetch/DB mock, nessuna chiamata provider reale. Compilazione automatica OK. Browser desktop/390px: checkout DEMO invariato, nessun overflow/errori; callback reali restituiscono 503 in DEMO e pagina ritorno non simula conferme. Verifica DB: zero donazioni/palline LIVE; anon/autenticati non possono leggere dati privati o confermare/inserire palline. Migrazioni additive condivise col sito pubblicato, nessun dato DEMO o permesso precedente modificato; nessuna pubblicazione.
