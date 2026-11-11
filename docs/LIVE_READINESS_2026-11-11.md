# Il Natale che fa bene — registro di preparazione al LIVE (11 novembre 2026)

Questo registro distingue **codice pronto**, **prove effettivamente eseguite** e **requisiti non ancora validati**. Le voci "in attesa" NON sono autorizzazioni implicite ad attivare il LIVE.

## Correzioni software

- [x] URL ufficiale `https://natale.crimonza.org` in cartoline, QR e email principali
- [x] Casetta: panettone/pandoro, riso 500 g, tisane, altri pensieri, orari orientativi
- [x] Bug maiuscole delle email risolto e preheader aggiunto
- [x] Caricamento albero distinto da albero vuoto, con riprova alla prima mancata connessione
- [x] Personalizzazione privata distinta dalla dedica pubblica
- [x] Cartolina resa visibile senza selezionare un canale
- [x] WhatsApp: testo breve per il PNG, niente dedica duplicata, URL ufficiale
- [x] Email DEMO esplicitamente etichettate come simulazione
- [x] Distinzione visibile tra invio immediato demo e programmazione reale a Natale
- [x] Test e compilazione automatizzati su GitHub Actions per le future PR
- [ ] Collaudo reale su Safari iOS, WhatsApp e Gmail con la nuova versione
- [ ] Controllo rendering di diploma e cartolina scaricati su dispositivo reale
- [ ] Verifica schermate albero vuoto, 1/5/molti addobbi e fallback 3D
- [ ] Verifica Lighthouse, accessibilità tastiera/screen reader e dispositivi lenti

## Approvazioni del Comitato

- [ ] Bozza privacy verificata e approvata formalmente; rimuovere la dicitura “bozza in revisione” soltanto dopo approvazione
- [ ] I 24 testi del Calendario della Gentilezza approvati. Proposta in `docs/CALENDARIO_GENTILEZZA_2026_BOZZA.md`; non inserirli nel database prima del via libera
- [ ] Conferma editoriale definitiva di periodo e fascia oraria indicativa della casetta
- [ ] Approvazione del testo delle email destinatario e conferma e indicazione del mittente ufficiale

## Email: completamento effettivo, non solo modifica visiva

- [ ] Login iniziale e password definitiva di `natale@crimonza.org`, con protezione 2FA
- [ ] Connettore Gmail Lovable autenticato con la nuova casella, verifica identità remota e inoltro corretti
- [ ] Cambiare il mittente applicativo soltanto dopo verifica della nuova connessione
- [ ] Inviare realmente conferma e regalo a un indirizzo di prova autorizzato, testando HTML su desktop e iOS
- [ ] Programmazione **vera** per il 25 dicembre ore 00:05 Europe/Rome, con coda durable, idempotenza, error recovery, invio una sola volta, prove con orologio controllato e osservabilità. La DEMO oggi manda subito: non è una coda certificata
- [ ] Aggiornare `OFFICIAL_EMAIL_READINESS` soltanto dopo ogni verifica; nessun bypass del controllo

## Pagamenti — ultima fase, con prova autorizzata

- [ ] Credenziali e modalità operative definitive SumUp / PayPal
- [ ] Verifica checkout, ritorno riuscito/annullato/fallito
- [ ] Webhook autenticati con chiavi/algoritmi del provider, verificati sul sistema reale
- [ ] Conferma denaro prima della creazione di una sola pallina anche sotto webhook duplicati
- [ ] Donazioni e palline LIVE in tabelle separate da `demo_ornaments`
- [ ] Notifiche, riconciliazione, esiti di rete e gestione errori
- [ ] Donazione reale controllata, tracciamento contabile e verifica email
- [ ] Rimuovere il banner DEMO e abilitare LIVE **solo dopo tutti i blocchi precedenti**

## Decisione operativa

La presenza di una funzione o di un test unitario non garantisce la sua operatività reale.
Fino alla verifica dei blocchi non superati, **la modalità deve rimanere DEMO**.

Per il prossimo collaudo su telefono: scegliere “Regala prossimità”, simulare un regalo, verificare che la cartolina compaia subito, inviarla a un contatto autorizzato via WhatsApp, controllare che la didascalia sia breve, la dedica non sia ripetuta e il link punti a `natale.crimonza.org`; ripetere con “Solo donazione”.


## Aggiornamento esecutivo — 11 novembre 2026, dopo approvazioni

**Comitato / utente:** privacy e 24 gesti di gentilezza dichiarati approvati; casella `natale@crimonza.org` riferita funzionante. La pagina `/privacy` contiene ancora marcatori "bozza" e note di revisione legale e va confrontata con il testo effettivamente approvato prima di dichiararla definitiva.

**Realizzato e verificato:**
- 24 contenuti della bozza sottoposta al Comitato caricati in `kindness_doors`; `kindness_calendar()` restituisce 24 porte ma 0 contenuti anticipati in novembre.
- Nuovo checkout LIVE preparato, ma raggiungibile solo quando la modalità è diversa da DEMO e dopo attivazione controllata dei provider; onorati i testi separati pubblico/privato, pagamento verificato prima della pallina, cartolina, email e storia social.
- Gmail LIVE collegato al mittente `natale@crimonza.org` usando il connettore già testato in DEMO, con controllo identità OAuth prima dell'invio e blocco irrevocabile dei tentativi ambigui. Mancano prove reali complete con donazione saldata.
- `pg_cron` e `pg_net` abilitati nel database Lovable; cron `natale-2026-christmas-gift-email` attivo ogni 5 minuti nei giorni UTC 24–26 dicembre; esecuzione protetta da token generato dentro Supabase Vault.
- Chiamata cron reale al dominio `natale.crimonza.org`: HTTP 200 con `{"state":"blocked","reason":"official_sender_not_configured"}` in modalità DEMO; il 401 precedente proveniva dalla pubblicazione non ancora aggiornata. Questo prova la connessione e l'autenticazione, **non** l'invio effettivo di una email.
- `LIVE_READINESS.payments=false`, `ACTIVE_CAMPAIGN_MODE='DEMO'`, `OFFICIAL_EMAIL_READINESS` e servizi opzionali ancora disattivati; nessun incasso attivo.

**Per chiudere prima dell'apertura:**
1. Sostituire la pagina privacy ancora contrassegnata "bozza" con la **copia finale esatta approvata**, non un testo riscritto sulla base di ipotesi legali.
2. Verificare realmente, da LIVE con donazione pagata di test, Gmail mittente, conferma donatore, regalo immediato e messaggio programmato (anche con collaudo su coda protetta senza aspettare il 25 dicembre). Registrare prove e stati.
3. Verificare entrambi i provider in collaudo autorizzato (checkout, ritorno, webhook, una sola pallina, email) e solo allora impostare i flag LIVE; pubblicare senza mai bypassare i controlli di sicurezza.
4. Monitorare `cron.job_run_details`, `net._http_response`, `live_donations.gift_email_state` e l'audit prima di Natale. Un invio `claimed` ambiguo non va rilanciato automaticamente.
5. Alla partenza pubblica eliminare le indicazioni DEMO soltanto dopo verifiche pagamenti/email/privacy e prova iPhone.

**Rollback:** mantenere la modalità DEMO finché i due pagamenti di test non sono conclusi; in caso di guasto ripristinare DEMO e non riprovare automaticamente un capture PayPal o un messaggio Gmail con esito ambiguo.
