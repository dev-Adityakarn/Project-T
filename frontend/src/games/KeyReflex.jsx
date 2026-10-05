import { useEffect, useRef, useState } from "react";
import { useLoop } from "@/hooks/useLoop";
import { GameHUD } from "@/components/GameHUD";
import { Keyboard3D } from "@/components/Keyboard3D";
import { sfx } from "@/lib/sound";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const CFG = {
  easy: { keys: LETTERS, window: 3, decay: 0.97, min: 0.8 },
  medium: { keys: `${LETTERS}0123456789`, window: 2.2, decay: 0.95, min: 0.55 },
  hard: { keys: `${LETTERS}0123456789-=[];',./`, window: 1.6, decay: 0.93, min: 0.4 },
};
const nextKey = (keys, prev) => { let k; do k = keys[Math.floor(Math.random() * keys.length)]; while (k === prev); return k; };

export default function KeyReflex({ onFinish, difficulty = "medium" }) {
  const cfg = CFG[difficulty];
  const s = useRef(null);
  if (!s.current) s.current = { key: nextKey(cfg.keys), window: cfg.window, left: cfg.window, hits: 0, misses: 0, keys: 0, score: 0, elapsed: 0, over: false, flash: null };
  const [, force] = useState(0);
  const st = s.current;

  const finish = () => {
    st.over = true;
    const acc = st.keys ? Math.round((st.hits / st.keys) * 1000) / 10 : 0;
    onFinish({ score: st.score, wpm: Math.round(st.hits / 5 / (Math.max(st.elapsed, 1) / 60)), accuracy: acc, duration: Math.round(st.elapsed) });
  };
  const miss = () => {
    st.misses += 1;
    st.flash = "miss";
    sfx.miss();
    if (st.misses >= 3) finish();
    else { st.key = nextKey(cfg.keys, st.key); st.left = st.window; }
  };

  useLoop(!st.over, (dt) => {
    st.elapsed += dt;
    st.left -= dt;
    if (st.left <= 0) miss();
  });

  useEffect(() => {
    const h = (e) => {
      if (st.over || e.key.length !== 1) return;
      st.keys += 1;
      if (e.key.toLowerCase() === st.key) {
        st.hits += 1;
        st.score += 10 + Math.round((st.left / st.window) * 20);
        st.window = Math.max(cfg.min, st.window * cfg.decay);
        st.key = nextKey(cfg.keys, st.key);
        st.left = st.window;
        st.flash = "hit";
        sfx.hit();
      } else miss();
      force((x) => x + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, cfg]);

  return (
    <div>
      <GameHUD items={[{ label: "Score", value: st.score, testId: "hud-score" }, { label: "Hits", value: st.hits, testId: "hud-hits" }, { label: "Window", value: `${st.window.toFixed(2)}s` }]} lives={3 - st.misses} maxLives={3} />
      <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-8">
        <div key={`${st.key}${st.hits}${st.misses}`} className="rise-in grid h-28 w-28 place-items-center rounded-2xl bg-secondary font-pixel text-4xl text-secondary-foreground shadow-[0_8px_0_hsl(var(--kb-key-side))]" data-testid="reflex-target-key">
          {st.key.toUpperCase()}
        </div>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${(st.left / st.window) * 100}%` }} data-testid="reflex-timer-bar" />
        </div>
        <Keyboard3D flat hint={st.key} className="w-full max-w-3xl" />
      </div>
    </div>
  );
}
