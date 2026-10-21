import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Play, Trophy, CalendarCheck, Lock } from "lucide-react";
import { getGame } from "@/data/games";
import { GAME_COMPONENTS } from "@/games";
import { DIFF_DESC } from "@/data/difficulty";
import { api } from "@/lib/api";
import { sfx } from "@/lib/sound";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DifficultyPicker, DifficultyBadge } from "@/components/DifficultyPicker";
import { BadgeIcon } from "@/components/Badges";

const MiniBoard = ({ rows, title }) => (
  <div className="rounded-2xl border bg-card p-5" data-testid="game-mini-leaderboard">
    <div className="mb-3 flex items-center gap-2 font-semibold"><Trophy size={16} className="text-primary" /> {title}</div>
    {rows.length === 0 && <p className="text-sm text-muted-foreground">No scores yet. Be the first!</p>}
    {rows.slice(0, 5).map((r, i) => (
      <div key={r.user_id} className="flex items-center justify-between border-t py-2 text-sm first:border-t-0">
        <span><span className="mr-2 font-pixel text-[10px] text-muted-foreground">{i + 1}</span>{r.name}</span>
        <span className="font-mono-type">{r.best_score}</span>
      </div>
    ))}
  </div>
);

const DailyTag = ({ daily }) => (
  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-medium text-primary" data-testid="daily-mode-tag">
    <CalendarCheck size={12} /> Daily Challenge · {daily.date}
  </div>
);

const Intro = ({ game, difficulty, setDifficulty, daily, loading, onStart }) => (
  <div className="rise-in rounded-2xl border bg-card p-8 sm:p-12" data-testid="game-intro">
    {daily && <DailyTag daily={daily} />}
    <p className="max-w-xl text-base text-muted-foreground md:text-lg">{game.description}</p>
    <ul className="mt-6 space-y-2">
      {game.howTo.map((h) => <li key={h} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ background: game.color }} />{h}</li>)}
    </ul>
    <div className="mt-8">
      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Difficulty</div>
      {daily ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="difficulty-locked"><DifficultyBadge d={difficulty} /> <Lock size={12} /> locked for today's challenge</div>
      ) : (
        <>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          <p className="mt-2 text-xs text-muted-foreground" data-testid="difficulty-desc">{DIFF_DESC[difficulty]}</p>
        </>
      )}
    </div>
    <Button size="lg" onClick={onStart} disabled={loading} className="mt-8 rounded-full px-8 font-semibold" data-testid="game-start-btn"><Play size={16} /> {loading ? "Loading challenge..." : "Start game"}</Button>
    <p className="mt-3 text-xs text-muted-foreground">or press Enter</p>
  </div>
);

const NewBadges = ({ badges }) => (
  <div className="mt-6 rounded-xl border border-primary/50 bg-primary/5 p-4" data-testid="new-badges">
    <div className="text-[10px] uppercase tracking-widest text-primary">Badge{badges.length > 1 ? "s" : ""} unlocked</div>
    <div className="mt-3 flex flex-wrap gap-3">
      {badges.map((b, i) => (
        <div key={b.id} className="rise-in flex items-center gap-3 rounded-lg border bg-card px-3 py-2" style={{ animationDelay: `${i * 120}ms` }} data-testid={`new-badge-${b.id}`}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--kb-key-side))]"><BadgeIcon name={b.icon} size={16} /></span>
          <div><div className="text-sm font-semibold">{b.title}</div><div className="text-xs text-muted-foreground">{b.desc}</div></div>
        </div>
      ))}
    </div>
  </div>
);

const Result = ({ r, saved, user, onAgain, difficulty, daily, badges }) => (
  <div className="rise-in rounded-2xl border bg-card p-8 sm:p-12" data-testid="game-result">
    {daily && <DailyTag daily={daily} />}
    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">Game over <DifficultyBadge d={difficulty} testId="result-difficulty" /></div>
    <div className="mt-2 font-pixel text-4xl text-primary sm:text-5xl" data-testid="result-score">{r.score}</div>
    {r.extra && <div className="mt-2 text-sm text-muted-foreground" data-testid="result-extra">{r.extra}</div>}
    <div className="mt-8 grid grid-cols-3 gap-3">
      {[["WPM", r.wpm, "result-wpm"], ["Accuracy", `${r.accuracy}%`, "result-accuracy"], ["Time", `${r.duration}s`, "result-time"]].map(([l, v, id]) => (
        <div key={l} className="rounded-xl bg-muted p-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div><div className="font-pixel text-sm sm:text-lg" data-testid={id}>{v}</div></div>
      ))}
    </div>
    {badges.length > 0 && <NewBadges badges={badges} />}
    <p className="mt-6 text-sm text-muted-foreground" data-testid="result-save-status">
      {user ? (saved ? (daily ? "Saved to today's challenge board." : "Saved to your profile.") : "Saving...") : <><Link to="/login/" className="text-primary underline">Sign in</Link> to save scores and join the leaderboard.</>}
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button onClick={onAgain} className="rounded-full px-6 font-semibold" data-testid="play-again-btn"><RotateCcw size={16} /> Play again</Button>
      {daily ? (
        <Button asChild variant="outline" className="rounded-full px-6" data-testid="back-to-daily-btn"><Link to="/daily/">Daily board</Link></Button>
      ) : (
        <Button asChild variant="outline" className="rounded-full px-6" data-testid="back-to-games-btn"><Link to="/games/">All games</Link></Button>
      )}
    </div>
  </div>
);

export default function GamePlay() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const wantDaily = params.get("daily") === "1";
  const game = getGame(id);
  const Comp = GAME_COMPONENTS[id];
  const { user } = useAuth();
  const [phase, setPhase] = useState("ready");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [badges, setBadges] = useState([]);
  const [board, setBoard] = useState([]);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem("kq_diff") || "medium");
  const [daily, setDaily] = useState(wantDaily ? undefined : null);

  useEffect(() => {
    if (!wantDaily) { setDaily(null); return; }
    setDaily(undefined);
    api.get("/daily").then((r) => setDaily(r.data.game_id === id ? r.data : null)).catch(() => setDaily(null));
  }, [wantDaily, id]);

  const loading = daily === undefined;
  const activeDiff = daily ? daily.difficulty : difficulty;

  const loadBoard = useCallback(() => {
    if (loading) return;
    const req = daily ? api.get("/daily/leaderboard", { params: { limit: 5 } }) : api.get("/leaderboard", { params: { game_id: id, difficulty: activeDiff, limit: 5 } });
    req.then((r) => setBoard(r.data)).catch(() => setBoard([]));
  }, [id, daily, activeDiff, loading]);
  useEffect(() => { setPhase("ready"); }, [id]);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  const pickDifficulty = (d) => { setDifficulty(d); localStorage.setItem("kq_diff", d); };
  const start = useCallback(() => { setResult(null); setSaved(false); setBadges([]); setRun((r) => r + 1); setPhase("playing"); }, []);

  useEffect(() => {
    if (phase === "playing" || loading) return undefined;
    const h = (e) => { if (e.key === "Enter") { e.preventDefault(); start(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, start, loading]);

  const onFinish = useCallback((r) => {
    setResult(r);
    setPhase("over");
    sfx.finish();
    if (!user) return;
    const { extra, ...payload } = r;
    api.post("/results", { game_id: id, ...payload, difficulty: activeDiff, daily: !!daily }).then((res) => {
      setSaved(true);
      loadBoard();
      const nb = res.data.new_achievements || [];
      if (nb.length) { setBadges(nb); setTimeout(sfx.unlock, 700); }
    }).catch(() => {});
  }, [id, user, loadBoard, activeDiff, daily]);

  if (!game) return <div className="p-20 text-center">Game not found. <Link to="/games/" className="text-primary">Back</Link></div>;
  const I = game.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <Link to={daily ? "/daily/" : "/games/"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="game-back-link"><ArrowLeft size={14} /> {daily ? "Daily challenge" : "Games"}</Link>
      <div className="mt-4 mb-6 flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: `${game.color}22`, color: game.color }}><I size={24} /></span>
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl" data-testid="game-title">{game.title}</h1>
          <p className="text-sm text-muted-foreground">{game.tagline}</p>
        </div>
        {phase === "playing" && <DifficultyBadge d={activeDiff} className="ml-auto" testId="playing-difficulty" />}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div data-testid="game-stage">
          {phase === "ready" && <Intro game={game} difficulty={activeDiff} setDifficulty={pickDifficulty} daily={daily} loading={loading} onStart={start} />}
          {phase === "playing" && <Comp key={run} onFinish={onFinish} difficulty={activeDiff} seed={daily?.seed} />}
          {phase === "over" && result && <Result r={result} saved={saved} user={user} onAgain={start} difficulty={activeDiff} daily={daily} badges={badges} />}
        </div>
        <aside className="space-y-4"><MiniBoard rows={board} title={daily ? "Today's top players" : `Top players · ${activeDiff}`} /></aside>
      </div>
    </div>
  );
}
