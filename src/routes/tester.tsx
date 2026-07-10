import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { FlaskConical, NotebookPen, Sparkles, FileText, ArrowRight } from "lucide-react";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";
import { useAppState } from "@/lib/bumpnotes/store";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { LogoBadge } from "@/components/bumpnotes/Logo";
import { TesterPasswordModal } from "@/components/bumpnotes/TesterPasswordModal";

export const Route = createFileRoute("/tester")({
  head: () => ({
    meta: [
      { title: "BumpNotes — Tester Mode" },
      {
        name: "description",
        content:
          "Tester Mode for invited BumpNotes testers. Explore the full experience with fake data — no account needed.",
      },
      { name: "theme-color", content: "#ffffff" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Tester,
});

function Tester() {
  const navigate = useNavigate();
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();
  const tester = useTester();
  const [showModal, setShowModal] = useState(false);

  // If they already have a tester session and have onboarded, go to the app.
  useEffect(() => {
    if (!userId && tester && profile?.onboarded) navigate({ to: "/", replace: true });
  }, [userId, tester, profile, navigate]);

  return (
    <>
      <Toaster position="top-center" />
      {showModal && <TesterPasswordModal onClose={() => setShowModal(false)} />}

      <PublicShell>
        <section className="px-5 sm:px-8 pt-6 sm:pt-10 pb-8">
          <div className="max-w-[640px] mx-auto text-center">
            <div className="flex justify-center">
              <LogoBadge className="size-20 sm:size-24" />
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-butter-soft border border-butter/50 text-[11px] uppercase tracking-[0.2em] font-semibold text-ink">
              <FlaskConical className="size-3.5" /> Tester Mode
            </span>
            <h1 className="mt-3 font-serif text-[26px] sm:text-[38px] font-semibold leading-[1.15] text-balance">
              Help us shape BumpNotes.
            </h1>
            <p className="mt-3 text-[15px] sm:text-base text-ink-soft leading-relaxed text-balance max-w-[480px] mx-auto">
              You've been invited to try BumpNotes. Use fake data only — no account needed. Tap
              around, then tell us what works and what doesn't.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="w-full max-w-[320px] inline-flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold shadow-sm shadow-primary/20"
              >
                Start testing <ArrowRight className="size-4" />
              </button>
              <p className="text-xs text-ink-soft max-w-[320px]">
                You'll need the access code Lizzie shared with you.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-10">
          <div className="max-w-[860px] mx-auto grid gap-3 sm:grid-cols-3">
            <Feature
              icon={<NotebookPen className="size-5" />}
              title="Try the real flow"
              body="You'll go through the same onboarding and recording experience as a real user."
            />
            <Feature
              icon={<Sparkles className="size-5" />}
              title="Fake data only"
              body="Please don't enter real pregnancy details. This is a shared testing sandbox."
            />
            <Feature
              icon={<FileText className="size-5" />}
              title="Tell us anything"
              body="Use the small feedback button in the corner whenever something feels off."
            />
          </div>
        </section>

        <section className="px-5 sm:px-8 pb-16">
          <div className="max-w-[680px] mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link to="/welcome" className="text-primary font-medium">
              Public site
            </Link>
            <Link to="/contact" className="text-primary font-medium">
              Get in contact
            </Link>
            <Link to="/privacy" className="text-primary font-medium">
              Privacy
            </Link>
          </div>
        </section>
      </PublicShell>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-4">
      <span className="size-10 rounded-2xl bg-blush-soft grid place-items-center text-primary">
        {icon}
      </span>
      <h3 className="mt-3 font-serif text-base font-semibold">{title}</h3>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
