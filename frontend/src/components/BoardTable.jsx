import { Crown } from "lucide-react";
import { DifficultyBadge } from "./DifficultyPicker";

const COLS = "grid-cols-[44px_1fr_72px_60px_60px] sm:grid-cols-[60px_1fr_90px_90px_90px]";

export const BoardTable = ({ rows, userId, emptyText = "No scores yet for this game." }) => (
  <div className="overflow-hidden rounded-2xl border bg-card" data-testid="leaderboard-table">
    <div className={`grid ${COLS} gap-2 border-b px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground sm:px-5`}>
      <span>Rank</span><span>Player</span><span className="text-right">Score</span><span className="text-right">WPM</span><span className="text-right">Acc</span>
    </div>
    {rows === null && <div className="p-6 text-sm text-muted-foreground">Loading...</div>}
    {rows?.length === 0 && <div className="p-6 text-sm text-muted-foreground" data-testid="leaderboard-empty">{emptyText}</div>}
    {rows?.map((r, i) => (
      <div key={r.user_id} data-testid={`lb-row-${i}`}
        className={`grid ${COLS} items-center gap-2 border-b px-4 py-3 text-sm last:border-b-0 sm:px-5 ${userId && userId === r.user_id ? "bg-primary/10" : ""}`}>
        <span className="font-pixel text-xs">{i === 0 ? <Crown size={16} className="text-[#FACC15]" /> : i + 1}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{r.name}</span>
          <DifficultyBadge d={r.difficulty} className="hidden sm:inline-flex" />
        </span>
        <span className="text-right font-mono-type">{r.best_score}</span>
        <span className="text-right font-mono-type">{r.wpm}</span>
        <span className="text-right font-mono-type">{r.accuracy}%</span>
      </div>
    ))}
  </div>
);
