import { useRef, useState } from "react";
import { useCharTyper } from "@/hooks/useCharTyper";
import { CODE, pick, rngFor } from "@/data/words";
import { TextDisplay } from "@/components/TextDisplay";
import { GameHUD } from "@/components/GameHUD";

export default function CodeTyper({ onFinish, difficulty = "medium", seed }) {
  const [snip] = useState(() => pick(CODE.filter((c) => c.level === difficulty), rngFor(seed)));
  const done = useRef(false);
  const t = useCharTyper(snip.text, {
    strict: true,
    autoIndent: true,
    onDone: () => {
      if (done.current) return;
      done.current = true;
      const s = t.getStats();
      onFinish({ ...s, score: Math.round((s.wpm * s.accuracy) / 100), extra: `${snip.lang} snippet` });
    },
  });
  const live = t.getStats();

  return (
    <div>
      <GameHUD items={[
        { label: "Language", value: snip.lang, testId: "hud-lang" },
        { label: "WPM", value: t.started ? live.wpm : 0, testId: "hud-wpm" },
        { label: "Errors", value: t.errors, testId: "hud-errors" },
      ]} />
      <TextDisplay text={snip.text} typed={t.typed} height="h-auto min-h-[260px]" className="!text-base sm:!text-lg" />
      <p className="mt-3 text-sm text-muted-foreground">Press Enter for new lines — indentation is filled in for you.</p>
    </div>
  );
}
