import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { EducationSection } from "@/components/bumpnotes/EducationSection";
import { useAppSession } from "@/lib/data/session";
import { useTester } from "@/lib/bumpnotes/tester";

// Education — general pregnancy safety information (spec EDUCATION-RED-FLAGS-SPEC).
// A public information resource AND an in-app tab: it renders in the app shell
// for signed-in / tester users, and in the public shell for everyone else (so it
// can be linked from the homepage). Either way it shows the SAME generic content
// via EducationSection, which is fenced from the data layer (AC-1) — the shell
// choice never feeds the user's own record into the content.
export const Route = createFileRoute("/education")({
  head: () => ({ meta: [{ title: "Education · BumpNotes" }] }),
  component: EducationPage,
});

const TITLE = "When to get further help";
const SUBTITLE = "General information about pregnancy warning signs.";

function EducationPage() {
  const { userId } = useAppSession();
  const tester = useTester();
  const inApp = !!userId || tester;

  if (inApp) {
    return (
      <AppShell>
        <PageHeader title={TITLE} subtitle={SUBTITLE} />
        <EducationSection />
      </AppShell>
    );
  }

  return (
    <PublicShell>
      <div className="max-w-[760px] mx-auto">
        <div className="px-5 sm:px-8 pt-10 pb-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink text-balance">
            {TITLE}
          </h1>
          <p className="mt-2 text-ink-soft">{SUBTITLE}</p>
        </div>
        <div className="px-1 sm:px-4">
          <EducationSection />
        </div>
      </div>
    </PublicShell>
  );
}
