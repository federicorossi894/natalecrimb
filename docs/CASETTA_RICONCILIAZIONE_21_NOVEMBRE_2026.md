# Casetta CRI Monza — pre-utilizzo cassa, 21 novembre 2026

Fonte: due registri cartacei dei turni 10–14 e 14–18, trascritti il 22/11/2026. I valori sono stati confermati dall'organizzatore come venduto del 21/11 e registrati nel database operativo come **pre-utilizzo cassa**.

| Prodotto | Pezzi | Prezzo | Importo |
|---|---:|---:|---:|
| Panettone in latta | 11 | 16 € | 176 € |
| Cioccolatini | 3 | 10 € | 30 € |
| Riso 500 g | 20 | 5 € | 100 € |
| Riso 1 kg | 4 | 8 € | 32 € |
| Tisane | 24 | 5 € | 120 € |
| Tè | 6 | 5 € | 30 € |
| Panettone in scatola | 1 | 14 € | 14 € |
| Candy cane | 8 | 3 € | 24 € |
| **Totale** | **77** | | **526 €** |

I dati sono registrati per prodotto nella tabella privata `casetta_preuse_sales`: **otto righe aggregate, non 77 transazioni individuali**. Non sono noti i nomi degli acquirenti, gli orari esatti né la ripartizione contanti/POS. Non attribuire dati di pagamento inventati e non spedire ricevute retroattive. La tabella ha chiave `(sale_day,product_id)` e l'importazione SQL usa `ON CONFLICT DO NOTHING` per evitare duplicazioni.

I report finanziari includono i 526 € nella giornata del 21/11 e nel cumulativo; li mostrano separatamente come `preUseCents` e `unallocatedCents`. L'Excel ha la colonna **Origine**, con `Pre-utilizzo cassa` e `Non rilevato` per i pagamenti storici. Il grafico delle ore non inventa timestamps.

## Scorte registrate il 22/11/2026

- Panettone scatola: 100
- Panettone latta: 36
- Pandoro: 10
- Cioccolatini: 73
- Riso 500 g: 60
- Riso 1 kg: 12
- Tisane, tè e bastoncini: **DA CENSIRE**

**Manca una sola informazione cruciale:** queste sei quantità sono state contate prima o dopo le vendite del 21 novembre? Finché non è chiaro, le vendite storiche hanno `stock_reconciliation='pending'`, sono visibili nello storico e negli avvisi di magazzino, ma **NON** scalano nuovamente le sei giacenze comunicate il 22/11. Quando si conferma la base, impostare per singolo articolo `apply_to_opening` (quantità 22/11 pre-vendite) oppure `already_in_count` (già comprese nel conteggio). Non cambiare tali stati senza evidenza.

## Invio e DEMO

- Il report giornaliero è programmato a partire dalle **19:00 Europe/Rome** (primo tick del job ogni 2 minuti), e parte solo quando `casetta_settings.mode='live'`.
- La modalità **DEMO resta attiva fino al via libera di Guido**; le ricevute DEMO su richiesta continuano, i report gestionali no.
- Il listino corrente mostra cioccolatini 10 € e tè 5 €.
- L'orario della cassa (08:00–20:00) è per ora distinto dall'orario del report; eventuali operazioni successive alle 19 non compaiono nel riepilogo già inviato. Da verificare operativamente prima di LIVE.
