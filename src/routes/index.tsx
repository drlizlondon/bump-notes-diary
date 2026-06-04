import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell } from "@/components/bumpnotes/AppShell";
import { HomeHeader } from "@/components/bumpnotes/HomeHeader";
import {
  ActionCard,
  SymptomPanelBody,
  QuestionPanelBody,
  AppointmentPanelBody,
  PhotoPanelBody,
  LabourPanelBody,
  FeelingPanelBody,
  NotePanelBody,
  ConcernPanelBody,
} from "@/components/bumpnotes/Panels";
import { Onboarding } from "@/components/bumpnotes/Onboarding";
import { gestationFromDueDate, formatGestation } from "@/lib/bumpnotes/gestation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BumpNotes — your pregnancy, in your own words" },
      { name: "description", content: "A simple, private pregnancy notebook to record symptoms, concerns, questions, appointments and more." },
      { name: "theme-color", content: "#fdf8f1" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  component: Index,
});

type PanelKey = "symptom" | "question" | "appointment" | "photo" | "labour" | "feeling" | "note" | "concern";

function Index() {
  const { profile, entries } = useAppState();
  const [open, setOpen] = useState<PanelKey | null>(null);

  function toggle(k: PanelKey) {
    setOpen((prev) => (prev === k ? null : k));
  }

  if (!profile?.onboarded) {
    return (
      <>
        <Toaster position="top-center" />
        <Onboarding onDone={(p) => store.setProfile({ ...p, onboarded: true })} />
      </>
    );
  }

  const todayStr = new Date().toDateString();
  const todayContractions = entries
    .filter((e) => !e.deletedAt && e.type === "labour" && e.event === "Contraction" && new Date(e.createdAt).toDateString() === todayStr)
    .map((e) => ({ id: e.id, createdAt: e.createdAt }));

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <HomeHeader profile={profile} />

        <section className="px-4 pt-4 pb-8 space-y-3">
          <ActionCard label="Symptom" tone="peach" open={open === "symptom"} onToggle={() => toggle("symptom")}>
            <SymptomPanelBody />
          </ActionCard>
          <ActionCard label="Question for my team" tone="sage" open={open === "question"} onToggle={() => toggle("question")}>
            <QuestionPanelBody />
          </ActionCard>
          <ActionCard label="Appointment" tone="butter" open={open === "appointment"} onToggle={() => toggle("appointment")}>
            <AppointmentPanelBody />
          </ActionCard>
          <ActionCard label="Photo" tone="lilac" open={open === "photo"} onToggle={() => toggle("photo")}>
            <PhotoPanelBody />
          </ActionCard>
          <ActionCard label="Labour" tone="rose" open={open === "labour"} onToggle={() => toggle("labour")} badge={todayContractions.length}>
            <LabourPanelBody contractionsToday={todayContractions} />
          </ActionCard>
          <ActionCard label="Feeling" tone="lilac" open={open === "feeling"} onToggle={() => toggle("feeling")}>
            <FeelingPanelBody />
          </ActionCard>
          <ActionCard label="Note" tone="sage" open={open === "note"} onToggle={() => toggle("note")}>
            <NotePanelBody />
          </ActionCard>
          <ActionCard label="Concern" tone="primary" open={open === "concern"} onToggle={() => toggle("concern")}>
            <ConcernPanelBody />
          </ActionCard>

          <p className="text-center text-xs text-ink-soft pt-4 px-6 leading-relaxed">
            Today, {profile.babyNickname} is {formatGestation(gestationFromDueDate(profile.dueDateISO))}.
            <br />
            Your notes stay on this device unless you choose to share them.
          </p>
        </section>
      </AppShell>
    </>
  );
}
