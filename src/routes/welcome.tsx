import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import {
  ArrowRight, Lock, Share2, Star, TrendingUp, HelpCircle, Calendar, ShieldCheck,
} from "lucide-react";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";
import { useAppState } from "@/lib/bumpnotes/store";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { SilhouetteIllustration } from "@/components/bumpnotes/SilhouetteIllustration";
import iconAsset from "@/assets/bumpnotes-icon.png.asset.json";

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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=Caveat:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
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
    <section className="relative px-4 sm:px-8 pt-5 sm:pt-10 pb-5 sm:pb-10 bg-gradient-to-b from-blush-soft/60 to-transparent overflow-hidden">
      {/* Mobile: faint decorative silhouette in background */}
      <div className="pointer-events-none absolute -right-10 top-0 bottom-0 w-[180px] opacity-[0.07] sm:hidden flex items-center" aria-hidden>
        <SilhouetteIllustration className="w-full h-auto" />
      </div>

      <div className="relative max-w-[1200px] mx-auto sm:grid sm:grid-cols-[1.05fr_0.95fr] sm:gap-10 sm:items-center">
        <div className="text-left min-w-0">
          <h1 className="font-serif text-[30px] sm:text-[40px] lg:text-[52px] font-semibold leading-[1.08] tracking-tight">
            Your pregnancy, clearly organised<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 sm:mt-5 text-[14.5px] sm:text-base lg:text-lg text-ink-soft leading-relaxed max-w-[520px]">
            Record symptoms, appointments and questions privately. Share a clear summary when you need it.
          </p>

          <div className="mt-4 sm:mt-6 flex items-center gap-3">
            <span className="size-10 sm:size-11 shrink-0 rounded-full bg-blush-soft grid place-items-center text-primary">
              <Lock className="size-4 sm:size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] sm:text-[15px] font-semibold text-ink leading-tight">Private by default.</p>
              <p className="text-[12.5px] sm:text-sm text-ink-soft leading-tight">Share only what you choose.</p>
            </div>
          </div>

          <Link
            to="/onboarding"
            className="mt-4 sm:mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-3 px-5 sm:px-7 py-3.5 sm:py-3 rounded-2xl sm:rounded-full bg-primary text-primary-foreground text-[15px] sm:text-base font-semibold shadow-sm shadow-primary/20 hover:opacity-95"
          >
            <span>Start your pregnancy record</span>
            <ArrowRight className="size-5 shrink-0" />
          </Link>
        </div>

        {/* Desktop/tablet silhouette */}
        <div className="hidden sm:block justify-self-end w-full max-w-[360px] lg:max-w-[440px]">
          <SilhouetteIllustration className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
}

function SummarySection() {
  return (
    <section className="px-4 sm:px-8 pt-2 sm:pt-10 pb-8 sm:pb-16">
      <div className="max-w-[1120px] mx-auto">
        <div className="surface-card p-3.5 sm:p-7 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif text-[19px] sm:text-[30px] font-semibold leading-tight">
                Ready to share at appointments<span className="text-primary">.</span>
              </h2>
              <p className="mt-1.5 text-[12.5px] sm:text-base text-ink-soft leading-snug">
                Bring a clear, organised summary to your midwife, doctor or care team in seconds.
              </p>
            </div>
            <span className="size-9 sm:size-11 shrink-0 rounded-full bg-blush-soft grid place-items-center text-primary">
              <Share2 className="size-4 sm:size-5" />
            </span>
          </div>

          <div className="mt-3 sm:mt-6">
            <SummaryPreview />
          </div>

          <div className="mt-4 sm:mt-5 flex justify-center sm:justify-end">
            <div className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blush-soft text-primary text-sm sm:text-base font-semibold">
              <Share2 className="size-4" /> Share summary
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryPreview() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
        <div className="min-w-0">
          <h3 className="font-serif text-[15px] sm:text-lg font-semibold leading-tight">BumpNotes Summary</h3>
          <p className="text-[11px] sm:text-xs text-ink-soft mt-0.5">Prepared on 12 May 2025</p>
        </div>
        <img src={iconAsset.url} alt="" className="size-7 sm:size-9 object-contain shrink-0" />
      </div>

      <div className="divide-y divide-border">
        <SummaryRow icon={<Star className="size-4" />} title="Overview">
          <p className="text-[12px] sm:text-[13px] text-ink">12w 3d <span className="text-ink-soft">·</span> First pregnancy</p>
        </SummaryRow>

        <SummaryRow icon={<TrendingUp className="size-4" />} title="Key updates">
          <ul className="text-[12px] sm:text-[13px] text-ink space-y-0.5 list-disc pl-4 marker:text-primary">
            <li><span className="font-semibold">Nausea</span> improving</li>
            <li><span className="font-semibold">Fatigue</span> continues in afternoons</li>
            <li><span className="font-semibold">Heartburn</span> a few times this week</li>
          </ul>
        </SummaryRow>

        <SummaryRow icon={<HelpCircle className="size-4" />} title="Questions for my team">
          <ul className="text-[12px] sm:text-[13px] text-ink space-y-0.5 list-disc pl-4 marker:text-primary">
            <li>Is it normal to feel dizzy after meals?</li>
            <li>Safe pain relief for headaches?</li>
          </ul>
        </SummaryRow>

        <SummaryRow icon={<Calendar className="size-4" />} title="Appointments">
          <ul className="text-[12px] sm:text-[13px] text-ink space-y-0.5">
            <li className="grid grid-cols-[auto_1fr] gap-x-3"><span>• 22 Apr 2025</span><span className="text-ink-soft">First scan</span></li>
            <li className="grid grid-cols-[auto_1fr] gap-x-3"><span>• 15 May 2025</span><span className="text-ink-soft">Midwife check-in</span></li>
          </ul>
        </SummaryRow>
      </div>
    </div>
  );
}

function SummaryRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 py-3">
      <span className="size-7 rounded-full bg-blush-soft grid place-items-center text-primary shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] sm:text-sm font-semibold text-ink leading-tight">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="px-4 sm:px-8 pb-8 sm:pb-16">
      <div className="max-w-[1120px] mx-auto grid grid-cols-3 gap-2.5 sm:gap-5">
        <FeatureCard icon={<Lock className="size-4 sm:size-5" />} title="Record privately" body="Add notes, symptoms and photos as you go." />
        <FeatureCard icon={<HelpCircle className="size-4 sm:size-5" />} title="Prepare easily" body="Keep questions and appointments in one place." />
        <FeatureCard icon={<Share2 className="size-4 sm:size-5" />} title="Share selectively" body="Create a clear summary for your care team." />
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-card p-3 sm:p-5 text-center">
      <span className="size-9 sm:size-10 mx-auto rounded-full bg-blush-soft grid place-items-center text-primary">{icon}</span>
      <h3 className="mt-2 sm:mt-3 font-serif text-[13px] sm:text-base font-semibold leading-tight">{title}</h3>
      <p className="text-[11.5px] sm:text-sm text-ink-soft mt-1 leading-snug">{body}</p>
    </div>
  );
}

function FootnoteSection() {
  return (
    <section className="px-4 sm:px-8 pb-10">
      <div className="max-w-[720px] mx-auto text-center">
        <p className="text-[12px] sm:text-xs text-ink-soft leading-relaxed inline-flex items-start justify-center gap-2">
          <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" />
          <span>BumpNotes is for personal organisation and support, not medical advice.</span>
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
