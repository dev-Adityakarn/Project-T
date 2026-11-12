import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { SITE } from "@/seo";
import widgetData from "@/seo/widgets.json";

const data = widgetData["exam-net-speed"];

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const format = (value) => (Math.round(value * 10) / 10).toFixed(1);

export const ExamNetSpeedCalculator = ({ testId = "exam-net-speed" }) => {
  const [mode, setMode] = useState("speed");
  const [speed, setSpeed] = useState(35);
  const [characters, setCharacters] = useState(1750);
  const [minutes, setMinutes] = useState(10);
  const [full, setFull] = useState(0);
  const [half, setHalf] = useState(0);
  const [fullPenalty, setFullPenalty] = useState(1);
  const [halfPenalty, setHalfPenalty] = useState(0.5);
  const [target, setTarget] = useState(35);

  const result = useMemo(() => {
    const duration = Math.max(0.1, number(minutes, 10));
    const gross = mode === "characters"
      ? (number(characters) / 5) / duration
      : number(speed);
    const penaltyWords = number(full) * number(fullPenalty) + number(half) * number(halfPenalty);
    const penaltyWpm = penaltyWords / duration;
    const net = Math.max(0, gross - penaltyWpm);
    const requiredGross = number(target) + penaltyWpm;
    const requiredCharacters = Math.ceil(requiredGross * 5 * duration + penaltyWords * 5);
    return { gross, penaltyWpm, net, requiredCharacters };
  }, [mode, speed, characters, minutes, full, half, fullPenalty, halfPenalty, target]);

  const status = result.net >= number(target)
    ? "At or above your target"
    : result.net >= number(target) * 0.95
      ? "Close to your target"
      : "Below your target";

  const updateNumber = (setter) => (event) => setter(event.target.value);

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
          <Calculator size={18} />
        </span>
        <div>
          <h3 id={`${testId}-title`} className="text-lg font-semibold">{data.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.intro}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Starting point
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-mode`}
          >
            <option value="speed">I know my WPM</option>
            <option value="characters">I know my correct characters</option>
          </select>
        </label>
        {mode === "speed" ? (
          <label className="text-sm font-medium">
            Starting WPM
            <input
              type="number"
              min="0"
              step="0.5"
              value={speed}
              onChange={updateNumber(setSpeed)}
              className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid={`${testId}-speed`}
            />
          </label>
        ) : (
          <label className="text-sm font-medium">
            Correct characters
            <input
              type="number"
              min="0"
              step="1"
              value={characters}
              onChange={updateNumber(setCharacters)}
              className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid={`${testId}-characters`}
            />
          </label>
        )}
        <label className="text-sm font-medium">
          Duration (minutes)
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={minutes}
            onChange={updateNumber(setMinutes)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-minutes`}
          />
        </label>
        <label className="text-sm font-medium">
          Your target net WPM
          <input
            type="number"
            min="0"
            step="0.5"
            value={target}
            onChange={updateNumber(setTarget)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-target`}
          />
        </label>
        <label className="text-sm font-medium">
          Full mistakes
          <input
            type="number"
            min="0"
            step="1"
            value={full}
            onChange={updateNumber(setFull)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-full`}
          />
        </label>
        <label className="text-sm font-medium">
          Half mistakes
          <input
            type="number"
            min="0"
            step="1"
            value={half}
            onChange={updateNumber(setHalf)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-half`}
          />
        </label>
        <label className="text-sm font-medium">
          Words per full mistake
          <input
            type="number"
            min="0"
            step="0.25"
            value={fullPenalty}
            onChange={updateNumber(setFullPenalty)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-full-penalty`}
          />
        </label>
        <label className="text-sm font-medium">
          Words per half mistake
          <input
            type="number"
            min="0"
            step="0.25"
            value={halfPenalty}
            onChange={updateNumber(setHalfPenalty)}
            className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid={`${testId}-half-penalty`}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3" role="status" aria-live="polite">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Starting WPM</div>
          <div className="mt-1 font-pixel text-2xl" data-testid={`${testId}-gross`}>{format(result.gross)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mistake penalty</div>
          <div className="mt-1 font-pixel text-2xl" data-testid={`${testId}-penalty`}>{format(result.penaltyWpm)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Estimated net WPM</div>
          <div className="mt-1 font-pixel text-2xl text-primary" data-testid={`${testId}-net`}>{format(result.net)}</div>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium" data-testid={`${testId}-status`}>{status}.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        To reach a net estimate of {format(number(target))} WPM with these mistakes, you would need roughly{" "}
        <strong>{result.requiredCharacters.toLocaleString("en-IN")}</strong> correct characters at this duration,
        before applying your exam's own rounding and qualification rules.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{data.note}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{SITE.affiliationDisclaimer}</p>
    </section>
  );
};
