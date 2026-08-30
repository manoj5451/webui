interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export default function NumberPad({ onDigit, onBackspace, disabled }: NumberPadProps) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          disabled={disabled}
          onClick={() => (k === "⌫" ? onBackspace() : onDigit(k))}
          className="py-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-lg font-mono font-medium text-[var(--text)]
          hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/40 active:bg-[var(--border)] disabled:opacity-40 transition-colors"
        >
          {k === "⌫" ? <span className="text-[var(--text-muted)]">⌫</span> : k}
        </button>
      ))}
    </div>
  );
}
