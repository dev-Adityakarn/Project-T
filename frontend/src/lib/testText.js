import { COMMON, MEDIUM, LONG, PARAGRAPHS, CODE, randomWords, pick, shuffle } from "@/data/words";

export const HOME_ROW = `as ask lad fall jak all sad flask salad dial glad hall jail task dad lads sail falls had lass flak ska gash
half slash fish shall sigh hash flag gas high galls haggis alaska salsa.`.trim().split(/\s+/);

export const PUNCT_SENTENCES = [
  "\"It isn't ready,\" she said; \"come back at 9:30.\"",
  "The report - all 42 pages of it - arrived late, again.",
  "Send it to admin@keyquest.app, then call +91 98765 43210.",
  "He asked: why now? Why not last week, when it mattered?",
  "Options include: (a) wait, (b) retry, or (c) escalate.",
  "We shipped v2.1 (finally!), and nobody's build broke.",
  "\"Don't guess,\" the editor wrote, \"check the source.\"",
  "Costs rose 12.5%, margins fell, and yet - somehow - we grew.",
  "Her note read: \"Meet me at the cafe; bring the keys.\"",
  "Use 'single quotes' inside \"double quotes\" carefully.",
];

const rnd = (n) => Math.floor(Math.random() * n);
const digits = (n) => Array.from({ length: n }, () => rnd(10)).join("");

const numberChunk = () => {
  const kind = rnd(5);
  if (kind === 0) return `${rnd(90) + 10},${digits(3)}.${digits(2)}`;
  if (kind === 1) return `${String(rnd(28) + 1).padStart(2, "0")}/${String(rnd(12) + 1).padStart(2, "0")}/2026`;
  if (kind === 2) return `${digits(5)} ${digits(5)}`;
  if (kind === 3) return `INV-${digits(4)}`;
  return digits(rnd(4) + 2);
};

export const makeTestText = (kind, { words = 150, texts } = {}) => {
  if (kind === "numbers") return Array.from({ length: words || 60 }, numberChunk).join(" ");
  if (kind === "punctuation") return shuffle(PUNCT_SENTENCES).concat(shuffle(PUNCT_SENTENCES)).join(" ");
  if (kind === "code") return pick(CODE).text;
  if (kind === "hindi") return shuffle(texts || []).slice(0, 6).join(" ");
  if (kind === "homerow") return randomWords(words, HOME_ROW).join(" ");
  if (kind === "paragraph") {
    const out = [];
    while (out.join(" ").split(/\s+/).length < (words || 200)) out.push(pick(PARAGRAPHS));
    return out.join(" ");
  }
  return randomWords(words, [...COMMON, ...COMMON, ...MEDIUM, ...LONG]).join(" ");
};
