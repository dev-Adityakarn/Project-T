export const WordInput = ({ value, onChange, placeholder = "type here..." }) => (
  <input
    autoFocus
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={(e) => setTimeout(() => e.target?.focus(), 0)}
    placeholder={placeholder}
    autoComplete="off"
    autoCapitalize="off"
    autoCorrect="off"
    spellCheck={false}
    className="mt-4 w-full rounded-xl border-2 border-primary/40 bg-card px-5 py-4 font-mono-type text-xl outline-none transition-colors duration-200 focus:border-primary"
    data-testid="game-word-input"
  />
);

export const Word = ({ word, input }) => {
  const v = input.trim().toLowerCase();
  const n = v && word.startsWith(v) ? v.length : 0;
  return (
    <span className="font-mono-type">
      <span className="text-primary">{word.slice(0, n)}</span>
      <span>{word.slice(n)}</span>
    </span>
  );
};
