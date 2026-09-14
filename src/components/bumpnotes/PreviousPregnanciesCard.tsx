// About Me → Previous Pregnancies card (ARCH §3.4). The most emotionally loaded
// surface in the product; all wording comes from the charity-reviewed copy
// module. Self-saving (About Me is STATE, edited in place — §3.1). Renders
// inside <AppRepository> on /details, so the repository hooks resolve.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useDeletePreviousPregnancyNote,
  usePreviousPregnancies,
  useUpsertPreviousPregnancyHeader,
  useUpsertPreviousPregnancyNote,
} from "@/lib/data/hooks";
import {
  LOSS_NOTE_TAG,
  PREV_PREG_COPY as C,
  PREVIOUS_PREGNANCY_PROMPTS,
} from "@/lib/bumpnotes/previous-pregnancies";

function parseCount(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 60 ? n : null;
}

export function PreviousPregnanciesCard() {
  const { data, isLoading } = usePreviousPregnancies();
  const upsertHeader = useUpsertPreviousPregnancyHeader();
  const upsertNote = useUpsertPreviousPregnancyNote();
  const deleteNote = useDeletePreviousPregnancyNote();

  const header = data?.header ?? null;
  const notes = useMemo(() => data?.notes ?? [], [data]);
  const noteText = (tag: string) => notes.find((n) => n.promptTag === tag)?.text ?? "";

  // First-pregnancy gate (§3.4/§4.1): hidden when she has said this is her first
  // (header present with 0 previous). A gentle reveal covers a mistaken "yes".
  const isFirstPregnancy = header?.pregnancyCount === 0;
  const [revealed, setRevealed] = useState(false);

  // hasPrevious tri-state: undefined = not yet answered here.
  const [hasPrevious, setHasPrevious] = useState<boolean | undefined>(undefined);
  const [pregCount, setPregCount] = useState("");
  const [birthCount, setBirthCount] = useState("");

  // (Re)sync local state whenever the persisted header changes.
  useEffect(() => {
    const pc = header?.pregnancyCount ?? null;
    setHasPrevious(header == null || pc == null ? undefined : pc > 0);
    setPregCount(pc != null && pc > 0 ? String(pc) : "");
    setBirthCount(header?.birthCount != null ? String(header.birthCount) : "");
  }, [header]);

  if (isLoading) return null;

  if (isFirstPregnancy && !revealed) {
    return (
      <div className="px-1 pt-1">
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-sm text-ink-soft underline underline-offset-4 hover:text-primary"
        >
          Not your first pregnancy? You can add previous pregnancies.
        </button>
      </div>
    );
  }

  async function chooseNo() {
    try {
      await upsertHeader.mutateAsync({ pregnancyCount: 0, birthCount: 0 });
      setHasPrevious(false);
    } catch {
      toast.error("Could not save. Please try again.");
    }
  }

  async function saveCounts() {
    const pregnancyCount = parseCount(pregCount);
    const birthCountVal = parseCount(birthCount);
    try {
      await upsertHeader.mutateAsync({ pregnancyCount, birthCount: birthCountVal });
      toast.success("Saved");
    } catch {
      toast.error("Could not save. Please try again.");
    }
  }

  async function saveNote(tag: string, value: string) {
    const text = value.trim();
    const existing = noteText(tag);
    if (text === existing) return; // nothing changed
    try {
      if (text) await upsertNote.mutateAsync({ promptTag: tag, text });
      else await deleteNote.mutateAsync(tag);
    } catch {
      toast.error("Could not save. Please try again.");
    }
  }

  const pc = parseCount(pregCount);
  const bc = parseCount(birthCount);
  const showLossLine = hasPrevious === true && pc != null && bc != null && pc !== bc;

  return (
    <section className="bg-card rounded-2xl px-5 py-5 ring-1 ring-black/5 space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">{C.cardTitle}</h2>
        <p className="text-sm text-ink-soft mt-1">{C.cardInvitation}</p>
      </div>

      {/* Have you had any previous pregnancies? */}
      <fieldset className="space-y-2">
        <legend className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
          {C.hasPreviousQuestion}
        </legend>
        <div className="flex gap-2">
          <Choice active={hasPrevious === false} onClick={() => void chooseNo()}>
            {C.hasPreviousNo}
          </Choice>
          <Choice active={hasPrevious === true} onClick={() => setHasPrevious(true)}>
            {C.hasPreviousYes}
          </Choice>
        </div>
      </fieldset>

      {hasPrevious === true && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
                {C.pregnancyCountLabel}
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={pregCount}
                onChange={(e) => setPregCount(e.target.value)}
                onBlur={() => void saveCounts()}
                className="mt-1 w-full bg-transparent text-base border-b border-border focus:outline-none focus:border-primary py-1"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
                {C.birthCountQuestion}
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={birthCount}
                onChange={(e) => setBirthCount(e.target.value)}
                onBlur={() => void saveCounts()}
                className="mt-1 w-full bg-transparent text-base border-b border-border focus:outline-none focus:border-primary py-1"
              />
            </label>
          </div>

          {/* Loss line — only when the two numbers differ (§3.4 rule 3). */}
          {showLossLine && (
            <div className="rounded-xl bg-blush-soft/60 p-4">
              <p className="text-sm text-ink leading-relaxed">{C.lossLine}</p>
              <textarea
                defaultValue={noteText(LOSS_NOTE_TAG)}
                onBlur={(e) => void saveNote(LOSS_NOTE_TAG, e.target.value)}
                rows={3}
                placeholder={C.freeTextPlaceholder}
                className="mt-3 w-full bg-white rounded-lg border border-border p-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Memory prompts — each opens a free-text box; her words, never a tick. */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink">{C.promptsIntro}</p>
            <p className="text-xs text-ink-soft">{C.promptsHelp}</p>
            <div className="pt-1 space-y-2">
              {PREVIOUS_PREGNANCY_PROMPTS.map((p) => (
                <PromptRow
                  key={p.tag}
                  label={p.label}
                  initialText={noteText(p.tag)}
                  placeholder={C.freeTextPlaceholder}
                  onSave={(value) => void saveNote(p.tag, value)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-5 py-2 rounded-full text-sm font-semibold border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-ink border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function PromptRow({
  label,
  initialText,
  placeholder,
  onSave,
}: {
  label: string;
  initialText: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [open, setOpen] = useState(!!initialText);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-blush-soft/40"
      >
        <span>{label}</span>
        <span className="text-xs text-ink-soft">{initialText ? "Edit" : open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <textarea
            defaultValue={initialText}
            onBlur={(e) => onSave(e.target.value)}
            rows={2}
            placeholder={placeholder}
            className="w-full bg-white rounded-lg border border-border p-3 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}
