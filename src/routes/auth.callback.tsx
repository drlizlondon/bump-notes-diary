import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Search = { next?: string };

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in · BumpNotes" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthCallbackPage,
});

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" }) as Search;
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const next = safeNext(search.next);
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error_description") || params.get("error");
      if (error) {
        setMessage(error);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setMessage(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setMessage(sessionError.message);
        return;
      }

      if (!data.session) {
        setMessage("We could not finish signing you in. Please try signing in again.");
        return;
      }

      if (!cancelled) navigate({ to: next, replace: true });
    }

    void finishSignIn();
    return () => { cancelled = true; };
  }, [navigate, search.next]);

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-background px-5">
      <p className="text-sm text-ink-soft text-center">{message}</p>
    </div>
  );
}
