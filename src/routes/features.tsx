import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Activity, HeartPulse, HelpCircle, FileText, Lock, Stethoscope, Share2, Camera, Users, Ruler } from "lucide-react";
import { PublicShell } from "@/components/bumpnotes/PublicShell";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — BumpNotes" },
      { name: "description", content: "Pregnancy timeline, symptom and feelings tracking, saved questions for your care team, and a shareable summary you control." },
      { property: "og:title", content: "Features — BumpNotes" },
      { property: "og:description", content: "Pregnancy timeline, symptom and feelings tracking, saved questions, and a shareable summary." },
    ],
  }),
  component: FeaturesPage,
});

type Feature = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const features: Feature[] = [
  {
    icon: <CalendarClock className="size-5" />,
    title: "Pregnancy timeline",
    body: "Everything you record is organised by pregnancy week and day, so you can look back and see exactly what happened and when.",
  },
  {
    icon: <Activity className="size-5" />,
    title: "Symptom tracking",
    body: "Tap to record a symptom in seconds. Add optional descriptors like mild, moderate or severe when you want more detail.",
  },
  {
    icon: <HeartPulse className="size-5" />,
    title: "Feelings tracking",
    body: "A calm space to note how you're feeling emotionally — not just physically. Helpful to share with your midwife or GP.",
  },
  {
    icon: <HelpCircle className="size-5" />,
    title: "Save questions for your team",
    body: "Jot questions down as they come to mind, so you're ready when you next see your midwife, doctor or care team.",
  },
  {
    icon: <Users className="size-5" />,
    title: "People & care",
    body: "Keep appointments and the people supporting you in one private place.",
  },
  {
    icon: <Ruler className="size-5" />,
    title: "Measurements",
    body: "Record blood pressure, weight, baby's movements and other measurements when you want to track them.",
  },
  {
    icon: <Camera className="size-5" />,
    title: "Photos & notes",
    body: "Add a bump photo, a scan or a quick note to remember the moments alongside the medical detail.",
  },
  {
    icon: <FileText className="size-5" />,
    title: "Pregnancy summary",
    body: "Generate a clear, factual summary of your pregnancy so far — organised the way clinicians expect to read it.",
  },
  {
    icon: <Share2 className="size-5" />,
    title: "Share only what you choose",
    body: "Pick what goes into the summary before you share it. Nothing leaves your record without your decision.",
  },
  {
    icon: <Stethoscope className="size-5" />,
    title: "Built for appointments",
    body: "Walk into your appointment with everything organised — no scrolling through notes apps trying to remember.",
  },
  {
    icon: <Lock className="size-5" />,
    title: "Private by default",
    body: "Your record is yours. We don't sell your data, share it with advertisers, or use it to train AI.",
  },
];

function FeaturesPage() {
  return (
    <PublicShell>
      <section className="px-5 sm:px-8 pt-8 sm:pt-14 pb-6 sm:pb-10">
        <div className="max-w-[820px] mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blush-soft border border-border text-[12px] font-medium text-ink">
            <Lock className="size-3.5 text-primary" /> Private by default
          </span>
          <h1 className="mt-5 font-serif text-[34px] sm:text-[46px] font-semibold leading-[1.05] tracking-tight text-balance">
            Everything in BumpNotes<span className="text-primary">.</span>
          </h1>
          <p className="mt-4 text-[15.5px] sm:text-lg text-ink-soft leading-relaxed max-w-[620px] mx-auto">
            A calm, private pregnancy notebook. Record what matters, organise it by week, and share a clear summary with your care team when you need to.
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-12 sm:pb-16">
        <div className="max-w-[1120px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-border p-5 sm:p-6">
              <span className="inline-grid place-items-center size-10 rounded-full bg-blush-soft text-primary">{f.icon}</span>
              <h3 className="mt-4 font-serif text-lg font-semibold leading-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="max-w-[820px] mx-auto rounded-3xl bg-blush-soft/60 border border-border p-7 sm:p-10 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight">Ready to start your record?</h2>
          <p className="mt-2 text-ink-soft text-[15px] sm:text-base">It takes less than a minute to set up.</p>
          <Link
            to="/onboarding"
            className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold shadow-sm shadow-primary/20 hover:opacity-95"
          >
            Start your pregnancy record <ArrowRight className="size-4" />
          </Link>
          <p className="mt-6 text-[12px] text-ink-soft">BumpNotes is for personal organisation and support, not medical advice.</p>
        </div>
      </section>
    </PublicShell>
  );
}
