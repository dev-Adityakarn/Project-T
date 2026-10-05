import { useEffect, useRef, useState } from "react";
import { useLoop } from "@/hooks/useLoop";
import { GameHUD } from "@/components/GameHUD";
import { sfx } from "@/lib/sound";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const COLORS = ["#F472B6", "#38BDF8", "#FACC15", "#A3E635", "#C084FC", "#FB923C"];
const CFG = {
  easy: { lives: 7, spawn: 1.5, speed: 0.09 },
  medium: { lives: 5, spawn: 1.2, speed: 0.12 },
  hard: { lives: 3, spawn: 0.9, speed: 0.16 },
};

export default function BalloonPop({ onFinish, difficulty = "medium" }) {
  const cfg = CFG[difficulty];
  const s = useRef(null);
  if (!s.current) s.current = { balloons: [], pops: [], lives: cfg.lives, score: 0, combo: 0, hits: 0, keys: 0, elapsed: 0, spawnT: 0, id: 0, over: false };
  const [, force] = useState(0);
  const st = s.current;
  const level = 1 + Math.floor(st.elapsed / 15);

  const finish = () => {
    st.over = true;
    onFinish({ score: st.score, wpm: Math.round(st.hits / 5 / (Math.max(st.elapsed, 1) / 60)), accuracy: st.keys ? Math.round((st.hits / st.keys) * 1000) / 10 : 0, duration: Math.round(st.elapsed) });
  };

  useLoop(!st.over, (dt, now) => {
    if (st.over) return;
    st.elapsed += dt;
    st.spawnT -= dt;
    const lvl = 1 + Math.floor(st.elapsed / 15);
    if (st.spawnT <= 0) {
      st.balloons.push({ id: ++st.id, ch: LETTERS[Math.floor(Math.random() * 26)], x: 5 + Math.random() * 88, p: 0, speed: cfg.speed * (1 + 0.15 * (lvl - 1)) * (0.8 + Math.random() * 0.4), color: COLORS[st.id % COLORS.length] });
      st.spawnT = Math.max(0.4, cfg.spawn - 0.1 * (lvl - 1));
    }
    st.balloons.forEach((b) => { b.p += b.speed * dt; });
    const escaped = st.balloons.filter((b) => b.p >= 1).length;
    if (escaped) { st.lives -= escaped; st.combo = 0; st.balloons = st.balloons.filter((b) => b.p < 1); sfx.miss(); }
    st.pops = st.pops.filter((p) => now - p.t < 350);
    if (st.lives <= 0) finish();
  });

  useEffect(() => {
    const h = (e) => {
      if (st.over || e.key.length !== 1) return;
      st.keys += 1;
      const k = e.key.toLowerCase();
      const match = st.balloons.filter((b) => b.ch === k).sort((a, b) => b.p - a.p)[0];
      if (match) {
        st.balloons = st.balloons.filter((b) => b.id !== match.id);
        st.combo += 1;
        st.hits += 1;
        st.score += 10 + Math.min(st.combo, 20) * 2;
        st.pops.push({ ...match, t: performance.now() });
        sfx.pop();
      } else { st.combo = 0; sfx.error(); }
      force((x) => x + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [st]);

  return (
    <div>
      <GameHUD items={[{ label: "Score", value: st.score, testId: "hud-score" }, { label: "Level", value: level, testId: "hud-level" }, { label: "Combo", value: `x${st.combo}` }]} lives={st.lives} maxLives={cfg.lives} />
      <div className="relative h-[460px] overflow-hidden rounded-2xl border bg-gradient-to-b from-secondary/10 to-card" data-testid="balloon-arena">
        {st.balloons.map((b) => (
          <div key={b.id} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${b.x}%`, bottom: `${b.p * 92 - 10}%` }} data-testid="balloon">
            <div className="grid h-14 w-12 place-items-center font-pixel text-base text-[#0F172A]" style={{ background: b.color, borderRadius: "50% 50% 48% 48% / 58% 58% 42% 42%", boxShadow: "inset -6px -8px 0 rgba(0,0,0,.12)" }}>
              {b.ch.toUpperCase()}
            </div>
            <div className="h-8 w-px bg-muted-foreground/50" />
          </div>
        ))}
        {st.pops.map((p) => (
          <div key={`p${p.id}`} className="pop-out absolute h-14 w-14 -translate-x-1/2 rounded-full border-4" style={{ left: `${p.x}%`, bottom: `${p.p * 92 - 6}%`, borderColor: p.color }} />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Press the letter keys to pop balloons.</p>
    </div>
  );
}
