import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";

export const calcStats = (correct, keys, errors, seconds) => {
  const mins = Math.max(seconds, 1) / 60;
  const wpm = Math.round(correct / 5 / mins);
  const accuracy = keys ? Math.round(((keys - errors) / keys) * 1000) / 10 : 0;
  return { wpm, accuracy, duration: Math.round(seconds) };
};

export function useCharTyper(text, { active = true, strict = false, autoIndent = false, onDone, onMistake } = {}) {
  const [typed, setTyped] = useState("");
  const ref = useRef({ typed: "", keys: 0, errors: 0, start: null });
  const cb = useRef({ onDone, onMistake });
  cb.current = { onDone, onMistake };

  useEffect(() => {
    ref.current = { typed: "", keys: 0, errors: 0, start: null };
    setTyped("");
  }, [text]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const st = ref.current;
      let cur = st.typed;
      if (e.key === "Backspace") {
        e.preventDefault();
        cur = cur.slice(0, -1);
      } else {
        const ch = e.key === "Enter" ? "\n" : e.key.length === 1 ? e.key : null;
        if (ch === null || cur.length >= text.length) return;
        e.preventDefault();
        if (!st.start) st.start = performance.now();
        st.keys += 1;
        const expected = text[cur.length];
        if (ch !== expected) {
          st.errors += 1;
          sfx.error();
          cb.current.onMistake?.();
          if (strict) return;
        } else sfx.click();
        cur += ch;
        if (autoIndent && ch === "\n") while (text[cur.length] === " ") cur += " ";
      }
      st.typed = cur;
      setTyped(cur);
      if (cur.length === text.length) cb.current.onDone?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, text, strict, autoIndent]);

  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === text[i]) correct++;

  const elapsed = () => (ref.current.start ? (performance.now() - ref.current.start) / 1000 : 0);
  const getStats = (seconds = elapsed()) => calcStats(correct, ref.current.keys, ref.current.errors, seconds);

  const reset = useCallback(() => {
    ref.current = { typed: "", keys: 0, errors: 0, start: null };
    setTyped("");
  }, []);

  return { typed, correct, started: !!ref.current.start, errors: ref.current.errors, elapsed, getStats, reset };
}
