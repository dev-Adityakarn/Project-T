import { useState } from "react";
import { HOME_ROW } from "@/lib/testText";
import { shuffle } from "@/data/words";
import { TypingTool } from "@/components/TypingTool";
import { Button } from "@/components/ui/button";
import widgetData from "@/seo/widgets.json";

const data = widgetData["home-row-drill"];

const makeDrillText = () => shuffle(HOME_ROW).slice(0, 24).join(" ");

export const HomeRowDrill = ({ testId = "home-row-drill" }) => {
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);
  const [text, setText] = useState(makeDrillText);

  return (
    <section className="mt-6 rounded-2xl border bg-muted/20 p-5 sm:p-6" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <h3 id={`${testId}-title`} className="text-lg font-semibold">
        {data.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.text}</p>
      {!started ? (
        <Button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-4 rounded-full px-5 font-semibold"
          data-testid={`${testId}-start`}
        >
          Start the 60-second drill
        </Button>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setText(makeDrillText());
                setRun((value) => value + 1);
              }}
              className="rounded-full px-4"
              data-testid={`${testId}-shuffle`}
            >
              Shuffle the words
            </Button>
          </div>
          <TypingTool
            key={run}
            config={{ duration: 60 }}
            textOverride={text}
            label="Home-row drill"
            testId="home-row-drill-tool"
          />
        </div>
      )}
    </section>
  );
};
