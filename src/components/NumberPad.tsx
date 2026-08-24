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
          className="py-3.5 rounded-lg border border-[#DCE6E4] text-lg font-mono font-medium text-[#0F1F2E]
          hover:bg-[#F2F6F6] active:bg-[#EEF0F3] disabled:opacity-40 transition-colors"
        >
          {k === "⌫" ? <span className="text-[#4A5A66]">⌫</span> : k}
        </button>
      ))}
    </div>
  );
}
