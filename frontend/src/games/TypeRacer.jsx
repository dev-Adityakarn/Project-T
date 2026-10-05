import { useEffect, useRef, useState } from "react";
import { Car } from "lucide-react";
import { useCharTyper } from "@/hooks/useCharTyper";
import { useLoop } from "@/hooks/useLoop";
import { PARAGRAPHS, pick, rngFor } from "@/data/words";
import { TextDisplay } from "@/components/TextDisplay";
import { GameHUD } from "@/components/GameHUD";

const mk = (a, b, c) => [{ name: "Rookie Bot", wpm: a, color: "#38BDF8" }, { name: "Pro Bot", wpm: b, color: "#F59E0B" }, { name: "Turbo Bot", wpm: c, color: "#EF4444" }];
const BOTS = { easy: mk(20, 30, 40), medium: mk(30, 48, 68), hard: mk(50, 70, 90) };

const Lane = ({ name, progress, color, testId }) => (
  <div className="flex items-center gap-3">
    <div className="w-24 shrink-0 truncate text-xs font-medium text-muted-foreground">{name}</div>
    <div className="relative h-10 flex-1 rounded-lg border border-dashed bg-muted/40">
      <div className="absolute right-0 top-0 h-full w-1.5 bg-[repeating-linear-gradient(0deg,#fff_0_4px,#111_4px_8px)]" />
      <Car size={28} className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-150" style={{ left: `calc(${progress * 100}% - ${progress * 34}px)`, color }} data-testid={testId} />
    </div>
  </div>
);

export default function TypeRacer({ onFinish, difficulty = "medium", seed }) {
  const bots = BOTS[difficulty];
  const [text] = useState(() => pick(PARAGRAPHS, rngFor(seed)));
  const [count, setCount] = useState(3);
  const race = useRef({ t: 0, finished: [] });
  const done = useRef(false);
  const t = useCharTyper(text, { active: count === 0, strict: true, onDone: () => end() });

  useEffect(() => {
    if (count === 0) return undefined;
    const id = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [count]);

  const botProg = (b) => Math.min(1, (b.wpm * 5 * race.current.t) / 60 / text.length);
  useLoop(count === 0 && !done.current, (dt) => {
    race.current.t += dt;
    bots.forEach((b) => { if (botProg(b) >= 1 && !race.current.finished.includes(b.name)) race.current.finished.push(b.name); });
  });

  const end = () => {
    if (done.current) return;
    done.current = true;
    const place = race.current.finished.length + 1;
    const s = t.getStats(race.current.t);
    onFinish({ ...s, score: Math.round((s.wpm * s.accuracy) / 100) + (4 - place) * 15, extra: `Finished #${place} of 4` });
  };

  return (
    <div>
      <GameHUD items={[{ label: "WPM", value: count ? 0 : t.getStats(race.current.t).wpm, testId: "hud-wpm" }, { label: "Progress", value: `${Math.round((t.typed.length / text.length) * 100)}%`, testId: "hud-progress" }]} />
      <div className="mb-5 space-y-2 rounded-2xl border bg-card p-4" data-testid="race-track">
        <Lane name="You" progress={t.typed.length / text.length} color="hsl(var(--primary))" testId="player-car" />
        {bots.map((b) => <Lane key={b.name} name={`${b.name} (${b.wpm})`} progress={count ? 0 : botProg(b)} color={b.color} />)}
      </div>
      <div className="relative">
        <TextDisplay text={text} typed={t.typed} height="h-40" />
        {count > 0 && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/80 font-pixel text-5xl text-primary" data-testid="race-countdown">{count}</div>
        )}
      </div>
    </div>
  );
}
