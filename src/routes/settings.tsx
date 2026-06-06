import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { formatUKDateTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry } from "@/lib/bumpnotes/summary";
import { useT, setLang, useLang, type Lang } from "@/lib/bumpnotes/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · BumpNotes" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { entries } = useAppState();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const t = useT();
  const lang = useLang();

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
    toast.success(t("set.exported"));
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("set.title")} />
        <div className="px-4 pb-8 space-y-6">

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">{t("set.language")}</p>
            <div className="bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
              <div className="relative">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="appearance-none w-full bg-transparent text-base font-medium focus:outline-none pr-8"
                >
                  <option value="en">{t("lang.english")}</option>
                  <option value="tr">{t("lang.turkish")}</option>
                </select>
                <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft text-xs">▼</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">{t("set.your")}</p>
            <button onClick={exportData} className="w-full text-left bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5 font-medium">
              {t("set.export")}
            </button>
            <button
              onClick={() => {
                if (!confirmWipe) { setConfirmWipe(true); return; }
                store.clearAll();
                setConfirmWipe(false);
                toast.success(t("set.deleted"));
              }}
              className="w-full text-left bg-card rounded-2xl px-5 py-4 ring-1 ring-destructive/30 text-destructive font-medium"
            >
              {confirmWipe ? t("set.deleteConfirm") : t("set.delete")}
            </button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">{t("set.recently")}</p>
              <span className="text-[10px] text-ink-soft">{t("set.kept")}</span>
            </div>
            {deleted.length === 0 && (
              <p className="text-sm text-ink-soft bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">{t("set.empty")}</p>
            )}
            {deleted.map((e) => (
              <div key={e.id} className="bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                  {t("common.delete")} {e.deletedAt && formatUKDateTime(e.deletedAt)}
                </p>
                <p className="font-semibold mt-1">{summariseEntry(e).headline}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => store.restore(e.id)} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">{t("set.restore")}</button>
                  <button onClick={() => store.hardDelete(e.id)} className="px-4 py-2 rounded-full bg-muted ring-1 ring-black/5 text-xs font-medium">{t("set.deletedPerm")}</button>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">{t("set.privacy")}</p>
            <div className="bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5 text-sm leading-relaxed text-ink-soft">
              {t("set.privacy.body")}
            </div>
          </section>
        </div>
      </AppShell>
    </>
  );
}
