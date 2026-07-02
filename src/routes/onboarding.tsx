import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import { useTester } from "@/lib/bumpnotes/tester";
import { Onboarding } from "@/components/bumpnotes/Onboarding";
import type { Profile } from "@/lib/bumpnotes/types";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — BumpNotes" }] }),
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const navigate = useNavigate();
  const { profile } = useAppState();
  const { userId } = useSyncSnapshot();
  const tester = useTester();

  // If user already onboarded and authenticated/tester, send straight to dashboard.
  useEffect(() => {
    if (profile?.onboarded && (userId || tester)) navigate({ to: "/", replace: true });
  }, [profile, userId, tester, navigate]);

  useEffect(() => {
    if (!profile?.onboarded) trackEvent("onboarding_started");
  }, [profile?.onboarded]);

  function handleDone(p: Profile) {
    store.setProfile({ ...p, onboarded: true });
    trackEvent("onboarding_completed");
    if (tester || userId) {
      navigate({ to: "/", replace: true });
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      <Onboarding onDone={handleDone} />
    </>
  );
}
