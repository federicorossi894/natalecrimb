import { TREE_UNTIL } from "./data";
import posterAsset from "@/assets/casetta/locandina-mercatini-di-natale.jpg.asset.json";
import chocoAsset from "@/assets/casetta/cioccolatini-solidali-latta.jpg.asset.json";
import boxAsset from "@/assets/casetta/panettone-solidale-scatola.jpg.asset.json";
import tinAsset from "@/assets/casetta/panettone-solidale-latta.jpg.asset.json";

/**
 * Casetta CRI shop window — facts confirmed by the Comitato (via the user), never invented.
 * Products are sold ONLY at the casetta in Piazza San Paolo: the site never sells or books them.
 */
export const CASETTA = {
  from: "21 novembre",
  until: TREE_UNTIL,
  place: "Piazza San Paolo, Monza",
  /** Assortimento indicativo confermato per la campagna; disponibilità variabile. */
  offering: ["Panettone e pandoro", "Riso 500 g", "Tisane", "Altri regali"],
  openingHours: "Indicativamente 10:00–18:00, con possibili variazioni",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Piazza+San+Paolo+Monza",
} as const;

/**
 * Official image slots. Each stays `null` until the original file is attached in chat and
 * uploaded as an asset; components then show it untouched. Never fill these with generated art.
 */
export type CasettaImage = { src: string; alt: string; width?: number; height?: number } | null;
export type CasettaSlot = "poster" | "cioccolatini" | "panettoneCarta" | "panettoneLatta" | "pandoroLatta" | "riso" | "tisane";
export const CASETTA_MEDIA: Record<CasettaSlot, CasettaImage> = {
  poster: { src: posterAsset.url, alt: "Locandina Mercatini di Natale di Croce Rossa Italiana – Comitato di Monza: dal 21 novembre al 6 gennaio, Piazza San Paolo Monza. Cioccolato, tisane, regali, panettone.", width: 1024, height: 1280 },
  cioccolatini: { src: chocoAsset.url, alt: "Latta Cioccolatini solidali Croce Rossa Italiana con cioccolatini incartati di rosso", width: 391, height: 382 },
  panettoneCarta: { src: boxAsset.url, alt: "Scatola in carta del Panettone solidale Croce Rossa Italiana", width: 427, height: 401 },
  panettoneLatta: { src: tinAsset.url, alt: "Latta del Panettone solidale Croce Rossa Italiana accanto al panettone", width: 554, height: 343 },
  // No original pandoro photo supplied yet: keep the placeholder, never a generated image.
  pandoroLatta: null,
  riso: null,
  tisane: null,
};

export type CasettaProduct = {
  id: string;
  name: string;
  /** Only confirmed details: weight is omitted when unknown. */
  format: string;
  price?: number;
  blurb: string;
  photo: CasettaSlot;
};

export const CASETTA_PRODUCTS: CasettaProduct[] = [
  {
    id: "panettone-pandoro",
    name: "Panettone e pandoro",
    format: "I grandi classici del Natale",
    blurb: "Due dolci delle feste, insieme in un unico pensiero solidale. La foto mostra il panettone; il pandoro può essere disponibile alla casetta.",
    photo: "panettoneCarta",
  },
  {
    id: "riso",
    name: "Riso solidale",
    format: "Sacchetto da 500 g",
    blurb: "Un piccolo prodotto da mettere in dispensa e un gesto concreto da condividere.",
    photo: "riso",
  },
  {
    id: "tisane",
    name: "Tisane",
    format: "Confezioni regalo",
    blurb: "Per regalare una pausa calda durante le feste.",
    photo: "tisane",
  },
  {
    id: "cioccolatini",
    name: "Cioccolatini e altri pensieri",
    format: "Altri prodotti solidali",
    blurb: "Cioccolatini, idee regalo e altre proposte, secondo la disponibilità del momento.",
    photo: "cioccolatini",
  },
];

export const formatEuro = (n: number) => `${n} €`;
