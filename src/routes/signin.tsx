import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { PasswordInput } from "@/components/bumpnotes/PasswordInput";

type Search = { redirect?: string; admin?: string };

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in · BumpNotes" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    admin: typeof s.admin === "string" ? s.admin : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/signin" }) as Search;
  const { userId } = useSyncSnapshot();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = search.admin === "1" || (search.redirect && search.redirect.startsWith("/admin"));
  const redirectTo = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  useEffect(() => {
    if (userId) navigate({ to: redirectTo, replace: true });
  }, [userId, navigate, redirectTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }
      navigate({ to: redirectTo });
    } finally { setBusy(false); }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const redirect_uri = origin && redirectTo !== "/" ? `${origin}${redirectTo}` : origin;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri });
      if (result.error) { toast.error(result.error.message || "Sign in failed"); return; }
      if (result.redirected) return;
      navigate({ to: redirectTo });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally { setBusy(false); }
  }

  async function onForgot() {
    if (!email) { toast.error("Enter your email above first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset email sent.");
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 py-10 bg-background">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Link to="/welcome" className="inline-flex items-center justify-center">
              <LogoWordmark className="h-20 w-auto" />
            </Link>
            <h1 className="font-serif text-2xl font-semibold mt-4">
              {isAdmin ? "Admin sign in" : "Welcome back"}
            </h1>
            <p className="text-sm text-ink-soft mt-2 leading-relaxed">
              {isAdmin
                ? "Sign in with your admin account to access the BumpNotes admin dashboard."
                : "Sign in to access your pregnancy record."}
            </p>
          </div>

          <div className="surface-card p-5 space-y-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <PasswordInput
                autoComplete="current-password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              />
              <button
                disabled={busy} type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >Sign in</button>
              <button type="button" onClick={onForgot} className="block mx-auto text-xs text-ink-soft underline underline-offset-2">
                Forgot password?
              </button>
            </form>

            <div className="relative text-center">
              <span className="px-2 bg-card text-[11px] uppercase tracking-widest text-ink-soft">or</span>
            </div>

            <button
              onClick={onGoogle} disabled={busy}
              className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
            >Continue with Google</button>
          </div>

          {!isAdmin && (
            <div className="surface-card p-5 text-center space-y-3">
              <h2 className="font-serif text-base font-semibold">New to BumpNotes?</h2>
              <p className="text-xs text-ink-soft leading-relaxed">
                Start your pregnancy record to create your account and begin your private pregnancy record.
              </p>
              <Link
                to="/onboarding"
                className="inline-flex w-full justify-center py-3 rounded-full bg-white border border-primary/40 text-primary text-sm font-semibold hover:bg-blush-soft"
              >
                Start your pregnancy record
              </Link>
            </div>
          )}

          <p className="text-center text-xs">
            <Link to="/welcome" className="text-ink-soft">← Back to welcome</Link>
          </p>
        </div>
      </div>
    </>
  );
}
