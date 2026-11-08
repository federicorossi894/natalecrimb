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
| Conferma provider → addobbo persistente e crescita TV/smartphone | simulata | richiesta, non implementata LIVE | come BASIC | come BASIC |
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
Ispezionati SumUp/PayPal nel checkout, funzioni server, migrazioni, nomi dei segreti e connessioni disponibili. Nel progetto attuale SumUp/PayPal sono simulatori; non sono presenti callback firmati, creazione/cattura pagamento o riconciliazione LIVE. La lista corrente dei segreti mostra solo valori gestiti Lovable, nessuna credenziale di pagamento; le connessioni disponibili sono Gmail, non provider di pagamento. Questo **non prova che i codici forniti in passato non esistano altrove**. Non sono stati stampati valori, richiesti nuovi codici o sovrascritti segreti. Credenziale presente e webhook operativo sono verifiche distinte; qui il secondo non esiste nel codice. Nessuna transazione di prova. Minimo invariato: **5 €**, euro interi fino a 1000 €.

`campaignCapabilities()` deriva capacità effettive dalla modalità e dai prerequisiti verificati. `cashRequested` e `wishWallRequested` rappresentano la matrice desiderata, **non** autorizzazioni operative. Attualmente tutti i prerequisiti LIVE sono falsi: cambiare modalità non inventa un gateway né abilita incassi.

## Confini e stato realmente implementato
- Le azioni DEMO esistenti passano da `campaign-rpc.ts` alle funzioni server; il server controlla modalità e allowlist. Le operazioni staff verificano sessione e ruolo con il client dell'operatore; il dispatcher DB ripete la verifica dell'attore.
- La migrazione `0008_campaign_demo_server_boundary.sql` revoca l'esecuzione diretta a pubblico/anon/autenticati di tutte le RPC albero, contanti e auguri, senza eliminarle né cambiare righe. Il dispatcher è eseguibile solo dal servizio server; mantiene validazioni, consenso, scadenze e lock originali.
- La migrazione `0009_campaign_demo_moderation_server_only.sql` revoca anche l'accesso diretto staff alle tabelle DEMO: letture e moderazione passano da `demoModeration`, con modalità e ruolo verificati server-side; lo staff conserva la gestione dei contenuti editoriali sotto le RLS esistenti.
- **Compatibilità sito già pubblicato:** i permessi Cloud sono condivisi tra preview e pubblicato. Una versione pubblicata precedente che chiama direttamente le vecchie RPC non può più leggere/scrivere albero o auguri né moderare quelle tabelle. Non è stata pubblicata questa versione; per ripristinare quei flussi sul sito pubblico serve autorizzazione alla pubblicazione del nuovo codice, senza cambiare DEMO.
- I dati esistenti in `demo_ornaments`, `cash_requests`, `wish_tokens`, `wishes` sono **DEMO**, mai evidenza di un pagamento reale. Fuori DEMO non sono letti dal sito né trasmessi in TV. I testi calendario e gli eventi confermati sono contenuti editoriali indipendenti.
- Le pagine non pertinenti sono bloccate dal `beforeLoad` centrale prima del montaggio. Il menu usa lo stesso criterio. TV non seleziona/renderizza il muro senza capacità; gli esempi non sono inseriti fuori DEMO.
- Il checkout LIVE è al momento un avviso indisponibile: non raggiunge una conferma simulata. Prenotazioni Babbo Natale e invii email restano simulatori solo DEMO, non servizi LIVE.
- La casetta resta una vetrina: nessun checkout prodotti; una vendita **non** produce automaticamente un addobbo. Non è implementato il collegamento a una vendita reale per l'emissione QR auguri.

## Prerequisiti mancanti prima del LIVE
1. **Pagamenti:** chiedere nell'editor Lovable l'attivazione pagamenti; implementare checkout reale, verifica callback/firma, importo/valuta, idempotenza, ricevuta e riconciliazione. Non basta impostare `LIVE_READINESS.payments` a true.
2. **Dati LIVE separati:** namespace/tabelle o ambiente separato; nessuna conversione automatica dei dati DEMO. Letture/creazione addobbi esclusivamente dopo prova di pagamento o attestazione staff autorizzata. Non usare il dispatcher DEMO per LIVE.
3. **Contanti/POS:** flusso LIVE e procedura amministrativa di incasso, account volontari individuali, ruoli validati, audit, anti-abuso e prove QR doppio uso/scadenza. L'attuale schema manuale richiede esplicitamente un passaggio simulato: non è una registrazione LIVE.
4. **Acquisti/auguri:** riferimento verificato a vendita reale alla casetta, emissione unica legata alla vendita (non alla donazione), nessun addobbo, codice opaco monouso/scadenza, consumo atomico, consenso e moderation preventiva. Attuale `create_wish_token()` non dimostra una vendita.
5. **Auth/sicurezza:** operatori reali e ruoli assegnati, prove autorizzato/non autorizzato, RLS/grant, throttling robusto per richieste pubbliche e revisioni privacy. I limiti attuali basati su client UUID non sono un anti-spam LIVE sufficiente.
6. **Moderazione:** personale e procedura disponibili; test end-to-end pending/approvato/rifiutato e revoca da TV. Le letture/modifiche dirette staff alle tabelle DEMO restano sotto RLS e non sono migrate a un servizio LIVE.
7. **Pubblicazione/TV:** solo con autorizzazione, verificare URL definitivo e QR sul telefono e sullo schermo fisico, fallback WebGL, regia e apertura calendario alle 12:00 Europe/Rome, una volta al giorno. I 24 testi calendario attendono revisione staff.

Solo dopo implementazione e prove dei servizi corrispondenti aggiornare `LIVE_READINESS`; questi valori documentano evidenza e non rendono operativo codice assente. **L'architettura centrale è disponibile, i flussi LIVE no.**

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