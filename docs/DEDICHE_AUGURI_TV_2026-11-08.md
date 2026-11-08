# Dediche, auguri e TV — 8 novembre 2026

## Implementato
- Migration `0017_shared_demo_review.sql` applicata a Lovable Cloud: nuova funzione service-only separata dal dispatcher contanti. Nessun ruolo cambiato. Sessione condivisa valida richiesta, origine esatta controllata nei due server functions, gate DEMO, UUID e decisione strict.
- Lista solo pending+consenso di wishes e demo_ornaments con dedica, colonne testo/firma/data/flag/ID, massimo 100 elementi e conteggio completo. Nessun importo o dato cliente. Testo reso come testo React, non HTML. Lista privata, nessuna lettura anonima aggiunta.
- Decisione row-lock pending-only: due decisioni concorrenti producono una sola transizione e `already_processed`; consenso richiesto. Approvazioni con flag ricalcolati o memorizzati, testo fuori limiti (augurio 180/nickname24; dedica90/firma40) sono bloccate con escalation al moderatore; rifiuto possibile. Massimo 20 tentativi/minuto/sessione con lock. Audit sessione/nome dichiarato/azione/ora e wish_id o ornament_id. Moderazione ordinaria resta separata e può gestire revoche.
- `/volontari`: sezione persistente «Auguri e dediche da approvare», conteggio e avviso ogni 4s anche su acquisti/QR, elenco espandibile con Approva/Rifiuta. Poll senza overlap, cancellazione all’unmount, errore visibile. Il QR non viene smontato dalle decisioni; aprendo la lista scende nella pagina.
- TV: cartolina natalizia nei tre percorsi arrivo/dedica/racconto. Testo e firma pubblici originali, nessuna firma “Anonimo” inventata. Palline ancora pending non rivelano testo. La nuova approvazione di dedica su ID già visto crea un reveal speciale, non una pallina nuova. Focus senza dedica mantiene i quattro racconti invariati e cadenza 45–60s.
- Auguri TV polling 4s (gli altri visitatori restano alla cadenza propria). Nuovi ID approvati dopo baseline iniziale attivano muro speciale 12s, nuova nota per prima, drop+snap 1.1s e molletta. Coda ID-only max6, deduplicata; eccedenze non riprodotte individualmente ma restano nel muro normale. Nessun replay al caricamento. Calendario e arrivi prevalgono e interrompono/sospendono il beat; normale regia riprende. Revoche/errori rimuovono il testo alla successiva lettura, non al giro muro. Dediche dipendono dal poll albero 15s: non promessa di revoca istantanea tra dispositivi.
- “Tlac” originale sintetizzato solo se audio attivato; musica ancora **0 brani, in preparazione**. Nessun audio automatico, pagamenti/LIVE/Gmail/DNS/gala modificati.

## Prove eseguite
- **365 test / 35 file passati**, automatic build/typecheck OK (18:50:52 UTC), inclusi i 359 precedenti.
- PGlite isolato con vera migration e funzioni SQL: token casetta → submit_wish pending → non visibile public_wishes → review da due sessioni → una approved/una already_processed → pubblicazione; audit nome+wish ID. Nessun auth.users creato, sessione/SQL diretti non autorizzati negati; flag escalation, rifiuto nonpublic e limite20/min. Contanti concurrency/idempotenza precedenti passano.
- Chromium 1920×1080 con **risposte pubbliche isolate intercettate**, non produzione: baseline sei palline → stessa pallina ottiene testo → reveal/cartolina con zoom reale; approvazione nuovo augurio → muro speciale; rimozione augurio → testo zero nel DOM. Zero page errors. Fotografati reveal, muro, dedica normale e arrivo. QR leggibile; controllo audio sul muro spostato nell’intestazione per non coprire biglietti.
- Chromium 390×844 con **sessione/lista simulate**: avviso 0→1 entro intervallo4s durante vista acquisti, lettura e Approva → conteggio0. Decisione non cambia view; non prova di sessione Cloud reale. Screenshot telefono verificato.
- Screenshot temporanei `/tmp/browser/review/reveal.png`, `wall.png`, `normal-postcard.png`, `arrival.png`, `phone.png`; non dati pubblicati né file di produzione.

## Non verificato / runbook pratico
La password reale del proprietario non è disponibile all’agente: **nessun login condiviso reale, nessuna sessione fantasma o nuova dedica/augurio sintetico inseriti nel Cloud pubblico**. Le prove SQL sono isolate, le prove browser hanno risposte simulate. Un vero flusso cookie→Cloud→TV resta da collaudare dai due dispositivi del proprietario; non lo presentiamo come già provato.

1. Aprire la TV pubblicata e lasciarla caricare per fissare baseline; attivare audio solo se desiderato.
2. Telefono volontario B accede con nome/password comune; resta su acquisto casetta e genera QR vero.
3. Telefono cliente A legge codice e invia augurio consentito. Entro ~4s, B vede conteggio/avviso; apre lista senza perdere QR e Approva. Entro ~4s più attesa per calendario/arrivi, TV mostra nuovo biglietto per12s.
4. Per dedica contanti, confermare QR come sempre: una sola pallina. Se dedica pending, B la trova nella stessa lista e approva; entro poll15s TV mostra cartolina sulla pallina già presente senza cambiare count.
5. Due volontari decidono stesso ID: uno ottiene successo, altro già elaborato. Test sospetto deve restare pending da sottoporre al moderatore; testo rifiutato non appare.
6. Revocare da moderazione ordinaria: al successivo poll il testo sparisce. Ricaricare TV: niente falso reveal/new-wish iniziale. Verificare fisicamente leggibilità/HDMI e rete.

## Pubblicazione
Nuova DEMO autorizzata dal piano: richiesta soltanto dopo test/build; verifica della versione sul dominio pubblico riportata separatamente. Include pulsante effetti opzionali e stato musica in preparazione già approvati nel piano, mai attivazione musicale. Gmail QA resta bloccato per ruolo e non è stato modificato.