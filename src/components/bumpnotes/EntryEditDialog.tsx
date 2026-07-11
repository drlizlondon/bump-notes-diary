import { useState } from "react";
import { store } from "@/lib/bumpnotes/store";
import type { Entry } from "@/lib/bumpnotes/types";
import { useT } from "@/lib/bumpnotes/i18n";

export function getEditableText(entry: Entry): string {
  switch (entry.type) {
    case "note":
    case "question":
      return entry.text;
    case "concern":
    case "symptom":
    case "feeling":
    case "labour":
    case "labour_event":
    case "contraction":
    case "photo":
      return entry.note ?? "";
    case "appointment":
    case "person":
      return entry.discussed ?? "";
    case "measurement":
      return entry.note ?? "";
    default:
      return "";
  }
}

export function EntryEditDialog({
  entry,
  onClose,
  overlay = "fixed",
}: {
  entry: Entry;
  onClose: () => void;
  overlay?: "fixed" | "absolute";
}) {
  const t = useT();
  const [text, setText] = useState(() => getEditableText(entry));

  function save() {
    const patch: Partial<Entry> = {};
    switch (entry.type) {
      case "note":
      case "question":
        (patch as { text: string }).text = text;
        break;
      case "concern":
      case "symptom":
      case "feeling":
      case "labour":
      case "labour_event":
      case "contraction":
      case "photo":
      case "measurement":
        (patch as { note?: string }).note = text || undefined;
        break;
      case "appointment":
      case "person":
        (patch as { discussed?: string }).discussed = text || undefined;
        break;
    }
    store.updateEntry(entry.id, patch);
    onClose();
  }

  const overlayClass =
    overlay === "fixed"
      ? "fixed inset-0 z-50 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6"
      : "absolute inset-0 z-10 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6";

  return (
    <div className={overlayClass}>
      <div className="surface-card p-5 w-full max-w-[440px] shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-3">{t("tl.editEntry")}</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
