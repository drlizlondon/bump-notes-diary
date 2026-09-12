import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { PasswordInput } from "@/components/bumpnotes/PasswordInput";
import { summariseEntry } from "@/lib/bumpnotes/summary";
import { useT } from "@/lib/bumpnotes/i18n";
import { signOut } from "@/lib/bumpnotes/sync";
import { supabase } from "@/integrations/supabase/client";
import { useTester, isTester, exitTesterMode } from "@/lib/bumpnotes/tester";
import { AppRepository } from "@/lib/data/capture";
import { useAppSession, refreshNativeSession } from "@/lib/data/session";
import {
  ENTRA_NATIVE_ENABLED,
  nativeSignOut,
  nativeStartPasswordReset,
  type NativeResetPwStep,
} from "@/lib/azure/entra-native";
import {
  useActivePregnancy,
  useDeleteAccount,
  useEntries,
  useExportMyData,
  useProfile,
  downloadJson,
} from "@/lib/data/hooks";
import { storeEntryFromV2, storeProfileFromV2 } from "@/lib/data/entry-adapter";
import type { Entry } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · BumpNotes" }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { userId, loading } = useAppSession();
  const tester = useTester();
  const navigate = useNavigate();
  const authorized = !!userId || tester;

  useEffect(() => {
    const authed = !!userId || isTester();
    if (!authed && !loading) navigate({ to: "/welcome", replace: true });
  }, [userId, loading, navigate]);

  if (!authorized) return null;
  return (
    <AppRepository>
      <SettingsInner />
    </AppRepository>
  );
}

function SettingsInner() {
  const t = useT();
  const tester = useTester();
  const navigate = useNavigate();
  const { email, userId } = useAppSession();
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [showStored, setShowStored] = useState(false);

  const { data: profileV2 } = useProfile();
  const { data: pregnancy } = useActivePregnancy();
  const { data: v2entries } = useEntries(
    { pregnancyId: pregnancy?.id ?? "" },
    { enabled: !!pregnancy?.id },
  );
  const exportMine = useExportMyData();
  const deleteAccount = useDeleteAccount();

  const profile = storeProfileFromV2(profileV2 ?? null, pregnancy ?? null);
  const entries = useMemo<Entry[]>(
    () => (v2entries ?? []).map(storeEntryFromV2).filter((e): e is Entry => e !== null),
    [v2entries],
  );

  async function exportData() {
    const date = new Date().toISOString().slice(0, 10);
    if (userId && !tester) {
      // GDPR-1 export: the authoritative server-side copy.
      try {
        const data = await exportMine.mutateAsync();
        downloadJson(`bumpnotes-${date}.json`, data);
        toast.success(t("set.exported"));
      } catch {
        toast.error("Could not export your data. Please try again.");
      }
      return;
    }
    // Tester: assemble the on-device copy from what's loaded.
    downloadJson(`bumpnotes-tester-${date}.json`, {
      profile: profileV2 ?? null,
      pregnancy: pregnancy ?? null,
      entries: v2entries ?? [],
    });
    toast.success(t("set.exported"));
  }

  async function onDeleteAccount() {
    if (!userId) return;
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    try {
      await deleteAccount.mutateAsync();
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
                      if (ENTRA_NATIVE_ENABLED) {
                        await nativeSignOut();
                        refreshNativeSession();
                      } else {
                        await signOut();
                      }
                      toast.success(t("auth.signedOut"));
                      navigate({ to: "/welcome" });
                    }}
                    className="w-full py-2.5 rounded-full bg-white border border-border text-sm font-medium"
                  >
                    {t("auth.signOut")}
                  </button>
                  <ChangePasswordSection email={email} />
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
                    {entries.length} entries, profile, pregnancy
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
              {userId && (
                <button
                  onClick={onDeleteAccount}
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

// Change password for a signed-in user. Native (Entra): the proven reset flow
// (email code -> new password) run in-place. Supabase (flag off): sends a reset
// email. Both use the account's own email, so no re-typing it.
function ChangePasswordSection({ email }: { email: string | null }) {
  const [stage, setStage] = useState<"idle" | "code" | "password">("idle");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const submitCodeRef = useRef<((code: string) => Promise<NativeResetPwStep>) | null>(null);
  const submitPwRef = useRef<
    ((pw: string) => Promise<{ status: string; message?: string }>) | null
  >(null);

  function reset() {
    setStage("idle");
    setCode("");
    setPw("");
    setConfirm("");
    setMsg(null);
    setErr(null);
  }

  async function start() {
    if (!email) {
      setErr("No email is on file for this account.");
      return;
    }
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (!ENTRA_NATIVE_ENABLED) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) setErr(error.message);
        else setMsg("We've emailed you a password reset link.");
        return;
      }
      const res = await nativeStartPasswordReset(email);
      if (res.status === "code_required") {
        submitCodeRef.current = res.submitCode;
        setStage("code");
        setMsg(`We've emailed you a ${res.codeLength}-digit code.`);
      } else {
        setErr(res.message);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start a password change.");
    } finally {
      setBusy(false);
    }
  }

  async function onCode() {
    if (!submitCodeRef.current || !code) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await submitCodeRef.current(code);
      if (res.status === "password_required") {
        submitPwRef.current = res.submitNewPassword;
        setStage("password");
        setCode("");
        setMsg("Code accepted. Choose a new password.");
      } else {
        setErr(res.message);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function onNewPassword() {
    if (!submitPwRef.current || !pw) return;
    if (pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirm) {
      setErr("Those passwords don't match.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await submitPwRef.current(pw);
      if (res.status === "signed_in") {
        refreshNativeSession();
        toast.success("Your password has been changed.");
        reset();
      } else {
        setErr(res.message ?? "Please choose a different password.");
        setPw("");
        setConfirm("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60";
  const secondary = "w-full py-2.5 rounded-full bg-white border border-border text-sm font-medium";

  return (
    <div className="border-t border-border pt-3 space-y-2">
      {stage === "idle" && (
        <button onClick={() => void start()} disabled={busy} className={secondary}>
          {busy ? "Please wait…" : "Change password"}
        </button>
      )}

      {stage === "code" && (
        <div className="space-y-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="Enter the code we emailed you"
            className={field}
          />
          <button onClick={() => void onCode()} disabled={busy || !code} className={secondary}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
      )}

      {stage === "password" && (
        <div className="space-y-2">
          <PasswordInput
            autoComplete="new-password"
            minLength={8}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
          />
          <p className="text-[11px] text-ink-soft px-1">
            At least 8 characters, with a mix of letters, numbers and symbols.
          </p>
          <PasswordInput
            autoComplete="new-password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
          />
          <button onClick={() => void onNewPassword()} disabled={busy || !pw} className={secondary}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </div>
      )}

      {stage !== "idle" && (
        <button onClick={reset} className="block mx-auto text-xs text-ink-soft underline">
          Cancel
        </button>
      )}
      {msg && <p className="text-[12px] text-ink-soft">{msg}</p>}
      {err && <p className="text-[12px] text-destructive">{err}</p>}
    </div>
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
