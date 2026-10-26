import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Play, Timer, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getGame } from "@/data/games";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/DifficultyPicker";
import { BoardTable } from "@/components/BoardTable";

const pad = (n) => String(n).padStart(2, "0");
const fmt = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

const DailyIntro = () => (
  <div className="mt-6 rounded-2xl border bg-card p-6" data-testid="daily-instructions">
    <h2 className="text-lg font-semibold">How the daily challenge works</h2>
    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
      <li>Everyone gets the same game, difficulty and word seed for the day.</li>
      <li>You can retry as many times as you like; the board keeps your best score.</li>
      <li>The challenge resets at midnight UTC. Signed-out runs are not saved.</li>
      <li>Use a physical keyboard for a fair result; the game needs keyboard focus.</li>
    </ul>
  </div>
);

export default function Daily() {
  const { user } = useAuth();
  const userKey = user?.id || "anon";

  const dailyReq = useApiResource(
    `daily:${userKey}`,
    ({ signal, timeout }) => api.get("/daily", { signal, timeout }).then((r) => r.data),
  );
  const boardReq = useApiResource(
    `daily-board:${userKey}`,
    ({ signal, timeout }) =>
      api
        .get("/daily/leaderboard", { params: { limit: 25 }, signal, timeout })
        .then((r) => (Array.isArray(r.data) ? r.data : [])),
  );

  const d = dailyReq.status === "success" ? dailyReq.data : null;
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (d && typeof d.resets_in === "number") setLeft(Math.max(0, d.resets_in));
  }, [d]);

  useEffect(() => {
    if (!d) return undefined;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [d]);

  const game = d && getGame(d.game_id);
  const I = game?.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8" data-testid="daily-page">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><CalendarCheck size={12} className="text-primary" /> One challenge. Everyone. Every day.</div>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Daily Challenge</h1>
      <p className="mt-3 max-w-3xl text-base text-muted-foreground md:text-lg">Same game, same difficulty, same words for every player. Resets at midnight UTC.</p>

      <DailyIntro />

      {dailyReq.status === "loading" && (
        <div className="mt-8 rounded-2xl border bg-card p-8 text-sm text-muted-foreground" data-testid="daily-loading" role="status">
          Loading today&apos;s challenge…
        </div>
      )}

      {dailyReq.status === "error" && (
        <div className="mt-8 rounded-2xl border border-destructive/40 bg-card p-8" data-testid="daily-error" role="alert">
          <h2 className="text-lg font-semibold">Today&apos;s challenge could not be loaded.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a connection or server problem, not an empty challenge. The rest of the site still works.
          </p>
          <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={dailyReq.retry} data-testid="daily-retry">
            Try again
          </Button>
        </div>
      )}

      {dailyReq.status === "success" && !d && (
        <div className="mt-8 rounded-2xl border border-destructive/40 bg-card p-8" data-testid="daily-error" role="alert">
          <h2 className="text-lg font-semibold">Today&apos;s challenge is unavailable.</h2>
          <p className="mt-2 text-sm text-muted-foreground">The server returned an empty response. Try again; the rest of the site still works.</p>
          <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={dailyReq.retry} data-testid="daily-retry">Try again</Button>
        </div>
      )}

      {dailyReq.status === "success" && d && !game && (
        <div className="mt-8 rounded-2xl border border-destructive/40 bg-card p-8" data-testid="daily-error" role="alert">
          <h2 className="text-lg font-semibold">Today&apos;s challenge is unavailable.</h2>
          <p className="mt-2 text-sm text-muted-foreground">The server returned a game that is not in this build. Try again or open the games page.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="rounded-full" onClick={dailyReq.retry} data-testid="daily-retry">Try again</Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/games/">All games</Link></Button>
          </div>
        </div>
      )}

      {game && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rise-in relative overflow-hidden rounded-2xl border bg-card p-8 sm:p-10" data-testid="daily-card">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: game.color }} />
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground" data-testid="daily-date">{d.date}</div>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-xl" style={{ background: `${game.color}22`, color: game.color }}><I size={28} /></span>
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl" data-testid="daily-game-title">{game.title}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">{game.tagline} <DifficultyBadge d={d.difficulty} testId="daily-difficulty" /></div>
              </div>
            </div>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">{game.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8 font-semibold" data-testid="daily-play-btn">
                <Link to={`/games/${d.game_id}/?daily=1`}><Play size={16} /> Play today&apos;s challenge</Link>
              </Button>
              <div className="flex items-center gap-2 font-mono-type text-sm text-muted-foreground"><Timer size={14} /> Resets in <span className="text-foreground" data-testid="daily-countdown">{fmt(left)}</span></div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6" data-testid="daily-my-stats">
            <div className="mb-3 flex items-center gap-2 font-semibold"><Users size={16} className="text-primary" /> Your run today</div>
            {!user && <p className="text-sm text-muted-foreground"><Link to="/login/" className="text-primary underline">Sign in</Link> to post your score to today&apos;s board.</p>}
            {user && !d.my_best && <p className="text-sm text-muted-foreground">No attempts yet. Go set the bar.</p>}
            {user && d.my_best && (
              <div className="grid grid-cols-3 gap-2">
                {[["Best", d.my_best.score, "daily-my-best"], ["WPM", d.my_best.wpm, "daily-my-wpm"], ["Acc", `${d.my_best.accuracy}%`, "daily-my-acc"]].map(([l, v, id]) => (
                  <div key={l} className="rounded-xl bg-muted p-3"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div><div className="font-pixel text-xs sm:text-sm" data-testid={id}>{v}</div></div>
                ))}
              </div>
            )}
            {user && <p className="mt-3 text-xs text-muted-foreground" data-testid="daily-my-attempts">{d.my_attempts} attempt{d.my_attempts === 1 ? "" : "s"} today · unlimited retries</p>}
          </div>
        </div>
      )}

      <h2 className="mt-12 mb-4 text-lg font-semibold">Today&apos;s leaderboard</h2>
      <BoardTable
        rows={boardReq.data}
        status={boardReq.status}
        error={boardReq.error}
        onRetry={boardReq.retry}
        userId={user?.id}
        emptyText="Nobody has played today's challenge yet. Be the first!"
      />
    </div>
  );
}
