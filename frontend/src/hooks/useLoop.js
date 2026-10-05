import { useEffect, useRef, useState } from "react";

export function useLoop(active, tick) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let id;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickRef.current(dt, now);
      setFrame((f) => (f + 1) % 1e6);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [active]);
}
