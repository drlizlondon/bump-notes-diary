import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { NotebookPen, CalendarCheck, Share2, ArrowRight, ShieldCheck } from "lucide-react";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";
import { useAppState } from "@/lib/bumpnotes/store";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { SilhouetteIllustration } from "@/components/bumpnotes/SilhouetteIllustration";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "BumpNotes — your pregnancy, clearly organised" },
      { name: "description", content: "Record pregnancy symptoms, appointments and questions privately. Share a clear summary with your care team when you need it." },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:title", content: "BumpNotes — your pregnancy, clearly organised" },
      { property: "og:description", content: "Private pregnancy notebook. Share a clear summary with your care team when you need it." },
      { name: "twitter:title", content: "BumpNotes — your pregnancy, clearly organised" },
      { name: "twitter:description", content: "Private pregnancy notebook. Share a clear summary with your care team when you need it." },
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
  const { userId } = useSyncSnapshot();
  const { profile } = useAppState();
  const tester = useTester();

  useEffect(() => {
    if (userId) {
      if (profile?.onboarded) navigate({ to: "/", replace: true });
      else navigate({ to: "/onboarding", replace: true });
    }
  }, [userId, profile, navigate]);

  useEffect(() => {
    if (!userId && tester && profile?.onboarded) navigate({ to: "/", replace: true });
  }, [userId, tester, profile, navigate]);

  return (
    <>
      <Toaster position="top-center" />
      <PublicShell>
        <HeroSection />
        <SummarySection />
        <FeaturesSection />
        <FootnoteSection />
      </PublicShell>
    </>
  );
}

function HeroSection() {
  return (
    <section className="px-5 sm:px-8 pt-8 sm:pt-12 lg:pt-16 pb-10 sm:pb-14">
      <div className="max-w-[1200px] mx-auto grid gap-8 lg:gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
        <div className="text-center lg:text-left">
          <h1 className="font-serif text-[30px] sm:text-[40px] lg:text-[52px] font-semibold leading-[1.08] tracking-tight text-balance">
            Your pregnancy,<br className="hidden sm:inline" /> clearly organised.
          </h1>
          <p className="mt-4 sm:mt-5 text-[15px] sm:text-base lg:text-lg text-ink-soft leading-relaxed max-w-[520px] mx-auto lg:mx-0 text-balance">
            Record symptoms, appointments and questions privately. Share a clear summary when you need it.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-4 lg:justify-start justify-center">
            <Link
              to="/onboarding"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold shadow-sm shadow-primary/20 hover:opacity-95"
            >
              Start your pregnancy record <ArrowRight className="size-4" />
            </Link>
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
              <ShieldCheck className="size-4 text-primary" />
              Private by default. Share only what you choose.
            </span>
          </div>
        </div>

        <div className="relative order-first lg:order-none mx-auto lg:mx-0 w-full max-w-[320px] sm:max-w-[380px] lg:max-w-none">
          <SilhouetteIllustration className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
}

function SummarySection() {
  return (
    <section className="px-5 sm:px-8 pb-12 sm:pb-16 bg-gradient-to-b from-transparent to-blush-soft/40">
      <div className="max-w-[1120px] mx-auto">
        <div className="text-center max-w-[640px] mx-auto">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">For your care team</p>
          <h2 className="mt-2 font-serif text-[26px] sm:text-[34px] font-semibold leading-tight text-balance">
            Ready to share at appointments.
          </h2>
          <p className="mt-3 text-[15px] sm:text-base text-ink-soft leading-relaxed text-balance">
            Bring a clear, organised summary to your midwife, doctor or care team in seconds.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-border text-sm font-medium text-ink">
            <Share2 className="size-4 text-primary" /> Share summary
          </div>
        </div>

        <div className="mt-8 sm:mt-10 max-w-[720px] mx-auto">
          <SummaryPreview />
        </div>
      </div>
    </section>
  );
}

function SummaryPreview() {
  return (
    <div className="surface-card p-5 sm:p-7 overflow-hidden">
      <h3 className="font-serif text-lg sm:text-xl font-semibold">Pregnancy Summary</h3>
      <p className="text-xs text-ink-soft mt-1">A factual record from BumpNotes — not medical advice.</p>

      <dl className="mt-4 grid grid-cols-[auto,1fr] sm:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-ink-soft">Name</dt><dd className="font-medium">Sample</dd>
        <dt className="text-ink-soft">Baby</dt><dd className="font-medium">Bean</dd>
        <dt className="text-ink-soft">Due date</dt><dd className="font-medium">14/03/2026</dd>
        <dt className="text-ink-soft">Today</dt><dd className="font-medium">22+3</dd>
      </dl>

      <div className="mt-5 space-y-5">
        <SummaryBlock label="Overview">
          <p className="text-xs text-ink leading-relaxed">
            22 weeks pregnant, generally well. Mild nausea easing in recent weeks. Movements first felt at 19+4 and now regular.
          </p>
        </SummaryBlock>

        <SummaryBlock label="Key updates">
          <ul className="text-xs space-y-1.5">
            <RowLine week="Week 22 + 1" text="Headache (mild) — eased with water and rest" />
            <RowLine week="Week 21 + 4" text="Back ache (moderate) — lower back, evenings" />
            <RowLine week="Week 20 + 2" text="Movements: regular, several times a day" />
            <RowLine week="Week 19 + 6" text="Blood pressure 118/76 mmHg" />
          </ul>
        </SummaryBlock>

        <SummaryBlock label="Questions for my team">
          <ul className="text-xs space-y-1.5">
            <RowLine week="Week 22 + 0" text="“Is it normal to feel movements less in the morning?”" />
            <RowLine week="Week 21 + 3" text="“Any safe options for ongoing back ache?”" />
          </ul>
        </SummaryBlock>

        <SummaryBlock label="Appointments">
          <ul className="text-xs space-y-1.5">
            <RowLine week="Week 20 + 0" text="Midwife — anomaly scan reviewed, all measurements as expected" />
            <RowLine week="Week 16 + 2" text="Midwife — routine check, BP normal, urine clear" />
          </ul>
        </SummaryBlock>
      </div>

      <p className="mt-6 text-[11px] text-ink-soft leading-relaxed border-t border-border pt-4">
        BumpNotes is a personal record. It does not give medical advice, diagnose, or triage.
      </p>
    </div>
  );
}

function SummaryBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-widest text-ink-soft mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function RowLine({ week, text }: { week: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="text-ink-soft shrink-0 w-[90px] sm:w-[110px]">{week}</span>
      <span className="text-ink min-w-0">{text}</span>
    </li>
  );
}

function FeaturesSection() {
  return (
    <section className="px-5 sm:px-8 py-12 sm:py-16">
      <div className="max-w-[1120px] mx-auto grid gap-4 sm:gap-5 sm:grid-cols-3">
        <FeatureCard
          icon={<NotebookPen className="size-5" />}
          title="Record privately"
          body="Add notes, symptoms and photos as you go."
        />
        <FeatureCard
          icon={<CalendarCheck className="size-5" />}
          title="Prepare easily"
          body="Keep questions and appointments in one place."
        />
        <FeatureCard
          icon={<Share2 className="size-5" />}
          title="Share selectively"
          body="Create a clear summary for your care team."
        />
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-5">
      <span className="size-10 rounded-2xl bg-blush-soft grid place-items-center text-primary">{icon}</span>
      <h3 className="mt-3 font-serif text-base font-semibold">{title}</h3>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function FootnoteSection() {
  return (
    <section className="px-5 sm:px-8 pb-14">
      <div className="max-w-[720px] mx-auto text-center">
        <p className="text-xs text-ink-soft leading-relaxed">
          BumpNotes is for personal organisation and support, not medical advice.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/demo" className="text-primary font-medium">See a preview</Link>
          <Link to="/contact" className="text-primary font-medium">Get in contact</Link>
          <Link to="/privacy" className="text-primary font-medium">Privacy</Link>
          <Link to="/terms" className="text-primary font-medium">Terms</Link>
        </div>
      </div>
    </section>
  );
}
