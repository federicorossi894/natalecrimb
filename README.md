# Il Natale che fa bene · CRI Monza

Current deployment: `SITE_EXPERIENCE=ONLINE_GIFT`, `ACTIVE_CAMPAIGN_MODE=DEMO`.

Public payments are simulations only. Shared demo ornaments persist in Cloud; private postcard names/messages remain on the device. Manual Gmail QA is protected, fixed From/To Federico, 10-minute/3-per-day durable claims. Connected Gmail does not authorize the app account.

## Rollback
Change only `SITE_EXPERIENCE` in `src/lib/site-experience.ts` to `FULL`, run tests, and publish. Do not change campaign mode or readiness. TV/audio, shared volunteer review/cash/wishes and all records remain preserved.

See `docs/ONLINE_GIFT_DEMO_2026-11-09.md` for routes, tests and exact limitations.

## Historical initial brief (superseded)

# Monza's Gift Tree

Crea una NUOVA DEMO VISIVA mobile-first per una campagna natalizia di Croce Rossa Italiana – Comitato di Monza. Nome di lavoro: “Il Natale che fa bene – Croce Rossa Monza”.

OBIETTIVO DI QUESTO TURNO
Voglio una demo navigabile e convincente del concept, NON un prodotto funzionante. Massima resa visiva con minimo consumo di crediti. Tutto ciò che sembra pagamento, invio email, WhatsApp, prenotazione, donazione, webhook, calendario o database deve essere SOLO simulato lato UI. Non creare backend, Supabase, autenticazione, Stripe/PayPal reali, webhook, scheduler, API, email reali, database o vero 3D/WebGL. Non installare dipendenze pesanti se non indispensabili. Usa dati mock locali. Tutti i pulsanti principali devono però essere cliccabili e portare a schermate/modali demo coerenti. Non chiedermi chiarimenti: scegli soluzioni eleganti e completa la demo in un solo passaggio.

CONTESTO
Per circa 40 giorni Croce Rossa Monza avrà una casetta nel Villaggio di Natale in PIAZZA SAN PAOLO, centro di Monza. Nella casetta: attività CRI, mercatino/gadget, panettoni e biscotti solidali, momenti sanitari come pressione/glicemia e iniziative/eventi. Un grande QR fisico porterà al sito.
Il concetto non è “dona genericamente”, ma “scegli quale regalo fare a Monza”: il visitatore sceglie un progetto concreto, scopre cosa fa CRI Monza in quell’ambito e simula una donazione destinata a quel progetto.
Mood: istituzionale CRI ma fortemente natalizio, emozionale, elegante e giocoso; NON infantile, NON e-commerce generico, NON template ONG. Rosso CRI, bianco, verde abete, tocchi oro caldo; neve e luci con microanimazioni leggere. Deve fare effetto wow soprattutto da smartphone.

HOME
Hero molto scenografico ma pulito:
“Questo Natale, scegli cosa regalare a Monza.”
Sottotitolo: “Non un regalo simbolico. Un aiuto concreto alle persone che vivono qui.”
CTA primaria “Scarta i regali”.
Riferimento evidente: “Croce Rossa Italiana – Comitato di Monza · Piazza San Paolo”.
Una piccola pill sempre visibile può dire “📍 Casetta CRI · Piazza San Paolo · Scopri cosa succede oggi”.
Crea una breve transizione/animazione di pacco che si apre quando si entra nei regali.

REGALI / PROGETTI
Crea un’esperienza visuale tipo albero/pacchi, non una griglia e-commerce piatta. Almeno:
1. “Regala calore” – sostegno alle persone senza dimora: coperte, bevande calde, vicinanza, unità di strada. Testo emozionale breve + sezione “Guarda cosa facciamo”.
2. “Regala un battito” – contribuire a un nuovo DAE / diffusione cultura del soccorso. Spiega in modo semplice che nei primi minuti di un arresto cardiaco servono persone capaci di intervenire e un DAE disponibile. Inserisci una progress bar DEMO verso un nuovo DAE. Poi: “Un DAE senza persone che sappiano usarlo non basta” con CTA ai corsi BLSD e primo soccorso. Queste CTA devono essere link esterni reali al sito CRI Monza:
https://www.crimonza.org/corso-blsd
https://www.crimonza.org/corso-di-primo-soccorso
e link area corsi:
https://www.crimonza.org/corsi-formazione
3. “Regala prossimità” – progetto Unità Mobile/Ambulatorio Mobile di Prossimità, per portare salute e supporto sul territorio.
4. “Dove serve di più” – cuore CRI / donazione libera.
Per ogni progetto: storia, cosa facciamo, importi demo 5/10/20/50/altro (adattali con buon senso), CTA “Fai questo regalo”. Specificare discretamente “Demo: nessun pagamento verrà effettuato”.

CHECKOUT DEMO
Schermata elegante che simuli importo e metodo: carta, PayPal, Apple Pay/Google Pay come semplici opzioni grafiche. Cliccando “Conferma regalo” NON deve partire nulla: mostra solo successo demo.
Success:
“🎁 Il tuo regalo è arrivato. Ora puoi regalarlo a qualcuno.”
Scelte:
- “È il mio regalo a Monza”
- “Dedicalo a qualcuno”
- “Fagli una sorpresa a Natale”

CARTOLINA
Se “Dedicalo”: form mock nome destinatario + dedica, poi popup/modal con una VERA ANTEPRIMA GRAFICA della cartolina natalizia CRI Monza, fronte/retro o card animata. Deve essere bella abbastanza da capire cosa riceverà davvero l’utente.
Pulsante “Condividi su WhatsApp” SOLO demo: mostra un toast/modal “Demo – nella versione reale si aprirà la condivisione WhatsApp”.
Opzione “Fagli una sorpresa a Natale”: mock nome, email, dedica; anteprima di una EMAIL NATALIZIA completa e ben disegnata con oggetto tipo “🎄 [Nome donatore] ti ha lasciato qualcosa sotto l’albero di Monza”.
Mostra “Consegna programmata · 24 dicembre · ore 00:05”. Pulsante “Programma sorpresa” SOLO demo e conferma finta. Non inviare email.
Testo email: comunica che la persona ha fatto a suo nome uno dei regali/progetti CRI e CTA “Scopri il tuo regalo”.

ALBERO DEI REGALI DI MONZA
Questa è una sezione centrale.
Per risparmiare crediti NON fare vero 3D. Crea un albero pseudo-3D/illustrato molto bello con CSS, layering, transform/parallax e animazioni leggere. Deve sembrare ricco e vivo.
Ogni donazione demo genera/mostra un addobbo simbolico:
- piccolo DAE per Regala un battito
- coperta/sciarpa per Regala calore
- mini unità mobile/camper per Regala prossimità
- cuore CRI per donazione libera.
Metti diversi addobbi mock già presenti. Alcuni hanno una dedica. Quando un addobbo viene evidenziato, deve potersi “girare” con effetto flip e mostrare sul retro una dedica tipo “Perché nessuno dovrebbe sentirsi solo a Natale. — Federico” oppure “Un regalo anonimo per Monza ❤️”.

IMPORTANTE: in QUESTA DEMO la pagina Albero deve mostrare principalmente la VERSIONE TV, non interattiva, per far capire cosa verrà proiettato sul grande schermo presso la casetta in Piazza San Paolo.
Inserisci in alto un badge/avviso elegante:
“DEMO · Questa è l’anteprima della modalità TV che verrà proiettata in Piazza San Paolo.”
Sotto, una nota:
“Nella versione definitiva del sito, da smartphone potrai ruotare l’albero, esplorare gli addobbi e leggere le dediche.”
La modalità TV deve simulare automaticamente:
- lenta rotazione/parallax dell’albero;
- luci/neve leggere;
- ogni tanto focus/zoom su un addobbo;
- flip automatico di almeno 2 addobbi con dedica, poi ritorno;
- simulazione di un nuovo addobbo che “arriva” e si appende all’albero;
- ogni tanto schermata/callout: “🎄 327 regali sono già appesi all’Albero di Monza. Il prossimo può essere il tuo.”
- grande QR CODE VISIVO DEMO con testo “Scansiona e appendi anche tu un regalo all’Albero di Monza” / “Scopri come fare il tuo regalo”.
Il QR nella demo può essere puramente illustrativo/non funzionante oppure puntare alla home della demo se è semplice: non perdere tempo/crediti per renderlo dinamico.
Prevedi route dedicata /albero-live pulita, fullscreen, pensata 16:9 per TV, senza navigazione, con autoplay delle animazioni. Nella normale pagina Albero includi anche spiegazione demo e link “Apri modalità TV”.

PIAZZA SAN PAOLO / CASETTA
Sezione “Oggi in Piazza San Paolo” con agenda MOCK chiaramente demo:
10:00–13:00 Mercatino solidale
14:00–18:00 Controllo pressione e glicemia
17:30 Dimostrazione manovre salvavita
Tutto il giorno Panettoni e biscotti solidali
Aggiungi vista semplice calendario dei 40 giorni / prossimi appuntamenti, senza backend. Evidenzia che gli orari sono “contenuti demo da confermare”.
Link al sito ufficiale CRI Monza: https://www.crimonza.org/

BABBO NATALE A DOMICILIO – SEZIONE SEPARATA
Inseriscila già nella demo, ma NON mischiarla alle normali donazioni. Nome provvisorio simpatico: “Prenota il tuo Babbo Natale 🎅”.
Aggiungi un avviso giocoso: “🤫 Area grandi: meglio non far leggere questa pagina ai bambini.”
Racconta il servizio: la famiglia prepara/consegna i propri regali secondo modalità che saranno definite; la sera del 24 dicembre volontari CRI nei panni di Babbo Natale e aiutanti li portano a domicilio creando la sorpresa.
IMPORTANTE: per Monza NON abbiamo ancora tariffa, area coperta, orari, modalità consegna regali o disponibilità confermati. NON inventare prezzi o regole. Mostra badge “Servizio in definizione · contenuti e disponibilità da confermare”.
Crea un flow PRENOTAZIONE SOLO DEMO con campi famiglia/indirizzo/numero bambini/fascia oraria/note, ma al submit mostra solo “Demo – nessuna prenotazione è stata inviata”.
Nella fase finale demo fai vedere il concetto futuro: “A quale progetto vuoi destinare il tuo contributo?” con Regala calore / Regala un battito / Regala prossimità / Dove serve di più. Non deve sembrare che una donazione normale dia diritto a Babbo Natale: questo servizio vive esclusivamente nella sua sezione.

AREA BAMBINI
Per ora NON costruire giochi complessi. Metti una bella card/teaser “Piccoli volontari di Babbo Natale” e, solo se costa pochissimo in termini di complessità, un mini-quiz di 3 domande completamente locale con schermata “Missione completata! Mostra questa schermata ai volontari della casetta”. Nessun backend. Se aumenta sensibilmente complessità, preferisci il teaser.

NAVIGAZIONE
Home / I regali / Albero di Monza / Oggi in Piazza / Babbo Natale / Piccoli volontari.
Footer con CRI Monza, sito ufficiale e icone social. Se non conosci URL social ufficiali esatti, non inventarli: metti placeholder chiaramente demo o link al sito CRI Monza.

DISCLAIMER DEMO
Deve essere chiarissimo ma non rovinare la magia: banner discreto “PROTOTIPO DIMOSTRATIVO · Pagamenti, prenotazioni, email, WhatsApp e dati sono simulati. Nessuna operazione reale viene eseguita.”
Ripetilo dove necessario.

DESIGN
Voglio qualità “wow”: fotografia/illustrazione natalizia contemporanea, profondità, glass panels leggeri, luci calde, dettagli rossi CRI, microanimazioni, typography elegante e leggibile. Evita eccesso di gradienti, emoji giganti, card tutte uguali e look da SaaS. Deve sembrare una campagna natalizia importante di un’associazione nazionale, ma profondamente legata a Monza.
Mobile-first, poi desktop. La /albero-live deve essere molto bella in 16:9.
Accessibilità: contrasto leggibile, animazioni non aggressive.

NON FARE IN QUESTO TURNO
- backend
- database
- Supabase
- login/admin
- pagamenti reali
- email reali
- WhatsApp reale
- webhook
- scheduler
- vero 3D/WebGL
- CMS
- pannello organizzatori
- giochi complessi
- integrazioni esterne.
Questa deve essere una demo finta ma totalmente esplorabile, utile a validare estetica, storytelling e UX spendendo il minimo possibile.

Dati, numeri raccolti, numero regali, agenda, progress bar e dediche sono MOCK e vanno presentati come demo, senza farli sembrare dati reali.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://natalecrimb.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f6dd90ba-cd6d-4316-8b9b-58f8b12e499e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
