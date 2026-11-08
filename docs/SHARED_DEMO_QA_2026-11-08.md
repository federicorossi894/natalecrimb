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
1. **Prima del test:** B apre `/volontari` e accede con il proprio account già abilitato. Se manca: «Registrati», confermare l’email, poi un amministratore del Comitato deve autorizzare quell’account come volontario; registrazione e login da soli non assegnano ruoli. Non esiste password comune. Nell’editor Lovable → Cloud → utenti/dati, un amministratore identifica l’account e autorizza solo il volontario scelto. Nessun account è stato scelto o promosso automaticamente in questa attività.
2. **TV:** aprire direttamente `/albero-live`, orientamento orizzontale, fullscreen; annotare il conteggio iniziale. Pagina non linkata dal menu pubblico.
3. **A:** `/regali` → Calore → almeno 5 € → Contanti alla casetta → prepara QR. Generare senza nome/dedica per il primo test, poi lasciare aperta la pagina QR. Il codice scade dopo 2 ore. Nessun contante viene incassato.
4. **B:** nella DEMO condivisa scegliere «Scansiona QR», fotocamera oppure codice di 16 caratteri copiato da A. Non usare QR di esempio della presentazione locale. Scegliere contanti simulati e «Conferma e appendi la pallina».
5. **A:** conferma recuperata tramite controllo ogni 5 s; aprire l’albero. **B:** aprire `/albero`. **TV:** albero/conteggio controllati ogni 15 s. Attendere un ciclo più il tempo rete; annotare qualsiasi ritardo oltre 15 s, che non può essere garantito su reti/dispositivi arbitrari.
6. **Idempotenza:** B rilegge lo stesso QR: «già confermato», nessuna seconda pallina. Ricaricare A, B e TV: stessa pallina/conteggio. Dediche con consenso compaiono solo dopo moderazione; la prima prova anonima evita di confondere la pallina con l’approvazione del testo.

## Email: autorizzazione setup oggi, invio ancora bloccato
Destinazione unica confermata: `federico.rossi@crimonza.org`, solo nel modulo server `demo-email-qa.server.ts`; il browser non può scegliere destinatario o contenuto. `/moderazione` contiene verifica predisposizione e invio disabilitato. Endpoint richiede sessione e `is_moderator`; volontario semplice non basta.

Il controllo Lovable Emails restituisce **nessun dominio configurato**. Non esiste mittente condiviso o di prova per le email dell’app; il mittente predefinito delle email di accesso non è utilizzabile per questa prova. `natale@crimonza.org` non è stato creato e non è verificato.

Passaggi:
1. Nell’editor usare **Configura dominio email** nella chat; il modulo avvia la configurazione effettiva, non un semplice consenso all’invio. Occorre autorizzazione del Comitato sull’uso del dominio posseduto `crimonza.org`.
2. Seguire il modulo Lovable, poi **More → Emails** per stato e record DNS esatti. Nessun valore record è inventato qui. Il responsabile che gestisce DNS di `crimonza.org` deve inserire i record mostrati (la delega del sottodominio richiede record NS); la verifica deve completarsi. Non alterare i record email esistenti del Comitato.
3. Il responsabile della posta del Comitato crea/approva la casella `natale@crimonza.org` separatamente: configurare il dominio d’invio non crea una casella. Verificare il From effettivo prima di dichiarare pronto il mittente ufficiale.
4. Dopo completamento del modulo si può generare il collegamento ufficiale Lovable Emails e integrare il test fisso `demo-qa`; nessuna chiave da incollare in chat. Servono ancora adattatore gestito e limite/audit durevoli verificati prima di rendere cliccabile l’invio.
5. Solo dopo verifica e nuova approvazione dell’invio manuale, un moderator/admin usa il test verso il destinatario unico. Oggetto e corpo `[DEMO — NESSUN PAGAMENTO]`, nessuna ricevuta fiscale, transazione, pallina o invio automatico.

Preparata orchestrazione testabile con porte per claim atomica, invio e audit, massimo previsto 3 prove/giorno e intervallo 10 minuti. **Limite/audit durevoli non ancora operativi**: nessuna tabella email/queue fittizia creata e nessuna scrittura personale in produzione. Il gate resta spento anche dopo un semplice cambio flag, finché non esistono implementazione e verifica. Le porte mock non provano invii reali.

## Blocchi residui
1. Account volontario/moderatore autorizzato dal Comitato per la prova Cloud e QA: il richiedente attualmente non ha i ruoli. Nessuna promozione arbitraria.
2. Dominio, casella/mittente e collegamento gestito email con limite/audit: il modulo va completato da chi può autorizzare il dominio e aggiornare DNS. Nessun invio effettuato.
3. Collaudo sui due telefoni e TV fisici dopo aggiornamento pubblico: i test isolati/mocked non sostituiscono questa prova.

## Risultati automatici della release
296 test in 26 file superati; compilazione automatica OK. Lint file modificati: zero errori, due avvisi preesistenti delle dipendenze useMemo della presentazione locale. Controlli sicurezza di base: nessun rilievo; non comprendono analisi approfondita del codice. Nessuna scrittura Cloud di prove/dati personali, nessuna email inviata, nessuna operazione provider reale.