import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/xmas/Shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Informazioni privacy (bozza) · Il Natale che fa bene – CRI Monza" },
    { name: "description", content: "Bozza in revisione delle informazioni sul trattamento dei dati per la campagna Il Natale che fa bene." },
  ] }),
  component: Privacy,
});

function Privacy() {
  return <Shell>
    <article className="mx-auto max-w-3xl px-5 pb-12 pt-12 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Trasparenza e tutela dei dati</p>
      <h1 className="mt-3 font-display text-4xl sm:text-5xl">Informazioni sulla privacy</h1>
      <div role="note" className="mt-6 rounded-2xl border border-gold/60 bg-secondary p-5 text-sm">
        <p className="font-semibold">Bozza in revisione · 11 novembre 2026</p>
        <p className="mt-2">Questo testo è predisposto per la valutazione del Comitato e non è ancora un’informativa definitivamente approvata. Prima dell’attivazione di donazioni e invii reali dovranno essere verificati i punti indicati sotto.</p>
      </div>
      <div className="mt-10 space-y-9 text-sm leading-relaxed text-foreground/85">
        <section><h2 className="font-display text-2xl">1. Chi tratta i dati</h2>
          <p className="mt-3">Titolare del trattamento: Croce Rossa Italiana – Comitato di Monza ODV, C.F./P. IVA 08466330969, Via Antonio Pacinotti 2, 20900 Monza (MB). Contatti: <a href="mailto:monza@cri.it" className="underline underline-offset-4">monza@cri.it</a>; PEC: cl.monza@cert.cri.it.</p>
          <p className="mt-2 text-gold">Da completare in revisione: eventuale nominativo e recapito del Responsabile della protezione dei dati (RPD/DPO).</p>
        </section>
        <section><h2 className="font-display text-2xl">2. Quali dati possono essere trattati</h2>
          <p className="mt-3">Per utilizzare la campagna possono essere trattati i dati necessari a gestire il regalo o la donazione (progetto, importo, identificativo tecnico, data), i dati facoltativi della dedica e della firma pubblica, gli indirizzi email forniti per conferme o regali, nonché i dati tecnici necessari al funzionamento e alla sicurezza del sito.</p>
          <p className="mt-2">Il nome del destinatario e il messaggio personale delle cartoline sono concepiti come elementi privati. La scelta di rendere pubbliche dedica e firma sull’albero è separata e facoltativa. I progressi dell’Accademia e i dati di personalizzazione dell’attestato sono previsti sul dispositivo, senza registrazione dell’utente.</p>
        </section>
        <section><h2 className="font-display text-2xl">3. Perché vengono utilizzati</h2>
          <p className="mt-3">Per consentire le simulazioni DEMO e, dopo la messa in esercizio autorizzata, la gestione delle donazioni, delle conferme richieste dal donatore, delle email con il regalo dedicate dal donatore a un destinatario, delle cartoline e della visualizzazione delle palline. Per proteggere il servizio possono essere trattate anche informazioni tecniche e di sicurezza.</p>
          <p className="mt-2">Non è prevista l’iscrizione automatica a newsletter o comunicazioni promozionali a seguito di una donazione o dell’invio di un regalo.</p>
          <p className="mt-2 text-gold">Da confermare: basi giuridiche per ciascuna finalità, con particolare attenzione ai messaggi inviati a destinatari indicati da terzi, ai pagamenti LIVE e alle necessità amministrative.</p>
        </section>
        <section><h2 className="font-display text-2xl">4. Cosa è visibile agli altri</h2>
          <p className="mt-3">Soltanto se viene selezionata l’apposita scelta di pubblicazione, la dedica e la firma inserite nell’albero digitale possono essere rese visibili agli altri visitatori. Senza tale scelta, l’addobbo è visibile senza quei contenuti. Evita di scrivere nella dedica pubblica dati personali di altre persone.</p>
          <p className="mt-2">La scelta di pubblicazione è distinta dall’eventuale invio dell’email privata e deve poter essere gestita secondo le procedure che il Comitato definirà per l’esercizio dei diritti.</p>
        </section>
        <section><h2 className="font-display text-2xl">5. Servizi tecnici e destinatari</h2>
          <p className="mt-3">Il sito utilizza componenti di hosting, infrastruttura dati e invio email connessi al progetto; nelle prove DEMO possono essere impiegati Lovable Cloud e un account Gmail autorizzato. In modalità LIVE potranno essere coinvolti anche i prestatori dei servizi di pagamento, secondo le configurazioni effettivamente attivate.</p>
          <p className="mt-2 text-gold">Da verificare prima dell’approvazione: elenco dei fornitori e dei responsabili, collocazione e trasferimenti dei dati, garanzie applicabili e informative dei prestatori di pagamento.</p>
        </section>
        <section><h2 className="font-display text-2xl">6. Conservazione e dati sul dispositivo</h2>
          <p className="mt-3">Il sito può utilizzare identificativi tecnici e dati locali sul dispositivo per ritrovare i regali e mantenere i progressi dell’Accademia. Le richieste di invio possono comportare registrazioni tecniche per prevenire duplicazioni e abusi.</p>
          <p className="mt-2 text-gold">Da definire con il Comitato: tempi di conservazione per dati di donazione, dedica pubblica, email, log tecnici, dati di pagamento e registri necessari ad adempiere a obblighi di legge. Occorre verificare anche l’eventuale presenza di strumenti di analisi e cookie non strettamente tecnici.</p>
        </section>
        <section><h2 className="font-display text-2xl">7. I tuoi diritti</h2>
          <p className="mt-3">Nei casi previsti dal Regolamento (UE) 2016/679 puoi chiedere accesso ai dati, rettifica, cancellazione, limitazione del trattamento, opposizione e portabilità, quando applicabile. Se un trattamento è basato sul consenso, puoi revocarlo per il futuro. Puoi scrivere a <a href="mailto:monza@cri.it" className="underline underline-offset-4">monza@cri.it</a> e proporre reclamo al Garante per la protezione dei dati personali.</p>
        </section>
        <section><h2 className="font-display text-2xl">8. Stato attuale della campagna</h2>
          <p className="mt-3">La versione attualmente mostrata è una DEMO: i pagamenti sono simulati, mentre gli invii di prova vengono gestiti secondo le limitazioni tecniche indicate nel sito. Le condizioni della futura esperienza con donazioni reali saranno comunicate prima della sua attivazione.</p>
        </section>
      </div>
      <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">Revisione legale e organizzativa necessaria prima dell’utilizzo definitivo. Riferimento: artt. 12–14 del Regolamento (UE) 2016/679.</p>
    </article>
  </Shell>;
}
