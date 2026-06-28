import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ArrowRight, Lock, Share2, Stethoscope } from "lucide-react";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";
import { useAppState } from "@/lib/bumpnotes/store";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { PregnancySummaryPreview } from "@/components/bumpnotes/PregnancySummaryPreview";
import { buildDemoSummary } from "@/lib/bumpnotes/demo-summary";

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
        <Hero />
        <Features />
      </PublicShell>
    </>
  );
}

function Hero() {
  return (
    <section className="px-5 sm:px-8 pt-8 sm:pt-16 lg:pt-20 pb-12 sm:pb-20">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[45fr_55fr] gap-10 lg:gap-14 items-center">
        {/* Copy column */}
        <div className="text-left max-w-[560px] mx-auto lg:mx-0 w-full">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blush-soft border border-border text-[12px] font-medium text-ink">
            <Lock className="size-3.5 text-primary" /> Private by default
          </span>

          <h1 className="mt-5 font-serif text-[34px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.05] tracking-tight text-balance">
            Your pregnancy,<br className="hidden sm:block" /> clearly organised<span className="text-primary">.</span>
          </h1>

          <p className="mt-5 text-[15.5px] sm:text-lg text-ink-soft leading-relaxed">
            Record symptoms, appointments and questions privately. Generate a clear summary to share whenever you need it.
          </p>

          <Link
            to="/onboarding"
            className="mt-7 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold shadow-sm shadow-primary/20 hover:opacity-95"
          >
            Start your pregnancy record <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Product preview column — becomes the hero visual */}
        <div className="w-full">
          <SummaryShowcase />
        </div>
      </div>
    </section>
  );
}

/**
 * Floating, slightly angled preview of the real Pregnancy Summary component,
 * populated with demo data. Auto-scrolls slowly through the content and gently
 * returns to the top. Pauses on hover/touch.
 */
function SummaryShowcase() {
  const [demo, setDemo] = useState<ReturnType<typeof buildDemoSummary> | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  // Build demo data client-side to avoid SSR/hydration drift (uses `new Date()`).
  useEffect(() => {
    setDemo(buildDemoSummary());
  }, []);

  // Gentle auto-scroll loop: ~15s down, brief hold, ease back to start.
  useEffect(() => {
    if (!demo) return;
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let start = performance.now();
    const DURATION = 15000;
    const HOLD = 1500;
    const RETURN = 1200;

    function tick(now: number) {
      if (!el) return;
      if (pausedRef.current) {
        start = now - (start ? 0 : 0); // freeze: rebase start so progress doesn't jump
        raf = requestAnimationFrame(tick);
        return;
      }
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (max <= 0) { raf = requestAnimationFrame(tick); return; }
      const elapsed = (now - start) % (DURATION + HOLD + RETURN);
      let target: number;
      if (elapsed < DURATION) {
        target = (elapsed / DURATION) * max;
      } else if (elapsed < DURATION + HOLD) {
        target = max;
      } else {
        const p = (elapsed - DURATION - HOLD) / RETURN;
        const eased = 1 - Math.pow(1 - p, 3);
        target = max * (1 - eased);
      }
      el.scrollTop = target;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  function pause() { pausedRef.current = true; }
  function resume() { pausedRef.current = false; }

  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
      {/* Soft ambient glow */}
      <div className="pointer-events-none absolute -inset-6 sm:-inset-10 bg-gradient-to-br from-blush-soft/80 via-transparent to-mint-soft/40 blur-3xl -z-10 rounded-[40px]" aria-hidden />
      <div
        className="rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(36,27,27,0.25),0_10px_30px_-15px_rgba(246,95,124,0.25)] ring-1 ring-border overflow-hidden transition-transform duration-500 will-change-transform lg:rotate-[2deg] lg:hover:rotate-0"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
      >
        <FauxBrowserChrome />
        <div
          ref={scrollerRef}
          className="overflow-hidden h-[420px] sm:h-[520px] lg:h-[620px] px-3 sm:px-4 pb-4"
          aria-label="Live preview of a BumpNotes Pregnancy Summary"
        >
          {demo ? (
            <PregnancySummaryPreview
              profile={demo.profile}
              entries={demo.entries}
              groupMeasurements
            />
          ) : (
            <SummarySkeleton />
          )}
        </div>
      </div>
    </div>
  );
}

function FauxBrowserChrome() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-blush-soft/60">
      <span className="size-2.5 rounded-full bg-coral-soft" />
      <span className="size-2.5 rounded-full bg-butter-soft" />
      <span className="size-2.5 rounded-full bg-mint-soft" />
      <span className="ml-3 text-[11px] font-mono uppercase tracking-widest text-ink-soft">Pregnancy Summary</span>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-4">
      <div className="h-5 w-2/3 bg-blush-soft rounded" />
      <div className="h-3 w-1/2 bg-blush-soft rounded" />
      <div className="h-24 bg-blush-soft rounded-xl mt-4" />
      <div className="h-24 bg-blush-soft rounded-xl" />
      <div className="h-24 bg-blush-soft rounded-xl" />
    </div>
  );
}

function Features() {
  const cards = useMemo(() => ([
    {
      icon: <Lock className="size-5" />,
      title: "Private by default",
      body: "Your information stays yours.",
    },
    {
      icon: <Share2 className="size-5" />,
      title: "Share your summary",
      body: "Generate a clear report to share with your midwife, GP or maternity team.",
    },
    {
      icon: <Stethoscope className="size-5" />,
      title: "Built for appointments",
      body: "Keep symptoms, questions and care notes organised so they are easier to discuss.",
    },
  ]), []);

  return (
    <section id="features" className="px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl bg-white border border-border p-5 sm:p-6">
            <span className="inline-grid place-items-center size-10 rounded-full bg-blush-soft text-primary">{c.icon}</span>
            <h3 className="mt-4 font-serif text-lg font-semibold leading-tight">{c.title}</h3>
            <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 max-w-[640px] mx-auto text-center text-[12px] text-ink-soft leading-relaxed">
        BumpNotes is for personal organisation and support, not medical advice.
      </p>
    </section>
  );
}
