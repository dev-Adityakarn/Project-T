import { useEffect, useRef, useState } from "react";
import { useCharTyper } from "@/hooks/useCharTyper";
import { randomWords, wordPool, rngFor } from "@/data/words";
import { TextDisplay } from "@/components/TextDisplay";
import { GameHUD } from "@/components/GameHUD";
import { Keyboard3D, normalizeKey } from "@/components/Keyboard3D";

const DURATIONS = [15, 30, 60];

export default function SpeedTest({ onFinish, difficulty = "medium", seed }) {
  const [dur, setDur] = useState(30);
  const [text] = useState(() => randomWords(150, wordPool(difficulty), rngFor(seed)).join(" "));
  const [left, setLeft] = useState(30);
  const done = useRef(false);
  const t = useCharTyper(text, { onDone: () => end() });

  const end = () => {
    if (done.current) return;
    done.current = true;
    const s = t.getStats(Math.min(dur, t.elapsed()) || dur);
    onFinish({ ...s, score: Math.round((s.wpm * s.accuracy) / 100) });
  };

  useEffect(() => {
    if (!t.started) return undefined;
    const id = setInterval(() => {
      const l = Math.max(0, dur - t.elapsed());
      setLeft(Math.ceil(l));
      if (l <= 0) end();
    }, 200);
    return () => clearInterval(id);
  });

  const live = t.getStats();
  const next = text[t.typed.length];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <GameHUD items={[
          { label: "Time", value: `${t.started ? left : dur}s`, testId: "hud-time" },
          { label: "WPM", value: t.started ? live.wpm : 0, testId: "hud-wpm" },
          { label: "Accuracy", value: `${t.started ? live.accuracy : 100}%`, testId: "hud-accuracy" },
        ]} />
        {!t.started && (
          <div className="flex gap-2" data-testid="duration-selector">
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => { setDur(d); setLeft(d); }} data-testid={`duration-${d}`}
                className={`rounded-full border px-4 py-1.5 font-mono-type text-sm transition-colors duration-200 ${dur === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {d}s
              </button>
            ))}
          </div>
        )}
      </div>
      <TextDisplay text={text} typed={t.typed} />
      {!t.started && <p className="mt-3 text-sm text-muted-foreground">Start typing to begin the timer.</p>}
      <div className="mt-6 hidden md:block">
        <Keyboard3D flat hint={next ? normalizeKey(next) : null} className="mx-auto max-w-3xl" />
      </div>
    </div>
  );
}
