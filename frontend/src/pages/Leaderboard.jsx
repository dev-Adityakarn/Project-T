import { useState } from "react";
import { GAMES } from "@/data/games";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { BoardTable } from "@/components/BoardTable";

export default function Leaderboard() {
  const [game, setGame] = useState(GAMES[0].id);
  const [diff, setDiff] = useState("all");
  const { user } = useAuth();

  const { status, data: rows, error, retry } = useApiResource(
    `leaderboard:${game}:${diff}`,
    ({ signal, timeout }) => {
      const params = { game_id: game, limit: 25 };
      if (diff !== "all") params.difficulty = diff;
      return api
        .get("/leaderboard", { params, signal, timeout })
        .then((r) => (Array.isArray(r.data) ? r.data : []));
    },
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Leaderboard</h1>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground md:text-lg">
        Each row shows one player&apos;s best score for the selected game and difficulty.
        Pick a game, then a difficulty, to see where you stand.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Play a game while signed in to save a result and join the board. Scores from
        signed-out runs are not stored.
      </p>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2" data-testid="leaderboard-game-tabs">
        {GAMES.map((g) => (
          <button key={g.id} onClick={() => setGame(g.id)} data-testid={`lb-tab-${g.id}`}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${game === g.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {g.title}
          </button>
        ))}
      </div>
      <div className="mt-3" data-testid="leaderboard-difficulty-tabs">
        <DifficultyPicker value={diff} onChange={setDiff} allowAll />
      </div>
      <div className="mt-6">
        <BoardTable
          rows={rows}
          status={status}
          error={error}
          onRetry={retry}
          userId={user?.id}
          emptyText="No scores yet for this game and difficulty. Play a round while signed in to set the first one."
        />
      </div>
    </div>
  );
}
