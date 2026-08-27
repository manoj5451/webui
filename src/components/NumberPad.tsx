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
          className="py-3.5 rounded-lg border border-[#D3EEDD] text-lg font-mono font-medium text-[#0F3D2E]
          hover:bg-[#F0FAF4] active:bg-[#E2F5E7] disabled:opacity-40 transition-colors"
        >
          {k === "⌫" ? <span className="text-[#4B6B57]">⌫</span> : k}
        </button>
      ))}
    </div>
  );
}
