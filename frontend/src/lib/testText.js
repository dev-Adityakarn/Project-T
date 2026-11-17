import { COMMON, MEDIUM, LONG, CODE, randomWords, pick, shuffle } from "@/data/words";

/**
 * The beginner drill deliberately uses only the keys taught in lesson one:
 * A S D F J K L and the space bar. Do not add G, H or top-row letters here;
 * a regression test checks the scope.
 */
export const HOME_ROW = `a ad add all ask asks dad dads fad fads fall falls flask flasks lad lads lass salad salads alfalfa alaska flak j k a s d f j k l`.split(/\s+/);

export const PUNCT_SENTENCES = [
  "\"It isn't ready,\" she said; \"come back at 9:30.\"",
  "The report - all 42 pages of it - arrived late, again.",
  "Send it to admin@example.com, then call +91 00000 00000.",
  "He asked: why now? Why not last week, when it mattered?",
  "Options include: (a) wait, (b) retry, or (c) escalate.",
  "We shipped v2.1 (finally!), and nobody's build broke.",
  "\"Don't guess,\" the editor wrote, \"check the source.\"",
  "Costs rose 12.5%, margins fell, and yet - somehow - we grew.",
  "Her note read: \"Meet me at the cafe; bring the keys.\"",
  "Use 'single quotes' inside \"double quotes\" carefully.",
];

/**
 * Original prose passages for the core routes. Each route gets its own text so
 * the default test is not the same random word salad on every page. The text is
 * coherent on purpose: real typing includes spaces, capitals and punctuation.
 */
export const ROUTE_PASSAGES = {
  home: [
    "Most typing tests begin with a simple promise: keep your eyes on the screen and let your fingers find the keys. That is easier when the hands start in a known place. Rest the left fingers on A, S, D and F, and the right fingers on J, K, L and the semicolon. The small bumps on F and J are there so you can return without looking. Begin at a pace that feels almost too easy. A clean rhythm is more useful than a fast first line. When a word goes wrong, correct only what you are typing and continue. The clock is a measurement, not a judge. Notice the keys that make you pause, and give them a little more attention in the next run. Over several short sessions, the pause becomes shorter and the rhythm becomes steadier. Speed is a by-product of that process, not a separate skill you can force. Keep the session brief, keep the text unfamiliar, and compare the trend rather than a single score.",
  ],
  "typing-test": [
    "A typing speed test is useful only when you know what it measured. This page reports correct characters, accuracy and the time you actually typed. It does not count a wrong key as progress, and it does not hide a correction. That makes the number less flattering than a raw keystroke count, but it is easier to compare with real work. Choose a duration that matches the task you care about. Fifteen seconds is a pulse check. One minute is a quick benchmark. Three to five minutes shows whether the pace survives a few mistakes and a little fatigue. Longer runs are better for exam preparation. Before you start, sit square to the keyboard, relax your shoulders and read the first few words. Do not sprint from the first keystroke. Start at a controlled pace and let the speed build as your hands settle. If you finish with a high error count, treat the result as a warning rather than a personal best.",
  ],
  "1-minute": [
    "Sixty seconds is a small sample, so use it as a pace check rather than a verdict. The clock starts with your first keystroke. From that moment, every pause and every correction is part of the result. The best strategy is not to type as fast as possible for the first ten seconds and then collapse. Start at a pace you can hold, keep your eyes two or three words ahead, and let your hands return to the home row after each reach. A single mistake is already counted, so hunting backwards for it usually costs more than it repairs. Correct the word you are on and move forward. The passage is ordinary prose, not a list of random words, because real typing includes spaces, capitals and punctuation. Treat the result as one data point. Repeat the same one-minute check tomorrow, then compare the two. If the number rises while accuracy stays steady, the practice is working. If speed rises and accuracy falls, the extra speed is provisional. Use the longer tests when you need a number you can quote.",
  ],
  "3-minute": [
    "Three minutes is long enough for the first flush of speed to wear off. The opening minute may feel easy; the second minute is where small technique problems begin to show; the third minute is where tension, posture and error recovery decide the average. A useful three-minute run should feel controlled rather than dramatic. Start slightly below your maximum, keep the same rhythm through the first punctuation mark, and resist the urge to repair an old mistake. If you lose your place, find the next word and continue. The clock does not pause for a restart. When the run ends, compare the result with your one-minute pace. A small drop is normal. A large drop suggests that your hands are working harder than they need to. Check whether your wrists are resting on the desk, whether your shoulders have crept upward, and whether you are looking down at the keys. Those small habits cost more over three minutes than they do over one.",
    "A good way to practise is to treat the first minute as a warm-up, the second as the main effort and the third as a finish. Do not change your technique halfway through. If a particular word keeps catching you, note it after the run and drill it separately. The test is for measurement; the drill is for repair. Keeping those two jobs separate makes both more effective. It also stops you from turning every practice session into a series of restarts. The passage should be unfamiliar. If you memorise the text, you are testing recall rather than typing. Use a fresh passage for each progress check, and keep the same keyboard and seating position where possible. Over several weeks, the three-minute result becomes a reliable picture of the pace you can sustain. That is more useful than a one-minute personal best, and it is a better preparation for any task that asks you to type for more than a few seconds.",
    "Finally, pay attention to the end of the run. Many typists accelerate in the last twenty seconds and lose accuracy exactly when they are trying to finish. A controlled finish is part of the skill. Keep the same rhythm until the clock stops, then review the errors before starting another attempt. The review is where the improvement happens; the test only shows you where to look.",
  ],
  "5-minute": [
    "Five minutes changes the question. A short test asks how fast your fingers can move; a five-minute test asks whether that movement survives the first mistake, the first difficult word and the first minute of concentration. The result is usually a little lower than a one-minute sprint, and that is not a failure. It is a more honest number. Use the opening minute to settle into a rhythm. Keep your eyes on the text, let your hands return to the home row after each reach, and resist the urge to chase a personal best in the first thirty seconds. The middle minutes are where consistency is built. If you notice tension in your shoulders or wrists, release it without changing your pace. A relaxed hand is faster over five minutes than a clenched one.",
    "Accuracy is the other half of the result. A five-minute run with a high error count is not the same as a clean run at the same speed. Every correction costs time, and some exams count the uncorrected error separately. Correct the word you are on, then continue. Do not go back through the passage looking for mistakes you have already passed. The clock will not wait, and the extra searching usually creates a second error. If you finish early, use the remaining time to check the current sentence rather than restarting the whole passage. The habit you want is recovery without panic.",
    "The passage itself should be unfamiliar. Repeating the same text makes the result a memory test. Choose a fresh passage for each progress check, and keep the setup consistent: the same keyboard, the same chair and, where possible, the same time of day. Small changes in the environment can move a five-minute score by several words per minute. That does not mean the practice is unreliable; it means you should compare like with like. Record the result, the accuracy and one observation about the run. The observation is often more useful than the number. Did you lose your place? Did you hesitate at capital letters? Did a difficult word lead to three more errors?",
    "A useful weekly pattern is to take one five-minute benchmark, then spend the rest of the week on shorter drills. The benchmark measures the trend; the drills change it. If the five-minute number is flat for several weeks, look at the error pattern rather than adding more tests. A plateau is often a technique problem, not a motivation problem. Maybe the right pinky is taking over the apostrophe, or the left hand is drifting away from the home row after a number. Fix the smallest repeatable movement and give it a week to settle before measuring again.",
    "When the test is over, do not immediately start another one. Read the result, compare it with the previous attempt, and write down one thing to change. Then stop. Five minutes of focused typing followed by a short review is a complete practice session. Adding another exhausted run rarely produces a better number, and it can reinforce the sloppy movements that appear when attention fades. The goal is not to collect scores. The goal is to make the next real typing task feel calmer and more accurate.",
    "Finally, remember what the number represents. It is a practice score produced by this website, not an official exam result. It counts correct characters and reports errors separately. If you are preparing for a specific exam, check the official duration, language, error rule and correction rule. Use this test to build the underlying skill, and use the official instructions to decide what qualifies. That division keeps the practice useful without turning a training number into a claim it cannot support.",
  ],
  practice: [
    "Untimed practice removes the pressure of the clock and gives you room to notice what your hands are doing. Start slowly. Let each finger find its key, return to the home row and move again. If a word feels awkward, repeat it three times at half speed before continuing. The aim is not to finish quickly; the aim is to finish with the same clean movement you want to use later. Keep the session short enough that your attention stays sharp. When you feel yourself rushing, pause, relax your shoulders and restart the passage. A calm repetition is more valuable than a fast one.",
  ],
  exam: [
    "The examination notice is the first document a candidate should read. It sets the duration, the language, the permitted input method and the error rule for the post. A practice passage can help you prepare, but it cannot replace the instructions issued for the examination. Read the notice carefully, note the date on which it was published, and check whether a corrigendum has changed any part of the requirement. Keep a copy of the relevant pages with your preparation notes.",
    "A typing or data-entry test is usually a timed task performed on a computer supplied by the examination centre. The candidate is asked to enter a passage, a set of figures or a combination of both. The keyboard may be unfamiliar, the room may be noisy, and the software may behave differently from the practice tool used at home. For that reason, a candidate should practise completing a full passage without restarting and without relying on a particular shortcut. The ability to recover from a mistake and continue is part of the skill being assessed.",
    "Accuracy matters because the task is to reproduce the source faithfully. A missing word, an incorrect figure or an extra space changes the result. The official evaluation method may distinguish between full mistakes and half mistakes, and it may allow a candidate to correct an error within the allotted time. The exact rule belongs to the notice, not to a practice website. Candidates should therefore train both speed and careful reading, and should review the error pattern after each full-length attempt.",
    "A sensible preparation routine includes a short warm-up, a focused drill on the previous day's errors, one full-length attempt and a brief review. The warm-up settles the hands. The drill repairs a specific movement. The full attempt shows whether the repair holds under time pressure. The review turns the attempt into information rather than a score. Four columns are enough for a log: the date, the duration, the output and the one error to work on next. Over several weeks, the log reveals whether the preparation is producing a steadier result.",
    "Candidates should also prepare for the practical conditions of the examination. Read the admission instructions, confirm the reporting time and carry the required documents. Practise on a keyboard that is not your own if possible, and check that you can switch to the required language or input method without hesitating. Do not experiment with a new layout in the final week. A familiar method performed calmly is usually better than an unfamiliar method performed quickly.",
    "Finally, keep the official notice as the source of truth. A practice score is feedback for training. It does not certify a speed, reproduce the examination software or decide whether a candidate qualifies. The recruiting body publishes the rule, conducts the test and evaluates the result. Use practice to prepare for that process, and use the process to decide what the result means.",
  ],
};

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

const passageFor = (key) => {
  const paragraphs = ROUTE_PASSAGES[key];
  if (!paragraphs) return null;
  return paragraphs.join(" ");
};

const uniqueParagraphs = (key, words = 200) => {
  const paragraphs = ROUTE_PASSAGES[key] || [];
  const out = [];
  let count = 0;
  for (const paragraph of paragraphs) {
    out.push(paragraph);
    count += paragraph.split(/\s+/).filter(Boolean).length;
    if (count >= words) break;
  }
  return out.join(" ");
};

export const makeTestText = (kind, { words = 150, texts, passage } = {}) => {
  if (kind === "numbers") return Array.from({ length: words || 60 }, numberChunk).join(" ");
  if (kind === "punctuation") return shuffle(PUNCT_SENTENCES).concat(shuffle(PUNCT_SENTENCES)).join(" ");
  if (kind === "code") return pick(CODE).text;
  if (kind === "hindi") return shuffle(texts || []).slice(0, 6).join(" ");
  if (kind === "homerow") return randomWords(words, HOME_ROW).join(" ");
  if (passage) {
    const text = passageFor(passage);
    if (text) return text;
  }
  if (kind === "paragraph") return uniqueParagraphs("exam", words || 200);
  return randomWords(words, [...COMMON, ...COMMON, ...MEDIUM, ...LONG]).join(" ");
};
