# Cassa digitale casetta — attivazione controllata (2026)

## Separazione dei sistemi
La cassa è una funzione **nuova e isolata** su `https://natale.crimonza.org/cassa`.
NON modifica né usa `live_donations`, `live_ornaments`, pagamenti PayPal/SumUp online, né il vecchio flusso volontari.
Il metodo "POS" registra un incasso già effettuato sul terminale fisico; **non incassa**.
Tutti i dati sono in centesimi di euro, prezzi salvati come snapshot in ciascuna vendita.

## Sicurezza
- Il QR porta un segreto casuale da 256 bit. Niente password per i volontari, ma **chiunque possieda il QR può registrare vendite**: non pubblicarlo sui social, non esporlo nella casetta all'esterno, ruotarlo se fotografato, usare un QR diverso per ciascun tablet.
- La pagina rimuove subito il token dalla barra URL e usa un cookie HttpOnly Secure SameSite=Strict. Accessi revocabili da DB.
- Tabelle RLS, nessun permesso `anon` o `authenticated`; RPC solo `service_role`. Nessuna API di emissione QR pubblica.
- Ogni conferma usa un UUID di idempotenza: un doppio tap o retry non crea doppia vendita.
- Non sono previste vendite offline: se manca rete, nessuna conferma.
- La pagina /cassa non è in sitemap e ha `noindex`.

## Checklist di attivazione — NON procedere senza dati e test
1. Ricevere **listino ufficiale completo** (varianti e prezzi; non inventare).
2. Ricevere indirizzi esatti per **amministrazione** e **Michela** (stock).
3. Applicare la migrazione `drizzle/migrations/0023_casetta_cassa.sql` su DB collegato solo dopo review e test.
4. Configurare i prodotti; esempi (sostituire prezzi con listino reale):
   ```sql
   -- NON eseguire senza prezzi verificati:
   -- UPDATE public.casetta_products SET price_cents = <centesimi_verificati>, active = true WHERE id = 'panettone';
   ```
   Inserire varianti (es. panettone in latta) come SKU separati con prezzo proprio.
5. Inserire destinatari (solo indirizzi verificati):
   ```sql
   -- INSERT INTO public.casetta_report_recipients(audience,email) VALUES
   -- ('finance','amministrazione@dominio-verificato.it'),
   -- ('stock','michela@dominio-verificato.it');
   ```
6. Generare QR **solo su server/database service-role**, per ogni tablet:
   ```sql
   SELECT public.casetta_issue_key('Tablet casetta 1',45);
   ```
   La risposta è un segreto da usare UNA VOLTA per creare il QR:
   `https://natale.crimonza.org/cassa?access=TOKEN`.
   **Non committare il token**, non inserirlo in documenti pubblici.
   Revoca: `UPDATE public.casetta_access_keys SET revoked_at=now() WHERE label='Tablet casetta 1';`
7. Collaudo con prodotto TEST dedicato non confondibile con vendite vere, oppure in ambiente di staging. Verificare quantità, totale, cash/POS, doppio tap, retry, QR revocato, giorno Italia e report. Eliminare dati test prima del go-live.
8. Configurare scheduler solo DOPO verifica Gmail e destinatari, usando token già presente in Vault. A 00:15 UTC viene inviato il giorno precedente nel fuso Europe/Rome.
   ```sql
   -- ESEGUIRE SOLO DOPO COLLAUDO
   -- SELECT cron.schedule('casetta-2026-daily-report','15 0 * * *',$cron$
   --   SELECT net.http_post(
   --     url := 'https://natale.crimonza.org/api/internal/casetta-daily-report',
   --     body := '{}'::jsonb,
   --     headers := jsonb_build_object(
   --       'Content-Type','application/json',
   --       'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets
   --        WHERE name='natale_2026_cron_token' LIMIT 1)),
   --     timeout_milliseconds := 20000);
   -- $cron$);
   ```
   Fermare il job dopo il 7 gennaio: `SELECT cron.unschedule('casetta-2026-daily-report');`
9. Report email: amministrazione riceve solo transazioni, totale, contanti e POS; Michela riceve gli stessi numeri **più quantità per prodotto**. Non è un inventario con giacenze (mancano carichi e scorte iniziali). Per riordini automatici futuri servirebbe un magazzino.
10. Riconciliare incassi con contanti reali e riepilogo terminale POS. La cassa non è un registratore fiscale e non sostituisce gli obblighi contabili/fiscali applicabili.

## Stato attuale
**Codice preparato in branch GitHub. Non operativo finché migrazione, listino, destinatari, QR, collaudo e scheduler non sono completati.**
