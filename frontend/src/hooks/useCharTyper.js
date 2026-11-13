import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";

export const calcStats = (correct, keys, errors, seconds) => {
  const mins = Math.max(seconds, 1) / 60;
  const wpm = Math.round(correct / 5 / mins);
  const accuracy = keys ? Math.round(((keys - errors) / keys) * 1000) / 10 : 0;
  return { wpm, accuracy, duration: Math.round(seconds), errors, keystrokes: keys };
};

/**
 * Several typing surfaces can be mounted at once. The main test on
 * /typing-test/code/ sits above the custom-snippet widget, and both used to
 * read the same window keydown event. Keep one owner so a keystroke is only
 * applied to the surface the visitor is using.
 */
let nextTyperId = 0;
let activeTyperId = null;
const mountedTypers = [];

const registerTyper = (id, autoClaim) => {
  mountedTypers.push(id);
  if (activeTyperId === null || autoClaim) activeTyperId = id;
};

const unregisterTyper = (id) => {
  const index = mountedTypers.indexOf(id);
  if (index !== -1) mountedTypers.splice(index, 1);
  if (activeTyperId === id) {
    activeTyperId = mountedTypers.length ? mountedTypers[mountedTypers.length - 1] : null;
  }
};

export function useCharTyper(
  text,
  { active = true, strict = false, autoIndent = false, autoClaim = false, onDone, onMistake } = {},
) {
  const [typed, setTyped] = useState("");
  const ref = useRef({ typed: "", keys: 0, errors: 0, start: null });
  const idRef = useRef(null);
  if (idRef.current === null) {
    nextTyperId += 1;
    idRef.current = nextTyperId;
  }
  const cb = useRef({ onDone, onMistake });
  cb.current = { onDone, onMistake };

  useEffect(() => {
    const id = idRef.current;
    registerTyper(id, autoClaim);
    return () => unregisterTyper(id);
  }, [autoClaim]);

  const claim = useCallback(() => {
    activeTyperId = idRef.current;
  }, []);

  useEffect(() => {
    ref.current = { typed: "", keys: 0, errors: 0, start: null };
    setTyped("");
  }, [text]);

  useEffect(() => {
    if (!active) return undefined;
    const id = idRef.current;
    const handler = (e) => {
      if (activeTyperId !== id) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // A page can contain a typing tool and a real form control (for example
      // the custom-code editor on /typing-test/code/). Never swallow keys that
      // belong to an input, textarea, select or contenteditable element.
      const target = e.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || ""))) {
        return;
      }
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

  return { typed, correct, started: !!ref.current.start, errors: ref.current.errors, elapsed, getStats, reset, claim };
}
