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
  nativeSignOut,
  type NativeAccount,
  type NativeSignInResult,
} from "@/lib/azure/entra-native";
import { useProfile, useUpsertProfile } from "@/lib/data/hooks";

export const Route = createFileRoute("/entra")({
  head: () => ({ meta: [{ title: "Sign in · BumpNotes (Entra)" }] }),
  component: EntraNativeSignIn,
});

type CodeStep = Extract<NativeSignInResult, { status: "code_required" }>;

function EntraNativeSignIn() {
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
      applyResult(await nativeSignIn(email, password));
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

  async function onSignOut() {
    await nativeSignOut();
    setAccount(null);
    setCodeStep(null);
    setCode("");
    setPassword("");
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
          <h1 className="font-serif text-2xl font-semibold mt-4">Welcome back</h1>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            Sign in to access your pregnancy record.
          </p>
        </div>

        {!checked && <p className="text-center text-sm text-ink-soft">Checking sign-in…</p>}

        {checked && !account && !codeStep && (
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
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                disabled={busy}
                type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => void onEmailCode()}
              disabled={busy}
              className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
            >
              Email me a code
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

        {account && (
          <div className="surface-card p-5 space-y-3">
            <p className="text-sm">
              ✅ Signed in with Entra as <strong>{account.username}</strong>
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
