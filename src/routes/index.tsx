import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Activity, HelpCircle, Users, Gauge, Camera, NotebookPen, Heart } from "lucide-react";
import { useAppState } from "@/lib/bumpnotes/store";
import { AppShell } from "@/components/bumpnotes/AppShell";
import { HomeHeader } from "@/components/bumpnotes/HomeHeader";
import {
  ActionCard, SymptomPanelBody, QuestionPanelBody, PeopleCarePanelBody,
  MeasurementPanelBody, PhotoPanelBody, FeelingPanelBody, NotePanelBody,
} from "@/components/bumpnotes/Panels";
import { useT } from "@/lib/bumpnotes/i18n";
import { useSyncSnapshot, closeMigrationPrompt } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BumpNotes — your pregnancy record" },
      { name: "description", content: "A simple, private pregnancy record. Capture symptoms, measurements, questions, care and photos, then create a clear summary by pregnancy week." },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Index,
});

type PanelKey = "symptom" | "question" | "people" | "measurement" | "photo" | "note" | "feeling";

function Index() {
  const { profile } = useAppState();
  const [open, setOpen] = useState<PanelKey | null>(null);
  const t = useT();
  const { migrationPromptOpen, userId } = useSyncSnapshot();
  const tester = useTester();
  const navigate = useNavigate();

  // Gate: route un-onboarded users appropriately
  useEffect(() => {
    if (profile?.onboarded) return;
    if (userId || tester) navigate({ to: "/onboarding", replace: true });
    else navigate({ to: "/welcome", replace: true });
  }, [userId, tester, profile, navigate]);

  // Onboarded local user, not authed, not tester → push to onboarding/auth to upgrade
  // (We allow them through if they already have data, to preserve back-compat)

  if (!profile?.onboarded) {
    // Don't render dashboard for users without a profile; navigation will redirect.
    return null;
  }

  function toggle(k: PanelKey) { setOpen((p) => (p === k ? null : k)); }

  return (
    <>
      <Toaster position="top-center" />
      {migrationPromptOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center px-4 py-6">
          <div className="surface-card p-5 w-full max-w-[440px] shadow-xl"
            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
            <h3 className="font-serif text-lg font-semibold">{t("sync.migrate.title")}</h3>
            <p className="text-sm text-ink-soft mt-2 leading-relaxed">{t("sync.migrate.body")}</p>
            <button onClick={closeMigrationPrompt} className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {t("sync.migrate.ok")}
            </button>
          </div>
        </div>
      )}
      <AppShell>
        <HomeHeader profile={profile} />

        <section className="px-4 md:px-0 pb-10 mt-6">
          <h2 className="font-serif text-xl md:text-2xl font-semibold mt-2 mb-1 px-1">{t("home.capture.title")}</h2>
          <p className="text-sm text-ink-soft mb-4 px-1">{t("home.capture.subtitle")}</p>
          <div className="space-y-2.5">
            <ActionCard label={t("cap.symptoms")} helper={t("cap.symptoms.helper")} tone="coral"
              icon={<Activity className="size-5" />} open={open === "symptom"} onToggle={() => toggle("symptom")}>
              <SymptomPanelBody />
            </ActionCard>
            <ActionCard label={t("cap.question")} helper={t("cap.question.helper")} tone="mint"
              icon={<HelpCircle className="size-5" />} open={open === "question"} onToggle={() => toggle("question")}>
              <QuestionPanelBody />
            </ActionCard>
            <ActionCard label={t("cap.people")} helper={t("cap.people.helper")} tone="butter"
              icon={<Users className="size-5" />} open={open === "people"} onToggle={() => toggle("people")}>
              <PeopleCarePanelBody />
            </ActionCard>
            <ActionCard label={t("cap.measurements")} helper={t("cap.measurements.helper")} tone="lavender"
              icon={<Gauge className="size-5" />} open={open === "measurement"} onToggle={() => toggle("measurement")}>
              <MeasurementPanelBody />
            </ActionCard>
            <ActionCard label={t("cap.photo")} helper={t("cap.photo.helper")} tone="blush"
              icon={<Camera className="size-5" />} open={open === "photo"} onToggle={() => toggle("photo")}>
              <PhotoPanelBody />
            </ActionCard>
            <ActionCard label={t("cap.note")} helper={t("cap.note.helper")} tone="mint"
              icon={<NotebookPen className="size-5" />} open={open === "note"} onToggle={() => toggle("note")}>
              <NotePanelBody />
            </ActionCard>
            <LabourLinkCard label={t("cap.labour")} helper={t("cap.labour.helper")} />
            <ActionCard label={t("cap.feelings")} helper={t("cap.feelings.helper")} tone="lavender"
              icon={<Heart className="size-5" />} open={open === "feeling"} onToggle={() => toggle("feeling")}>
              <FeelingPanelBody />
            </ActionCard>
          </div>

          <p className="text-center text-xs text-ink-soft pt-6 px-6 leading-relaxed">
            {t("home.privacy")}
          </p>
        </section>
      </AppShell>
    </>
  );
}

function LabourLinkCard({ label, helper }: { label: string; helper: string }) {
  return (
    <Link to="/labour" className="surface-card flex items-center gap-4 px-4 py-4 text-left">
      <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-coral-soft">
        <Heart className="size-5 text-ink" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[15px] leading-tight text-ink">{label}</span>
        <span className="block text-[12.5px] text-ink-soft mt-0.5 truncate">{helper}</span>
      </span>
      <span className="text-ink-soft text-lg">›</span>
    </Link>
  );
}
