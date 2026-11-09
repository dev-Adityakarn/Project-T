import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SeoArticle } from "@/components/SeoArticle";
import { WpmInterpreter } from "@/components/WpmInterpreter";
import { KeyboardFingerMap } from "@/components/KeyboardFingerMap";
import { HomeRowDrill } from "@/components/HomeRowDrill";

describe("WpmInterpreter", () => {
  const renderInterpreter = () =>
    render(
      <MemoryRouter>
        <WpmInterpreter />
      </MemoryRouter>,
    );

  test("interprets WPM, accuracy and duration without claiming a percentile", () => {
    renderInterpreter();

    expect(screen.getByTestId("wpm-interpreter-band").textContent).toBe("Comfortable");
    expect(screen.getByTestId("wpm-interpreter-result").textContent).toContain(
      "40 WPM at 96% accuracy over 5 minutes",
    );
    expect(screen.getByTestId("wpm-interpreter-targets").textContent).toContain(
      "Comfortable office work: 40 WPM",
    );
    expect(screen.getByTestId("wpm-interpreter").textContent).toContain(
      "does not estimate a population percentile",
    );

    fireEvent.change(screen.getByTestId("wpm-interpreter-duration"), {
      target: { value: "15" },
    });
    expect(screen.getByTestId("wpm-interpreter-result").textContent).toContain(
      "Fifteen minutes matches the MP CPCT typing modules",
    );

    fireEvent.change(screen.getByTestId("wpm-interpreter-wpm"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByTestId("wpm-interpreter-accuracy"), {
      target: { value: "90" },
    });
    fireEvent.change(screen.getByTestId("wpm-interpreter-duration"), {
      target: { value: "1" },
    });

    expect(screen.getByTestId("wpm-interpreter-band").textContent).toBe("Developing");
    expect(screen.getByTestId("wpm-interpreter-result").textContent).toContain(
      "One minute is a short burst",
    );
    expect(screen.getByTestId("wpm-interpreter-result").textContent).toContain(
      "Treat the speed as provisional",
    );
  });

  test("rejects values outside the supported range", () => {
    renderInterpreter();

    fireEvent.change(screen.getByTestId("wpm-interpreter-wpm"), {
      target: { value: "400" },
    });

    expect(screen.getByTestId("wpm-interpreter-result").textContent).toContain(
      "Enter a WPM between 0 and 300",
    );
    expect(screen.queryByTestId("wpm-interpreter-targets")).toBeNull();
  });
});

describe("KeyboardFingerMap", () => {
  test("labels every key with its finger and exposes a text legend", () => {
    const { container } = render(<KeyboardFingerMap />);

    const fKey = container.querySelector('[aria-label="F, left index finger"]');
    const semicolonKey = container.querySelector(
      '[aria-label="semicolon, right little finger"]',
    );

    expect(fKey).toBeTruthy();
    expect(fKey.textContent).toContain("F");
    expect(fKey.textContent).toContain("LI");
    expect(semicolonKey).toBeTruthy();
    expect(screen.getByLabelText("Finger legend").textContent).toContain(
      "Left index finger (LI): R, F, V, T, G, B. Home key: F.",
    );
    expect(screen.getByLabelText("Finger legend").textContent).toContain(
      'Right middle finger (RM): I, K, ",". Home key: K.',
    );
    expect(container.textContent).toContain("Space bar: either thumb.");
  });
});

describe("HomeRowDrill", () => {
  test("mounts the typing drill only after an explicit start", () => {
    render(<HomeRowDrill />);

    expect(screen.queryByTestId("home-row-drill-tool")).toBeNull();
    expect(screen.getByTestId("home-row-drill")).toBeTruthy();

    fireEvent.click(screen.getByTestId("home-row-drill-start"));

    expect(screen.getByTestId("home-row-drill-tool")).toBeTruthy();
    expect(screen.getByTestId("home-row-drill-shuffle")).toBeTruthy();
  });
});

describe("SeoArticle blocks", () => {
  test("renders tables, links, preformatted text and widgets", () => {
    render(
      <MemoryRouter>
        <SeoArticle
          blocks={[
            {
              h2: "Reference table",
              table: {
                caption: "Example requirements",
                columns: ["Exam", "Speed"],
                rows: [["SSC CHSL", "35 WPM"]],
              },
            },
            {
              h2: "Related reading",
              pre: ["line one", "line two"],
              links: [
                {
                  to: "/typing-test/5-minute",
                  label: "Take the 5-minute test",
                  description: "A sustained benchmark.",
                },
              ],
            },
            { h2: "Interpreter", widget: "wpm-interpreter" },
          ]}
        />
      </MemoryRouter>,
    );

    const table = screen.getByTestId("article-table");
    expect(table.querySelector("caption").textContent).toBe("Example requirements");
    expect(table.querySelector('th[scope="row"]').textContent).toBe("SSC CHSL");

    const links = screen.getByTestId("article-links");
    expect(links.querySelector("a").getAttribute("href")).toBe("/typing-test/5-minute/");
    expect(links.textContent).toContain("A sustained benchmark.");

    expect(document.querySelector("pre").textContent).toContain("line one\nline two");
    expect(screen.getByTestId("wpm-interpreter")).toBeTruthy();
  });
});
