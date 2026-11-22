# Cassa Casetta · CRI Monza (novembre 2026)

## Utilizzo
- URL: **https://natale.crimonza.org/cassa**. Nessun QR, codice, login o area amministrativa.
- Aperta **08:00–20:00 ora italiana**, controllo server nel database; dopo le 20:00 le vendite vengono rifiutate anche se la pagina è rimasta aperta.
- Il volontario tocca le icone, cambia quantità, seleziona **Contanti** o **POS** (POS fisico, non integrazione), può inserire email facoltativa, controlla e conferma.
- Nome e cognome del cliente sono obbligatori e devono coincidere con il blocchetto delle offerte. L'email viene richiesta solo se il cliente spunta esplicitamente la casella per ricevere il ringraziamento.
- La cassa non è un registratore fiscale; il POS va effettivamente incassato sul terminale e il contante va riconciliato.
- Chiunque conosca l'URL può registrare vendite: limitazioni anti-abuso e assenza dalla sitemap riducono il rischio, **non garantiscono che sia solo per volontari**.

## Listino dalla foto del 22/11/2026
| Prodotto | Euro |
|---|---:|
| Panettone cartone | 14 |
| Panettone / Pandoro latta | 16 |
| Cioccolatini | 8 |
| Tisane etiche | 5 |
| Riso 500 g | 5 |
| Riso 1 kg | 8 |
| Tè verde / rosso | 5 |
| Bastoncino di zucchero | 3 |

Modifiche al listino solo via SQL/codice, nessuna pagina amministrativa.

## Test e produzione
- `casetta_settings.mode` nasce `test`. Le vendite di prova restano salvate ma **non contano** nei report e **non inviano email**.
- Dopo collaudo e verifica email, passare a `live` con `UPDATE public.casetta_settings SET mode='live' WHERE singleton=true;`.
- Tutte le tabelle dedicate hanno RLS e solo `service_role` può usarle. Non modificare i flussi di donazioni online.

## Email
- Da **natale@crimonza.org** tramite connessione Gmail già usata dal sito.
- **amministrazione@crimonza.org**: totale giornata, contanti, POS, numero vendite, cumulativo e grafico ultimi 7 giorni.
- **Michela.cirla@crimonza.org**: stessi numeri, quantità per prodotto, grafico orario oggi vs media dei giorni precedenti e grafico 7 giorni.
- **Cliente (facoltativa, solo su richiesta)**: conferma non fiscale personalizzata con articoli, importo e invito a `/regali`.
- Alle **20:00** (primo tick disponibile dello scheduler) parte il report della giornata. Il job lavora ogni 2 minuti dalle 08:00 alle 20:59 (CET) e invia ricevute pendenti; il DB impedisce doppi report. Un esito Gmail ambiguo viene segnalato per verifica, non ritentato automaticamente per evitare duplicati.

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

Job attivato il 22 novembre 2026 in modalità prova: non invia email finché la cassa resta in modalità test. Stop a fine campagna:
`SELECT cron.unschedule('natale-2026-casetta-automation');`.

## Controlli obbligatori
1. Compilazione e test (typecheck, Vitest, build) prima del merge.
2. Migrazione SQL provata in transazione con rollback e vendita duplicata idempotente.
3. In test mode: vendite di prova 8 prodotti, POS, contanti, email non inviate, chiusura 20:00.
4. In live mode: un acquisto controllato, una email cliente, report e scheduler verificati; controllare stato `casetta_sales.receipt_state` e `casetta_report_dispatch`.
5. Riconciliazione contanti/POS e audit delle vendite. Non assumere che il solo riepilogo corrisponda al denaro reale.

**Nota**: il grafico "oggi vs media" confronta la fascia oraria odierna con la media dei giorni precedenti con vendite registrate. Non misura ingressi o affluenza. Le quantità vendute non equivalgono alle giacenze.

## Stato operativo 22 novembre 2026
- Modalità **live** attivata: 8 prodotti, 0 vendite live al momento dell'attivazione; 4 vecchie vendite di test escluse dai report.
- Nome e cognome obbligatori e email con checkbox facoltativa. Validazione server e database.
- Report di Manuela e Michela alle 20:00 da `natale@crimonza.org`; link Excel personale valido 7 giorni, con tutti i pagamenti live fino alla data del report e colonne quantità per ogni prodotto. Il token è salvato solo come SHA-256; non pubblicare né inoltrare il link.
- Verificati: typecheck/test/build cassa, migrazione 0024, RPC vendita nominativa e export con rollback, download XLSX HTTP 200 con firma ZIP, scheduler autenticato HTTP 200 prima delle 20.
- **Non ancora verificata la consegna effettiva di una email Gmail live**: primo report alle 20:00; controllare stati `casetta_report_dispatch` e `casetta_sales.receipt_state` dopo il primo invio.
