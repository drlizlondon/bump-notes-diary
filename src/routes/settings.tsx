import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { formatUKDateTime } from "@/lib/bumpnotes/gestation";
import { summariseEntry } from "@/lib/bumpnotes/summary";
import { useT } from "@/lib/bumpnotes/i18n";
import { useSyncSnapshot, signOut } from "@/lib/bumpnotes/sync";
import { supabase } from "@/integrations/supabase/client";
import { useTester, exitTesterMode } from "@/lib/bumpnotes/tester";
import { deleteOwnAccount } from "@/lib/bumpnotes/admin.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · BumpNotes" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { entries, profile } = useAppState();
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [showStored, setShowStored] = useState(false);
  const t = useT();

  const tester = useTester();
  const navigate = useNavigate();
  const { email, userId } = useSyncSnapshot();
  const deleteOwnAccountFn = useServerFn(deleteOwnAccount);

  const deleted = useMemo(
    () =>
      entries
        .filter((e) => e.deletedAt)
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")),
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

  async function deletePregnancyRecord() {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    store.clearAll();
    if (userId) {
      const { error } = await supabase.from("bumpnotes_state").delete().eq("user_id", userId);
      if (error) toast.error("Cloud copy could not be deleted: " + error.message);
    }
    setConfirmWipe(false);
    toast.success(t("set.deleted"));
  }

  async function deleteAccount() {
    if (!userId) return;
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    try {
      await deleteOwnAccountFn({ data: undefined } as never);
      await supabase.auth.signOut();
      store.clearAll();
      toast.success("Your account and all BumpNotes data have been permanently deleted.");
      navigate({ to: "/welcome" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete account deletion.");
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("set.title")} />
        <div className="px-4 lg:px-0 pb-10 space-y-6">
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">
              {t("set.account")}
            </p>
            <div className="surface-card px-5 py-4 space-y-3">
              {tester ? (
                <>
                  <p className="text-sm font-medium">Tester workspace</p>
                  <p className="text-xs text-ink-soft">
                    You're in a sandbox. Nothing here is real and nothing syncs to a cloud account.
                  </p>
                  <button
                    onClick={() => {
                      store.clearAll();
                      exitTesterMode();
                      navigate({ to: "/welcome" });
                    }}
                    className="w-full py-2.5 rounded-full bg-white border border-border text-sm font-medium"
                  >
                    Exit tester mode
                  </button>
                </>
              ) : userId ? (
                <>
                  <div>
                    <p className="text-xs text-ink-soft">{t("set.signedInAs")}</p>
                    <p className="text-sm font-medium break-all">{email ?? "—"}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                      toast.success(t("auth.signedOut"));
                      navigate({ to: "/welcome" });
                    }}
                    className="w-full py-2.5 rounded-full bg-white border border-border text-sm font-medium"
                  >
                    {t("auth.signOut")}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">{t("set.notSignedIn")}</p>
                  <Link
                    to="/auth"
                    className="block text-center w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    {t("set.signInCta")}
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">
              Privacy &amp; Data
            </p>
            <div className="surface-card divide-y divide-border overflow-hidden">
              <button
                onClick={() => setShowStored((v) => !v)}
                className="w-full text-left px-5 py-4 flex items-center justify-between"
              >
                <span>
                  <span className="block text-sm font-medium">View stored information</span>
                  <span className="block text-xs text-ink-soft mt-0.5">
                    {entries.length} entries, profile, labour plan
                  </span>
                </span>
                <span className="text-ink-soft text-xs">{showStored ? "Hide" : "Show"}</span>
              </button>
              {showStored && (
                <div className="px-5 py-4 bg-blush-soft/50 text-xs space-y-2 max-h-72 overflow-auto">
                  <div>
                    <p className="font-semibold text-ink">Profile</p>
                    <p className="text-ink-soft break-words">
                      {profile
                        ? `${profile.userName} · baby: ${profile.babyNickname || "—"} · due ${profile.dueDateISO}`
                        : "No profile"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink mt-2">Entries</p>
                    {entries.length === 0 && <p className="text-ink-soft">None</p>}
                    <ul className="space-y-1 mt-1">
                      {entries.slice(0, 50).map((e) => (
                        <li key={e.id} className="text-ink-soft">
                          <span className="font-mono text-[10px] uppercase mr-1">{e.type}</span>
                          {summariseEntry(e).headline}
                          {e.deletedAt && <span className="ml-1 text-destructive">(deleted)</span>}
                        </li>
                      ))}
                    </ul>
                    {entries.length > 50 && (
                      <p className="text-ink-soft italic mt-1">
                        ... and {entries.length - 50} more
                      </p>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={exportData}
                className="w-full text-left px-5 py-4 text-sm font-medium"
              >
                Download your data (.json)
              </button>
              <button
                onClick={deletePregnancyRecord}
                className="w-full text-left px-5 py-4 text-sm font-medium text-destructive"
              >
                {confirmWipe
                  ? "Tap again to permanently delete your pregnancy record"
                  : "Delete pregnancy record"}
              </button>
              {userId && (
                <button
                  onClick={deleteAccount}
                  className="w-full text-left px-5 py-4 text-sm font-medium text-destructive"
                >
                  {confirmDeleteAccount
                    ? "Tap again to permanently delete account & data"
                    : "Permanently delete account and data"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink-soft px-1 leading-relaxed">
              Deletion is immediate. Sign-in credentials may take up to 30 days to be removed from
              authentication logs by our hosting partner.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">
                {t("set.recently")}
              </p>
              <span className="text-[10px] text-ink-soft">{t("set.kept")}</span>
            </div>
            {deleted.length === 0 && (
              <p className="text-sm text-ink-soft surface-card px-5 py-4">{t("set.empty")}</p>
            )}
            {deleted.map((e) => (
              <div key={e.id} className="surface-card px-5 py-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                  {t("common.delete")} {e.deletedAt && formatUKDateTime(e.deletedAt)}
                </p>
                <p className="font-semibold mt-1 break-words">{summariseEntry(e).headline}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => store.restore(e.id)}
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    {t("set.restore")}
                  </button>
                  <button
                    onClick={() => store.hardDelete(e.id)}
                    className="px-4 py-2 rounded-full bg-muted ring-1 ring-black/5 text-xs font-medium"
                  >
                    {t("set.deletedPerm")}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">
              {t("set.privacy")}
            </p>
            <div className="surface-card px-5 py-4 text-sm leading-relaxed text-ink-soft space-y-2">
              <p>{t("set.privacy.body")}</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <Link to="/privacy" className="text-primary font-medium">
                  Privacy policy
                </Link>
                <Link to="/terms" className="text-primary font-medium">
                  Terms of use
                </Link>
                <Link to="/contact" className="text-primary font-medium">
                  Contact
                </Link>
              </p>
            </div>
          </section>
        </div>
        <TesterFeedbackButton />
      </AppShell>
    </>
  );
}

export function SyncBadge({ status }: { status: "local" | "syncing" | "synced" | "error" }) {
  const t = useT();
  const map: Record<string, { label: string; cls: string }> = {
    local: { label: t("sync.local"), cls: "bg-muted text-ink-soft" },
    syncing: { label: t("sync.syncing"), cls: "bg-butter-soft text-ink" },
    synced: { label: t("sync.synced"), cls: "bg-mint-soft text-ink" },
    error: { label: t("sync.error"), cls: "bg-coral-soft text-ink" },
  };
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${m.cls}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" />
      {m.label}
    </span>
  );
}
