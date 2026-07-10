import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Toaster } from "sonner";
import {
  Activity,
  HelpCircle,
  Users,
  Gauge,
  FileUp,
  NotebookPen,
  Heart,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell } from "@/components/bumpnotes/AppShell";
import { HomeHeader } from "@/components/bumpnotes/HomeHeader";
import {
  ActionCard,
  SymptomPanelBody,
  QuestionPanelBody,
  PeopleCarePanelBody,
  MeasurementPanelBody,
  PhotoPanelBody,
  FeelingPanelBody,
  NotePanelBody,
} from "@/components/bumpnotes/Panels";
import { useT } from "@/lib/bumpnotes/i18n";
import { gestationFromDueDate } from "@/lib/bumpnotes/gestation";
import { buildDemoDashboardState } from "@/lib/bumpnotes/demo-dashboard";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Preview — BumpNotes" },
      {
        name: "description",
        content:
          "Try BumpNotes with a demo dashboard. Add and edit example entries to see how easy it is to capture your pregnancy notes.",
      },
      { name: "theme-color", content: "#ffffff" },
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
  component: Demo,
});

type PanelKey = "symptom" | "question" | "people" | "measurement" | "photo" | "note" | "feeling";

function Demo() {
  const { profile } = useAppState();
  const [open, setOpen] = useState<PanelKey | null>(null);
  const t = useT();

  // Enter demo mode on mount. Demo state persists across in-app navigation
  // via sessionStorage in the store; the user exits via the banner X button.
  useEffect(() => {
    if (!store.isDemoMode()) {
      store.enterDemoMode(buildDemoDashboardState());
    }
  }, []);

  if (!profile?.onboarded) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-8">
        <p className="text-sm text-ink-soft">Loading demo…</p>
      </div>
    );
  }

  function toggle(k: PanelKey) {
    setOpen((p) => (p === k ? null : k));
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <HomeHeader profile={profile} />

        <ThisWeekCard />

        <section className="px-4 md:px-0 pb-28 lg:pb-10 mt-5">
          <h2 className="font-serif text-lg md:text-2xl font-semibold mt-1 mb-0.5 px-1">
            {t("home.capture.title")}
          </h2>
          <p className="text-[13px] text-ink-soft mb-3 px-1">{t("home.capture.subtitle")}</p>
          <div className="space-y-2">
            <ActionCard
              label={t("cap.symptoms")}
              helper={t("cap.symptoms.helper")}
              tone="coral"
              icon={<Activity className="size-5" />}
              open={open === "symptom"}
              onToggle={() => toggle("symptom")}
            >
              <SymptomPanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.question")}
              helper={t("cap.question.helper")}
              tone="mint"
              icon={<HelpCircle className="size-5" />}
              open={open === "question"}
              onToggle={() => toggle("question")}
            >
              <QuestionPanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.people")}
              helper={t("cap.people.helper")}
              tone="butter"
              icon={<Users className="size-5" />}
              open={open === "people"}
              onToggle={() => toggle("people")}
            >
              <PeopleCarePanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.measurements")}
              helper={t("cap.measurements.helper")}
              tone="lavender"
              icon={<Gauge className="size-5" />}
              open={open === "measurement"}
              onToggle={() => toggle("measurement")}
            >
              <MeasurementPanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.photo")}
              helper={t("cap.photo.helper")}
              tone="blush"
              icon={<FileUp className="size-5" />}
              open={open === "photo"}
              onToggle={() => toggle("photo")}
            >
              <PhotoPanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.note")}
              helper={t("cap.note.helper")}
              tone="mint"
              icon={<NotebookPen className="size-5" />}
              open={open === "note"}
              onToggle={() => toggle("note")}
            >
              <NotePanelBody />
            </ActionCard>
            <ActionCard
              label={t("cap.feelings")}
              helper={t("cap.feelings.helper")}
              tone="lavender"
              icon={<Heart className="size-5" />}
              open={open === "feeling"}
              onToggle={() => toggle("feeling")}
            >
              <FeelingPanelBody />
            </ActionCard>
          </div>

          <div className="mt-8 surface-card p-5 blush-bg text-center">
            <p className="font-serif text-lg font-semibold">Like what you see?</p>
            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">
              Create your own pregnancy record in under a minute.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/onboarding"
                className="flex-1 text-center py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                Start your pregnancy record
              </Link>
              <Link
                to="/welcome"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-white border border-border text-sm font-medium"
              >
                <ArrowLeft className="size-4" /> Back to homepage
              </Link>
            </div>
          </div>
        </section>
      </AppShell>
    </>
  );
}

function ThisWeekCard() {
  const { entries, profile } = useAppState();
  const { weeks: currentWeek } = useMemo(
    () => (profile ? gestationFromDueDate(profile.dueDateISO) : { weeks: 0, days: 0 }),
    [profile],
  );

  const stats = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = entries.filter((e) => !e.deletedAt && new Date(e.createdAt).getTime() >= since);
    const total = recent.length;
    const counts: Record<string, number> = {};
    for (const e of recent) counts[e.type] = (counts[e.type] ?? 0) + 1;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { total, top };
  }, [entries]);

  const labelMap: Record<string, string> = {
    symptom: "symptoms",
    question: "questions",
    person: "appointments",
    measurement: "measurements",
    photo: "uploads",
    note: "notes",
    feeling: "feelings",
  };

  return (
    <section className="px-4 md:px-0 mt-4">
      <div className="surface-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold">This week</p>
        </div>
        {stats.total === 0 ? (
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            Nothing recorded yet this week. Tap anything below to start — we'll save it
            automatically.
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-semibold text-ink leading-none">
                {stats.total}
              </span>
              <span className="text-sm text-ink-soft">
                {stats.total === 1 ? "entry" : "entries"} added in week {currentWeek}
              </span>
            </div>
            {stats.top.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stats.top.map(([k, n]) => (
                  <span key={k} className="px-2.5 py-1 rounded-full bg-blush-soft text-xs text-ink">
                    {n} {labelMap[k] ?? k}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
