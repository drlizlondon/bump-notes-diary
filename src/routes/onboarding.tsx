import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useTester, isTester } from "@/lib/bumpnotes/tester";
import { Onboarding } from "@/components/bumpnotes/Onboarding";
import { useAppSession } from "@/lib/data/session";
import type { Profile } from "@/lib/bumpnotes/types";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { AppRepository } from "@/lib/data/capture";
import { useActivePregnancy, useCreatePregnancy, useUpsertProfile } from "@/lib/data/hooks";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — BumpNotes" }] }),
  component: OnboardingRoute,
});

// V2: onboarding writes to the repository, which needs an authorized session
// (tester on-device, or signed-in). Anon visitors sign up first (identity flow).
function OnboardingRoute() {
  const navigate = useNavigate();
  const { userId } = useAppSession();
  const tester = useTester();
  const authorized = !!userId || tester;

  useEffect(() => {
    const authed = !!userId || isTester();
    // Signed-out -> the sign-in front door (native or Supabase per the flag).
    // NOT /auth, whose own "not onboarded -> /onboarding" redirect would loop.
    if (!authed) navigate({ to: "/signin", replace: true });
  }, [userId, navigate]);

  useEffect(() => {
    trackEvent("onboarding_started");
  }, []);

  if (!authorized) return null;

  return (
    <AppRepository>
      <OnboardingInner />
    </AppRepository>
  );
}

function OnboardingInner() {
  const navigate = useNavigate();
  const { data: pregnancy, isLoading } = useActivePregnancy();
  const upsertProfile = useUpsertProfile();
  const createPregnancy = useCreatePregnancy();

  // Already has an active pregnancy -> straight to the dashboard.
  useEffect(() => {
    if (!isLoading && pregnancy) navigate({ to: "/", replace: true });
  }, [isLoading, pregnancy, navigate]);

  // D3: split the old single "profile" into a Profile (identity) + an active
  // Pregnancy (the due date + nickname). displayName <- userName; the due date
  // and nickname live on the pregnancy.
  async function handleDone(p: Profile) {
    await upsertProfile.mutateAsync({ displayName: p.userName || null });
    await createPregnancy.mutateAsync({
      edd: p.dueDateISO.slice(0, 10),
      nickname: p.babyNickname ? p.babyNickname : null,
    });
    trackEvent("onboarding_completed");
    navigate({ to: "/", replace: true });
  }

  if (isLoading || pregnancy) return null;

  return (
    <>
      <Toaster position="top-center" />
      <Onboarding
        onDone={(p) => {
          void handleDone(p);
        }}
      />
    </>
  );
}
