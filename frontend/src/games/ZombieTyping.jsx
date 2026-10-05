import { Skull, Shield } from "lucide-react";
import { useWordTargets } from "@/hooks/useWordTargets";
import { COMMON, MEDIUM, LONG } from "@/data/words";
import { GameHUD } from "@/components/GameHUD";
import { WordInput, Word } from "@/components/WordInput";

const CFG = {
  easy: { pool: COMMON, maxLives: 5, spawnBase: 3.2, speedBase: 0.055 },
  medium: { pool: MEDIUM, maxLives: 3, spawnBase: 2.6, speedBase: 0.07 },
  hard: { pool: [...MEDIUM, ...LONG], maxLives: 2, spawnBase: 2, speedBase: 0.09 },
};

export default function ZombieTyping({ onFinish, difficulty = "medium" }) {
  const g = useWordTargets({ onFinish, hitSound: "splat", ...CFG[difficulty] });
  return (
    <div>
      <GameHUD items={[{ label: "Kills score", value: g.score, testId: "hud-score" }, { label: "Wave", value: g.level, testId: "hud-level" }]} lives={g.lives} maxLives={g.maxLives} />
      <div className="relative h-[420px] overflow-hidden rounded-2xl border bg-card" data-testid="zombie-arena">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#3f6212]/20" />
        <div className="absolute left-0 top-0 flex h-full w-14 items-center justify-center border-r-4 border-dashed border-secondary/60 bg-secondary/10">
          <Shield className="text-secondary" size={28} />
        </div>
        {g.targets.map((t) => (
          <div key={t.id} className="absolute flex flex-col items-center" style={{ left: `${94 - t.p * 82}%`, top: `${8 + (t.x / 90) * 72}%` }} data-testid="zombie">
            <div className="mb-1 whitespace-nowrap rounded-md border bg-background px-2 py-0.5 text-base"><Word word={t.word} input={g.input} /></div>
            <Skull size={34} className="text-[#84cc16]" style={{ transform: `rotate(${Math.sin(t.p * 40) * 10}deg)` }} />
          </div>
        ))}
        {g.kills.map((k) => (
          <div key={`k${k.id}`} className="pop-out absolute font-pixel text-xs text-destructive" style={{ left: `${94 - k.p * 82}%`, top: `${8 + (k.x / 90) * 72}%` }}>SPLAT</div>
        ))}
      </div>
      <WordInput value={g.input} onChange={g.onInput} />
    </div>
  );
}
