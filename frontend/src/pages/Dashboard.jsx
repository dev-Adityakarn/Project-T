import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { GAMES, getGame } from "@/data/games";
import { BadgeCard } from "@/components/Badges";
import { DifficultyBadge } from "@/components/DifficultyPicker";

const Card = ({ label, value, testId }) => (
  <div className="rounded-2xl border bg-card p-6">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-2 font-pixel text-xl sm:text-2xl" data-testid={testId}>{value}</div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get("/stats/me").then((r) => setStats(r.data));
    api.get("/results/me", { params: { limit: 30 } }).then((r) => setHistory(r.data));
    api.get("/achievements/me").then((r) => setBadges(r.data)).catch(() => {});
  }, [user]);

  if (user === null) return <div className="p-20 text-center text-muted-foreground">Loading...</div>;
  if (user === false) return <Navigate to="/login" replace />;

  const chart = [...history].reverse().map((h, i) => ({ n: i + 1, wpm: h.wpm, accuracy: h.accuracy }));
  const perGame = Object.fromEntries((stats?.per_game || []).map((g) => [g.game_id, g]));
  const unlocked = badges.filter((b) => b.unlocked_at).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8" data-testid="dashboard">
      <h1 className="text-4xl font-bold sm:text-5xl">Hey, {user.name}</h1>
      <p className="mt-3 text-base text-muted-foreground md:text-lg">Your typing journey so far.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Games played" value={stats?.total_games ?? 0} testId="stat-total-games" />
        <Card label="Best WPM" value={stats?.best_wpm ?? 0} testId="stat-best-wpm" />
        <Card label="Avg WPM" value={stats?.avg_wpm ?? 0} testId="stat-avg-wpm" />
        <Card label="Avg accuracy" value={`${stats?.avg_accuracy ?? 0}%`} testId="stat-avg-accuracy" />
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6" data-testid="badges-section">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Award size={18} className="text-primary" /> Badges</h2>
          <span className="font-pixel text-[10px] text-muted-foreground" data-testid="badges-count">{unlocked} / {badges.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {badges.map((a) => <BadgeCard key={a.id} a={a} />)}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">WPM over last {chart.length} games</h2>
        {chart.length ? (
          <div className="h-64" data-testid="wpm-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="n" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="wpm" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-muted-foreground">Play a game to see your progress. <Link to="/games" className="text-primary">Browse games</Link></p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6" data-testid="per-game-stats">
          <h2 className="mb-4 text-lg font-semibold">Personal bests</h2>
          {GAMES.map((g) => (
            <div key={g.id} className="flex items-center justify-between border-t py-2.5 text-sm first:border-t-0">
              <Link to={`/games/${g.id}`} className="flex items-center gap-2 hover:text-primary"><g.icon size={14} style={{ color: g.color }} /> {g.title}</Link>
              <span className="font-mono-type text-muted-foreground">{perGame[g.id] ? `${perGame[g.id].best_score} pts · ${perGame[g.id].plays} plays` : "—"}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-6" data-testid="recent-results">
          <h2 className="mb-4 text-lg font-semibold">Recent games</h2>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {history.slice(0, 10).map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 border-t py-2.5 text-sm first:border-t-0">
              <span className="flex min-w-0 items-center gap-2"><span className="truncate">{getGame(h.game_id)?.title || h.game_id}</span><DifficultyBadge d={h.difficulty} className="hidden sm:inline-flex" /></span>
              <span className="shrink-0 font-mono-type text-muted-foreground">{h.score} pts · {h.wpm} wpm · {h.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
