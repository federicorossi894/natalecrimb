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

**Conferma dell'organizzatore (22/11):** le quantità di Michela sono il **magazzino iniziale, prima delle vendite del 21 novembre**. Ho registrato la riconciliazione nel database con `stock_reconciliation='apply_to_opening'` per i cinque prodotti con giacenza iniziale nota e venduto positivo, mediante `drizzle/migrations/0030_casetta_stock_michela_opening_20261121.sql`. Il pandoro non è stato venduto il 21 novembre, perciò rimane 10.

| Prodotto | Magazzino iniziale | Vendite 21/11 | Giacenza teorica dopo il 21/11 |
|---|---:|---:|---:|
| Panettone in scatola | 100 | 1 | **99** |
| Panettone in latta | 36 | 11 | **25** |
| Pandoro | 10 | 0 | **10** |
| Cioccolatini | 73 | 3 | **70** |
| Riso 500 g | 60 | 20 | **40** |
| Riso 1 kg | 12 | 4 | **8** |

Le vendite del 21 novembre di tisane (24), tè (6) e candy cane (8) **restano contabilizzate** come vendite storiche, ma non esiste ancora un magazzino iniziale per calcolarne la giacenza residua. Per questi tre SKU lo stato resta `pending` e la disponibilità è **sconosciuta**, non zero. Quando arriva un conteggio fisico bisogna stabilire a quale data si riferisce e applicare la correzione in modo coerente, senza sottrarre nuovamente il 21/11 se già compreso.

Al momento delle verifiche non risultavano vendite in modalità LIVE né movimenti manuali di magazzino. Le vendite del **22 novembre** devono essere importate come storico cartaceo del 22/11 quando arriveranno i registri, senza attribuire nomi/metodi inventati, e senza passare in LIVE finché Guido non autorizza. La cassa digitale dovrebbe diventare il canale ordinario dal 23/11 dopo approvazione e collaudo.

## Invio e DEMO

- Il report giornaliero è programmato a partire dalle **19:00 Europe/Rome** (primo tick del job ogni 2 minuti), e parte solo quando `casetta_settings.mode='live'`.
- La modalità **DEMO resta attiva fino al via libera di Guido**; le ricevute DEMO su richiesta continuano, i report gestionali no.
- Il listino corrente mostra cioccolatini 10 € e tè 5 €.
- L'orario della cassa (08:00–20:00) è per ora distinto dall'orario del report; eventuali operazioni successive alle 19 non compaiono nel riepilogo già inviato. Da verificare operativamente prima di LIVE.
