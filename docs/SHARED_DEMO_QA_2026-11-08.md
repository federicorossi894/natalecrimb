# DEMO condivisa e email QA — 8 novembre 2026

## Stato e limiti verificati
- DEMO resta attiva, LIVE e provider reali spenti; nessuna modifica pagamenti, gala, listener, credenziali o scheduler.
- `/volontari` propone prima «DEMO condivisa · due telefoni + TV»: accesso individuale e ruolo volunteer/moderator/admin. API Cloud esistente tramite `staffDemoRpc`, controllo server `is_volunteer` e dispatcher service-only, nessun bypass pubblico.
- Presentazione locale facoltativa, chiusa inizialmente, un solo telefono, azzerata al refresh e senza Cloud.
- L’account del richiedente è stato autenticato nel browser: accesso negato sia ai volontari sia ai moderatori per ruolo mancante. Nessun ruolo assegnato. Questo impedisce un collaudo completo reale Cloud con tale account; non viene spacciata la presentazione per una prova condivisa.
- Prove database isolato: vere funzioni SQL delle migrazioni, richiesta 5 €, nessuna pallina prima della conferma, due conferme concorrenti → confirmed/already_confirmed con stesso ID, tre letture nuove → stessa singola pallina, replay dopo refresh senza duplicati, accesso anon/auth diretto negato, minimo 5 €.
- Prova componente: tre lettori DEMO telefono A/B/TV, polling 15000 ms, un solo addobbo, smontaggio/rimontaggio dei tre lettori mantiene ID e conteggio. Non equivale a un test hardware né a una conferma in Cloud.
- Browser 390×844: accesso condiviso primario, presentazione chiusa e poi esplicitamente locale, nessun errore pagina. Pubblico prima delle modifiche: HTTP 200, nessun titolo condiviso, vecchia presentazione locale subito visibile.

## Procedura pratica: due telefoni + TV
Usare lo stesso sito/revisione su tutti i dispositivi: `https://natalecrimb.lovable.app` dopo pubblicazione verificata. Non mescolare la versione vecchia pubblica con l’anteprima.
1. **Prima del test:** B apre `/volontari` (o, dopo l’attivazione DNS, https://volontari.natale.crimonza.org) e accede con Nome e cognome + password comune del Comitato. Nessun account, email o ruolo da creare per i volontari; gli account personali servono solo a moderatori e QA Gmail.
2. **TV:** aprire direttamente `/albero-live`, orientamento orizzontale, fullscreen; annotare il conteggio iniziale. Pagina non linkata dal menu pubblico.
3. **A:** `/regali` → Calore → almeno 5 € → Contanti alla casetta → prepara QR. Generare senza nome/dedica per il primo test, poi lasciare aperta la pagina QR. Il codice scade dopo 2 ore. Nessun contante viene incassato.
4. **B:** nella DEMO condivisa scegliere «Scansiona QR», fotocamera oppure codice di 16 caratteri copiato da A. Non usare QR di esempio della presentazione locale. Scegliere contanti simulati e «Conferma e appendi la pallina».
5. **A:** conferma recuperata tramite controllo ogni 5 s; aprire l’albero. **B:** aprire `/albero`. **TV:** albero/conteggio controllati ogni 15 s. Attendere un ciclo più il tempo rete; annotare qualsiasi ritardo oltre 15 s, che non può essere garantito su reti/dispositivi arbitrari.
6. **Idempotenza:** B rilegge lo stesso QR: «già confermato», nessuna seconda pallina. Ricaricare A, B e TV: stessa pallina/conteggio. Dediche con consenso compaiono solo dopo moderazione; la prima prova anonima evita di confondere la pallina con l’approvazione del testo.

## Email QA Gmail — correzione 8 novembre
- Connettore Gmail del workspace già esistente, identità verificata con GET profilo: `federico.rossi@crimonza.org`, collegato al progetto e credenziali runtime verificate HTTP 200. La seconda connessione è `grangala@crimonza.org`: non usata né modificata.
- La connessione esistente ha send, readonly, compose e modify già concessi; nessun nuovo accesso richiesto, nessun messaggio letto. Per una nuova autorizzazione scegliere il solo scope `gmail.send` ove il modulo lo consente; il controllo profilo corrente usa il grant esistente. Non viene dichiarata una connessione send-only.
- Nessuna nuova connessione è necessaria al momento. Se revocata/scaduta: https://lovable.dev/dashboard?connectors=&connector=google_mail&workspace=FqetqUBRBhlbcaE0ZRZ4 → Gmail → connessione di Federico → autorizzare Google con `federico.rossi@crimonza.org`, non gala. Questo account è stato verificato da Gmail, non dedotto dal dominio.
- Da e a sempre `federico.rossi@crimonza.org`, fissati sul server. QA non richiede `natale@crimonza.org`, DNS né `officialEmailReady`; LIVE rimane bloccato dal proprio gate ufficiale.
- Migrazione additiva 0014: audit privato staff, nessuna coda/email o schedulazione; claim globale atomico, minimo 10 minuti fra prove, massimo 3 al giorno Europe/Rome, request ID monouso, anche errori/esiti incerti consumano il budget. Tabelle/RPC solo service_role; ruolo moderator/admin ricontrollato dal server e dalla claim SQL.

### Procedura manuale, nessun invio eseguito durante preparazione
1. Aprire `/moderazione` nella **anteprima aggiornata dell’editor**, con account già autorizzato moderator/admin. L’account corrente non ha tale ruolo: un amministratore del Comitato deve autorizzarlo esplicitamente; nessun ruolo assegnato qui.
2. In «Prova email · DEMO», cliccare «Verifica Gmail». Non invia messaggi: verifica identità della connessione e accessibilità audit.
3. Selezionare la prova: conferma informativa donazione DEMO (5 € fittizi, nessun record donazione), augurio immediato, oppure Natale **SIMULAZIONE ORARIO inviata SUBITO**. Nessuno scheduler reale viene attivato.
4. Spuntare «Autorizzo questa email reale solo alla mia casella QA», poi «Invia prova al QA». Questo clic è l’autorizzazione manuale all’unico messaggio selezionato. Nessun From, To o contenuto arbitrario accettato dal browser.
5. Gmail può rispondere **accettata**, non «consegnata». Controllare Posta in arrivo/spam dell’account QA e verificare From, To, soggetto `[DEMO — NESSUN PAGAMENTO]` e corpo; poi attendere almeno 10 minuti e selezionare il secondo tipo. Tre prove richiedono almeno 20 minuti.
6. Esito incerto: non ripetere alla cieca; controllare casella e audit. Nessun reinvio automatico. La ricezione reale non è verificata finché il proprietario non la vede nella casella.

### Limiti residui
- Accesso reale alla UI staff bloccato dal ruolo mancante dell’account corrente: nessuna promozione arbitraria. UI e orchestration verificati con mock, browser desktop/mobile verifica il diniego reale.
- Consegna/ricezione reale da verificare con i tre clic manuali autorizzati. Nessuna email inviata in questa attività.
- Mittente ufficiale `natale@crimonza.org` e scheduler LIVE ancora separatamente non pronti; BASIC/ADVANCED restano bloccati. Nessuna pubblicazione in questa attività: la UI aggiornata è nell’anteprima, non automaticamente sul pubblico.

## Risultati automatici della release
296 test in 26 file superati; compilazione automatica OK. Lint file modificati: zero errori, due avvisi preesistenti delle dipendenze useMemo della presentazione locale. Controlli sicurezza di base: nessun rilievo; non comprendono analisi approfondita del codice. Nessuna scrittura Cloud di prove/dati personali, nessuna email inviata, nessuna operazione provider reale.