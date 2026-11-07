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

`campaignCapabilities()` deriva capacità effettive dalla modalità e dai prerequisiti verificati. `cashRequested` e `wishWallRequested` rappresentano la matrice desiderata, **non** autorizzazioni operative. Attualmente tutti i prerequisiti LIVE sono falsi: cambiare modalità non inventa un gateway né abilita incassi.

## Confini e stato realmente implementato
- Le azioni DEMO esistenti passano da `campaign-rpc.ts` alle funzioni server; il server controlla modalità e allowlist. Le operazioni staff verificano sessione e ruolo con il client dell'operatore; il dispatcher DB ripete la verifica dell'attore.
- La migrazione `0008_campaign_demo_server_boundary.sql` revoca l'esecuzione diretta a pubblico/anon/autenticati di tutte le RPC albero, contanti e auguri, senza eliminarle né cambiare righe. Il dispatcher è eseguibile solo dal servizio server; mantiene validazioni, consenso, scadenze e lock originali.
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

## Informazione fiscale
Approfondimento generale espandibile vicino alle informazioni donazione, senza percentuali, massimali, IBAN o condizioni di altri Comitati. Le simulazioni non generano benefici/ricevute; per applicazione locale e gestione ricevute è necessaria verifica amministrativa. Nessuna promessa automatica per contanti o acquisti.