import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import widgetData from "@/seo/widgets.json";

const data = widgetData["wpm-interpreter"];

const bandFor = (wpm) => data.bands.find((band) => band.max === null || wpm <= band.max) || data.bands[0];

const toneFor = (accuracy) => {
  if (accuracy >= 97) return "high";
  if (accuracy >= 95) return "medium";
  return "low";
};

export const WpmInterpreter = ({ testId = "wpm-interpreter" }) => {
  const [wpm, setWpm] = useState("40");
  const [accuracy, setAccuracy] = useState("96");
  const [duration, setDuration] = useState("5");

  const wpmValue = Number(wpm);
  const accuracyValue = Number(accuracy);
  const durationValue = Number(duration);
  const validWpm = wpm !== "" && Number.isFinite(wpmValue) && wpmValue >= 0 && wpmValue <= 300;
  const validAccuracy =
    accuracy !== "" && Number.isFinite(accuracyValue) && accuracyValue >= 0 && accuracyValue <= 100;
  const band = validWpm ? bandFor(wpmValue) : null;
  const accuracyTone = validAccuracy ? toneFor(accuracyValue) : null;

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <h3 id={`${testId}-title`} className="text-lg font-semibold">
        {data.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.intro}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          WPM
          <input
            type="number"
            min="0"
            max="300"
            inputMode="numeric"
            value={wpm}
            onChange={(event) => setWpm(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 font-mono-type text-base"
            data-testid={`${testId}-wpm`}
          />
        </label>
        <label className="text-sm font-medium">
          Accuracy (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            value={accuracy}
            onChange={(event) => setAccuracy(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 font-mono-type text-base"
            data-testid={`${testId}-accuracy`}
          />
        </label>
        <label className="text-sm font-medium">
          Test duration
          <select
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-base"
            data-testid={`${testId}-duration`}
          >
            <option value="1">1 minute</option>
            <option value="2">2 minutes</option>
            <option value="3">3 minutes</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4" aria-live="polite" data-testid={`${testId}-result`}>
        {!validWpm || !validAccuracy ? (
          <p className="text-sm text-muted-foreground">
            Enter a WPM between 0 and 300 and an accuracy between 0 and 100 to see an interpretation.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {wpmValue} WPM at {accuracyValue}% accuracy over {durationValue}{" "}
              {durationValue === 1 ? "minute" : "minutes"}
            </p>
            <p className="mt-2 text-xl font-semibold text-primary" data-testid={`${testId}-band`}>
              {band.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{band.note}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {data.durationNotes[duration] || data.durationNotes["5"]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {data.accuracyNotes[accuracyTone]}
            </p>
          </>
        )}
      </div>

      {validWpm && validAccuracy && (
        <div className="mt-4" data-testid={`${testId}-targets`}>
          <h4 className="text-sm font-semibold">How that compares with common reference points</h4>
          <ul className="mt-2 space-y-2">
            {data.targets.map((target) => {
              const met = wpmValue >= target.wpm;
              return (
                <li key={target.label} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className={met ? "font-semibold text-primary" : "font-semibold text-muted-foreground"}>
                    {met ? "Meets" : "Below"}
                  </span>
                  <span>
                    {target.label}: {target.wpm} WPM
                  </span>
                  <span className="text-muted-foreground">{target.detail}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{data.note}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        This tool interprets the numbers you enter using Typinger's correct-character WPM definition. It does not
        estimate a population percentile or reproduce an exam's scoring.{" "}
        <Link to="/typing-test/5-minute/" className="text-primary underline underline-offset-2">
          Take the 5-minute typing test
        </Link>{" "}
        to get a sustained result.
      </p>
    </section>
  );
};
