import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAppState } from "@/lib/bumpnotes/store";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { PasswordInput } from "@/components/bumpnotes/PasswordInput";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Create your account · BumpNotes" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (userId) navigate({ to: "/", replace: true }); }, [userId, navigate]);

  // If user lands here without completing onboarding, send them to onboarding first.
  useEffect(() => {
    if (!profile?.onboarded) navigate({ to: "/onboarding", replace: true });
  }, [profile, navigate]);

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
    } catch (e) { console.warn("acceptance record failed", e); }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (!consentOk()) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Account created.");
      await recordAcceptance();
      navigate({ to: "/" });
    } finally { setBusy(false); }
  }

  async function onGoogle() {
    if (!consentOk()) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) { toast.error(result.error.message || "Sign in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally { setBusy(false); }
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
            <h1 className="font-serif text-2xl font-semibold mt-4 text-balance">You're almost there{greeting}</h1>
            <p className="text-sm text-ink-soft mt-2 text-balance leading-relaxed">
              Create your secure account to save your pregnancy record and access it whenever you need it.
            </p>
          </div>

          <div className="surface-card p-5 space-y-4">
            <button
              onClick={onGoogle} disabled={busy}
              className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
            >Continue with Google</button>

            <div className="relative text-center">
              <span className="px-2 bg-card text-[11px] uppercase tracking-widest text-ink-soft">or</span>
            </div>

            <form onSubmit={onEmail} className="space-y-3">
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <input
                type="password" autoComplete="new-password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox" checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                  />
                  <span>I agree to the{" "}
                    <Link to="/terms" target="_blank" rel="noopener" className="text-primary font-medium underline">Terms of Use</Link>.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox" checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                  />
                  <span>I have read the{" "}
                    <Link to="/privacy" target="_blank" rel="noopener" className="text-primary font-medium underline">Privacy Policy</Link>{" "}
                    and understand how my data will be used.
                  </span>
                </label>
                <p className="text-[11px] text-ink-soft leading-relaxed pt-1">
                  BumpNotes helps you organise your pregnancy notes and questions. It is not a medical device and does not replace your midwife, doctor or emergency care. Do not use it for urgent symptoms.
                </p>
              </div>

              <button
                disabled={busy} type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >Create account</button>
            </form>
          </div>

          <p className="text-center text-xs text-ink-soft leading-relaxed">
            Your record is private to you. Only you can read it. We don't sell or share it.
          </p>
          <p className="text-center text-xs">
            Already have an account? <Link to="/signin" className="text-primary font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
