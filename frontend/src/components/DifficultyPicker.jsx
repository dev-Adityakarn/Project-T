import { DIFFICULTIES, DIFF_LABEL, DIFF_COLOR } from "@/data/difficulty";

export const DifficultyBadge = ({ d = "medium", className = "", testId }) => (
  <span data-testid={testId} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    style={{ borderColor: `${DIFF_COLOR[d]}66`, color: DIFF_COLOR[d] }}>
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: DIFF_COLOR[d] }} />{DIFF_LABEL[d]}
  </span>
);

export const DifficultyPicker = ({ value, onChange, allowAll = false }) => (
  <div className="flex flex-wrap gap-2" data-testid="difficulty-picker">
    {(allowAll ? ["all", ...DIFFICULTIES] : DIFFICULTIES).map((d) => (
      <button key={d} onClick={() => onChange(d)} data-testid={`difficulty-${d}`}
        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${value === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
        {d === "all" ? "All" : DIFF_LABEL[d]}
      </button>
    ))}
  </div>
);
