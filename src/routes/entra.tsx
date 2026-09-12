// Entra native sign-in — the "B" login proof surface (AZURE Phase I.1).
//
// This is BumpNotes' OWN branded sign-in form (same visual language as
// /signin) wired to Microsoft Entra External ID NATIVE authentication as the
// engine: credentials are entered on THIS page, never on a Microsoft-hosted
// redirect. It proves the full pure-UK path end to end — our form -> native
// auth (via the same-origin CORS proxy) -> Entra access token -> Azure API ->
// Postgres profile round-trip.
//
// Why it lives here and not on /signin yet: the live app's session and data are
// still Supabase-backed (useSyncSnapshot + pullFromCloud). Making this the real
// front door is the Phase 3 surface cutover (app state onto the Azure
// repository); until then this surface proves the login works without breaking
// the live Supabase sign-in. Additive route; gated by VITE_ENTRA_NATIVE.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { PasswordInput } from "@/components/bumpnotes/PasswordInput";
import {
  ENTRA_NATIVE_ENABLED,
  getNativeAccount,
  nativeSignIn,
  nativeSignUp,
  nativeSignOut,
  nativeStartPasswordReset,
  type NativeAccount,
  type NativeSignInResult,
  type NativeResetResult,
  type NativeResetPwStep,
} from "@/lib/azure/entra-native";
import { useProfile, useUpsertProfile } from "@/lib/data/hooks";

export const Route = createFileRoute("/entra")({
  head: () => ({ meta: [{ title: "Sign in · BumpNotes (Entra)" }] }),
  component: EntraRoute,
});

function EntraRoute() {
  return <EntraNativeSignIn />;
}

type CodeStep = Extract<NativeSignInResult, { status: "code_required" }>;
type ResetCodeStep = Extract<NativeResetResult, { status: "code_required" }>;
type ResetPwStep = Extract<NativeResetPwStep, { status: "password_required" }>;

export function EntraNativeSignIn({ onSignedIn }: { onSignedIn?: () => void }) {
  const [account, setAccount] = useState<NativeAccount | null>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null);
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // Password-reset ("Forgot password?") flow — its own code + new-password steps.
  const [resetCodeStep, setResetCodeStep] = useState<ResetCodeStep | null>(null);
  const [resetPwStep, setResetPwStep] = useState<ResetPwStep | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const profile = useProfile();
  const upsert = useUpsertProfile();

  useEffect(() => {
    let active = true;
    void getNativeAccount().then((a) => {
      if (active) {
        setAccount(a);
        setChecked(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function applyResult(result: NativeSignInResult) {
    if (result.status === "signed_in") {
      setAccount(result.account);
      setCodeStep(null);
      setCode("");
      void profile.refetch();
      onSignedIn?.();
      return;
    }
    if (result.status === "code_required") {
      setCodeStep(result);
      setNotice(`We've emailed you a ${result.codeLength}-digit code. Enter it below.`);
      return;
    }
    if (result.status === "redirect_required") {
      setErr(result.message);
      return;
    }
    setErr(result.message);
  }

  async function onPasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      applyResult(
        mode === "signup"
          ? await nativeSignUp(email, password)
          : await nativeSignIn(email, password),
      );
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onEmailCode() {
    if (!email) {
      setErr("Enter your email above first.");
      return;
    }
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      applyResult(await nativeSignIn(email)); // no password -> email one-time passcode
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeStep || !code) return;
    setErr(null);
    setBusy(true);
    try {
      applyResult(await codeStep.submitCode(code));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (!codeStep) return;
    setErr(null);
    setBusy(true);
    try {
      applyResult(await codeStep.resendCode());
      setNotice("A new code is on its way.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  function exitReset() {
    setResetCodeStep(null);
    setResetPwStep(null);
    setResetCode("");
    setNewPassword("");
    setErr(null);
    setNotice(null);
  }

  async function onForgotPassword() {
    if (!email) {
      setErr("Enter your email above first.");
      return;
    }
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await nativeStartPasswordReset(email);
      if (result.status === "code_required") {
        setResetCodeStep(result);
        setNotice(`We've emailed you a ${result.codeLength}-digit reset code. Enter it below.`);
      } else {
        setErr(result.message);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onResetSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCodeStep || !resetCode) return;
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const step = await resetCodeStep.submitCode(resetCode);
      if (step.status === "password_required") {
        setResetPwStep(step);
        setNotice("Code accepted. Choose a new password.");
      } else {
        setErr(step.message);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onResetSubmitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwStep || !newPassword) return;
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await resetPwStep.submitNewPassword(newPassword);
      if (result.status === "signed_in") {
        exitReset();
        applyResult(result); // completes straight into signed-in
      } else {
        // e.g. AADSTS399249 "password banned" — stay on this step so a stronger
        // password can be entered without restarting the emailed-code flow.
        setNewPassword("");
        setErr(result.status === "error" ? result.message : "Please choose a different password.");
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await nativeSignOut();
    setAccount(null);
    setCodeStep(null);
    setCode("");
    setPassword("");
    exitReset();
  }

  async function onSaveProfile() {
    setErr(null);
    try {
      await upsert.mutateAsync({ displayName: displayName || null });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  if (!ENTRA_NATIVE_ENABLED) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm surface-card p-6 text-center">
          <LogoWordmark className="h-16 w-auto mx-auto" />
          <p className="text-sm text-ink-soft mt-4">
            Entra native sign-in is not enabled in this build (<code>VITE_ENTRA_NATIVE</code> is
            off).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 py-10 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <LogoWordmark className="h-20 w-auto mx-auto" />
          <h1 className="font-serif text-2xl font-semibold mt-4">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            {mode === "signup"
              ? "Start your pregnancy record."
              : "Sign in to access your pregnancy record."}
          </p>
        </div>

        {!checked && <p className="text-center text-sm text-ink-soft">Checking sign-in…</p>}

        {checked && !account && !codeStep && !resetCodeStep && !resetPwStep && (
          <div className="surface-card p-5 space-y-4">
            <form onSubmit={onPasswordSignIn} className="space-y-3">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <PasswordInput
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                disabled={busy}
                type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy
                  ? mode === "signup"
                    ? "Creating…"
                    : "Signing in…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => void onEmailCode()}
                  disabled={busy}
                  className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
                >
                  Email me a code
                </button>
                <button
                  type="button"
                  onClick={() => void onForgotPassword()}
                  disabled={busy}
                  className="block mx-auto text-xs text-ink-soft underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setErr(null);
                setNotice(null);
                setMode(mode === "signup" ? "signin" : "signup");
              }}
              className="block mx-auto text-xs text-ink-soft underline underline-offset-2"
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New to BumpNotes? Create an account"}
            </button>
          </div>
        )}

        {checked && !account && codeStep && (
          <div className="surface-card p-5 space-y-4">
            <form onSubmit={onSubmitCode} className="space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`${codeStep.codeLength}-digit code`}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm tracking-widest text-center focus:outline-none focus:border-primary/60"
              />
              <button
                disabled={busy}
                type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify code"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={busy}
              className="block mx-auto text-xs text-ink-soft underline underline-offset-2"
            >
              Resend code
            </button>
          </div>
        )}

        {checked && !account && resetCodeStep && !resetPwStep && (
          <div className="surface-card p-5 space-y-4">
            <p className="text-sm text-ink-soft">Reset your password</p>
            <form onSubmit={onResetSubmitCode} className="space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder={`${resetCodeStep.codeLength}-digit reset code`}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm tracking-widest text-center focus:outline-none focus:border-primary/60"
              />
              <button
                disabled={busy}
                type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify code"}
              </button>
            </form>
            <button
              type="button"
              onClick={exitReset}
              className="block mx-auto text-xs text-ink-soft underline underline-offset-2"
            >
              Back to sign in
            </button>
          </div>
        )}

        {checked && !account && resetPwStep && (
          <div className="surface-card p-5 space-y-4">
            <p className="text-sm text-ink-soft">Choose a new password</p>
            <form onSubmit={onResetSubmitNewPassword} className="space-y-3">
              <PasswordInput
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <button
                disabled={busy}
                type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Saving…" : "Set new password & sign in"}
              </button>
            </form>
            <button
              type="button"
              onClick={exitReset}
              className="block mx-auto text-xs text-ink-soft underline underline-offset-2"
            >
              Back to sign in
            </button>
          </div>
        )}

        {account && (
          <div className="surface-card p-5 space-y-3">
            <p className="text-sm">
              ✅ Signed in with Entra as <strong>{account.username || email}</strong>
            </p>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="text-xs text-ink-soft underline underline-offset-2"
            >
              Sign out
            </button>
            <hr className="border-border" />
            <h2 className="font-serif text-base font-semibold">
              Profile (via Azure API → Postgres)
            </h2>
            {profile.isLoading && <p className="text-sm text-ink-soft">Loading profile…</p>}
            {profile.isError && (
              <p className="text-sm text-destructive">
                Load failed: {(profile.error as Error)?.message}
              </p>
            )}
            {profile.data !== undefined && (
              <pre className="text-xs bg-white border border-border rounded-xl p-3 overflow-x-auto">
                {JSON.stringify(profile.data, null, 2)}
              </pre>
            )}
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="display name"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-border text-sm"
              />
              <button
                type="button"
                onClick={() => void onSaveProfile()}
                disabled={upsert.isPending}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {notice && <p className="text-center text-xs text-ink-soft">{notice}</p>}
        {err && <p className="text-center text-xs text-destructive">{err}</p>}
      </div>
    </div>
  );
}
