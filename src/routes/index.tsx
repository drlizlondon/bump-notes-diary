import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Activity, HelpCircle, Users, Gauge, Camera, NotebookPen, Heart } from "lucide-react";
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
import { Onboarding } from "@/components/bumpnotes/Onboarding";

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

  if (!profile?.onboarded) {
    return (
      <>
        <Toaster position="top-center" />
        <Onboarding onDone={(p) => store.setProfile({ ...p, onboarded: true })} />
      </>
    );
  }

  function toggle(k: PanelKey) { setOpen((p) => (p === k ? null : k)); }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <HomeHeader profile={profile} />

        <section className="px-4 md:px-0 pb-10">
          <h2 className="font-serif text-xl md:text-2xl font-semibold mt-2 mb-1 px-1">What would you like to capture?</h2>
          <p className="text-sm text-ink-soft mb-4 px-1">Tap any card to add an entry.</p>
          <div className="space-y-2.5">
            <ActionCard label="Symptoms" helper="Headache, swelling, bleeding, pain, movements" tone="coral"
              icon={<Activity className="size-5" />} open={open === "symptom"} onToggle={() => toggle("symptom")}>
              <SymptomPanelBody />
            </ActionCard>
            <ActionCard label="Save a Question" helper="Questions for your next appointment" tone="mint"
              icon={<HelpCircle className="size-5" />} open={open === "question"} onToggle={() => toggle("question")}>
              <QuestionPanelBody />
            </ActionCard>
            <ActionCard label="People & Care" helper="Who you saw and what was discussed" tone="butter"
              icon={<Users className="size-5" />} open={open === "people"} onToggle={() => toggle("people")}>
              <PeopleCarePanelBody />
            </ActionCard>
            <ActionCard label="Measurements" helper="Blood pressure, weight, movements +" tone="lavender"
              icon={<Gauge className="size-5" />} open={open === "measurement"} onToggle={() => toggle("measurement")}>
              <MeasurementPanelBody />
            </ActionCard>
            <ActionCard label="Photo" helper="Add a photo or document" tone="blush"
              icon={<Camera className="size-5" />} open={open === "photo"} onToggle={() => toggle("photo")}>
              <PhotoPanelBody />
            </ActionCard>
            <ActionCard label="Note" helper="Notes, thoughts or anything else" tone="mint"
              icon={<NotebookPen className="size-5" />} open={open === "note"} onToggle={() => toggle("note")}>
              <NotePanelBody />
            </ActionCard>
            <ActionCard label="Feelings" helper="Mood and emotional wellbeing" tone="lavender"
              icon={<Heart className="size-5" />} open={open === "feeling"} onToggle={() => toggle("feeling")}>
              <FeelingPanelBody />
            </ActionCard>
          </div>

          <p className="text-center text-xs text-ink-soft pt-6 px-6 leading-relaxed">
            Your data is private. Only on this device unless you choose to share.
          </p>
        </section>
      </AppShell>
    </>
  );
}
