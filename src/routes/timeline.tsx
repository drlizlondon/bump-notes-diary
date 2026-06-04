import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { formatUKDate, formatUKTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import type { Entry } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline · BumpNotes" }] }),
  component: TimelinePage,
});

function TimelinePage() {
  const { entries } = useAppState();
  const [editing, setEditing] = useState<Entry | null>(null);

  const grouped = useMemo(() => {
    const live = entries.filter((e) => !e.deletedAt);
    const map = new Map<string, Entry[]>();
    for (const e of live) {
      const k = weekDayKey(e);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    // sort entries within group by createdAt desc
    for (const arr of map.values()) arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // sort groups by week+day desc
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
        <PageHeader title="Timeline" subtitle="Grouped by pregnancy week" />
        <div className="px-4 pb-8 space-y-8">
          {grouped.length === 0 && (
            <div className="rounded-3xl bg-peach-soft p-6 text-center text-sm text-ink-soft ring-1 ring-peach/20">
              Nothing logged yet. Tap any panel on Home to add your first entry.
            </div>
          )}
          {grouped.map(([key, list]) => {
            const [w, d] = key.split("+");
            return (
              <section key={key}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h2 className="font-serif text-lg font-semibold">
                    Week {w} + {d}
                  </h2>
                  <div className="flex-1 h-px bg-ink/10" />
                  <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
                    {list.length} entr{list.length === 1 ? "y" : "ies"}
                  </span>
                </div>
                <ul className="space-y-3">
                  {list.map((e) => (
                    <li key={e.id} className="bg-card rounded-2xl p-4 ring-1 ring-black/5 shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                            {formatUKDate(e.createdAt)} · {formatUKTime(e.createdAt)}
                          </p>
                          <p className="font-semibold mt-1">{summariseEntry(e).headline}</p>
                          {summariseEntry(e).detail && (
                            <p className="text-sm text-ink-soft mt-1 break-words">{summariseEntry(e).detail}</p>
                          )}
                          {e.type === "photo" && (
                            <img src={e.dataUrl} alt={e.tag} className="mt-3 w-full rounded-xl ring-1 ring-black/5" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-black/5 flex gap-3">
                        <button onClick={() => setEditing(e)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                          <Pencil className="size-3.5" /> Edit
                        </button>
                        <button onClick={() => store.softDelete(e.id)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive">
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
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

function EditDialog({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [text, setText] = useState(() => {
    switch (entry.type) {
      case "note": return entry.text;
      case "question": return entry.text;
      case "concern": return entry.note ?? "";
      case "symptom": return entry.note ?? "";
      case "feeling": return entry.note ?? "";
      case "labour": return entry.note ?? "";
      case "appointment": return entry.discussed ?? "";
      case "photo": return entry.note ?? "";
    }
  });

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
      case "photo":
        (patch as { note?: string }).note = text || undefined; break;
      case "appointment":
        (patch as { discussed?: string }).discussed = text || undefined; break;
    }
    store.updateEntry(entry.id, patch);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6">
      <div className="bg-card rounded-3xl ring-1 ring-black/10 p-5 w-full max-w-[440px] shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-3">Edit entry</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
          className="w-full px-4 py-3 rounded-2xl bg-muted ring-1 ring-black/5 text-sm resize-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full bg-muted text-sm font-medium">Cancel</button>
          <button onClick={save} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}
