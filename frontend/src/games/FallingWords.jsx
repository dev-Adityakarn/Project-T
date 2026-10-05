import { useWordTargets } from "@/hooks/useWordTargets";
import { COMMON, MEDIUM } from "@/data/words";
import { GameHUD } from "@/components/GameHUD";
import { WordInput, Word } from "@/components/WordInput";

const CFG = {
  easy: { pool: COMMON, maxLives: 5, spawnBase: 2.6, speedBase: 0.07 },
  medium: { pool: COMMON, maxLives: 3, spawnBase: 2, speedBase: 0.09 },
  hard: { pool: [...COMMON, ...MEDIUM], maxLives: 2, spawnBase: 1.5, speedBase: 0.12 },
};

export default function FallingWords({ onFinish, difficulty = "medium" }) {
  const g = useWordTargets({ onFinish, hitSound: "pop", ...CFG[difficulty] });
  return (
    <div>
      <GameHUD items={[{ label: "Score", value: g.score, testId: "hud-score" }, { label: "Level", value: g.level, testId: "hud-level" }, { label: "Combo", value: `x${g.combo}` }]} lives={g.lives} maxLives={g.maxLives} />
      <div className="relative h-[420px] overflow-hidden rounded-2xl border bg-card bg-grid" data-testid="falling-arena">
        {g.targets.map((t) => (
          <div key={t.id} className="absolute -translate-x-1/2 rounded-lg border bg-background px-3 py-1.5 text-lg shadow-lg"
            style={{ left: `${t.x}%`, top: `${t.p * 88}%` }} data-testid="falling-word">
            <Word word={t.word} input={g.input} />
          </div>
        ))}
        {g.kills.map((k) => (
          <div key={`k${k.id}`} className="pop-out absolute -translate-x-1/2 font-pixel text-xs text-primary" style={{ left: `${k.x}%`, top: `${k.p * 88}%` }}>+{k.word.length * 10}</div>
        ))}
        <div className="absolute bottom-0 h-2 w-full bg-destructive/60" />
      </div>
      <WordInput value={g.input} onChange={g.onInput} />
    </div>
  );
}
