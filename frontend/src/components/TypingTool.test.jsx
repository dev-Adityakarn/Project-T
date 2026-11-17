import { render, screen } from "@testing-library/react";
import { TypingTool } from "@/components/TypingTool";

describe("TypingTool keyboard", () => {
  it("hides the English QWERTY reference for the Hindi test", () => {
    render(
      <TypingTool
        config={{ kind: "hindi", duration: 60, texts: ["भारत एक विशाल देश है।"] }}
        label="Hindi typing test"
      />,
    );

    expect(screen.getByTestId("hindi-keyboard-note")).toBeTruthy();
    expect(screen.queryByTestId("keyboard-flat")).toBeNull();
  });

  it("keeps the keyboard reference for an English test", () => {
    render(
      <TypingTool
        config={{ kind: "words", duration: 60, passage: "home" }}
        label="Typing test"
      />,
    );

    expect(screen.getByTestId("keyboard-flat")).toBeTruthy();
    expect(screen.queryByTestId("hindi-keyboard-note")).toBeNull();
  });
});
