import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { formatUKDateTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry } from "@/lib/bumpnotes/summary";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · BumpNotes" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { entries } = useAppState();
  const [confirmWipe, setConfirmWipe] = useState(false);

  const deleted = useMemo(
    () => entries.filter((e) => e.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
    [entries],
  );

  function exportData() {
    const blob = new Blob([store.exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bumpnotes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title="Settings" />
        <div className="px-4 pb-8 space-y-6">
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">Your data</p>
            <button onClick={exportData} className="w-full text-left bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5 font-medium">
              Export all data (.json)
            </button>
            <button
              onClick={() => {
                if (!confirmWipe) { setConfirmWipe(true); return; }
                store.clearAll();
                setConfirmWipe(false);
                toast.success("All data deleted");
              }}
              className="w-full text-left bg-card rounded-2xl px-5 py-4 ring-1 ring-destructive/30 text-destructive font-medium"
            >
              {confirmWipe ? "Tap again to confirm — this cannot be undone" : "Delete all data"}
            </button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">Recently deleted</p>
              <span className="text-[10px] text-ink-soft">Kept for 30 days</span>
            </div>
            {deleted.length === 0 && (
              <p className="text-sm text-ink-soft bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
                Nothing here. Deleted entries appear for 30 days.
              </p>
            )}
            {deleted.map((e) => (
              <div key={e.id} className="bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                  Deleted {e.deletedAt && formatUKDateTime(e.deletedAt)}
                </p>
                <p className="font-semibold mt-1">{summariseEntry(e).headline}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => store.restore(e.id)} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Restore</button>
                  <button onClick={() => store.hardDelete(e.id)} className="px-4 py-2 rounded-full bg-muted ring-1 ring-black/5 text-xs font-medium">Delete permanently</button>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">Privacy</p>
            <div className="bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5 text-sm leading-relaxed text-ink-soft">
              Your notes stay on this device unless you choose to share or export them. BumpNotes
              does not send your data anywhere, and is not a medical device, diagnostic tool or
              triage service.
            </div>
          </section>
        </div>
      </AppShell>
    </>
  );
}
