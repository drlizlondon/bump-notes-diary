import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useT } from "@/lib/bumpnotes/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · BumpNotes" }] }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
        });
        if (error) { toast.error(error.message); return; }
        toast.success(t("auth.signupOk"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.message); return; }
      }
      navigate({ to: "/" });
    } finally { setBusy(false); }
  }

  async function onGoogle() {
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

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-10 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="font-serif text-3xl font-semibold">BumpNotes</p>
            <p className="text-sm text-ink-soft mt-2">{t("auth.intro")}</p>
          </div>

          <div className="surface-card p-5 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 py-2 rounded-full text-sm font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}
              >{t("auth.signin")}</button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-full text-sm font-medium ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}
              >{t("auth.signup")}</button>
            </div>

            <form onSubmit={onEmail} className="space-y-3">
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <input
                type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
              <button
                disabled={busy} type="submit"
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >{mode === "signin" ? t("auth.signin") : t("auth.signup")}</button>
            </form>

            <div className="relative text-center">
              <span className="px-2 bg-card text-[11px] uppercase tracking-widest text-ink-soft">{t("auth.or")}</span>
            </div>

            <button
              onClick={onGoogle} disabled={busy}
              className="w-full py-3 rounded-full bg-white border border-border text-sm font-medium disabled:opacity-60"
            >{t("auth.google")}</button>
          </div>

          <p className="text-center text-xs text-ink-soft leading-relaxed">
            {t("auth.privacy")}
          </p>
          <p className="text-center text-xs">
            <Link to="/" className="text-primary font-medium">{t("auth.continueLocal")}</Link>
          </p>
        </div>
      </div>
    </>
  );
}
