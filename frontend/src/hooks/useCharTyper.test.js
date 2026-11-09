import { calcStats } from "@/hooks/useCharTyper";

describe("calcStats", () => {
  test("reports errors and keystrokes alongside WPM and accuracy", () => {
    expect(calcStats(100, 120, 10, 60)).toEqual({
      wpm: 20,
      accuracy: 91.7,
      duration: 60,
      errors: 10,
      keystrokes: 120,
    });
  });
});
