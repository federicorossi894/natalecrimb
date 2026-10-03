export type OrnamentKind = "dae" | "calore" | "prossimita" | "cuore";

export type Project = {
  id: string;
  title: string;
  kicker: string;
  ornament: OrnamentKind;
  ornamentName: string;
  tagline: string;
  story: string;
  doing: string[];
  amounts: { value: number; impact: string }[];
};

export const PROJECTS: Project[] = [
  {
    id: "calore",
    title: "Regala calore",
    kicker: "Persone senza dimora",
    ornament: "calore",
    ornamentName: "una sciarpa",
    tagline: "Una coperta, un tè caldo, qualcuno che si ferma.",
    story:
      "Nelle notti di dicembre, a Monza, c'è chi dorme fuori. Le nostre Unità di Strada passano a portare coperte, bevande calde e soprattutto tempo: un nome chiamato, una parola, un controllo sulla salute. A volte è l'unico incontro della giornata.",
    doing: [
      "Uscite serali delle Unità di Strada",
      "Coperte, sacchi a pelo e kit igiene",
      "Bevande calde e pasti",
      "Ascolto e orientamento ai servizi",
    ],
    amounts: [
      { value: 5, impact: "Un tè caldo e un pasto per una notte" },
      { value: 10, impact: "Una coperta termica nuova" },
      { value: 20, impact: "Un kit inverno completo" },
      { value: 50, impact: "Un'uscita serale dell'Unità di Strada" },
    ],
  },
  {
    id: "battito",
    title: "Regala un battito",
    kicker: "Defibrillatori e cultura del soccorso",
    ornament: "dae",
    ornamentName: "un piccolo DAE",
    tagline: "Nei primi minuti, fa la differenza chi c'è.",
    story:
      "Quando un cuore si ferma, ogni minuto conta. Prima che arrivi l'ambulanza servono due cose: un defibrillatore (DAE) vicino e una persona capace di usarlo. Con questo regalo aiuti Monza ad avere un nuovo DAE in un luogo pubblico.",
    doing: [
      "Installazione di nuovi DAE sul territorio",
      "Corsi BLSD per cittadini e aziende",
      "Dimostrazioni di manovre salvavita in piazza",
      "Formazione nelle scuole",
    ],
    amounts: [
      { value: 10, impact: "Un set di piastre per esercitazioni" },
      { value: 20, impact: "Un manichino-minuto di formazione" },
      { value: 50, impact: "Un pezzo concreto del nuovo DAE" },
      { value: 100, impact: "Una teca protettiva per esterni" },
    ],
  },
  {
    id: "prossimita",
    title: "Regala prossimità",
    kicker: "Ambulatorio Mobile di Prossimità",
    ornament: "prossimita",
    ornamentName: "una mini unità mobile",
    tagline: "La salute che arriva dove serve.",
    story:
      "Non tutti riescono ad andare dal medico. L'Unità Mobile di Prossimità porta nei quartieri controlli di base, ascolto e orientamento: pressione, glicemia, una parola gentile, un consiglio su dove andare.",
    doing: [
      "Screening gratuiti nei quartieri",
      "Controlli pressione e glicemia",
      "Supporto a persone fragili e anziani soli",
      "Orientamento ai servizi sanitari",
    ],
    amounts: [
      { value: 5, impact: "Strisce per un controllo glicemia" },
      { value: 15, impact: "Il carburante per una tappa nel quartiere" },
      { value: 30, impact: "Materiale sanitario per una giornata" },
      { value: 60, impact: "Una giornata di ambulatorio mobile" },
    ],
  },
  {
    id: "cuore",
    title: "Dove serve di più",
    kicker: "Il cuore di Croce Rossa Monza",
    ornament: "cuore",
    ornamentName: "un cuore CRI",
    tagline: "Fidati di chi c'è, ogni giorno.",
    story:
      "Emergenze, trasporti, sociale, formazione, giovani. I volontari di Croce Rossa Monza ci sono 365 giorni l'anno. Un regalo libero ci permette di intervenire subito dove il bisogno è più urgente.",
    doing: [
      "Soccorso e trasporto sanitario",
      "Attività sociali e distribuzione beni",
      "Protezione civile ed emergenze",
      "Progetti giovani e inclusione",
    ],
    amounts: [
      { value: 5, impact: "Un piccolo gesto che si somma" },
      { value: 10, impact: "Un kit di primo soccorso" },
      { value: 25, impact: "Una divisa invernale per un volontario" },
      { value: 50, impact: "Un turno di servizio in più" },
    ],
  },
];

export const getProject = (id: string) => PROJECTS.find((p) => p.id === id);

export type TreeOrnament = {
  id: number;
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
};
