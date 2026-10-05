import { useRef, useState } from "react";
import { useCharTyper } from "@/hooks/useCharTyper";
import { randomWords, wordPool, rngFor } from "@/data/words";
import { TextDisplay } from "@/components/TextDisplay";
import { GameHUD } from "@/components/GameHUD";

export default function SuddenDeath({ onFinish, difficulty = "medium", seed }) {
  const [text] = useState(() => randomWords(200, wordPool(difficulty), rngFor(seed)).join(" "));
  const [dead, setDead] = useState(false);
  const done = useRef(false);

  const end = () => {
    if (done.current) return;
    done.current = true;
    setDead(true);
    setTimeout(() => {
      const s = t.getStats();
      onFinish({ ...s, score: words() * 10 });
    }, 500);
  };
  const t = useCharTyper(text, { active: !dead, onMistake: end, onDone: end });
  const words = () => text.slice(0, t.correct).split(" ").length - 1;

  return (
    <div className={dead ? "shake" : ""}>
      <GameHUD items={[{ label: "Words", value: words(), testId: "hud-words" }, { label: "Score", value: words() * 10, testId: "hud-score" }, { label: "WPM", value: t.started ? t.getStats().wpm : 0, testId: "hud-wpm" }]} />
      <TextDisplay text={text} typed={t.typed} className={dead ? "border-destructive" : ""} />
      <p className="mt-3 text-sm text-muted-foreground">{dead ? "Typo! Run over." : "Careful — a single wrong key ends the run."}</p>
    </div>
  );
}
