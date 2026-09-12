import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

export function UndoStrip({
  label,
  onUndo,
  durationMs = 5000,
}: {
  label: string;
  onUndo: () => void;
  durationMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(id);
  }, [durationMs]);

  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-mint-soft text-ink text-[13px] animate-in fade-in slide-in-from-bottom-1 duration-200">
      <Check className="size-4 text-mint shrink-0" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <button
        onClick={() => {
          setVisible(false);
          onUndo();
        }}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline shrink-0"
      >
        <RotateCcw className="size-3.5" /> Undo
      </button>
    </div>
  );
}
