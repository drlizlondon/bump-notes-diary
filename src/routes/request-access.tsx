// BN-INVITE: the public "Request access" page (linked from sign-in), for visitors
// without an invite code. Founder 2026-10-29.
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoWordmark } from "@/components/bumpnotes/Logo";
import { RequestAccessForm } from "@/components/bumpnotes/RequestAccessForm";

export const Route = createFileRoute("/request-access")({
  head: () => ({ meta: [{ title: "Request access · BumpNotes" }] }),
  component: RequestAccessPage,
});

function RequestAccessPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <Link to="/welcome" className="inline-flex items-center justify-center">
            <LogoWordmark className="h-16 w-auto" />
          </Link>
          <p className="text-sm text-ink-soft mt-3 text-balance leading-relaxed">
            BumpNotes is invite-only while we're in beta. Leave your email and we'll send you a code
            when a place opens.
          </p>
        </div>
        <div className="surface-card p-5">
          <RequestAccessForm />
        </div>
        <p className="text-center text-xs">
          <Link to="/signin" className="text-ink-soft">
            Already have a code? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
