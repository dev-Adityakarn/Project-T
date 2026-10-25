import { useEffect, useState } from "react";
import { GAMES } from "@/data/games";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { BoardTable } from "@/components/BoardTable";
import { AdInArticle } from "@/components/ads/AdInArticle";
import { AdRailLayout } from "@/components/ads/AdSideRail";
import { AD_SLOTS } from "@/config/adsense";

export default function Leaderboard() {
  const [game, setGame] = useState(GAMES[0].id);
  const [diff, setDiff] = useState("all");
  const [rows, setRows] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    setRows(null);
    const params = { game_id: game, limit: 25 };
    if (diff !== "all") params.difficulty = diff;
    api.get("/leaderboard", { params }).then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [game, diff]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
      <AdRailLayout slot={AD_SLOTS.desktopRail}>
        <h1 className="text-4xl font-bold sm:text-5xl">Leaderboard</h1>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">Best score per player, per game and difficulty.</p>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" data-testid="leaderboard-game-tabs">
          {GAMES.map((g) => (
            <button key={g.id} onClick={() => setGame(g.id)} data-testid={`lb-tab-${g.id}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${game === g.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {g.title}
            </button>
          ))}
        </div>
        <div className="mt-3" data-testid="leaderboard-difficulty-tabs"><DifficultyPicker value={diff} onChange={setDiff} allowAll /></div>
        <div className="mt-6"><BoardTable rows={rows} userId={user?.id} /></div>
        <AdInArticle slot={AD_SLOTS.leaderboardInline} className="xl:hidden" />
      </AdRailLayout>
    </div>
  );
}
