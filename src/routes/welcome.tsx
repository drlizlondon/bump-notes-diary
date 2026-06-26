import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { FlaskConical, NotebookPen, ShieldCheck, Sparkles, FileText, ArrowRight } from "lucide-react";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { enterTesterMode, useTester } from "@/lib/bumpnotes/tester";
import { useAppState } from "@/lib/bumpnotes/store";
import { setLang, useLang, type Lang, useT } from "@/lib/bumpnotes/i18n";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "BumpNotes — your private pregnancy record" },
      { name: "description", content: "A calm, private notebook for your pregnancy. Capture symptoms, questions, appointments, photos and labour, then create a clear summary for your care team." },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();
  const tester = useTester();
  const [testerCheck, setTesterCheck] = useState(false);
  const [showTesterModal, setShowTesterModal] = useState(false);

  // Authenticated users skip the landing entirely
  useEffect(() => {
    if (userId) navigate({ to: "/", replace: true });
  }, [userId, navigate]);

  // Existing tester / onboarded local user can keep going
  useEffect(() => {
    if (!userId && tester && profile?.onboarded) navigate({ to: "/", replace: true });
  }, [userId, tester, profile, navigate]);

  function handleStart() {
    if (testerCheck) { setShowTesterModal(true); return; }
    navigate({ to: "/onboarding" });
  }

  return (
    <>
      <Toaster position="top-center" />
      {showTesterModal && <TesterModal onClose={() => setShowTesterModal(false)} />}

      <PublicShell>
        <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-10">
          <div className="max-w-[640px] mx-auto text-center">
            <div className="inline-flex size-16 sm:size-20 rounded-full bg-gradient-to-br from-peach via-butter to-rose items-center justify-center shadow-lg shadow-peach/40">
              <span className="font-serif text-3xl sm:text-4xl text-white">b</span>
            </div>
            <h1 className="mt-6 font-serif text-[34px] sm:text-5xl font-semibold leading-tight text-balance">
              Your pregnancy, gently remembered.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-ink-soft leading-relaxed text-balance max-w-[520px] mx-auto">
              BumpNotes is a calm, private notebook for everything you want to remember about your pregnancy —
              and to share with your care team when it matters.
            </p>

            <div className="mt-7 flex flex-col items-center gap-3">
              <button
                onClick={handleStart}
                className="w-full max-w-[320px] inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold shadow-sm shadow-primary/20"
              >
                Start your pregnancy record <ArrowRight className="size-4" />
              </button>
              <p className="text-sm text-ink-soft">
                Already have an account?{" "}
                <Link to="/auth" className="text-primary font-semibold">Sign in</Link>
              </p>

              <label className="mt-2 inline-flex items-start gap-2 text-sm text-ink-soft cursor-pointer max-w-[320px] text-left">
                <input
                  type="checkbox"
                  checked={testerCheck}
                  onChange={(e) => setTesterCheck(e.target.checked)}
                  className="mt-1 size-4 accent-[var(--primary)] shrink-0"
                />
                <span>I've been invited to test BumpNotes and give feedback.</span>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs">
              <span className="text-ink-soft">{t("lang.select")}:</span>
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full border text-xs ${lang === "en" ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border text-ink-soft"}`}
              >English</button>
              <button
                onClick={() => setLang("tr")}
                className={`px-3 py-1 rounded-full border text-xs ${lang === "tr" ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border text-ink-soft"}`}
              >Türkçe</button>
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-12">
          <div className="max-w-[860px] mx-auto grid gap-3 sm:grid-cols-3">
            <Feature icon={<NotebookPen className="size-5" />} title="A simple notebook" body="Symptoms, questions, appointments, photos and feelings — all in one place." />
            <Feature icon={<Sparkles className="size-5" />} title="Organised by week" body="Every entry is plotted onto your pregnancy timeline automatically." />
            <Feature icon={<FileText className="size-5" />} title="A clear summary" body="Download a clean A4 pregnancy summary to save or share with your care team." />
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-12">
          <div className="max-w-[680px] mx-auto surface-card p-5 sm:p-6 blush-bg">
            <div className="flex items-start gap-3">
              <span className="size-10 rounded-2xl bg-white grid place-items-center shrink-0"><ShieldCheck className="size-5 text-primary" /></span>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-semibold">Your record stays yours</h2>
                <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">
                  BumpNotes is designed for privacy from the start. Your pregnancy notes belong to you.
                  We don't sell or share what you write, and you can download or delete your data at any time.
                  BumpNotes is a personal record — it does not give medical advice, diagnose, or triage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-16">
          <div className="max-w-[680px] mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link to="/demo" className="text-primary font-medium">See a preview</Link>
            <Link to="/contact" className="text-primary font-medium">Get in contact</Link>
            <Link to="/privacy" className="text-primary font-medium">Privacy</Link>
            <Link to="/terms" className="text-primary font-medium">Terms</Link>
          </div>
        </section>
      </PublicShell>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-4">
      <span className="size-10 rounded-2xl bg-blush-soft grid place-items-center text-primary">{icon}</span>
      <h3 className="mt-3 font-serif text-base font-semibold">{title}</h3>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function TesterModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  function enter() {
    enterTesterMode();
    toast.success("Welcome to the BumpNotes tester workspace.");
    onClose();
    navigate({ to: "/onboarding" });
  }
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] max-h-[90dvh] overflow-y-auto surface-card p-5 sm:p-6"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-2 text-primary mb-3">
          <FlaskConical className="size-5" />
          <span className="text-xs uppercase tracking-widest font-semibold">Tester mode</span>
        </div>
        <h3 className="font-serif text-xl font-semibold">You're entering BumpNotes tester mode.</h3>
        <div className="mt-3 text-sm text-ink-soft leading-relaxed space-y-3">
          <p>You won't create a real account or log in. This test workspace is only for trying BumpNotes using fake information.</p>
          <p>Please use this space to explore the app and point out anything that feels confusing, broken, missing or could be improved.</p>
          <p>Thank you so much for helping test BumpNotes.</p>
          <p className="font-medium text-ink">Lizzie</p>
        </div>
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium">Cancel</button>
          <button onClick={enter} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Enter tester mode</button>
        </div>
      </div>
    </div>
  );
}
