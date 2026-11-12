# Il Natale che fa bene — Piano operativo minimo per la privacy e la chiusura

**12 novembre 2026.** Documento interno, non linkato dalla navigazione pubblica.

## Decisioni del Comitato comunicate dal responsabile del progetto
- La campagna è temporanea: al termine della presenza della casetta, il sito verrà dismesso.
- Non è previsto un elenco di donatori da riutilizzare per newsletter o promozioni.
- Non verrà conservato un archivio pubblico delle dediche e delle palline.
- Le email già spedite possono rimanere nelle caselle email, salvo diverse impostazioni/azioni legittime.
- I dati obbligatori di pagamento/contabilità e i log tecnici possono avere termini autonomi e non sono automaticamente cancellati rimuovendo il sito.

## Elementi verificati sul codice e sul database
1. Il database operativo **esiste**: durante la DEMO vi sono `demo_ornaments`, `online_gift_mails`, e durante il LIVE `live_donations`, `live_ornaments`, oltre a eventuali altri dati di campagna.
2. Email DEMO: la tabella `online_gift_mails` conserva hash del destinatario, esito e identificativi tecnici, non una rubrica per newsletter. Gmail può conservare il messaggio effettivamente spedito.
3. Email LIVE: `live_donations` ha indirizzo e contenuto transitorio per la consegna, stato e audit; la funzione `finish_donation_email` azzera indirizzo e contenuto dopo invio accettato/soppresso. Stati ambigui possono richiedere riconciliazione.
4. `localStorage` e `sessionStorage` mantengono alcuni identificativi e progressi sul dispositivo. Cancellare il sito non azzera automaticamente i dati già sui dispositivi.
5. Google Fonts è caricato da un dominio Google. È disponibile una funzionalità di analisi delle visite della piattaforma di hosting; prima di LIVE verificare quali strumenti/statistiche siano abilitati e l'eventuale presenza di cookie non tecnici.
6. Durante i pagamenti LIVE, i prestatori SumUp e PayPal e la documentazione contabile possono richiedere conservazioni ulteriori.

## Tre conferme organizzative prima del LIVE
- [ ] **Privacy/RPD:** confermare se il Comitato di Monza ha un RPD/DPO competente per la campagna, relativo recapito e contatti effettivi; integrare il sito ove necessario.
- [ ] **Fornitori e trasferimenti:** verificare su Lovable Cloud, Google Workspace/Gmail, Google Fonts e provider di pagamento nominativi contrattuali, localizzazione, eventuali trasferimenti fuori SEE, politiche backup/log e strumenti analytics/cookie non tecnici.
- [ ] **Data di chiusura:** annotare l'ultimo giorno effettivo della casetta, fissare chi esegue cancellazione applicativa e verificare l'eventuale conservazione obbligatoria della documentazione contabile.

## Chiusura campagna: sequenza concreta
1. Disattivare nuove donazioni e invii. Verificare esiti SumUp/PayPal, webhook, riconciliazioni e messaggi programmati rimasti in coda; evitare cancellazioni che interrompano pagamenti o regali.
2. Eliminare dal sito pubblico l'albero e le dediche, quindi sospendere dominio/hosting quando opportuno.
3. Eliminare i dati applicativi non più necessari dalle tabelle di campagna (inclusi demo, dediche, messaggi e hash di email) **soltanto dopo** aver isolato e conservato in ambiente amministrativo adeguato i documenti fiscali e contabili che la legge richiede. Non cancellare indiscriminatamente `live_donations` o le prove di pagamenti ancora da riconciliare.
4. Controllare le cartelle «Posta inviata» e i termini di conservazione in Google Workspace, gli audit Gmail, il ciclo delle copie di sicurezza e dei log del fornitore, e la procedura di dismissione degli accessi.
5. Registrare internamente data e risultato delle operazioni e il responsabile dell'esecuzione; completare l'eliminazione dei dati operativi dopo i tempi tecnici dichiarati dai fornitori.
6. Conservare una copia **non pubblica** dell'informativa effettivamente visibile durante la raccolta e della prova delle scelte di pubblicazione, nella misura necessaria per l'accountability e in modo non eccedente.

## Nota
Il presente documento non costituisce una consulenza legale né sostituisce la verifica del titolare: non dichiarare mai «nessun dato salvato» o «tutto eliminato» finché le operazioni sopra non sono state eseguite e documentate.
