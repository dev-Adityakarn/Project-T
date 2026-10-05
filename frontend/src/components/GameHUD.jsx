import { Heart } from "lucide-react";

export const Stat = ({ label, value, testId }) => (
  <div className="rounded-xl border bg-card px-4 py-2">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-pixel text-sm text-foreground sm:text-base" data-testid={testId}>{value}</div>
  </div>
);

export const Lives = ({ lives, max }) => (
  <div className="flex items-center gap-1 rounded-xl border bg-card px-4 py-3" data-testid="hud-lives">
    {Array.from({ length: max }).map((_, i) => (
      <Heart key={i} size={16} className={i < lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"} />
    ))}
  </div>
);

export const GameHUD = ({ items = [], lives, maxLives }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="game-hud">
    {items.map((it) => <Stat key={it.label} {...it} />)}
    {lives !== undefined && <Lives lives={Math.max(0, lives)} max={maxLives} />}
  </div>
);
