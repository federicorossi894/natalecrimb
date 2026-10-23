export type OrnamentKind = "dae" | "calore" | "prossimita" | "cuore";

export type Project = {
  id: string;
  title: string;
  kicker: string;
  ornament: OrnamentKind;
  ornamentName: string;
  /** Short line for cards and emails (keep under ~40 characters). */
  tagline: string;
  /** Evocative opening shown large on the project page. */
  opening: string;
  /** One concrete sentence shown first: the quick path must not require reading more. */
  intro: string;
  /** Default postcard sentence (max 90 chars), used when the donor writes no dedication. */
  postcardLine: string;
  /** Gift palette as CSS custom-property names (background, ribbon, text). */
  theme: { bg: string; ribbon: string; ink: string };
  /** Optional deep-dive: what CRI Monza does in this area (no invented figures, services or testimonials). */
  story: string;
  doing: string[];
  /** How a gift helps: a donation to the project as a whole, never an amount = object equivalence. */
  helps: string;
  /** Optional official page about the project (verified on crimonza.org). */
  officialLink?: { label: string; url: string };
  amounts: number[];
};

/** Same suggested amounts everywhere so €5 is always one tap away. */
const AMOUNTS = [5, 10, 20, 50];

export const PROJECTS: Project[] = [
  {
    id: "calore",
    title: "Regala calore",
    kicker: "Persone in difficoltà, in strada",
    ornament: "calore",
    ornamentName: "una sciarpa",
    tagline: "Fermarsi accanto a chi è solo.",
    opening: "Ci sono sere in cui il freddo non è l'unica cosa che pesa. Pesa anche sentirsi invisibili.",
    intro: "Il tuo regalo sostiene i volontari di Croce Rossa Monza che, in strada, si fermano accanto a chi è in difficoltà.",
    postcardLine: "Quest'anno il mio regalo per te è una presenza accanto a chi, a Monza, vive in strada.",
    theme: { bg: "--primary", ribbon: "--ivory", ink: "--snow" },
    story:
      "Quando la città si accende per le feste, c'è chi resta fuori. I volontari di Croce Rossa Monza escono in strada per incontrare le persone in difficoltà: portano qualcosa di caldo, ma soprattutto tempo e ascolto. A volte una bevanda calda è il modo per cominciare a parlarsi; a volte un'indicazione sui servizi del territorio è il primo passo per non sentirsi più soli.",
    doing: ["Uscite in strada con i volontari", "Bevande calde, coperte e generi di conforto", "Ascolto e vicinanza a chi è in difficoltà", "Orientamento verso i servizi del territorio"],
    helps: "Il tuo contributo sostiene le attività di strada nel loro insieme. Non compra una coperta o una bevanda: dà continuità a una presenza.",
    amounts: AMOUNTS,
  },
  {
    id: "battito",
    title: "Regala un battito",
    kicker: "Defibrillatori e cultura del soccorso",
    ornament: "dae",
    ornamentName: "un piccolo DAE",
    tagline: "Sapere cosa fare cambia tutto.",
    opening: "Ci sono momenti in cui sapere cosa fare può cambiare tutto.",
    intro: "Il tuo regalo aiuta Croce Rossa Monza a diffondere i defibrillatori e a insegnare a sempre più persone come intervenire.",
    postcardLine: "Ti regalo un battito: perché a Monza ci siano sempre più persone pronte a soccorrere.",
    theme: { bg: "--fir-deep", ribbon: "--gold", ink: "--snow" },
    story:
      "Un arresto cardiaco può accadere ovunque: in piazza, a scuola, al lavoro, a casa. Nei primi minuti chi è vicino può fare la differenza, se sa riconoscere cosa succede, chiamare aiuto, iniziare il massaggio cardiaco e usare un defibrillatore. Per questo Croce Rossa Monza promuove la cultura del soccorso e forma i cittadini con corsi di primo soccorso e BLSD aperti a tutti.",
    doing: ["Diffusione dei defibrillatori (DAE)", "Corsi BLSD per l'uso del defibrillatore", "Corsi di primo soccorso per la popolazione", "Cultura del soccorso in città"],
    helps: "Il tuo contributo sostiene il progetto nel suo insieme, tra defibrillatori e formazione. Non corrisponde a un corso o a un apparecchio: rende più forte una rete di persone preparate.",
    amounts: AMOUNTS,
  },
  {
    id: "prossimita",
    title: "Regala prossimità",
    kicker: "Unità Mobile di Prossimità",
    ornament: "prossimita",
    ornamentName: "una mini unità mobile",
    tagline: "Fare noi il primo passo.",
    opening: "A volte, per aiutare davvero qualcuno, bisogna essere noi a fare il primo passo.",
    intro: "Il tuo regalo sostiene l'Unità Mobile di Prossimità che Croce Rossa Monza sta realizzando per portare salute e ascolto vicino alle persone più fragili.",
    postcardLine: "Il mio regalo per te fa il primo passo verso chi, a Monza, fatica a raggiungere i servizi.",
    theme: { bg: "--ivory", ribbon: "--burgundy", ink: "--ink" },
    story:
      "Non tutti riescono a raggiungere un ambulatorio o a orientarsi tra i servizi: per età, fragilità, solitudine o difficoltà di accesso. Per questo Croce Rossa Monza sta realizzando un'Unità Mobile di Prossimità, un presidio sanitario mobile pensato per muoversi a Monza e nei Comuni del Comitato invece di aspettare che siano le persone ad arrivare. Le sue attività si adatteranno ai bisogni del territorio, insieme a istituzioni, professionisti sanitari e realtà del Terzo Settore.",
    doing: ["Prevenzione e promozione della salute, come gli screening", "Attenzione ad anziani e persone fragili", "Educazione sanitaria e ascolto", "Orientamento verso i servizi sanitari del territorio"],
    helps: "Il tuo contributo sostiene la realizzazione dell'Unità Mobile nel suo insieme. È una donazione, non l'acquisto di una prestazione.",
    officialLink: { label: "Scopri l'Unità Mobile di Prossimità", url: "https://www.crimonza.org/post/chef-for-health-il-buono-per-il-bene" },
    amounts: AMOUNTS,
  },
  {
    id: "cuore",
    title: "Dove serve di più",
    kicker: "Il cuore di Croce Rossa Monza",
    ornament: "cuore",
    ornamentName: "un cuore",
    tagline: "Scegliere di esserci.",
    opening: "Non possiamo sapere oggi chi avrà bisogno di noi domani. Possiamo scegliere di esserci.",
    intro: "Un regalo libero permette a Croce Rossa Monza di intervenire dove il bisogno è più urgente, quando serve.",
    postcardLine: "Ho scelto per te il regalo più semplice: esserci, dove a Monza serve di più.",
    theme: { bg: "--burgundy", ribbon: "--gold", ink: "--snow" },
    story:
      "I bisogni di una città cambiano, spesso senza preavviso: un'emergenza, un inverno più duro, un servizio da tenere attivo. Una donazione senza vincolo di progetto dà al Comitato la libertà di rispondere nel momento giusto, sostenendo le attività sanitarie e sociali e i volontari che le rendono possibili ogni giorno.",
    doing: ["Risposta ai bisogni più urgenti", "Continuità delle attività sanitarie e sociali", "Sostegno ai volontari", "Flessibilità quando il territorio cambia"],
    helps: "Il tuo contributo viene destinato dal Comitato dove è più utile in quel momento. Nessun oggetto acquistato: fiducia in chi c'è.",
    amounts: AMOUNTS,
  },
];

export const getProject = (id: string) => PROJECTS.find((p) => p.id === id);

export type TreeOrnament = {
  id: number | string;
  kind: OrnamentKind;
  x: number; // %
  y: number; // %
  dedica?: string;
  firma?: string;
};

export const TREE_ORNAMENTS: TreeOrnament[] = [
  { id: 1, kind: "cuore", x: 50, y: 22, dedica: "Un regalo anonimo per Monza ❤️" },
  { id: 2, kind: "calore", x: 41, y: 33, dedica: "Perché nessuno dovrebbe sentirsi solo a Natale.", firma: "Federico" },
  { id: 3, kind: "dae", x: 59, y: 35 },
  { id: 4, kind: "prossimita", x: 35, y: 47, dedica: "Per la nonna Lucia, che ci ha insegnato a prenderci cura.", firma: "Giulia e Marco" },
  { id: 5, kind: "cuore", x: 52, y: 45 },
  { id: 6, kind: "dae", x: 66, y: 50, dedica: "Grazie a chi c'era quando serviva.", firma: "Andrea" },
  { id: 7, kind: "calore", x: 28, y: 62 },
  { id: 8, kind: "dae", x: 44, y: 60, dedica: "Che ogni cuore di Monza trovi qualcuno pronto.", firma: "Classe 4B" },
  { id: 9, kind: "prossimita", x: 60, y: 63 },
  { id: 10, kind: "calore", x: 73, y: 66, dedica: "Una coperta in più, un sorriso in più.", firma: "Sara" },
  { id: 11, kind: "cuore", x: 22, y: 76 },
  { id: 12, kind: "prossimita", x: 38, y: 75, dedica: "Buon Natale ai volontari di Monza!", firma: "La famiglia Brambilla" },
  { id: 13, kind: "calore", x: 54, y: 77 },
  { id: 14, kind: "dae", x: 70, y: 79 },
  { id: 15, kind: "cuore", x: 78, y: 82, dedica: "Per papà, che salvava vite.", firma: "Elena" },
];

export const MOCK_TOTAL_GIFTS = 327;

export const AGENDA_TODAY = [
  { time: "10:00 – 13:00", title: "Mercatino solidale", desc: "Gadget, decorazioni e idee regalo CRI" },
  { time: "14:00 – 18:00", title: "Controllo pressione e glicemia", desc: "Gratuito, con i nostri volontari sanitari" },
  { time: "17:30", title: "Dimostrazione manovre salvavita", desc: "Massaggio cardiaco e uso del DAE" },
  { time: "Tutto il giorno", title: "Panettoni e biscotti solidali", desc: "Dolci di Natale che fanno bene" },
];

export const CRI = {
  site: "https://www.crimonza.org/",
  blsd: "https://www.crimonza.org/corso-blsd",
  primoSoccorso: "https://www.crimonza.org/corso-di-primo-soccorso",
  corsi: "https://www.crimonza.org/corsi-formazione",
  /** Verified on crimonza.org (footer links), October 2026. */
  social: [
    { name: "Facebook", url: "https://www.facebook.com/CroceRossaItalianaMonza" },
    { name: "Instagram", url: "https://www.instagram.com/crocerossamonza/" },
    { name: "YouTube", url: "https://www.youtube.com/channel/UCNu_Ueq4iLV_hXW6VJnNdfg" },
    { name: "LinkedIn", url: "https://www.linkedin.com/company/croce-rossa-italiana-comitato-di-monza/" },
  ],
};

/** User-stated period: the Albero di Monza stands in Piazza San Paolo until 6 January. */
export const TREE_UNTIL = "6 gennaio";
