let ctx;
let muted = localStorage.getItem("kq_muted") === "1";
const listeners = new Set();

export const isMuted = () => muted;
export const setMuted = (m) => {
  muted = m;
  localStorage.setItem("kq_muted", m ? "1" : "0");
  listeners.forEach((l) => l(m));
};
export const subscribeMute = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

const tone = ({ type = "square", f0 = 440, f1 = f0, dur = 0.1, gain = 0.15, delay = 0 }) => {
  const c = ac();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

const noise = ({ dur = 0.08, gain = 0.2, filter = 1800, q = 1 }) => {
  const c = ac();
  const t = c.currentTime;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = filter;
  bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
};

const SOUNDS = {
  click: () => { noise({ dur: 0.035, gain: 0.12, filter: 2600, q: 0.8 }); tone({ type: "triangle", f0: 1200, f1: 600, dur: 0.03, gain: 0.04 }); },
  error: () => tone({ type: "sawtooth", f0: 160, f1: 90, dur: 0.18, gain: 0.1 }),
  zap: () => tone({ type: "sawtooth", f0: 1400, f1: 120, dur: 0.22, gain: 0.12 }),
  pop: () => { noise({ dur: 0.06, gain: 0.3, filter: 1200, q: 2 }); tone({ type: "sine", f0: 600, f1: 1100, dur: 0.07, gain: 0.1 }); },
  splat: () => { noise({ dur: 0.16, gain: 0.3, filter: 350, q: 1 }); tone({ type: "square", f0: 180, f1: 60, dur: 0.16, gain: 0.08 }); },
  hit: () => tone({ type: "square", f0: 880, f1: 1320, dur: 0.08, gain: 0.08 }),
  miss: () => tone({ type: "square", f0: 300, f1: 150, dur: 0.2, gain: 0.1 }),
  finish: () => [523, 659, 784].forEach((f, i) => tone({ type: "triangle", f0: f, dur: 0.18, gain: 0.1, delay: i * 0.12 })),
  unlock: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ type: "sine", f0: f, dur: 0.2, gain: 0.09, delay: i * 0.08 })),
};

export const sfx = Object.fromEntries(
  Object.entries(SOUNDS).map(([k, fn]) => [k, () => { if (muted) return; try { fn(); } catch { /* no audio */ } }]),
);
