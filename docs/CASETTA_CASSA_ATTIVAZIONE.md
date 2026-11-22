# Cassa Casetta · CRI Monza (novembre 2026)

## Utilizzo
- URL: **https://natale.crimonza.org/cassa**. Nessun QR, codice, login o area amministrativa.
- Aperta **08:00–20:00 ora italiana**, controllo server nel database; dopo le 20:00 le vendite vengono rifiutate anche se la pagina è rimasta aperta.
- Il volontario tocca le icone, cambia quantità, seleziona **Contanti** o **POS** (POS fisico, non integrazione), può inserire email facoltativa, controlla e conferma.
- Nome e cognome del cliente sono obbligatori e devono coincidere con il blocchetto delle offerte. L'email viene richiesta solo se il cliente spunta esplicitamente la casella per ricevere il ringraziamento.
- Il registro cartaceo storico viene importato come totale aggregato e non genera ricevute individuali. La cassa non è un registratore fiscale; il POS va effettivamente incassato sul terminale e il contante va riconciliato.
- Chiunque conosca l'URL può registrare vendite: limitazioni anti-abuso e assenza dalla sitemap riducono il rischio, **non garantiscono che sia solo per volontari**.

## Listino digitale provvisorio (prezzi da confermare con Guido)
| Prodotto | Euro |
|---|---:|
| Panettone cartone | 14 |
| Panettone in latta | 16 |
| Pandoro | 16 (provvisorio) |
| Cioccolatini | 10 |
| Tisane etiche | 5 |
| Riso 500 g | 5 |
| Riso 1 kg | 8 |
| Tè verde / rosso | 5 |
| Bastoncino di zucchero | 3 |

Modifiche al listino solo via SQL/codice, nessuna pagina amministrativa.

## Test e produzione
- `casetta_settings.mode` nasce `test`. Le vendite di prova restano salvate ma **non contano** nei report e **non riducono il magazzino**. Se il cliente spunta la richiesta, parte una ricevuta DEMO chiaramente marcata come simulazione; i report gestionali delle 19:00 restano sospesi.
- Dopo collaudo e verifica email, passare a `live` con `UPDATE public.casetta_settings SET mode='live' WHERE singleton=true;`.
- Tutte le tabelle dedicate hanno RLS e solo `service_role` può usarle. Non modificare i flussi di donazioni online.

## Email
- Da **natale@crimonza.org** tramite connessione Gmail già usata dal sito.
- **amministrazione@crimonza.org**: totale giornata, contanti, POS, numero vendite, cumulativo e grafico ultimi 7 giorni.
- **monza.sviluppo@lombardia.cri.it**: stessi numeri, quantità per prodotto, grafico orario oggi vs media dei giorni precedenti e grafico 7 giorni.
- **CCN Federico**: federico.rossi@crimonza.org per entrambi i report gestionali; in DEMO anche per le ricevute cliente, ma non per quelle reali.
- **Cliente (facoltativa, solo su richiesta)**: conferma non fiscale personalizzata con articoli, importo e invito a `/regali`.
- Alle **19:00 ora italiana** (primo tick disponibile dello scheduler) parte il report della giornata, solo in LIVE. L'orario operativo della cassa continua a consentire inserimenti fino alle 20:00; le vendite registrate dopo le 19:00 richiederanno riconciliazione aggiuntiva, perché il recap giornaliero è già stato inviato. Il job lavora ogni 2 minuti dalle 08:00 alle 20:59 (CET) e invia ricevute pendenti; il DB impedisce doppi report. Un esito Gmail ambiguo viene segnalato per verifica, non ritentato automaticamente per evitare duplicati.

## Cron (solo dopo deploy, migrazione e collaudo)
Il token `natale_2026_cron_token` esiste già in Supabase Vault.
Il job usa lo stesso autenticatore delle altre automazioni del sito.

```sql
SELECT cron.schedule('natale-2026-casetta-automation','*/2 7-19 * 11,12 *',$job$
  SELECT net.http_post(
    url := 'https://natale.crimonza.org/api/internal/casetta-daily-report',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||(
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name='natale_2026_cron_token' LIMIT 1)),
    timeout_milliseconds := 30000);
$job$);
```

Job attivato il 22 novembre 2026 in modalità prova: invia le sole ricevute DEMO richieste, non i report gestionali delle 19:00. Stop a fine campagna:
`SELECT cron.unschedule('natale-2026-casetta-automation');`.

## Controlli obbligatori
1. Compilazione e test (typecheck, Vitest, build) prima del merge.
2. Migrazione SQL provata in transazione con rollback e vendita duplicata idempotente.
3. In test mode: vendite di prova 9 prodotti, POS, contanti, ricevute DEMO su richiesta, nessun report gestionale, chiusura 20:00.
4. In live mode: un acquisto controllato, una email cliente, report e scheduler verificati; controllare stato `casetta_sales.receipt_state` e `casetta_report_dispatch`.
5. Riconciliazione contanti/POS e audit delle vendite. Non assumere che il solo riepilogo corrisponda al denaro reale.

**Nota**: il grafico "oggi vs media" confronta la fascia oraria odierna con la media dei giorni precedenti con vendite registrate. Non misura ingressi o affluenza. Le quantità vendute non equivalgono alle giacenze.

## Stato operativo 22 novembre 2026
- **Modalità DEMO (test) confermata**: 9 prodotti (panettone latta e pandoro separati); zero vendite reali. I test non entrano negli incassi e non scalano le giacenze.
- **Magazzino iniziale Michela** (prima delle vendite del 21/11): 100 panettoni in scatola, 36 in latta, 10 pandori, 73 cioccolatini, 60 riso 500 g, 12 riso 1 kg. **Rimanenze dopo il venduto del 21/11: 99, 25, 10, 70, 40, 8** rispettivamente. Tisane, tè e bastoncini ancora da censire.
- **21/11 registrato e riconciliato per i sei prodotti censiti**: 77 articoli, 526 € su 8 righe aggregate; metodo di pagamento sconosciuto. I cinque prodotti con vendite e apertura nota sono marcati `apply_to_opening`, senza riscrivere la giacenza iniziale; il pandoro non ha avuto vendite. Le giacenze di tisane, tè e candy cane rimangono sconosciute. Dettagli in docs/CASETTA_RICONCILIAZIONE_21_NOVEMBRE_2026.md.
- Tè confermato a 5 € e cioccolatini portati a 10 € nel database. Prezzo del pandoro ancora da confermare con Guido.
- Email a Manuela (amministrazione) e a Michela (sviluppo) con Federico in CCN: **solo dopo LIVE**, dopo le 19:00; Michela riceve gli avvisi evidenti per scorte basse/esaurite e giacenze da censire.
- Ricevuta cliente DEMO: opzionale, marcata simulazione, con Federico in CCN. Ricevute reali senza CCN a Federico per minimizzare la diffusione dei dati cliente.
- **Consegna Gmail non ancora verificata end-to-end**: non dichiarare gli invii riusciti senza controllare esiti e casella destinatario.
- Prima di LIVE: conferma di Guido, conteggi mancanti per tisane/tè/bastoncini, import cartaceo del 22/11 quando disponibile, collaudo reale della mail e riconciliazione POS/contanti. La giacenza nota del 21/11 è già riconciliata.
