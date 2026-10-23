import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CircleOff, EyeOff, Footprints, Gamepad2, HandHeart, Home, Megaphone, MoveUp, Phone, Users } from "lucide-react";
import cold from "@/assets/kids/scene-cold.jpg";
import fall from "@/assets/kids/scene-fall.jpg";
import lost from "@/assets/kids/scene-lost.jpg";
import { Bubble, ChoiceCard, ListenButton, MissionTop, PrimaryButton, SceneImage, useChimes } from "./Kit";
import { MissionDone } from "./MissionDone";

type Choice = { icon: ReactNode; label: string; ok: boolean; fb: string };
type Scene = { img: string; alt: string; title: string; story: string; choices: Choice[]; caption: string; praise: string };

const SCENES: Scene[] = [
  {
    img: cold, alt: "Un signore anziano trema dal freddo su una panchina; un bambino con la mamma lo guarda", title: "Brrr, che freddo!",
    story: "In piazza, su una panchina, un signore trema dal freddo. È tutto solo. Tu sei con la mamma. Cosa fai?",
    choices: [
      { icon: <EyeOff className="h-7 w-7" />, label: "Faccio finta di niente", ok: false, fb: "Se nessuno se ne accorge, resterà solo al freddo. Accorgersi è già il primo aiuto! Proviamo un'altra idea?" },
      { icon: <HandHeart className="h-7 w-7" />, label: "Lo dico alla mamma, che è qui con me", ok: true, fb: "" },
      { icon: <Footprints className="h-7 w-7" />, label: "Vado da lui da solo, lontano dalla mamma", ok: false, fb: "Che cuore grande! Però si resta sempre vicino al proprio adulto: insieme siete più forti. Riprova!" },
    ],
    caption: "La mamma saluta il signore e gli chiede se ha bisogno. Poi chiama chi può aiutarlo: arrivano i volontari con una coperta e una bevanda calda.",
    praise: "Bravissimo! Ti sei accorto di lui e l'hai detto subito a un adulto. È proprio così che si aiuta.",
  },
  {
    img: fall, alt: "Una nonnina è scivolata sul ghiaccio e si tiene il ginocchio; arance rotolate per terra", title: "Una scivolata sul ghiaccio",
    story: "Una nonnina è scivolata sul ghiaccio. È seduta per terra e si tiene il ginocchio. Le arance sono rotolate via. Cosa fai?",
    choices: [
      { icon: <MoveUp className="h-7 w-7" />, label: "Provo a tirarla su da solo", ok: false, fb: "Potreste farvi male tutti e due. Per aiutare chi è caduto servono i grandi. Riprova!" },
      { icon: <Gamepad2 className="h-7 w-7" />, label: "Corro via a giocare", ok: false, fb: "Lei ha bisogno di qualcuno che se ne accorga, e tu puoi esserci! Riprova." },
      { icon: <Megaphone className="h-7 w-7" />, label: "Chiamo forte un adulto: «Aiuto, venite!»", ok: true, fb: "" },
    ],
    caption: "Arriva un signore. Chiede alla nonnina come sta e, siccome le fa molto male, chiama il 112. Tu intanto raccogli le arance: che aiuto!",
    praise: "Perfetto! Hai chiamato un adulto invece di fare da solo. Così nessuno si fa male.",
  },
  {
    img: lost, alt: "Al mercatino di Natale un bimbo piccolo con l'orsetto si guarda intorno, perso", title: "Un bimbo si è perso",
    story: "Al mercatino, un bimbo piccolo piange stringendo il suo orsetto. Non vede più i suoi genitori. Cosa fai?",
    choices: [
      { icon: <Users className="h-7 w-7" />, label: "Avviso il mio adulto, che chiama un volontario o un vigile", ok: true, fb: "" },
      { icon: <Home className="h-7 w-7" />, label: "Lo porto a casa mia", ok: false, fb: "Meglio di no: se si allontana, i genitori non lo trovano più. Si resta qui e si chiama un adulto. Riprova!" },
      { icon: <CircleOff className="h-7 w-7" />, label: "Lo lascio lì: non è affar mio", ok: false, fb: "Anche un piccolo gesto conta: accorgerti di lui può cambiargli la serata. Riprova!" },
    ],
    caption: "Il tuo adulto resta con il bimbo e chiama un volontario. Pochi minuti dopo… ecco la sua mamma! Che abbraccio!",
    praise: "Che bello! Siete rimasti lì, vicino a dove i genitori potevano cercarlo, e avete chiesto aiuto.",
  },
];

/** Order of the mission: three scenes, with the pretend 112 call after the fall. */
const FLOW = [{ k: "scene", s: 0 }, { k: "scene", s: 1 }, { k: "dial", s: 1 }, { k: "scene", s: 2 }] as const;

export function MissionCity({ sound, setSound, onExit, onComplete, onDiploma }: { sound: boolean; setSound: (v: boolean) => void; onExit: () => void; onComplete: () => void; onDiploma: () => void }) {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState<number | null>(null);
  const [fb, setFb] = useState("");
  const chime = useChimes(sound);
  const done = step >= FLOW.length;
  useEffect(() => { if (done) { onComplete(); chime("tada"); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { setStep((s) => s + 1); setWrong([]); setRight(null); setFb(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const restart = () => { setStep(0); setWrong([]); setRight(null); setFb(""); };

  const top = <MissionTop n={1} title="La città ha bisogno di te!" step={step} steps={FLOW.length} sound={sound} setSound={setSound} onExit={onExit} />;
  if (done) return <>{top}<MissionDone mission="citta" title="Sei un piccolo aiutante attento!" onDiploma={onDiploma} onExit={onExit} onRetry={restart}
    lessons={["Aiutare comincia dall'accorgersi di chi è in difficoltà.", "Si chiama subito un adulto: mamma, papà, un volontario, un vigile.", "Non si affronta mai un'emergenza da soli.", "Il 112 si chiama solo per le vere emergenze, mai per scherzo."]} /></>;

  const f = FLOW[step]!;
  const sc = SCENES[f.s]!;
  if (f.k === "dial") return <>{top}<Dial img={sc.img} alt={sc.alt} chime={chime} onDone={next} /></>;

  const pick = (i: number) => {
    const c = sc.choices[i]!;
    if (right !== null) return;
    if (c.ok) { setRight(i); setFb(sc.praise); chime("ok"); }
    else { setWrong((w) => [...w, i]); setFb(c.fb); chime("soft"); }
  };
  return (
    <>
      {top}
      <section key={step} className="animate-rise mx-auto grid max-w-6xl gap-6 px-4 pt-5 lg:grid-cols-[1.2fr_1fr] lg:items-start" data-testid="city-scene">
        <SceneImage src={sc.img} alt={sc.alt} resolved={right !== null} caption={right !== null ? sc.caption : undefined} />
        <div>
          <h2 className="font-display text-3xl">{sc.title}</h2>
          <p className="mt-2 text-xl leading-relaxed">{sc.story}</p>
          <div className="mt-3"><ListenButton text={sc.story} /></div>
          <div className="mt-5 space-y-3">
            {sc.choices.map((c, i) => (
              <ChoiceCard key={c.label} icon={c.icon} label={c.label} onPick={() => pick(i)} disabled={right !== null && right !== i}
                state={right === i ? "right" : wrong.includes(i) ? "wrong" : "idle"} />
            ))}
          </div>
          {fb && <div className="mt-4"><Bubble tone={right !== null ? "great" : "kind"}>{fb}</Bubble></div>}
          {right !== null && <PrimaryButton onClick={next} className="mt-5 w-full sm:w-auto">Avanti <ArrowRight className="h-5 w-5" /></PrimaryButton>}
        </div>
      </section>
    </>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
function Dial({ img, alt, chime, onDone }: { img: string; alt: string; chime: (k: "ok" | "soft" | "tick" | "tada") => void; onDone: () => void }) {
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState(false);
  const ok = typed === "112";
  const press = (k: string) => {
    if (ok) return;
    const next = typed + k;
    if ("112".startsWith(next)) { setTyped(next); setHint(false); chime(next === "112" ? "ok" : "tick"); }
    else { setTyped(""); setHint(true); chime("soft"); }
  };
  return (
    <section className="animate-rise mx-auto grid max-w-6xl gap-6 px-4 pt-5 lg:grid-cols-[1.2fr_1fr] lg:items-start" data-testid="city-dial">
      <div className="hidden lg:block"><SceneImage src={img} alt={alt} resolved /></div>
      <div>
        <h2 className="font-display text-3xl">Il numero delle emergenze</h2>
        <p className="mt-2 text-xl leading-relaxed">Il signore chiama il 112. Lo sai comporre? Tocca <strong className="text-gold">1 – 1 – 2</strong> sul telefono finto.</p>
        <div className="mx-auto mt-5 max-w-xs rounded-[2.2rem] border-4 border-ink bg-ink p-4 shadow-deep">
          <div className="rounded-2xl bg-paper px-4 py-3 text-center text-ink">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">Telefono finto · gioco</p>
            <p className="mt-1 h-10 font-display text-4xl tracking-[0.3em]" aria-live="polite">{typed || "\u00a0"}</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button key={k} type="button" onClick={() => press(k)} aria-label={`Tasto ${k}`} className="h-16 rounded-2xl bg-secondary font-display text-2xl text-foreground transition active:scale-95 active:bg-gold active:text-ink">{k}</button>
            ))}
          </div>
          <div className={`mt-3 flex h-14 items-center justify-center gap-2 rounded-2xl font-semibold ${ok ? "bg-gold text-ink" : "bg-muted text-muted-foreground"}`}><Phone className="h-5 w-5" /> {ok ? "Chiamata (per finta)!" : "Componi il numero"}</div>
        </div>
        {hint && <div className="mt-4"><Bubble tone="kind">Quasi! Il numero è 1, poi 1, poi 2. Riprova con calma.</Bubble></div>}
        {ok && (
          <div className="mt-4 space-y-4">
            <Bubble tone="great">Esatto: <strong>1-1-2</strong>! Di solito lo chiamano i grandi. Se sei solo e qualcuno sta molto male, puoi chiamarlo anche tu: rispondi alle domande e resta al sicuro. Il 112 si chiama solo per le vere emergenze, mai per scherzo.</Bubble>
            <PrimaryButton onClick={onDone} className="w-full sm:w-auto">Avanti <ArrowRight className="h-5 w-5" /></PrimaryButton>
          </div>
        )}
      </div>
    </section>
  );
}
