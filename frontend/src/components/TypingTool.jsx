import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useCharTyper } from "@/hooks/useCharTyper";
import { makeTestText } from "@/lib/testText";
import { TextDisplay } from "@/components/TextDisplay";
import { GameHUD } from "@/components/GameHUD";
import { Keyboard3D, normalizeKey } from "@/components/Keyboard3D";
import { ShareCard } from "@/components/ShareCard";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sound";
import { trackEvent } from "@/lib/analytics";

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

export const TypingTool = ({ config, label = "Typing test", textOverride, testId = "typing-tool" }) => {
  const options = config.durations || (config.duration ? [config.duration] : []);
  const [dur, setDur] = useState(config.duration ?? null);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState(null);
  const [left, setLeft] = useState(config.duration ?? 0);
  const done = useRef(false);

  const text = useMemo(
    () => textOverride || makeTestText(config.kind, { words: config.words ?? (dur ? Math.max(60, dur * 3) : 60), texts: config.texts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, dur, textOverride],
  );

  const end = () => {
    if (done.current) return;
    done.current = true;
    const seconds = dur ? Math.min(dur, t.elapsed() || dur) : t.elapsed();
    const s = t.getStats(seconds);
    setResult(s);
    sfx.finish();
    trackEvent("typing_test_complete", { label, wpm: s.wpm, accuracy: s.accuracy, duration: s.duration });
  };

  const t = useCharTyper(text, { active: !result, autoIndent: config.kind === "code", onDone: end });

  useEffect(() => {
    if (!dur || !t.started || result) return undefined;
    const id = setInterval(() => {
      const l = Math.max(0, dur - t.elapsed());
      setLeft(Math.ceil(l));
      if (l <= 0) end();
    }, 200);
    return () => clearInterval(id);
  });

  const restart = () => {
    done.current = false;
    setResult(null);
    setLeft(dur ?? 0);
    setRun((r) => r + 1);
  };

  const changeDuration = (d) => {
    done.current = false;
    setDur(d);
    setLeft(d);
    setResult(null);
    setRun((r) => r + 1);
  };

  const live = t.getStats();
  const next = text[t.typed.length];

  if (result) {
    return (
      <div className="rise-in rounded-2xl border bg-card p-6 sm:p-8" data-testid={`${testId}-result`}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label} · result</div>
        <div className="mt-2 flex flex-wrap items-end gap-8">
          <div>
            <div className="font-pixel text-4xl text-primary sm:text-5xl" data-testid="tool-result-wpm">{result.wpm}</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">words per minute</div>
          </div>
          <div>
            <div className="font-pixel text-2xl sm:text-3xl" data-testid="tool-result-accuracy">{result.accuracy}%</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">accuracy</div>
          </div>
          <div>
            <div className="font-pixel text-2xl sm:text-3xl" data-testid="tool-result-duration">{result.duration}s</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">time typed</div>
          </div>
        </div>
        <ShareCard wpm={result.wpm} accuracy={result.accuracy} duration={result.duration} label={label} />
        <Button onClick={restart} className="mt-6 rounded-full px-6 font-semibold" data-testid="tool-restart-btn">
          <RotateCcw size={16} /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-7" data-testid={testId}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <GameHUD items={[
          ...(dur ? [{ label: "Time", value: fmt(t.started ? left : dur), testId: "hud-time" }] : [{ label: "Time", value: `${Math.round(live.duration)}s`, testId: "hud-time" }]),
          { label: "WPM", value: t.started ? live.wpm : 0, testId: "hud-wpm" },
          { label: "Accuracy", value: `${t.started ? live.accuracy : 100}%`, testId: "hud-accuracy" },
        ]} />
        {!t.started && options.length > 1 && (
          <div className="flex gap-2" data-testid="tool-duration-selector">
            {options.map((d) => (
              <button key={d} onClick={() => changeDuration(d)} data-testid={`tool-duration-${d}`}
                className={`rounded-full border px-4 py-1.5 font-mono-type text-sm transition-colors duration-200 ${dur === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {fmt(d)}
              </button>
            ))}
          </div>
        )}
      </div>
      <TextDisplay text={text} typed={t.typed} />
      <p className="mt-3 text-sm text-muted-foreground" data-testid="tool-hint">
        {t.started ? "Keep going — the clock stops on its own." : dur ? "Start typing to begin the timer." : "Start typing; this drill ends when you finish the passage."}
      </p>
      <div className="mt-6 hidden md:block">
        <Keyboard3D flat hint={next ? normalizeKey(next) : null} className="mx-auto max-w-3xl" />
      </div>
    </div>
  );
};
