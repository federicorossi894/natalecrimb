# Casetta — registro cartaceo del 23 novembre 2026

Il 23 novembre la cassa era in modalità `test`; gli incassi reali sono stati annotati a mano, quindi non risultano in `casetta_sales` come operazioni LIVE. La registrazione del giorno è stata importata nel database come **venduto storico reale** tramite `0035_casetta_cartaceo_23nov_mattina_pomeriggio.sql`.

## Vendite del 23/11

| Prodotto | Mattina | Pomeriggio | Totale pezzi | Prezzo storico | Totale |
|---|---:|---:|---:|---:|---:|
| Cioccolatini | 1 | 1 | **2** | 10 € | **20 €** |
| Riso 500 g | 12 (2 + 10) | 12 (2 + 1 + 1 + 8) | **24** | 5 € | **120 €** |
| Tisane | 3 | 3 | **6** | 5 € | **30 €** |
| Confezione tè | 1 | 1 | **2** | 5 € | **10 €** |
| **Totale** | **17** | **17** | **34** | | **180 €** |

### Incassi distinti, senza attribuzioni inventate

| Fonte | Contanti | POS | Metodo non rilevato | Totale |
|---|---:|---:|---:|---:|
| Mattina, tabella | — | — | 90 € | 90 € |
| Pomeriggio, elenco | 20 € | 70 € | 0 € | 90 € |
| **23/11** | **20 €** | **70 €** | **90 €** | **180 €** |

Nel dettaglio del pomeriggio: 3 tisane contanti (15 €), 2 riso POS (10 €), 1 tè POS (5 €), 1 cioccolatini POS (10 €), 1 riso POS (5 €), 1 riso contanti (5 €), 8 riso POS (40 €). Non sono disponibili nominativi né orari esatti delle operazioni. Il prezzo storico dei cioccolatini è **10 €** secondo entrambi i registri; **il listino attuale resta 7 €**.

La tabella privata `casetta_paper_sale_lines` conserva 11 righe e metodo di pagamento di ciascuna. `casetta_preuse_sales` conserva quattro aggregati giornalieri; i report sommano **una sola volta** ciascuna vendita. L'export Excel genera righe di mattina e pomeriggio preservando i pagamenti quando noti.

## Giacenze e verifiche

Per riso 500 g e cioccolatini l'apertura originaria era già stata confermata come antecedente al 21 novembre: `stock_reconciliation='apply_to_opening'`. Per tisane e tè, di cui manca un magazzino iniziale, la disponibilità resta **sconosciuta** (non zero). Le vendite del 24/11 si scaricano automaticamente perché LIVE e sono indipendenti dal registro cartaceo del 23/11.

Rimanenze teoriche verificate alla chiusura del **24 novembre**, includendo 21, 23 e venduto digitale 24, ma **senza dati di vendita del 22 novembre**:

| Prodotto | Giacenza teorica |
|---|---:|
| Panettone scatola | 99 |
| Panettone latta | 25 |
| Pandoro | 10 |
| Cioccolatini | 66 |
| Riso 500 g | 16 |
| Riso 1 kg | 8 |
| Tisane, tè, bastoncini | Da censire |

L'assenza delle vendite cartacee del **22/11** è un limite importante: non considerare questi numeri come inventario fisico verificato. Recuperare il registro del 22 novembre prima di confermare i riordini. Non generare ricevute o email retroattive per gli acquisti storici; nessuna modifica alla modalità LIVE corrente o al cron delle 19.

## Verifica economica

- Registri 21/11: 526 €.
- Venduto 23/11: 180 €.
- Vendite LIVE 24/11 al controllo: 44 €.
- **Cumulativo registrato al 24/11: 750 €**, con **22/11 ancora mancante**.

La migrazione può essere rieseguita senza duplicare righe, grazie alle chiavi primarie e ai controlli di coerenza. Una correzione futura dei fogli richiede revisione esplicita, non sovrascritture silenziose.
