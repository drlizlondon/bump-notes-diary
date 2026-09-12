import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { AppShell, PregnancySummaryAside } from "@/components/bumpnotes/AppShell";
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
import { useTester, isTester } from "@/lib/bumpnotes/tester";
import { gestationFromDueDate } from "@/lib/bumpnotes/gestation";
import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { AppRepository } from "@/lib/data/capture";
import { useAppSession } from "@/lib/data/session";
import { useActivePregnancy, useEntries, useProfile } from "@/lib/data/hooks";
import { storeEntryFromV2, storeProfileFromV2 } from "@/lib/data/entry-adapter";
import type { Entry as StoreEntry } from "@/lib/bumpnotes/types";
import type { Pregnancy } from "@/lib/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BumpNotes | Your Pregnancy Bump Note, Organised in One Place" },
      {
        name: "description",
        content:
          "Create a clear, organised bump note for your pregnancy. Track appointments, symptoms, questions, scans and key moments, then generate summaries when you need them.",
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
  component: Index,
});

type PanelKey = "symptom" | "question" | "people" | "measurement" | "photo" | "note" | "feeling";

// Auth gate: only tester or signed-in users load the app (and its repository
// data). Anon visitors go to the marketing homepage. The repository read for
// "has an active pregnancy?" happens inside AppRepository, so anon users never
// trigger an API call. (Identity signal is still Supabase-sync until B1/B2.)
function Index() {
  const { userId, loading } = useAppSession();
  const tester = useTester();
  const navigate = useNavigate();
  const authorized = !!userId || tester;

  useEffect(() => {
    // Read the tester flag imperatively (client-only) to avoid a hydration race
    // where the reactive snapshot is still false when this effect first fires.
    const authed = !!userId || isTester();
    if (!authed && !loading) navigate({ to: "/welcome", replace: true });
  }, [userId, loading, navigate]);

  if (!authorized) return null;

  return (
    <AppRepository>
      <HomeGate />
    </AppRepository>
  );
}

// Inside the repository: no active pregnancy -> onboarding; else the dashboard.
function HomeGate() {
  const navigate = useNavigate();
  const { data: pregnancy, isLoading, isError } = useActivePregnancy();

  useEffect(() => {
    if (!isLoading && !isError && !pregnancy) navigate({ to: "/onboarding", replace: true });
  }, [isLoading, isError, pregnancy, navigate]);

  if (isLoading || !pregnancy) return null;
  return <HomeView pregnancy={pregnancy} />;
}

function HomeView({ pregnancy }: { pregnancy: Pregnancy }) {
  const t = useT();
  const [open, setOpen] = useState<PanelKey | null>(null);
  const { data: profileV2 } = useProfile();
  const profile = storeProfileFromV2(profileV2 ?? null, pregnancy);

  function toggle(k: PanelKey) {
    setOpen((p) => (p === k ? null : k));
  }

  if (!profile) return null;

  return (
    <>
      <Toaster position="top-center" />
      <AppShell right={<PregnancySummaryAside />}>
        <HomeHeader profile={profile} />

        <ThisWeekCard pregnancyId={pregnancy.id} dueDateISO={profile.dueDateISO} />

        <section className="px-4 md:px-0 pb-28 lg:pb-10 mt-5">
          <h2 className="font-serif text-lg md:text-2xl font-semibold mt-1 mb-0.5 px-1">
            {t("home.capture.title")}
          </h2>
          <p className="text-[13px] text-ink-soft mb-3 px-1 break-words">
            {t("home.capture.subtitle")}
          </p>
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
          <TesterFeedbackButton />
        </section>
      </AppShell>
    </>
  );
}

function ThisWeekCard({ pregnancyId, dueDateISO }: { pregnancyId: string; dueDateISO: string }) {
  const { data: v2entries } = useEntries({ pregnancyId });
  const entries = useMemo<StoreEntry[]>(
    () => (v2entries ?? []).map(storeEntryFromV2).filter((e): e is StoreEntry => e !== null),
    [v2entries],
  );
  const currentWeek = useMemo(() => gestationFromDueDate(dueDateISO).weeks, [dueDateISO]);

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
    appointment: "appointments",
    measurement: "measurements",
    photo: "uploads",
    note: "notes",
    feeling: "feelings",
  };

  return (
    <section className="px-4 md:px-0 mt-4">
      <Link
        to="/timeline"
        className="surface-card p-4 sm:p-5 block w-full text-left hover:ring-1 hover:ring-primary/20 transition"
      >
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold">This week</p>
        </div>
        {stats.total === 0 ? (
          <p className="mt-2 text-sm text-ink-soft leading-relaxed break-words">
            Nothing recorded yet this week. Tap anything below to start — we'll save it
            automatically.
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-baseline flex-wrap gap-2">
              <span className="font-serif text-3xl font-semibold text-ink leading-none">
                {stats.total}
              </span>
              <span className="text-sm text-ink-soft break-words min-w-0">
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
            <span className="mt-3 inline-block text-xs font-semibold text-primary">
              View timeline →
            </span>
          </>
        )}
      </Link>
    </section>
  );
}
