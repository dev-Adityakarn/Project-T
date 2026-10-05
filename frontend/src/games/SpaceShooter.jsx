import { Rocket } from "lucide-react";
import { useWordTargets } from "@/hooks/useWordTargets";
import { COMMON, MEDIUM, LONG } from "@/data/words";
import { GameHUD } from "@/components/GameHUD";
import { WordInput, Word } from "@/components/WordInput";

const CFG = {
  easy: { pool: COMMON.filter((w) => w.length > 3), maxLives: 5, spawnBase: 2.4, speedBase: 0.08 },
  medium: { pool: [...COMMON.filter((w) => w.length > 3), ...MEDIUM], maxLives: 3, spawnBase: 1.9, speedBase: 0.1 },
  hard: { pool: [...MEDIUM, ...LONG], maxLives: 2, spawnBase: 1.4, speedBase: 0.13 },
};

export default function SpaceShooter({ onFinish, difficulty = "medium" }) {
  const g = useWordTargets({ onFinish, hitSound: "zap", ...CFG[difficulty] });
  return (
    <div>
      <GameHUD items={[{ label: "Score", value: g.score, testId: "hud-score" }, { label: "Sector", value: g.level, testId: "hud-level" }, { label: "Combo", value: `x${g.combo}` }]} lives={g.lives} maxLives={g.maxLives} />
      <div className="relative h-[440px] overflow-hidden rounded-2xl border bg-[#050816]" data-testid="space-arena">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="absolute h-0.5 w-0.5 rounded-full bg-white/70" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53 + g.elapsed * 8 * (1 + (i % 3))) % 100}%` }} />
        ))}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {g.kills.map((k) => (
            <line key={k.id} x1="50" y1="92" x2={k.x} y2={k.p * 85 + 4} stroke="#22C55E" strokeWidth="0.6" />
          ))}
        </svg>
        {g.targets.map((t) => (
          <div key={t.id} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${t.x}%`, top: `${t.p * 85}%` }} data-testid="asteroid">
            <div className="h-8 w-8 rounded-full border-2 border-[#a78bfa] bg-[#4c1d95]/70 shadow-[0_0_14px_#a78bfa]" style={{ transform: `rotate(${t.p * 400}deg)`, borderRadius: "45% 55% 50% 40%" }} />
            <div className="mt-1 whitespace-nowrap rounded bg-black/60 px-2 text-sm text-white"><Word word={t.word} input={g.input} /></div>
          </div>
        ))}
        {g.kills.map((k) => (
          <div key={`b${k.id}`} className="pop-out absolute h-10 w-10 -translate-x-1/2 rounded-full bg-[#f59e0b]" style={{ left: `${k.x}%`, top: `${k.p * 85}%` }} />
        ))}
        <Rocket size={36} className="absolute bottom-3 left-1/2 -translate-x-1/2 -rotate-45 text-[#22C55E]" />
      </div>
      <WordInput value={g.input} onChange={g.onInput} placeholder="type to fire..." />
    </div>
  );
}
