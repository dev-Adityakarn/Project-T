import widgetData from "@/seo/widgets.json";

const data = widgetData["finger-map"];

const TONES = {
  lp: "border-rose-300 bg-rose-100 text-rose-900",
  lr: "border-amber-300 bg-amber-100 text-amber-900",
  lm: "border-lime-300 bg-lime-100 text-lime-900",
  li: "border-emerald-300 bg-emerald-100 text-emerald-900",
  ri: "border-sky-300 bg-sky-100 text-sky-900",
  rm: "border-indigo-300 bg-indigo-100 text-indigo-900",
  rr: "border-violet-300 bg-violet-100 text-violet-900",
  rp: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900",
};

const fingerForKey = data.fingers.reduce((map, finger) => {
  finger.keys.forEach((key) => {
    map[key] = finger;
  });
  return map;
}, {});

const KEY_NAMES = {
  ";": "semicolon",
  ",": "comma",
  ".": "period",
  "/": "slash",
};

const keyLabel = (key) => KEY_NAMES[key] || key;

const keyList = (keys) => keys.map((key) => (KEY_NAMES[key] ? `"${key}"` : key)).join(", ");

export const KeyboardFingerMap = ({ testId = "finger-map" }) => (
  <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6" data-testid={testId} aria-labelledby={`${testId}-title`}>
    <h3 id={`${testId}-title`} className="text-lg font-semibold">
      {data.title}
    </h3>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.intro}</p>

    <div className="mt-5 overflow-x-auto pb-2">
      <div className="min-w-[340px]" role="group" aria-label="Keyboard layout grouped by finger">
        {data.rows.map((row, rowIndex) => (
          <div
            key={row.join("")}
            role="list"
            aria-label={["Top letter row", "Home row", "Bottom letter row"][rowIndex]}
            className={`mt-1 grid grid-cols-10 gap-1 first:mt-0 ${
              rowIndex === 1 ? "pl-4" : rowIndex === 2 ? "pl-8" : ""
            }`}
          >
            {row.map((key) => {
              const finger = fingerForKey[key];
              return (
                <div
                  key={key}
                  role="listitem"
                  aria-label={`${keyLabel(key)}, ${finger.hand.toLowerCase()} ${finger.name.toLowerCase()}`}
                  className={`flex h-10 flex-col items-center justify-center rounded-md border text-center ${TONES[finger.id]}`}
                >
                  <span className="text-sm font-semibold leading-none">{key === ";" ? ";" : key}</span>
                  <span className="mt-1 text-[9px] font-semibold leading-none opacity-70" aria-hidden="true">
                    {finger.abbr}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
          {data.space}
        </div>
      </div>
    </div>

    <ul className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2" aria-label="Finger legend">
      {data.fingers.map((finger) => (
        <li key={finger.id} className="flex items-center gap-2">
          <span className={`h-3 w-3 shrink-0 rounded-sm border ${TONES[finger.id]}`} aria-hidden="true" />
          <span>
            {finger.hand} {finger.name.toLowerCase()} ({finger.abbr}): {keyList(finger.keys)}. Home key:{" "}
            {finger.home}.
          </span>
        </li>
      ))}
    </ul>
  </section>
);
