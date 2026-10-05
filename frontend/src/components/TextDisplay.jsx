import { useEffect, useRef } from "react";

export const TextDisplay = ({ text, typed, height = "h-44", className = "" }) => {
  const box = useRef(null);
  const caret = useRef(null);

  useEffect(() => {
    if (box.current && caret.current) box.current.scrollTop = Math.max(0, caret.current.offsetTop - 40);
  }, [typed.length]);

  return (
    <div ref={box} className={`relative overflow-hidden rounded-2xl border bg-card p-6 font-mono-type text-lg leading-relaxed sm:text-2xl ${height} ${className}`} data-testid="typing-text">
      {text.split("").map((ch, i) => {
        let cls = "text-muted-foreground/60";
        if (i < typed.length) cls = typed[i] === ch ? "text-foreground" : "bg-destructive/25 text-destructive";
        const isCaret = i === typed.length;
        const shown = ch === "\n" ? "\u21B5" : ch;
        return (
          <span key={i}>
            <span ref={isCaret ? caret : null} className={`${cls} ${isCaret ? "caret" : ""} whitespace-pre`}>{shown}</span>
            {ch === "\n" && <br />}
          </span>
        );
      })}
    </div>
  );
};
