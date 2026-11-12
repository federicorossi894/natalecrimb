# Il Natale che fa bene — handoff tecnico al collaudo finale

Data: 12 novembre 2026. Documento operativo riservato al Comitato; non esporre sul sito.

## Architettura preparata

- Sito pubblico e ritorni: **https://natale.crimonza.org**. I checkout LIVE non possono partire dagli indirizzi Lovable di anteprima. SumUp/PayPal riportano il visitatore a `/pagamento` sul dominio ufficiale.
- Le prove DEMO del sito e delle email da `natale@crimonza.org` sono state eseguite dagli operatori; ciò **non equivale** a una prova di consegna associata a una donazione pagata.
- Coda regalo Natale: `gift_email_due_at = 2026-12-24T23:05:00Z` = **25 dicembre 2026 ore 00:05 Europe/Rome**. Il cron esegue fino al 26 dicembre UTC ogni 5 minuti, seleziona soltanto donazioni `paid` + `completed` in scadenza e usa le claim SQL per impedire invii duplicati. Non esiste più l'invio cron arbitrario per un singolo ID.
- Invio `natale@crimonza.org` tramite il connettore Gmail gestito: verifica identità del mittente, gestione di conferma, regalo immediato o programmato. Su risposta ambigua il tentativo resta da riconciliare, **mai ritentare alla cieca**.
- Recupero pagamenti: cron interno `natale-2026-payment-recovery`, limitato alla stagione 2026/27, con verifica provider autorevole e claim durabili. Non crea nuove richieste e non duplica una capture PayPal incerta. Il suo endpoint usa lo stesso autenticatore service-role/Vault del cron email.
- Privacy specifica della campagna e 24 gesti della gentilezza già pubblicati. La validazione organizzativa della nuova informativa deve restare a carico del Comitato.

## Sicurezze da NON allentare prima delle due donazioni

- `ACTIVE_CAMPAIGN_MODE = 'DEMO'`
- `LIVE_READINESS.payments = false`
- `LIVE_PROVIDER_READINESS.sumup.webhookVerified = false`
- `LIVE_PROVIDER_READINESS.paypal.webhookVerified = false`
- `OFFICIAL_EMAIL_READINESS.receiptImplementedAndVerified = false`
- `OFFICIAL_EMAIL_READINESS.giftNowImplementedAndVerified = false`
- `OFFICIAL_EMAIL_READINESS.giftChristmasScheduleVerified = false`
- `OPTIONAL_SERVICE_READINESS.emailSending = false`
- `OPTIONAL_SERVICE_READINESS.emailScheduling = false`

Questi valori **NON** vanno portati a true per comodità o per far passare una build. Sono prove non ancora concluse. L'apertura pubblica non avviene durante questa preparazione.

## Ultimo collaudo con il responsabile del progetto

Sono previste **due donazioni reali di importo minimo 5 €**, una per SumUp e una per PayPal. I test vanno svolti in una finestra di collaudo controllata, attivata esplicitamente, senza esporre nuovi pagamenti al pubblico prima delle verifiche. Il normale flusso pubblico deve restare in DEMO fino alla decisione di lancio.

Per entrambi:
1. Aprire `natale.crimonza.org` (non un URL Lovable). Verificare checkout esterno corretto, importo in EUR, ritorno al dominio ufficiale, stato del provider e registrazione nel database.
2. Attendere la conferma di `paid` e `settlement_state=completed` **dal server**, senza fidarsi della sola pagina di successo. Verificare un solo addobbo associato al pagamento e nessuna seconda capture al refresh/callback duplicato.
3. Donazione a una persona: dedica privata e firma, separazione della dedica pubblica, invio del regalo e rendering della cartolina. Un test con invio **ora** e uno con scelta **Natale** (persistenza coda a 00:05, non invio anticipato).
4. Richiedere una sola conferma donatore a email autorizzata, se prevista; controllare la casella e lo stato audit. La prova dell'effettiva consegna a Natale non si può osservare prima della data: convalidare il cron, la coda, l'autenticazione e le regole temporali.
5. Verificare che il cron di recupero funzioni in caso di ritorno interrotto senza duplicare un'operazione economica. Non simulare errori direttamente sui pagamenti reali.
6. In caso di invio `claimed`, pagamento ambiguo o webhook non verificato, **fermarsi**, controllare il provider e il registro: non pagare né inviare nuovamente alla cieca.

## Pubblicazione dopo i due test

Solo dopo evidenza verificata:
- Aggiornare `LIVE_PROVIDER_READINESS` per ciascun provider *solo* se relativo webhook e verifica del provider sono stati osservati; impostare `LIVE_READINESS.payments=true` e `ACTIVE_CAMPAIGN_MODE='BASIC'` per la campagna online.
- Aggiornare le prove `OFFICIAL_EMAIL_READINESS` e `OPTIONAL_SERVICE_READINESS` **solo** per le modalità email realmente validate e dopo verifica dei collegamenti Gmail e cron. In caso contrario rimanere bloccati, non dichiarare falsamente completato il LIVE.
- Eseguire test e build GitHub, sincronizzare Lovable, pubblicare, controllare che sparisca il banner DEMO, effettuare un controllo dal telefono e registrare commit/deploy.
- Monitorare `cron.job_run_details`, `net._http_response`, `live_donations` e audit email durante la campagna. A chiusura, fermare entrambi i job e seguire `docs/CHIUSURA_CAMPAGNA_PRIVACY_2026.md`.

**Rollback:** se la prova non torna, ripristinare immediatamente la modalità DEMO senza cancellare donazioni già pagate e senza inviare nuovamente comunicazioni ambigue.
