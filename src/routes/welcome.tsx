import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ArrowRight, Lock } from "lucide-react";
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
      </PublicShell>
    </>
  );
}

function Hero() {
  return (
    <section className="px-5 sm:px-8 pt-4 sm:pt-8 lg:pt-10 pb-12 sm:pb-20">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[45fr_55fr] gap-8 lg:gap-14 items-center">
        {/* Copy column */}
        <div className="text-left max-w-[560px] mx-auto lg:mx-0 w-full lg:py-6">

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
 * Floating, slightly angled preview of the real Pregnancy Summary component
 * populated with demo data. Plays a single subtle scroll reveal, then stops.
 */
function SummaryShowcase() {
  const [demo, setDemo] = useState<ReturnType<typeof buildDemoSummary> | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    setDemo(buildDemoSummary());
  }, []);

  // Single, gentle reveal scroll — runs once, then stays put.
  useEffect(() => {
    if (!demo) return;
    const el = scrollerRef.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const DELAY = 1200;
    const DURATION = 2600;
    let startTs: number | null = null;
    let cancelled = false;

    function stop() {
      stoppedRef.current = true;
      cancelled = true;
      cancelAnimationFrame(raf);
      el?.removeEventListener("wheel", stop);
      el?.removeEventListener("touchstart", stop);
      el?.removeEventListener("pointerdown", stop);
    }
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("pointerdown", stop, { passive: true });

    function tick(now: number) {
      if (cancelled || !el) return;
      if (startTs === null) startTs = now;
      const elapsed = now - startTs;
      if (elapsed < DELAY) { raf = requestAnimationFrame(tick); return; }
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (max <= 0) return;
      const reveal = Math.min(max, 220); // small reveal, not a full scroll
      const p = Math.min(1, (elapsed - DELAY) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      el.scrollTop = reveal * eased;
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [demo]);

  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
      <div className="pointer-events-none absolute -inset-6 sm:-inset-10 bg-gradient-to-br from-blush-soft/80 via-transparent to-mint-soft/40 blur-3xl -z-10 rounded-[40px]" aria-hidden />
      <div className="relative rounded-[28px] bg-white shadow-[0_30px_80px_-30px_rgba(36,27,27,0.25),0_10px_30px_-15px_rgba(246,95,124,0.25)] ring-1 ring-border overflow-hidden transition-transform duration-500 will-change-transform lg:rotate-[2deg] lg:hover:rotate-0">
        <FauxBrowserChrome />
        <div
          ref={scrollerRef}
          className="overflow-hidden h-[420px] sm:h-[520px] lg:h-[620px] px-3 sm:px-4 pb-4"
          aria-label="Preview of a BumpNotes Pregnancy Summary"
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
        {/* Soft fade hinting at more content below */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" aria-hidden />
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

