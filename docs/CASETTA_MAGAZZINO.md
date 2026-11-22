# Magazzino della Casetta — CRI Monza

## Regole operative
- Unità di magazzino = **una confezione vendibile**, non il peso. Riso 500 g e riso 1 kg sono due SKU distinti. Se Michela scrive "4 kg di riso", chiedere il numero di confezioni da 500 g e da 1 kg prima di aggiornare.
- **DEMO**: nessuna vendita di prova modifica la giacenza; nessun riepilogo automatico a Michela/Manuela. La ricevuta al cliente, se richiesta, è marcata DEMO.
- **LIVE (solo dopo approvazione di Guido)**: ogni vendita reale scala il magazzino tramite i dati già registrati nella cassa; non serve modificare il modulo della cassa.
- Giacenza teorica = apertura + somma rifornimenti/correzioni − somma vendite reali.
- Se manca il conteggio iniziale, la giacenza è **sconosciuta**, non zero. La mail lo segnala come "Da censire".
- Soglia provvisoria = **5 confezioni per prodotto**. Da personalizzare con Michela. Allerta se residuo ≤ soglia; "ESAURITO" se residuo ≤ 0. Il magazzino non blocca le vendite: una giacenza negativa segnala una discrepanza da verificare.
- La mail di Michela alle 20:00 include giacenze teoriche, vendite e rifornimenti del giorno, allerta scorte basse/esaurite. Quella di Manuela non mostra giacenze.
- Non esiste una nuova schermata per il personale. I carichi sono effettuati tramite SQL amministrativo su richiesta esplicita dell'utente, con nota e riferimento univoco; non usare crediti Lovable per i carichi.
- I dati di giacenza sono privati: RLS attiva, nessuna autorizzazione ad anon/authenticated.

## Prima attivazione
La migrazione `drizzle/migrations/0026_casetta_inventory.sql` deve essere applicata al database **effettivamente usato** da `natale.crimonza.org`. Il progetto Lovable non è lo stesso del progetto Supabase autonomo denominato "natale". Non scrivere su un database diverso.

Richiedere una volta sola le giacenze iniziali per tutti gli otto prodotti. Esempio:
```sql
UPDATE public.casetta_inventory_config
SET opening_qty=20, initialized_at=now(), updated_at=now(), low_stock_threshold=5
WHERE product_id='panettone_cartone' AND opening_qty IS NULL
RETURNING product_id,opening_qty,low_stock_threshold;
```
Controllare che la query aggiorni esattamente una riga. Se la giacenza iniziale è già impostata, non sovrascriverla: concordare una correzione con nota.

## Rifornimenti
Con messaggio "Sono arrivati 10 panettoni cartone, 12 tisane" inserire due movimenti distinti, in una transazione. Generare un `external_ref` unico e stabile per la consegna per evitare doppioni in caso di retry:
```sql
BEGIN;
INSERT INTO public.casetta_inventory_movements
 (product_id,kind,delta_qty,note,external_ref)
VALUES
 ('panettone_cartone','restock',10,'Rifornimento comunicato da Michela','carico-20261124-001-panettone'),
 ('tisane_etiche','restock',12,'Rifornimento comunicato da Michela','carico-20261124-001-tisane')
ON CONFLICT(external_ref) DO NOTHING;
SELECT public.casetta_inventory_snapshot((now() AT TIME ZONE 'Europe/Rome')::date);
COMMIT;
```
Verificare che il numero di righe inserite sia quello atteso e confermare le nuove giacenze all'utente. Non attribuire un rifornimento a un giorno diverso da quello comunicato senza conferma.

## Consultazione
```sql
SELECT public.casetta_inventory_snapshot((now() AT TIME ZONE 'Europe/Rome')::date);
```
Risultato per ogni prodotto: `openingQty`, `receivedToday`, `soldToday`, `availableQty`, `thresholdQty`, `status`.

## Limiti
- La giacenza è una stima basata su cassa e rifornimenti, non un inventario fisico certificato. Scarti, omaggi, resi e perdite vanno registrati come correzioni dopo conferma.
- L'applicazione della migrazione e il deploy del codice richiedono accesso effettivo al database e all'hosting. Non dichiararli completati finché non verificati.
