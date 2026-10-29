// BN-INVITE: shown instead of onboarding to a signed-in account with no invite
// yet. Enter a code, or ask for one. Founder 2026-10-29.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { redeemInviteCode } from "@/lib/bumpnotes/invite.functions";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { RequestAccessForm } from "@/components/bumpnotes/RequestAccessForm";

export function InviteGate({ email, onInvited }: { email?: string; onInvited: () => void }) {
  const redeem = useServerFn(redeemInviteCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await redeem({ data: { code } });
      if (res.ok) onInvited();
      else if (res.reason === "inactive")
        setError("That code has been turned off. Ask for a new one below.");
      else setError("That code didn't work. Check it and try again, or ask for one below.");
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <LogoWordmark className="h-16 w-auto mx-auto" />
          <h1 className="font-serif text-2xl font-semibold mt-4 text-balance">
            You'll need an invite code
          </h1>
          <p className="text-sm text-ink-soft mt-2 text-balance leading-relaxed">
            BumpNotes is invite-only while we're in beta. Enter your code to start your pregnancy
            record.
          </p>
        </div>

        {!asking ? (
          <div className="surface-card p-5 space-y-3">
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="invite-code" className="block text-sm font-medium">
                Invite code
              </label>
              <input
                id="invite-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base tracking-widest uppercase"
                placeholder="BN······"
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Checking…" : "Continue"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="w-full text-sm text-primary font-medium py-2"
            >
              No code? Request access
            </button>
          </div>
        ) : (
          <div className="surface-card p-5 space-y-3">
            <RequestAccessForm defaultEmail={email} />
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="w-full text-sm text-ink-soft py-2"
            >
              I have a code
            </button>
          </div>
        )}

        <p className="text-center text-xs">
          <Link to="/welcome" className="text-ink-soft">
            ← Back to welcome
          </Link>
        </p>
      </div>
    </div>
  );
}
