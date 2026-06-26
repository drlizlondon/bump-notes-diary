import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { Activity, HelpCircle, Users, Gauge, Camera, NotebookPen, Heart, FileText } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Preview — BumpNotes" }] }),
  component: Demo,
});

function Demo() {
  return (
    <PublicShell>
      <section className="px-5 sm:px-8 pt-10 pb-6 max-w-[820px] mx-auto">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Preview</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-2">A look inside BumpNotes</h1>
        <p className="text-ink-soft mt-3 leading-relaxed max-w-[600px]">
          A quick tour of the dashboard, the timeline, and the pregnancy summary you can download. No account needed to look around.
        </p>
      </section>

      <section className="px-5 sm:px-8 pb-10 max-w-[820px] mx-auto">
        <div className="surface-card p-5 blush-bg">
          <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">Niamh &amp; Pearl</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-5xl font-semibold text-primary leading-none">22</span>
            <span className="font-serif italic text-base text-ink-soft">weeks</span>
            <span className="font-serif text-3xl font-semibold text-primary leading-none ml-2">+3</span>
            <span className="font-serif italic text-base text-ink-soft">days</span>
          </div>
          <p className="text-xs text-ink-soft mt-3">Due 14 March 2026</p>
        </div>

        <h2 className="font-serif text-xl font-semibold mt-8 mb-2">Capture in seconds</h2>
        <p className="text-sm text-ink-soft mb-3">Tap a card to record something. BumpNotes plots it onto your week automatically.</p>
        <div className="grid sm:grid-cols-2 gap-2.5">
          <DemoCard icon={<Activity className="size-5" />} tone="bg-coral-soft" label="Symptoms" sub="Headache, swelling, movements" />
          <DemoCard icon={<HelpCircle className="size-5" />} tone="bg-mint-soft" label="Save a Question" sub="For your next appointment" />
          <DemoCard icon={<Users className="size-5" />} tone="bg-butter-soft" label="People & Care" sub="Who you saw, what was discussed" />
          <DemoCard icon={<Gauge className="size-5" />} tone="bg-lavender-soft" label="Measurements" sub="BP, weight, movements" />
          <DemoCard icon={<Camera className="size-5" />} tone="bg-blush-soft" label="Photos" sub="Bump, scans, documents" />
          <DemoCard icon={<NotebookPen className="size-5" />} tone="bg-mint-soft" label="Notes" sub="Anything you want to remember" />
          <DemoCard icon={<Heart className="size-5" />} tone="bg-lavender-soft" label="Feelings" sub="Mood and wellbeing" />
          <DemoCard icon={<Heart className="size-5" />} tone="bg-coral-soft" label="Labour & Birth" sub="Plan, hospital bag, contractions" />
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-10 max-w-[820px] mx-auto">
        <h2 className="font-serif text-xl font-semibold mb-2">A clean weekly timeline</h2>
        <p className="text-sm text-ink-soft mb-3">Everything you record is automatically organised by pregnancy week.</p>
        <div className="surface-card p-5 space-y-3">
          <TimelineRow week="22 + 3" title="Headache (mild)" detail="Eased after rest" />
          <TimelineRow week="22 + 1" title="Midwife appointment" detail="Discussed iron levels. Plan: repeat bloods at 28w." />
          <TimelineRow week="21 + 5" title="Blood pressure" detail="118 / 76 mmHg" />
          <TimelineRow week="21 + 2" title="Question saved" detail="Ask about glucose tolerance test booking" />
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-14 max-w-[820px] mx-auto">
        <h2 className="font-serif text-xl font-semibold mb-2">Download a clean pregnancy summary</h2>
        <p className="text-sm text-ink-soft mb-3">An A4 PDF organised by week and category. Easy for clinicians to read at a glance.</p>
        <div className="surface-card p-5 sm:p-6 ring-1 ring-border">
          <div className="flex items-center gap-2 text-primary mb-3"><FileText className="size-5" /><span className="font-semibold text-sm">BumpNotes Pregnancy Summary</span></div>
          <dl className="grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-ink-soft">Name</dt><dd className="font-medium">Niamh O'Connor</dd>
            <dt className="text-ink-soft">Baby</dt><dd className="font-medium">Pearl</dd>
            <dt className="text-ink-soft">Due</dt><dd className="font-medium">14 March 2026</dd>
            <dt className="text-ink-soft">Gestation</dt><dd className="font-medium">22 weeks + 3 days</dd>
          </dl>
          <hr className="my-4 border-border" />
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Week 22 + 3</p>
          <p className="text-sm mt-1">• 03/11/2025 09:14 — Headache (mild) · Eased after rest</p>
          <p className="text-xs text-ink-soft mt-2">Measurements this week</p>
          <p className="text-xs text-ink-soft">• Blood pressure — 2 readings (range 118/76 to 122/79 mmHg)</p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link to="/onboarding" className="flex-1 text-center py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Start your record</Link>
          <Link to="/auth" className="flex-1 text-center py-3 rounded-full bg-white border border-border text-sm font-medium">Sign in</Link>
        </div>
      </section>
    </PublicShell>
  );
}

function DemoCard({ icon, tone, label, sub }: { icon: React.ReactNode; tone: string; label: string; sub: string }) {
  return (
    <div className="surface-card flex items-center gap-3 px-4 py-3.5">
      <span className={`size-10 shrink-0 rounded-2xl grid place-items-center ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-ink-soft truncate">{sub}</p>
      </div>
    </div>
  );
}

function TimelineRow({ week, title, detail }: { week: string; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold w-14 shrink-0 pt-0.5">{week}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}
