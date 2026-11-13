import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/xmas/Shell";

/** Information based on the real 2026 campaign data flows. No false claim that
 * data is never stored or erased simply by hiding the website. The organisation
 * remains responsible for verifying supplier contracts, DPO and end-of-campaign
 * deletion throughout the campaign.
 */
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy e dati personali · Il Natale che fa bene – CRI Monza" },
    { name: "description", content: "Come vengono usati e protetti i dati relativi ai regali solidali, all'Albero di Monza e alle comunicazioni della campagna." },
    { property: "og:title", content: "Privacy e dati personali · CRI Monza" },
    { property: "og:description", content: "Informativa sui dati dei regali solidali, delle dediche pubbliche e delle comunicazioni della campagna." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Privacy,
});

function Privacy() {
  return <Shell>
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Il Natale che fa bene · Trasparenza</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Informativa sulla privacy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Aggiornamento: 12 novembre 2026 · Informazioni ai sensi degli articoli 13 e, ove applicabile, 14 del Regolamento (UE) 2016/679.</p>
      <div className="mt-7 rounded-2xl border border-gold/40 bg-secondary/60 p-5">
        <h2 className="font-display text-xl">In breve</h2>
        <p className="mt-2 text-sm leading-relaxed">I dati servono per gestire il tuo gesto solidale, creare la pallina e, se lo chiedi, inviare il regalo o la conferma. <strong>La dedica e la firma diventano pubbliche soltanto se scegli esplicitamente di pubblicarle.</strong> Non ti iscriviamo automaticamente a newsletter e non creiamo un elenco di contatti per attività promozionali. Al termine della campagna è prevista la dismissione del sito e la rimozione dei dati operativi non più necessari, con le eccezioni spiegate sotto.</p>
      </div>
      <div className="mt-10 space-y-9 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-2xl">1. Chi è il titolare e come contattarlo</h2>
          <p className="mt-3"><strong>Croce Rossa Italiana – Comitato di Monza ODV</strong>, C.F./P. IVA 08466330969, Via Antonio Pacinotti 2, 20900 Monza (MB).</p>
          <p className="mt-2">Per informazioni, richieste sui dati o sulla cancellazione di una dedica pubblica: <a className="font-semibold underline underline-offset-4" href="mailto:monza@cri.it">monza@cri.it</a>. PEC: <a className="underline underline-offset-4" href="mailto:cl.monza@cert.cri.it">cl.monza@cert.cri.it</a>.</p>
          <p className="mt-2">Puoi usare gli stessi recapiti per richiedere il contatto del responsabile della protezione dei dati, qualora designato e competente per questo trattamento.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">2. Quali dati utilizziamo</h2>
          <p className="mt-3">Per i regali e le donazioni: progetto scelto, importo, data, identificativi della transazione, stato del pagamento e dell'addobbo; dedica e firma pubbliche, <em>solo se autorizzate</em>.</p>
          <p className="mt-2">Se scegli la cartolina o l'email: nome del destinatario, firma e testo personale, eventuale indirizzo email del destinatario o del donatore e dati tecnici dell'invio. La cartolina WhatsApp viene preparata sul tuo dispositivo: scegli tu a chi inoltrarla.</p>
          <p className="mt-2">Per far funzionare e proteggere il servizio: identificativi tecnici, informazioni di navigazione e sicurezza, registrazioni necessarie a prevenire invii o addebiti ripetuti. Il sistema prevede un database operativo durante la campagna; non è corretto dire che non viene memorizzato alcun dato.</p>
          <p className="mt-2">Nell'Accademia dei Piccoli Volontari i progressi e il nome eventualmente inserito nel diploma restano sul dispositivo; per partecipare non è richiesta la registrazione di un bambino.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">3. Perché li trattiamo e su quale base</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>Gestione del regalo o della donazione:</strong> per fornire il servizio richiesto dall'utente (art. 6, par. 1, lett. b, GDPR).</li>
            <li><strong>Pubblicazione della dedica e della firma sull'albero:</strong> solo con una scelta separata e facoltativa dell'utente (consenso, art. 6, par. 1, lett. a). Puoi revocarlo scrivendoci; la revoca non pregiudica i trattamenti già legittimamente effettuati.</li>
            <li><strong>Invio del regalo all'indirizzo indicato:</strong> per realizzare la richiesta del donatore e, per i dati del destinatario comunicati da un'altra persona, sulla base dell'interesse legittimo a consegnare l'unico messaggio atteso, nel rispetto dei diritti del destinatario (art. 6, par. 1, lett. f). Il destinatario riceve un collegamento a questa informativa e può chiedere di non ricevere ulteriori comunicazioni.</li>
            <li><strong>Protezione da abusi, frodi e duplicazioni:</strong> interesse legittimo alla sicurezza del servizio (art. 6, par. 1, lett. f).</li>
            <li><strong>Adempimenti amministrativi, fiscali e contabili:</strong> obblighi di legge, quando applicabili alle donazioni effettivamente incassate (art. 6, par. 1, lett. c).</li>
          </ul>
          <p className="mt-3">Non sono previste newsletter automatiche, vendita di dati o profilazione pubblicitaria da parte del Comitato nell'ambito di questa campagna.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">4. Chi può vedere i dati</h2>
          <p className="mt-3">Sull'Albero di Monza gli altri visitatori vedono l'addobbo e, soltanto se hai selezionato la pubblicazione, la dedica e la firma. La dedica privata e il nome del destinatario <strong>non diventano pubblici automaticamente</strong>. Non scrivere dati personali di terzi nei messaggi destinati all'albero.</p>
          <p className="mt-2">Le informazioni necessarie all'invio dell'email sono usate per quella comunicazione; l'indirizzo non viene pubblicato sull'albero. Le cartoline condivise tramite WhatsApp o social escono dal controllo del Comitato quando le inoltri: la loro ulteriore diffusione dipende da chi le riceve.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">5. Servizi utilizzati</h2>
          <p className="mt-3">La campagna utilizza i fornitori di hosting e database collegati al progetto <strong>Lovable Cloud</strong>, il servizio di posta <strong>Google Workspace/Gmail</strong> e i prestatori di pagamento <strong>SumUp</strong> e <strong>PayPal</strong>. Il sito carica inoltre caratteri tipografici tramite <strong>Google Fonts</strong>.</p>
          <p className="mt-2">I fornitori trattano i dati nei limiti necessari al proprio servizio e secondo le rispettive condizioni e informative; per pagamenti e infrastrutture possono esistere conservazioni autonome e trattamenti internazionali. Le garanzie per eventuali trasferimenti fuori dallo Spazio economico europeo vanno considerate secondo le regole GDPR e le configurazioni del fornitore. Puoi chiederci informazioni sui servizi effettivamente attivi.</p>
          <p className="mt-2">Non raccogliamo direttamente, nei moduli di questo sito, i dati completi delle carte di pagamento: vengono gestiti dal prestatore scelto.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">6. Quanto tempo restano i dati</h2>
          <p className="mt-3"><strong>La campagna è temporanea.</strong> Alla chiusura dell'iniziativa è prevista la dismissione del sito e la cancellazione dei dati applicativi non più necessari, comprese le dediche pubbliche, dopo la conclusione delle verifiche tecniche e delle eventuali consegne ancora pendenti. Restano ferme le esigenze di conservazione delle transazioni e delle registrazioni di controllo descritte sotto. Non è previsto un archivio storico nominativo dell'Albero di Monza.</p>
          <p className="mt-2">Per le email, l'indirizzo e il messaggio possono essere mantenuti nei sistemi operativi fino alla gestione dell'invio. Una volta accettata la spedizione, il sistema LIVE è progettato per eliminare dalla coda il contenuto e l'indirizzo; possono rimanere identificativi ed esiti tecnici necessari a evitare duplicazioni. <strong>Le email già inviate possono invece rimanere</strong> nella casella del Comitato e in quella del destinatario, secondo le rispettive impostazioni di conservazione.</p>
          <p className="mt-2">Le registrazioni contabili e dei pagamenti possono dover essere conservate anche dopo la chiusura del sito, per i termini previsti dalla normativa applicabile. Anche le copie di sicurezza e i log dei fornitori possono seguire cicli tecnici di cancellazione propri. <strong>Chiudere una pagina web, da solo, non cancella il database né le registrazioni dei prestatori di pagamento.</strong></p>
        </section>
        <section>
          <h2 className="font-display text-2xl">7. Dati conservati sul tuo dispositivo</h2>
          <p className="mt-3">Il browser può conservare identificativi tecnici, il riferimento alla pallina, le informazioni temporanee del regalo e i progressi dell'Accademia per consentirti di ritrovare quello che hai fatto. Non sono utilizzati per creare un profilo pubblicitario; puoi eliminarli cancellando i dati del sito dal browser, ma potresti perdere l'accesso a un regalo o ai progressi locali.</p>
          <p className="mt-2">Il codice della campagna non prevede l'installazione di cookie pubblicitari. Possono tuttavia essere presenti cookie o registrazioni tecniche dei servizi di hosting e autenticazione; se saranno introdotti strumenti di tracciamento non strettamente necessari, saranno fornite le informazioni e le scelte richieste dalla normativa.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl">8. I tuoi diritti</h2>
          <p className="mt-3">Nei casi previsti dal GDPR puoi chiedere accesso, rettifica, cancellazione o limitazione dei dati, opporti al trattamento e richiedere la portabilità quando applicabile. Per la pubblicazione della dedica puoi revocare il consenso. Scrivi a <a href="mailto:monza@cri.it" className="font-semibold underline underline-offset-4">monza@cri.it</a>, indicando se possibile il riferimento della pallina o del regalo, senza inviare password o dati di pagamento.</p>
          <p className="mt-2">Hai inoltre diritto di proporre reclamo al <a className="underline underline-offset-4" href="https://www.garanteprivacy.it/" target="_blank" rel="noopener noreferrer">Garante per la protezione dei dati personali</a>.</p>
        </section>
      </div>
      <p className="mt-10 border-t border-gold/35 pt-6 text-xs leading-relaxed text-muted-foreground">Questa informativa si riferisce esclusivamente alla campagna «Il Natale che fa bene» su natale.crimonza.org, non agli altri siti o servizi della Croce Rossa Italiana.</p>
    </article>
  </Shell>;
}
