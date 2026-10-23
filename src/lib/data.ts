export type OrnamentKind = "dae" | "calore" | "prossimita" | "cuore";

export type Project = {
  id: string;
  title: string;
  kicker: string;
  ornament: OrnamentKind;
  ornamentName: string;
  tagline: string;
  /** One or two short sentences shown first: the quick path must not require reading more. */
  intro: string;
  /** Default postcard sentence, used when the donor writes no dedication. */
  postcardLine: string;
  /** Gift palette as CSS custom-property names (background, ribbon, text). */
  theme: { bg: string; ribbon: string; ink: string };
  /** Optional deep-dive: what CRI Monza does in this area (no invented figures or services). */
  story: string;
  doing: string[];
  /** How a gift helps: a donation to the project as a whole, never an amount = object equivalence. */
  helps: string;
  amounts: number[];
};

/** Same suggested amounts everywhere so €5 is always one tap away. */
const AMOUNTS = [5, 10, 20, 50];

export const PROJECTS: Project[] = [
  {
    id: "calore",
    title: "Regala calore",
    kicker: "Persone senza dimora",
    ornament: "calore",
    ornamentName: "una sciarpa",
    tagline: "Una coperta, una bevanda calda, qualcuno che si ferma.",
    intro: "Nelle notti d'inverno c'è chi a Monza vive in strada. Il tuo regalo sostiene le unità di strada di Croce Rossa.",
    postcardLine: "Quest'anno il mio regalo per te scalda le notti di chi a Monza vive in strada.",
    theme: { bg: "--primary", ribbon: "--ivory", ink: "--snow" },
    story:
      "Con le unità di strada i volontari incontrano le persone senza dimora: portano coperte, bevande calde e generi di conforto, ma soprattutto tempo e ascolto. Un saluto, un nome, un aiuto per orientarsi verso i servizi del territorio.",
    doing: ["Unità di strada con i volontari", "Coperte, bevande calde e generi di conforto", "Ascolto e vicinanza", "Orientamento ai servizi del territorio"],
    helps: "Il tuo contributo sostiene le attività delle unità di strada nel loro insieme. Non acquisti un oggetto: dai forza a un servizio che c'è.",
    amounts: AMOUNTS,
  },
  {
    id: "battito",
    title: "Regala un battito",
    kicker: "Defibrillatori e cultura del soccorso",
    ornament: "dae",
    ornamentName: "un piccolo DAE",
    tagline: "Nei primi minuti fa la differenza chi c'è.",
    intro: "Quando un cuore si ferma servono un defibrillatore vicino e qualcuno che sappia usarlo. Il tuo regalo sostiene i DAE e la formazione dei cittadini.",
    postcardLine: "Ti regalo un battito: perché a Monza ci sia sempre qualcuno pronto a salvare una vita.",
    theme: { bg: "--fir-deep", ribbon: "--gold", ink: "--snow" },
    story:
      "Croce Rossa promuove la diffusione dei defibrillatori (DAE) e la cultura del soccorso: insegna alla popolazione le manovre salvavita, il massaggio cardiaco e l'uso del DAE, con corsi BLSD e di primo soccorso aperti a tutti.",
    doing: ["Diffusione dei defibrillatori (DAE)", "Corsi BLSD e di primo soccorso", "Formazione della popolazione alle manovre salvavita", "Sensibilizzazione alla cultura del soccorso"],
    helps: "Il tuo contributo sostiene il progetto nel suo insieme, defibrillatori e formazione, senza corrispondere a un singolo oggetto.",
    amounts: AMOUNTS,
  },
  {
    id: "prossimita",
    title: "Regala prossimità",
    kicker: "Unità Mobile di Prossimità",
    ornament: "prossimita",
    ornamentName: "una mini unità mobile",
    tagline: "La salute che arriva dove serve.",
    intro: "Non tutti riescono a raggiungere i servizi. L'Unità Mobile di Prossimità porta vicinanza sanitaria e sociale nei luoghi della città.",
    postcardLine: "Il mio regalo per te porta salute e vicinanza a chi a Monza ne ha più bisogno.",
    theme: { bg: "--ivory", ribbon: "--burgundy", ink: "--ink" },
    story:
      "L'Unità Mobile di Prossimità di Croce Rossa Monza si sposta sul territorio e offre servizi sanitari e sociali di base: ascolto, controlli semplici, orientamento ai servizi e attenzione per le persone più fragili.",
    doing: ["Servizi sanitari di base", "Supporto sociale e ascolto", "Attenzione per le persone fragili", "Orientamento ai servizi del territorio"],
    helps: "Il tuo contributo sostiene l'attività dell'Unità Mobile nel suo insieme. È una donazione, non l'acquisto di una prestazione.",
    amounts: AMOUNTS,
  },
  {
    id: "cuore",
    title: "Dove serve di più",
    kicker: "Il cuore di Croce Rossa Monza",
    ornament: "cuore",
    ornamentName: "un cuore",
    tagline: "Fidati di chi c'è, ogni giorno.",
    intro: "Un regalo libero permette a Croce Rossa Monza di intervenire dove il bisogno è più urgente, quando serve.",
    postcardLine: "Ho scelto per te il regalo più semplice: esserci, dove a Monza serve di più.",
    theme: { bg: "--burgundy", ribbon: "--gold", ink: "--snow" },
    story:
      "Le attività di Croce Rossa Monza sono tante e cambiano con i bisogni della città. Una donazione senza vincolo di progetto dà al Comitato la flessibilità di sostenere le attività dove servono di più.",
    doing: ["Supporto flessibile alle attività del Comitato", "Risposta ai bisogni più urgenti", "Sostegno ai volontari", "Attività sanitarie e sociali"],
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
