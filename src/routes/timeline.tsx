import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { FileUp, Pencil, Trash2, Search, X } from "lucide-react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { EntryEditDialog } from "@/components/bumpnotes/EntryEditDialog";
import { formatUKDate, formatUKTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import { useT } from "@/lib/bumpnotes/i18n";
import type { Entry } from "@/lib/bumpnotes/types";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/timeline")({
  head: () => ({ meta: [{ title: "Timeline · BumpNotes" }] }),
  component: TimelinePage,
});

type FilterKey =
  | "all"
  | "symptom"
  | "question"
  | "measurement"
  | "note"
  | "photo"
  | "appointment"
  | "baby";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "symptom", label: "Symptoms" },
  { key: "question", label: "Questions" },
  { key: "measurement", label: "Measurements" },
  { key: "note", label: "Notes" },
  { key: "photo", label: "Uploads" },
  { key: "appointment", label: "Appointments" },
  { key: "baby", label: "Baby" },
];

// Labour entry types survive in old blobs but have no UI; never render them.
const HIDDEN_TYPES = new Set(["labour", "labour_event", "contraction"]);

function matchesFilter(e: Entry, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "appointment") return e.type === "person" || e.type === "appointment";
  if (f === "baby") return e.type === "feeling";
  return e.type === f;
}

function entryText(e: Entry): string {
  const s = summariseEntry(e);
  const bits: string[] = [s.headline, s.detail ?? "", e.type];
  // Pull common text-ish fields without TS noise
  const any = e as unknown as Record<string, unknown>;
  for (const k of [
    "text",
    "note",
    "context",
    "discussed",
    "advised",
    "advice",
    "followUp",
    "name",
    "role",
    "whoSeen",
    "symptom",
    "quantifier",
    "location",
    "tag",
    "feeling",
    "concern",
    "event",
    "customLabel",
    "unit",
  ]) {
    const v = any[k];
    if (typeof v === "string") bits.push(v);
    if (typeof v === "number") bits.push(String(v));
  }
  return bits.join(" ").toLowerCase();
}

function TimelinePage() {
  const { entries } = useAppState();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const t = useT();

  useEffect(() => {
    trackEvent("timeline_opened");
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();

    const live = entries.filter((e) => {
      if (e.deletedAt) return false;
      if (HIDDEN_TYPES.has(e.type)) return false;
      if (!matchesFilter(e, filter)) return false;
      if (q && !entryText(e).includes(q)) return false;
      return true;
    });

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
  }, [entries, query, filter]);

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("tl.title")} subtitle={t("tl.subtitle")} />

        <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-md px-4 lg:px-0 pt-2 pb-3 border-b border-border">
          <label className="relative block max-w-[680px]">
            <Search className="size-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your pregnancy record"
              className="w-full pl-9 pr-9 py-2 rounded-full bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded-full text-ink-soft hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
          <div className="-mx-4 lg:mx-0 mt-2 overflow-x-auto md:overflow-visible">
            <div className="flex md:flex-wrap gap-1.5 px-4 lg:px-0 w-max md:w-auto pb-1 md:pb-0">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-ink border-border hover:border-primary/40"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-0 pt-5 pb-10 space-y-8">
          {grouped.length === 0 && (
            <div className="surface-card blush-bg p-6 text-center">
              <p className="text-sm font-semibold text-ink">
                {query || filter !== "all" ? "No entries found" : t("tl.empty")}
              </p>
              {(query || filter !== "all") && (
                <p className="text-xs text-ink-soft mt-1">Try a different search or filter.</p>
              )}
            </div>
          )}
          {grouped.map(([key, list]) => {
            const [w, d] = key.split("+");
            return (
              <section key={key}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <h2 className="font-serif text-lg font-semibold">
                    {t("home.week")} {w} + {d}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold">
                    {list.length === 1
                      ? t("tl.entries.one", { n: list.length })
                      : t("tl.entries.other", { n: list.length })}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {list.map((e) => {
                    const s = summariseEntry(e);
                    return (
                      <li key={e.id} className="surface-card p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft break-words">
                              {formatUKDate(e.createdAt)} · {formatUKTime(e.createdAt)}
                            </p>
                            <p className="font-semibold mt-1 break-words">{s.headline}</p>
                            {s.detail && (
                              <p className="text-sm text-ink-soft mt-1 break-words">{s.detail}</p>
                            )}
                            {e.type === "photo" &&
                              (e.dataUrl.startsWith("data:image/") ? (
                                <img
                                  src={e.dataUrl}
                                  alt={e.tag}
                                  className="mt-3 w-full rounded-xl border border-border"
                                />
                              ) : (
                                <div className="mt-3 w-full min-h-28 rounded-xl border border-border bg-white grid place-items-center text-sm text-ink-soft">
                                  <span className="inline-flex items-center gap-2">
                                    <FileUp className="size-4" /> {t("upload.ready")}
                                  </span>
                                </div>
                              ))}
                            {e.type === "person" &&
                              e.dataUrl &&
                              (e.dataUrl.startsWith("data:image/") ? (
                                <img
                                  src={e.dataUrl}
                                  alt=""
                                  className="mt-3 w-full rounded-xl border border-border"
                                />
                              ) : (
                                <div className="mt-3 w-full min-h-28 rounded-xl border border-border bg-white grid place-items-center text-sm text-ink-soft">
                                  <span className="inline-flex items-center gap-2">
                                    <FileUp className="size-4" /> {t("upload.ready")}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border flex gap-3">
                          <button
                            onClick={() => setEditing(e)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft"
                          >
                            <Pencil className="size-3.5" /> {t("common.edit")}
                          </button>
                          <button
                            onClick={() => store.softDelete(e.id)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive"
                          >
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
        <TesterFeedbackButton />
      </AppShell>
      {editing && <EntryEditDialog entry={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
