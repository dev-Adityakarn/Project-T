import { useRef, useState } from "react";
import { useLoop } from "./useLoop";
import { calcStats } from "./useCharTyper";
import { pick } from "@/data/words";
import { sfx } from "@/lib/sound";

export function useWordTargets({ onFinish, pool, maxLives = 3, spawnBase = 2.2, speedBase = 0.085, hitSound = "pop" }) {
  const s = useRef({ targets: [], lives: maxLives, score: 0, elapsed: 0, spawnT: 0.3, chars: 0, keys: 0, errors: 0, kills: [], combo: 0, over: false, id: 0 });
  const [input, setInput] = useState("");
  const st = s.current;
  const level = 1 + Math.floor(st.elapsed / 20);

  const finish = () => {
    st.over = true;
    onFinish({ score: st.score, ...calcStats(st.chars, st.keys, st.errors, st.elapsed) });
  };

  useLoop(!st.over, (dt, now) => {
    if (st.over) return;
    st.elapsed += dt;
    st.spawnT -= dt;
    const lvl = 1 + Math.floor(st.elapsed / 20);
    if (st.spawnT <= 0) {
      const used = new Set(st.targets.map((t) => t.word));
      let word = pick(pool);
      for (let i = 0; i < 5 && used.has(word); i++) word = pick(pool);
      st.targets.push({ id: ++st.id, word, x: 6 + Math.random() * 78, p: 0, speed: speedBase * (1 + 0.18 * (lvl - 1)) * (0.8 + Math.random() * 0.4) });
      st.spawnT = Math.max(0.65, spawnBase - 0.22 * (lvl - 1));
    }
    st.targets.forEach((t) => { t.p += t.speed * dt; });
    const missed = st.targets.filter((t) => t.p >= 1).length;
    if (missed) {
      st.lives -= missed;
      st.combo = 0;
      st.targets = st.targets.filter((t) => t.p < 1);
      sfx.miss();
    }
    st.kills = st.kills.filter((k) => now - k.t < 300);
    if (st.lives <= 0) finish();
  });

  const onInput = (v) => {
    const val = v.trim().toLowerCase();
    const hit = st.targets.find((t) => t.word === val);
    if (v.length > input.length) {
      st.keys += 1;
      const ok = !val || st.targets.some((t) => t.word.startsWith(val));
      if (!ok) st.errors += 1;
      if (!hit) sfx[ok ? "click" : "error"]();
    }
    if (hit) {
      st.targets = st.targets.filter((t) => t.id !== hit.id);
      st.combo += 1;
      st.score += hit.word.length * 10 * level + Math.min(st.combo, 10) * 5;
      st.chars += hit.word.length + 1;
      st.kills.push({ ...hit, t: performance.now() });
      sfx[hitSound]();
      setInput("");
    } else setInput(v);
  };

  return { targets: st.targets, kills: st.kills, input, onInput, lives: st.lives, maxLives, score: st.score, level, combo: st.combo, elapsed: st.elapsed };
}
