import { act, renderHook } from "@testing-library/react";
import { calcStats, useCharTyper } from "@/hooks/useCharTyper";

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

describe("useCharTyper keyboard scope", () => {
  test("does not capture keystrokes intended for a form control", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const { result } = renderHook(() => useCharTyper("abc", { active: true }));

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
      );
    });
    expect(result.current.typed).toBe("");

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
      );
    });
    expect(result.current.typed).toBe("a");

    input.remove();
  });

  test("routes keystrokes to only one of two mounted typing surfaces", () => {
    const first = renderHook(() => useCharTyper("abc", { active: true }));
    const second = renderHook(() => useCharTyper("abc", { active: true, autoClaim: true }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
      );
    });
    expect(first.result.current.typed).toBe("");
    expect(second.result.current.typed).toBe("a");

    act(() => first.result.current.claim());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", bubbles: true, cancelable: true }),
      );
    });
    expect(first.result.current.typed).toBe("b");
    expect(second.result.current.typed).toBe("a");
  });
});
