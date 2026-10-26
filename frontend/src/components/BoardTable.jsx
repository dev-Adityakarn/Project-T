import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "./DifficultyPicker";

const COLS = "grid-cols-[44px_1fr_72px_60px_60px] sm:grid-cols-[60px_1fr_90px_90px_90px]";

export const BoardTable = ({
  rows,
  userId,
  emptyText = "No scores yet for this game.",
  status = rows === null ? "loading" : "success",
  error,
  onRetry,
}) => (
  <div className="overflow-hidden rounded-2xl border bg-card" data-testid="leaderboard-table">
    <div className={`grid ${COLS} gap-2 border-b px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground sm:px-5`}>
      <span>Rank</span><span>Player</span><span className="text-right">Score</span><span className="text-right">WPM</span><span className="text-right">Acc</span>
    </div>
    {status === "loading" && (
      <div className="p-6 text-sm text-muted-foreground" data-testid="leaderboard-loading" role="status">
        Loading scores…
      </div>
    )}
    {status === "error" && (
      <div className="p-6" data-testid="leaderboard-error" role="alert">
        <p className="text-sm font-medium">Scores could not be loaded.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error?.response?.status === 408 || error?.code === "ECONNABORTED"
            ? "The request timed out. Check your connection and try again."
            : "Check your connection and try again. The games and tests still work while the board is unavailable."}
        </p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={onRetry}
            data-testid="leaderboard-retry"
          >
            Try again
          </Button>
        )}
      </div>
    )}
    {status === "success" && rows?.length === 0 && (
      <div className="p-6 text-sm text-muted-foreground" data-testid="leaderboard-empty">
        {emptyText}
      </div>
    )}
    {status === "success" && rows?.map((r, i) => (
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
