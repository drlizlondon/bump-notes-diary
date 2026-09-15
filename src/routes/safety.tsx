import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { EducationSection } from "@/components/bumpnotes/EducationSection";

// The Education / Safety surface (spec EDUCATION-RED-FLAGS-SPEC.md). A STANDING
// reference area (AC-5) — never injected into the timeline or capture flow. It
// pulls in NO session and NO repository: the content is generic and identical
// for everyone, which is the non-device boundary. Do not add auth/data wiring.
export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "Safety · BumpNotes" }] }),
  component: SafetyPage,
});

function SafetyPage() {
  return (
    <AppShell>
      <PageHeader
        title="When to get further help"
        subtitle="General information about pregnancy warning signs."
      />
      <EducationSection />
    </AppShell>
  );
}
