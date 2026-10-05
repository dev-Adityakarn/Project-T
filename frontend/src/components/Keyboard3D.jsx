import { forwardRef } from "react";

const keys = (s) => s.split("").map((k) => ({ id: k, l: k }));
export const ROWS = [
  [...keys("`1234567890-="), { id: "Backspace", l: "back", w: 2 }],
  [{ id: "Tab", l: "tab", w: 1.5 }, ...keys("qwertyuiop[]"), { id: "\\", l: "\\", w: 1.5 }],
  [{ id: "CapsLock", l: "caps", w: 1.75 }, ...keys("asdfghjkl;'"), { id: "Enter", l: "enter", w: 2.25 }],
  [{ id: "Shift", l: "shift", w: 2.25 }, ...keys("zxcvbnm,./"), { id: "Shift", l: "shift", w: 2.75 }],
  [{ id: "Control", l: "ctrl", w: 1.5 }, { id: "Meta", l: "cmd", w: 1.25 }, { id: "Alt", l: "alt", w: 1.25 }, { id: " ", l: "", w: 7 }, { id: "Alt", l: "alt", w: 1.25 }, { id: "Fn", l: "fn", w: 1.25 }, { id: "Control", l: "ctrl", w: 1.5 }],
];

const SHIFTED = { "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/", "~": "`" };

export const normalizeKey = (k) => {
  if (k === "\n") return "Enter";
  if (k.length === 1) return SHIFTED[k] || k.toLowerCase();
  return k;
};

export const Keyboard3D = forwardRef(({ active = new Set(), hint = null, flat = false, className = "" }, ref) => (
  <div ref={ref} className={`kb-board ${flat ? "flat" : ""} ${className}`} data-testid={flat ? "keyboard-flat" : "keyboard-3d"}>
    {ROWS.map((row, ri) => (
      <div className="kb-row" key={ri}>
        {row.map((k, ki) => (
          <div
            key={ki}
            className={`kb-key ${active.has(k.id) ? "on" : ""} ${hint === k.id ? "hint" : ""}`}
            style={{ "--w": k.w || 1 }}
            data-key={k.id}
          >
            {k.l}
          </div>
        ))}
      </div>
    ))}
  </div>
));
Keyboard3D.displayName = "Keyboard3D";
