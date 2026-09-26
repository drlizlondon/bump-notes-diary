import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { setAnalyticsConsent } from "@/lib/analytics";

const STORAGE_KEY = "bumpnotes.cookieConsent.v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!v) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  function savePreference(analytics: boolean) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accepted: true, analytics, at: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
    setAnalyticsConsent(analytics);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 print:hidden"
    >
      <div className="mx-auto max-w-[680px] rounded-2xl bg-white border border-border shadow-[0_8px_30px_rgba(36,27,28,0.08)] p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <p className="text-[12.5px] sm:text-[13px] text-ink-soft leading-snug flex-1">
            We use essential cookies to keep you signed in. Analytics stays off unless you allow it,
            and never sees your pregnancy record.{" "}
            <Link to="/privacy" className="text-primary underline whitespace-nowrap">
              Privacy Policy
            </Link>
          </p>
          <div className="flex shrink-0 gap-2 self-end sm:self-auto">
            <button
              onClick={() => savePreference(false)}
              className="px-4 py-2 rounded-full bg-white border border-border text-sm font-semibold text-ink"
            >
              Essential only
            </button>
            <button
              onClick={() => savePreference(true)}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Allow analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
