import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { formatUKDate, formatUKTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import { useT } from "@/lib/bumpnotes/i18n";
import type { Entry } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline · BumpNotes" }] }),
  component: TimelinePage,
});

function TimelinePage() {
  const { entries } = useAppState();
  const [editing, setEditing] = useState<Entry | null>(null);
  const t = useT();

  const grouped = useMemo(() => {
    const live = entries.filter((e) => !e.deletedAt);
    const map = new Map<string, Entry[]>();
    for (const e of live) {
      const k = weekDayKey(e);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Array.from(map.entries()).sort(([a], [b]) => {
      const [aw, ad] = a.split("+").map(Number);
      const [bw, bd] = b.split("+").map(Number);
      return bw - aw || bd - ad;
    });
  }, [entries]);

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("tl.title")} subtitle={t("tl.subtitle")} />
        <div className="px-4 lg:px-0 pb-10 space-y-8">
          {grouped.length === 0 && (
            <div className="surface-card blush-bg p-6 text-center text-sm text-ink-soft">
              {t("tl.empty")}
            </div>
          )}
          {grouped.map(([key, list]) => {
            const [w, d] = key.split("+");
            return (
              <section key={key}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h2 className="font-serif text-lg font-semibold">{t("home.week")} {w} + {d}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
                    {list.length === 1 ? t("tl.entries.one", { n: list.length }) : t("tl.entries.other", { n: list.length })}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {list.map((e) => {
                    const s = summariseEntry(e);
                    return (
                      <li key={e.id} className="surface-card p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                              {formatUKDate(e.createdAt)} · {formatUKTime(e.createdAt)}
                            </p>
                            <p className="font-semibold mt-1">{s.headline}</p>
                            {s.detail && <p className="text-sm text-ink-soft mt-1 break-words">{s.detail}</p>}
                            {e.type === "photo" && (
                              <img src={e.dataUrl} alt={e.tag} className="mt-3 w-full rounded-xl border border-border" />
                            )}
                            {e.type === "person" && e.dataUrl && (
                              <img src={e.dataUrl} alt="" className="mt-3 w-full rounded-xl border border-border" />
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border flex gap-3">
                          <button onClick={() => setEditing(e)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                            <Pencil className="size-3.5" /> {t("common.edit")}
                          </button>
                          <button onClick={() => store.softDelete(e.id)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">
                            <Trash2 className="size-3.5" /> {t("common.delete")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </AppShell>
      {editing && <EditDialog entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function getEditableText(entry: Entry): string {
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

function EditDialog({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const t = useT();
  const [text, setText] = useState(() => getEditableText(entry));

  function save() {
    const patch: Partial<Entry> = {};
    switch (entry.type) {
      case "note":
      case "question":
        (patch as { text: string }).text = text; break;
      case "concern":
      case "symptom":
      case "feeling":
      case "labour":
      case "labour_event":
      case "contraction":
      case "photo":
      case "measurement":
        (patch as { note?: string }).note = text || undefined; break;
      case "appointment":
      case "person":
        (patch as { discussed?: string }).discussed = text || undefined; break;
    }
    store.updateEntry(entry.id, patch);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6">
      <div className="surface-card p-5 w-full max-w-[440px] shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-3">{t("tl.editEntry")}</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
          className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium">{t("common.cancel")}</button>
          <button onClick={save} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}
