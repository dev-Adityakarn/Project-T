import { useEffect, useRef, useState } from "react";
import { Keyboard3D, normalizeKey } from "./Keyboard3D";

const PHRASES = ["practice makes perfect", "ten games one keyboard", "type faster every day", "zombies hate good typists", "hello world"];

export const HeroKeyboard = () => {
  const [demoKey, setDemoKey] = useState(null);
  const [pressed, setPressed] = useState(new Set());
  const [text, setText] = useState("");
  const lastReal = useRef(0);
  const boardRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    let p = 0, i = 0, wait = 0;
    const id = setInterval(() => {
      if (Date.now() - lastReal.current < 2500) return setDemoKey(null);
      if (wait > 0) { wait -= 1; setDemoKey(null); return; }
      const phrase = PHRASES[p];
      if (i >= phrase.length) { p = (p + 1) % PHRASES.length; i = 0; wait = 10; return; }
      const ch = phrase[i];
      i += 1;
      setDemoKey(normalizeKey(ch));
      setText(phrase.slice(0, i));
    }, 120);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const down = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      lastReal.current = Date.now();
      const k = normalizeKey(e.key);
      setPressed((s) => new Set(s).add(k));
      if (e.key.length === 1) setText((t) => (t.length > 28 ? "" : t) + e.key);
      else if (e.key === "Backspace") setText((t) => t.slice(0, -1));
    };
    const up = (e) => setPressed((s) => { const n = new Set(s); n.delete(normalizeKey(e.key)); return n; });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const onMove = (e) => {
    if (!boardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = sceneRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    boardRef.current.style.setProperty("--rx", `${46 - y * 14}deg`);
    boardRef.current.style.setProperty("--ry", `${x * 14}deg`);
  };
  const onLeave = () => {
    boardRef.current?.style.setProperty("--rx", "46deg");
    boardRef.current?.style.setProperty("--ry", "0deg");
  };

  const active = new Set(pressed);
  if (demoKey) active.add(demoKey);

  return (
    <div ref={sceneRef} onMouseMove={onMove} onMouseLeave={onLeave} className="relative w-full" data-testid="hero-keyboard-scene">
      <div className="mx-auto mb-2 w-fit rounded-full border bg-card/80 px-5 py-2 font-mono-type text-sm backdrop-blur-md sm:text-base" data-testid="hero-typed-text">
        <span className="text-muted-foreground">&gt; </span>
        {text}
        <span className="caret inline-block w-2">&nbsp;</span>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-3/4 -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/25 blur-3xl" />
      <div className="kb-scene relative px-2 py-10 sm:py-16">
        <div className="kb-float">
          <Keyboard3D ref={boardRef} active={active} className="mx-auto max-w-[860px]" />
        </div>
      </div>
    </div>
  );
};
