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
