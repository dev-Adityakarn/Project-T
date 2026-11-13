import { useState } from "react";
import { Code2, RotateCcw } from "lucide-react";
import { TypingTool } from "@/components/TypingTool";
import { Button } from "@/components/ui/button";
import widgetData from "@/seo/widgets.json";

const data = widgetData["custom-code-practice"];
const MAX_CHARS = 4000;

/**
 * A browser-only code drill. The snippet never leaves the page: it is kept in
 * local component state and handed straight to the typing engine.
 */
export const CustomCodePractice = ({ testId = "custom-code-practice" }) => {
  const [snippet, setSnippet] = useState("");
  const [active, setActive] = useState(false);
  const [run, setRun] = useState(0);
  const [error, setError] = useState("");

  const start = () => {
    const text = snippet.replace(/^\n+|\n+$/g, "");
    if (text.trim().length < 20) {
      setError("Paste at least a few lines of code before starting.");
      return;
    }
    setError("");
    setSnippet(text);
    setActive(true);
    setRun((value) => value + 1);
  };

  return (
    <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
          <Code2 size={18} />
        </span>
        <div>
          <h3 id={`${testId}-title`} className="text-lg font-semibold">{data.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.intro}</p>
        </div>
      </div>

      {!active ? (
        <>
          <label htmlFor={`${testId}-input`} className="mt-5 block text-sm font-medium">
            Your snippet
          </label>
          <textarea
            id={`${testId}-input`}
            value={snippet}
            onChange={(event) => {
              setSnippet(event.target.value.slice(0, MAX_CHARS));
              if (error) setError("");
            }}
            rows={8}
            spellCheck={false}
            placeholder={data.placeholder}
            className="mt-2 w-full resize-y rounded-xl border bg-background px-3 py-2 font-mono-type text-sm leading-relaxed outline-none focus:border-primary"
            data-testid={`${testId}-input`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{snippet.length.toLocaleString("en-IN")} / {MAX_CHARS.toLocaleString("en-IN")} characters · stays in your browser</span>
            <Button type="button" onClick={start} className="rounded-full px-5 font-semibold" data-testid={`${testId}-start`}>
              Start snippet practice
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert" data-testid={`${testId}-error`}>{error}</p>
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Indentation is filled after Enter. The drill ends when the snippet is complete.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActive(false)}
              className="rounded-full text-xs"
              data-testid={`${testId}-edit`}
            >
              <RotateCcw size={14} /> Use a different snippet
            </Button>
          </div>
          <div className="mt-4">
            <TypingTool
              key={run}
              config={{ kind: "code", duration: null }}
              textOverride={snippet}
              label="Custom code practice"
              testId={`${testId}-typing`}
              autoClaim
            />
          </div>
        </>
      )}
    </section>
  );
};
