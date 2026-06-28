import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useT } from "@/lib/bumpnotes/i18n";
import { useAppState } from "@/lib/bumpnotes/store";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { LogoWordmark } from "@/components/bumpnotes/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Create your account · BumpNotes" }] }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();

  // Default to "Create account". Sign-in is only for returning users.
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (userId) navigate({ to: "/", replace: true });
  }, [userId, navigate]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === "signup" && (!acceptTerms || !acceptPrivacy)) {
      toast.error("Please confirm both the Terms of Use and Privacy Policy to create an account.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
        if (error) { toast.error(error.message); return; }
        toast.success(t("auth.signupOk"));
        await recordAcceptance();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); return; }
      }
      navigate({ to: "/" });
    } finally { setBusy(false); }
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

  async function onGoogle() {
    if (mode === "signup" && !acceptTerms) {
      toast.error("Please accept the Privacy Policy and Terms to continue.");
      return;
    }
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) { toast.error(result.error.message || t("auth.failed")); return; }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("auth.failed"));
    } finally { setBusy(false); }
  }

  const intro = mode === "signup"
    ? (profile?.onboarded
        ? "Last step — create your account to securely save your pregnancy record and access it again later."
        : "Create your account to securely save your pregnancy record and access it again later.")
    : "Welcome back. Sign in to continue your pregnancy record.";

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 py-10 bg-background">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Link to="/welcome" className="inline-flex items-center justify-center">
              <LogoWordmark className="h-20 w-auto" />
            </Link>
            <p className="text-sm text-ink-soft mt-3 text-balance leading-relaxed">{intro}</p>
          </div>

          <div className="surface-card p-5 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-full text-sm font-medium ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}
              >Create account</button>
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 py-2 rounded-full text-sm font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}
              >Sign in</button>
            </div>

            <form onSubmit={onEmail} className="space-y-3">
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <input
                type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />

              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--primary)] shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/privacy" target="_blank" rel="noopener" className="text-primary font-medium underline">Privacy Policy</Link> and{" "}
                    <Link to="/terms" target="_blank" rel="noopener" className="text-primary font-medium underline">Terms of Use</Link>.
                  </span>
                </label>
              )}

              <button
                disabled={busy} type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >{mode === "signup" ? "Create account" : "Sign in"}</button>
            </form>

            <div className="relative text-center">
              <span className="px-2 bg-card text-[11px] uppercase tracking-widest text-ink-soft">or</span>
            </div>

            <button
              onClick={onGoogle} disabled={busy}
              className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
            >Continue with Google</button>
          </div>

          <p className="text-center text-xs text-ink-soft leading-relaxed">
            Your record is private to you. Only you can read it. We don't sell or share it.
          </p>
          <p className="text-center text-xs">
            <Link to="/welcome" className="text-ink-soft">← Back to welcome</Link>
          </p>
        </div>
      </div>
    </>
  );
}
