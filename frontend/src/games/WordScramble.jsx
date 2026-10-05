import { useEffect, useRef, useState } from "react";
import { SkipForward } from "lucide-react";
import { COMMON, MEDIUM, LONG, pick, shuffle, rngFor } from "@/data/words";
import { GameHUD } from "@/components/GameHUD";
import { WordInput } from "@/components/WordInput";
import { calcStats } from "@/hooks/useCharTyper";
import { sfx } from "@/lib/sound";

const DURATION = 60;
const POOLS = { easy: COMMON.filter((w) => w.length >= 4 && w.length <= 5), medium: MEDIUM, hard: LONG };
const scramble = (w, rng) => { let s; do s = shuffle(w.split(""), rng).join(""); while (s === w && w.length > 1); return s; };

export default function WordScramble({ onFinish, difficulty = "medium", seed }) {
  const rng = useRef(rngFor(seed));
  const newWord = () => { const w = pick(POOLS[difficulty], rng.current); return { w, s: scramble(w, rng.current) }; };
  const [cur, setCur] = useState(newWord);
  const [input, setInput] = useState("");
  const [left, setLeft] = useState(DURATION);
  const st = useRef({ score: 0, solved: 0, chars: 0, keys: 0, errors: 0, start: performance.now(), over: false });
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const l = DURATION - (performance.now() - st.current.start) / 1000;
      setLeft(Math.max(0, Math.ceil(l)));
      if (l <= 0 && !st.current.over) {
        st.current.over = true;
        const x = st.current;
        onFinish({ score: x.score, ...calcStats(x.chars, x.keys, x.errors, DURATION), extra: `${x.solved} words solved` });
      }
    }, 200);
    return () => clearInterval(id);
  }, [onFinish]);

  const onChange = (v) => {
    const x = st.current;
    const val = v.trim().toLowerCase();
    const solved = val === cur.w;
    if (v.length > input.length) {
      x.keys += 1;
      const ok = cur.w.startsWith(val);
      if (!ok) x.errors += 1;
      if (!solved) sfx[ok ? "click" : "error"]();
    }
    if (solved) {
      x.score += cur.w.length * 10;
      x.solved += 1;
      x.chars += cur.w.length + 1;
      sfx.hit();
      setCur(newWord());
      setInput("");
    } else setInput(v);
  };

  return (
    <div>
      <GameHUD items={[{ label: "Time", value: `${left}s`, testId: "hud-time" }, { label: "Score", value: st.current.score, testId: "hud-score" }, { label: "Solved", value: st.current.solved }]} />
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-10">
        <div key={cur.s} className="rise-in flex flex-wrap justify-center gap-2" data-testid="scrambled-word">
          {cur.s.split("").map((c, i) => (
            <span key={i} className="grid h-14 w-12 place-items-center rounded-lg bg-muted font-pixel text-lg uppercase shadow-[0_5px_0_hsl(var(--kb-key-side))]">{c}</span>
          ))}
        </div>
        <button onClick={() => { setCur(newWord()); setInput(""); force((f) => f + 1); }} className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors duration-200 hover:bg-muted" data-testid="scramble-skip-btn">
          <SkipForward size={14} /> Skip
        </button>
      </div>
      <WordInput value={input} onChange={onChange} placeholder="unscramble..." />
    </div>
  );
}
