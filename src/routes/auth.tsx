import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SERVICE_PAUSED } from "@/lib/service-pause";
import { PauseNotice } from "@/components/bumpnotes/PauseNotice";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppState } from "@/lib/bumpnotes/store";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { PasswordInput } from "@/components/bumpnotes/PasswordInput";
import { trackEvent } from "@/lib/analytics";
import { buildAuthCallbackUrl } from "@/lib/supabase-auth-redirect";
import { useServerFn } from "@tanstack/react-start";
import { INVITE_ONLY } from "@/lib/invite-config";
import { checkInviteCode } from "@/lib/bumpnotes/invite.functions";
import { rememberInviteCode, rememberedInviteCode } from "@/lib/bumpnotes/invite-storage";
import { RequestAccessForm } from "@/components/bumpnotes/RequestAccessForm";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Create your account · BumpNotes" }] }),
  component: AuthPage,
});

// Service pause: no new accounts while the backend is down (src/lib/service-pause.ts).
function AuthPage() {
  const [codeOk, setCodeOk] = useState(() => !INVITE_ONLY || !!rememberedInviteCode());
  if (SERVICE_PAUSED) {
    return (
      <div className="min-h-[100dvh] flex items-center px-4">
        <PauseNotice />
      </div>
    );
  }
  // BN-INVITE: check the invite code before showing the sign-up form.
  if (!codeOk) return <InviteCodeStep onOk={() => setCodeOk(true)} />;
  return <AuthForm />;
}

function InviteCodeStep({ onOk }: { onOk: () => void }) {
  const check = useServerFn(checkInviteCode);
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
      const res = await check({ data: { code } });
      if (res.ok) {
        rememberInviteCode(code);
        onOk();
      } else setError("That code didn't work. Check it and try again, or request access below.");
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
          <Link to="/welcome" className="inline-flex items-center justify-center">
            <LogoWordmark className="h-16 w-auto" />
          </Link>
          <h1 className="font-serif text-2xl font-semibold mt-4 text-balance">
            Do you have an invite code?
          </h1>
          <p className="text-sm text-ink-soft mt-2 text-balance leading-relaxed">
            BumpNotes is invite-only while we're in beta.
          </p>
        </div>
        <div className="surface-card p-5 space-y-3">
          {!asking ? (
            <>
              <form onSubmit={submit} className="space-y-3">
                <label htmlFor="auth-invite" className="block text-sm font-medium">
                  Invite code
                </label>
                <input
                  id="auth-invite"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base tracking-widest uppercase"
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
            </>
          ) : (
            <>
              <RequestAccessForm />
              <button
                type="button"
                onClick={() => setAsking(false)}
                className="w-full text-sm text-ink-soft py-2"
              >
                I have a code
              </button>
            </>
          )}
        </div>
        <p className="text-center text-xs">
          <Link to="/signin" className="text-ink-soft">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function AuthForm() {
  const navigate = useNavigate();
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (userId) navigate({ to: "/", replace: true });
  }, [userId, navigate]);

  // V2: account first, then onboarding (onboarding needs a signed-in account). The old
  // "not onboarded -> /onboarding" redirect bounced new people to /signin and back.

  function consentOk() {
    if (!acceptTerms || !acceptPrivacy) {
      toast.error("Please confirm both the Terms of Use and Privacy Policy to create an account.");
      return false;
    }
    return true;
  }

  async function recordAcceptance() {
    try {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id;
      if (!id) return;
      await supabase.from("profiles").upsert({
        id,
        accepted_terms_at: new Date().toISOString(),
        accepted_privacy_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("acceptance record failed", e);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (!consentOk()) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: buildAuthCallbackUrl("/") },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      trackEvent("account_created");
      toast.success("Check your email to confirm your account, then sign in.");
      await recordAcceptance();
      navigate({ to: "/signin" });
    } finally {
      setBusy(false);
    }
  }

  const greeting = profile?.userName ? `, ${profile.userName}` : "";

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 py-10 bg-background">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Link to="/welcome" className="inline-flex items-center justify-center">
              <LogoWordmark className="h-20 w-auto" />
            </Link>
            <h1 className="font-serif text-2xl font-semibold mt-4 text-balance">
              You're almost there{greeting}
            </h1>
            <p className="text-sm text-ink-soft mt-2 text-balance leading-relaxed">
              Create your secure account to save your pregnancy record and access it whenever you
              need it.
            </p>
          </div>

          <div className="surface-card p-5 space-y-4">
            <form onSubmit={onEmail} className="space-y-3">
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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
              />

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener"
                      className="text-primary font-medium underline"
                    >
                      Terms of Use
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                  />
                  <span>
                    I have read the{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener"
                      className="text-primary font-medium underline"
                    >
                      Privacy Policy
                    </Link>{" "}
                    and understand how my data will be used.
                  </span>
                </label>
                <p className="text-[11px] text-ink-soft leading-relaxed pt-1">
                  BumpNotes helps you organise your pregnancy notes and questions. It is not a
                  medical device and does not replace your midwife, doctor or emergency care. Do not
                  use it for urgent symptoms.
                </p>
              </div>

              <button
                disabled={busy}
                type="submit"
                onClick={() => trackEvent("cta_clicked")}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                Create account
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-ink-soft leading-relaxed">
            Your record is private to you. Only you can read it. We don't sell or share it.
          </p>
          <p className="text-center text-xs">
            Already have an account?{" "}
            <Link to="/signin" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
