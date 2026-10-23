import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ExternalLink, Gift, Hand, Hourglass, Info, Mail, MapPin, Megaphone, MessageSquareWarning, PawPrint, Zap } from "lucide-react";
import scene from "@/assets/kids/scene-battito.jpg";
import { CRI } from "@/lib/data";
import { GUIDE_BPM, MIN_TAPS, RHYTHM_SECONDS, liveBpm, rhythmSummary, zoneOf, BPM_MIN, BPM_MAX } from "@/lib/kids-academy";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { MagicHeart } from "./KidsArt";
import { Bubble, ChoiceCard, ListenButton, MissionTop, PrimaryButton, RetryLink, SceneImage, useChimes } from "./Kit";
import { MissionDone } from "./MissionDone";

type Choice = { icon: ReactNode; label: string; ok: boolean; fb: string };
type Q = { title: string; story: string; choices: Choice[]; need: number; praise: string; caption: string };

const QS: Q[] = [
  {
    title: "Cosa sta succedendo?", need: 1,
    story: "In piazza un signore cade a terra. Lo chiamate, ma non risponde e non si muove. È un'emergenza. Cosa fai per prima cosa?",
    choices: [
      { icon: <Hourglass className="h-7 w-7" />, label: "Aspetto che si svegli da solo", ok: false, fb: "In un'emergenza ogni minuto conta: chiedere aiuto subito è la cosa più importante. Riprova!" },
      { icon: <Megaphone className="h-7 w-7" />, label: "Chiamo forte gli adulti: «Aiuto! Chiamate il 112!»", ok: true, fb: "" },
      { icon: <Hand className="h-7 w-7" />, label: "Lo scuoto forte per svegliarlo", ok: false, fb: "Meglio di no: tu chiama aiuto, i grandi sanno cosa fare e l'operatore del 112 li guida. Riprova!" },
    ],
    praise: "Giusto! Hai riconosciuto l'emergenza e hai dato l'allarme. È il primo anello della catena dei soccorsi.",
    caption: "Una signora si avvicina e chiama subito il 112 con il vivavoce.",
  },
  {
    title: "Al telefono con il 112", need: 2,
    story: "L'operatore del 112 fa alcune domande. Quali informazioni sono utili? Tocca le 2 giuste.",
    choices: [
      { icon: <MapPin className="h-7 w-7" />, label: "Dove siamo: Piazza San Paolo, Monza", ok: true, fb: "" },
      { icon: <Gift className="h-7 w-7" />, label: "Che regalo vorrei per Natale", ok: false, fb: "Bella idea per la letterina, ma ora all'operatore non serve! Prova un'altra." },
      { icon: <MessageSquareWarning className="h-7 w-7" />, label: "Cosa è successo: un signore è a terra e non risponde", ok: true, fb: "" },
      { icon: <PawPrint className="h-7 w-7" />, label: "Il nome del mio cane", ok: false, fb: "Simpatico, ma non aiuta il signore. Cosa serve sapere ai soccorritori?" },
    ],
    praise: "Esatto: dove siete e cosa è successo. Poi si resta al telefono e si fa quello che dice l'operatore, passo dopo passo.",
    caption: "L'ambulanza è in arrivo. L'operatore resta in linea e guida gli adulti.",
  },
  {
    title: "La scatola verde", need: 1,
    story: "Sul muro c'è una scatola verde con un cuore e un fulmine. Che cos'è?",
    choices: [
      { icon: <Mail className="h-7 w-7" />, label: "Una cassetta delle lettere", ok: false, fb: "Le lettere per Babbo Natale vanno altrove! Guarda bene il cuore con il fulmine…" },
      { icon: <Zap className="h-7 w-7" />, label: "Un defibrillatore (DAE): lo indico subito a un adulto", ok: true, fb: "" },
      { icon: <Gift className="h-7 w-7" />, label: "Un gioco per bambini", ok: false, fb: "Non è un gioco: è uno strumento importante. Riprova!" },
    ],
    praise: "Bravissimo! Il DAE è un defibrillatore: parla e spiega cosa fare. Lo usano gli adulti, guidati dall'operatore del 112. Tu puoi indicarlo e farlo portare.",
    caption: "Un ragazzo porta il DAE alla signora, mentre l'ambulanza sta arrivando.",
  },
];

const STEPS = 5; // 3 questions + rhythm intro + rhythm

export function MissionBattito({ sound, setSound, onExit, onComplete, onDiploma }: { sound: boolean; setSound: (v: boolean) => void; onExit: () => void; onComplete: () => void; onDiploma: () => void }) {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState<number[]>([]);
  const [fb, setFb] = useState("");
  const chime = useChimes(sound);
  const done = step >= STEPS;
  useEffect(() => { if (done) { onComplete(); chime("tada"); } }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { setStep((s) => s + 1); setWrong([]); setRight([]); setFb(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const restart = () => { setStep(0); setWrong([]); setRight([]); setFb(""); };
  const top = <MissionTop n={3} title="Missione Battito" step={step} steps={STEPS} sound={sound} setSound={setSound} onExit={onExit} />;

  if (done) return <>{top}<MissionDone mission="battito" title="Hai un cuore da soccorritore!" onDiploma={onDiploma} onExit={onExit} onRetry={restart}
    lessons={["Se qualcuno è a terra e non risponde, è un'emergenza.", "Si chiama forte un adulto e si fa chiamare il 112: dove siamo e cosa è successo.", "Il DAE si indica e si fa portare: lo usano i grandi, guidati dal 112.", "Il massaggio cardiaco vero si impara solo a un corso, con istruttori e manichini."]}
    extra={<a href={CRI.corsi} target="_blank" rel="noopener noreferrer" className="mx-auto mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border hairline-gold px-4 text-sm font-semibold text-gold">Per i genitori: i corsi di Croce Rossa Monza <ExternalLink className="h-4 w-4" /></a>} /></>;

  if (step === 3) return <>{top}<RhythmIntro onStart={next} /></>;
  if (step === 4) return <>{top}<Rhythm sound={sound} chime={chime} onFinish={next} /></>;

  const q = QS[step]!;
  const solved = right.length >= q.need;
  const pick = (i: number) => {
    if (solved || right.includes(i)) return;
    const c = q.choices[i]!;
    if (c.ok) { const r = [...right, i]; setRight(r); chime("ok"); setFb(r.length >= q.need ? q.praise : "Giusto! Ne manca ancora una."); }
    else { setWrong((w) => [...w, i]); setFb(c.fb); chime("soft"); }
  };
  return (
    <>
      {top}
      <section key={step} className="animate-rise mx-auto grid max-w-6xl gap-6 px-4 pt-5 lg:grid-cols-[1.2fr_1fr] lg:items-start" data-testid="battito-q">
        <SceneImage src={scene} alt="In piazza un uomo è a terra; una signora telefona al 112 e un ragazzo indica un defibrillatore sul muro" resolved={solved} caption={solved ? q.caption : undefined} />
        <div>
          <h2 className="font-display text-3xl">{q.title}</h2>
          <p className="mt-2 text-xl leading-relaxed">{q.story}</p>
          <div className="mt-3"><ListenButton text={q.story} /></div>
          <div className="mt-5 space-y-3">
            {q.choices.map((c, i) => (
              <ChoiceCard key={c.label} icon={c.icon} label={c.label} onPick={() => pick(i)} disabled={solved && !right.includes(i)} state={right.includes(i) ? "right" : wrong.includes(i) ? "wrong" : "idle"} />
            ))}
          </div>
          {fb && <div className="mt-4"><Bubble tone={solved ? "great" : "kind"}>{fb}</Bubble></div>}
          {solved && <PrimaryButton onClick={next} className="mt-5 w-full sm:w-auto">Avanti <ArrowRight className="h-5 w-5" /></PrimaryButton>}
        </div>
      </section>
    </>
  );
}

function SafetyNote() {
  return (
    <div className="flex gap-3 rounded-3xl border hairline-gold bg-card p-4 text-left text-sm leading-relaxed" data-testid="cpr-disclaimer">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
      <p><strong>È un gioco di ritmo, non una lezione di massaggio cardiaco.</strong> Non provarlo mai su una persona o su un amico. Il massaggio vero si impara a un corso con istruttori e manichini: quando sarai più grande potrai farlo anche con Croce Rossa.</p>
    </div>
  );
}

function RhythmIntro({ onStart }: { onStart: () => void }) {
  const text = `Mentre arriva l'ambulanza, gli adulti che hanno fatto un corso aiutano il cuore con un ritmo preciso: tra ${BPM_MIN} e ${BPM_MAX} colpi al minuto, un po' più veloce di una camminata svelta. Alleniamo il ritmo sul cuore magico!`;
  return (
    <section className="animate-rise mx-auto max-w-2xl px-4 pt-6 text-center" data-testid="rhythm-intro">
      <MagicHeart beat={0} glow="idle" className="mx-auto w-44" />
      <h2 className="mt-2 font-display text-3xl">Il ritmo del cuore</h2>
      <p className="mt-3 text-xl leading-relaxed">{text}</p>
      <div className="mt-3"><ListenButton text={text} /></div>
      <div className="mt-5"><SafetyNote /></div>
      <p className="mt-5 text-base text-muted-foreground">Tocca il cuore a tempo con la luce che pulsa, per circa {RHYTHM_SECONDS} secondi. Con la tastiera puoi usare la barra spaziatrice.</p>
      <PrimaryButton onClick={onStart} className="mt-5">Sono pronto <ArrowRight className="h-5 w-5" /></PrimaryButton>
    </section>
  );
}

const ZONE_TEXT = { slow: "Un po' più veloce!", good: "Perfetto, continua così!", fast: "Un po' più piano!" } as const;

function Rhythm({ sound, chime, onFinish }: { sound: boolean; chime: (k: "ok" | "soft" | "tick" | "tada") => void; onFinish: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"ready" | "play" | "retry" | "result">("ready");
  const [taps, setTaps] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [beat, setBeat] = useState(0);
  const [guideOn, setGuideOn] = useState(true);
  const [guide, setGuide] = useState(0);
  const start = useRef(0);
  const lastTap = useRef(0);
  const lastGuide = useRef(-1);
  const raf = useRef(0);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    const t0 = performance.now();
    const loop = (now: number) => {
      const interval = 60000 / GUIDE_BPM;
      const ref = phase === "play" ? start.current : t0;
      const g = Math.floor((now - ref) / interval);
      setGuide(((now - ref) % interval) / interval);
      if (g !== lastGuide.current) { lastGuide.current = g; if (guideOn && sound && (phase === "play" || phase === "ready")) chime("tick"); }
      setBeat(Math.max(0, 1 - (now - lastTap.current) / 160));
      if (phase === "play") {
        const e = (now - start.current) / 1000;
        setElapsed(e);
        if (e >= RHYTHM_SECONDS) { setPhase(tapsRef.current.length >= MIN_TAPS ? "result" : "retry"); return; }
      }
      raf.current = requestAnimationFrame(loop);
    };
    if (phase === "play" || phase === "ready") raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, guideOn, sound, chime]);

  const tap = () => {
    if (phase === "result" || phase === "retry") return;
    const now = performance.now();
    if (phase === "ready") { start.current = now; lastGuide.current = -1; tapsRef.current = []; setPhase("play"); }
    lastTap.current = now;
    tapsRef.current = [...tapsRef.current, now];
    setTaps(tapsRef.current);
  };
  const again = () => { tapsRef.current = []; setTaps([]); setElapsed(0); setPhase("ready"); };

  const bpm = liveBpm(taps);
  const zone = bpm ? zoneOf(bpm) : null;
  const sum = rhythmSummary(taps);
  const progress = Math.min(1, elapsed / RHYTHM_SECONDS);
  const C = 2 * Math.PI * 47;
  const guideOpacity = guideOn ? (reduced ? (guide < 0.25 ? 0.9 : 0.15) : 0.9 * (1 - guide)) : 0;

  if (phase === "result") {
    const good = sum.goodShare >= 0.5;
    return (
      <section className="animate-rise mx-auto max-w-2xl px-4 pt-6 text-center" data-testid="rhythm-result">
        <MagicHeart beat={0} glow="good" className="mx-auto w-40" />
        <h2 className="mt-2 font-display text-3xl">{good ? "Hai trovato il ritmo giusto!" : "Che bell'allenamento!"}</h2>
        <p className="mt-3 text-xl">Il tuo ritmo medio: <strong className="text-gold">{sum.avgBpm ?? "–"} al minuto</strong>.</p>
        <p className="mt-2 text-base text-muted-foreground">{good ? `Sei rimasto spesso tra ${BPM_MIN} e ${BPM_MAX}: proprio il ritmo che si impara ai corsi.` : `Il ritmo giusto è tra ${BPM_MIN} e ${BPM_MAX} al minuto. Se vuoi, riprova seguendo la luce: ogni volta viene meglio!`}</p>
        <div className="mt-5"><SafetyNote /></div>
        <div className="mt-6 flex flex-col items-center gap-3">
          <PrimaryButton onClick={onFinish}>Completa la missione <ArrowRight className="h-5 w-5" /></PrimaryButton>
          <RetryLink onClick={again}>Riprova il ritmo</RetryLink>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 pt-4 text-center" data-testid="rhythm-game">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => setGuideOn(!guideOn)} aria-pressed={guideOn} className="glass inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold">Luce guida: {guideOn ? "accesa" : "spenta"}</button>
        <span className="text-xs text-muted-foreground">{sound ? "Con i suoni accesi senti anche il tempo." : "Accendi i suoni in alto se vuoi sentire il tempo."}</span>
      </div>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[340px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--muted)" strokeWidth="3" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity={guideOpacity} />
        </svg>
        <button type="button" onPointerDown={(e) => { e.preventDefault(); tap(); }} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); tap(); } }}
          aria-label="Cuore magico: toccalo a ritmo" style={{ touchAction: "manipulation" }} data-testid="magic-heart"
          className="absolute inset-[9%] flex items-center justify-center rounded-full outline-offset-4 select-none">
          <MagicHeart beat={beat} glow={zone === "good" ? "good" : phase === "play" ? "idle" : "off"} className="w-full" />
        </button>
      </div>
      <div className="min-h-[88px]">
        {phase === "ready" && <p className="mt-2 font-display text-2xl">Tocca il cuore per iniziare</p>}
        {phase === "play" && (
          <>
            <p className="mt-2 font-display text-4xl" aria-hidden>{bpm ?? "…"} <span className="text-base text-muted-foreground">al minuto</span></p>
            <p className={`mt-1 text-lg font-semibold ${zone === "good" ? "text-gold" : ""}`} aria-live="polite">{zone ? ZONE_TEXT[zone] : "Continua a toccare a tempo…"}</p>
          </>
        )}
        {phase === "retry" && (
          <div className="mt-2 space-y-3">
            <Bubble tone="kind">Il cuore aspetta i tuoi tocchi! Riproviamo insieme? Tocca il cuore ogni volta che la luce si accende.</Bubble>
            <PrimaryButton onClick={again}>Riprova</PrimaryButton>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Gioco di ritmo: non è una lezione di massaggio cardiaco.</p>
    </section>
  );
}
