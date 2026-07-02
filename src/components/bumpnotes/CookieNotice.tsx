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
    } catch { /* ignore */ }
  }, []);

  function savePreference(analytics: boolean) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, analytics, at: new Date().toISOString() })); } catch { /* ignore */ }
    setAnalyticsConsent(analytics);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 print:hidden"
    >
      <div className="mx-auto max-w-[680px] rounded-2xl bg-white border border-border shadow-[0_8px_30px_rgba(36,27,28,0.08)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm text-ink flex-1">
            <p className="font-medium">We use essential cookies</p>
            <p className="text-ink-soft text-[13px] mt-1 leading-relaxed">
              BumpNotes uses essential cookies and local storage to keep you signed in and to remember your pregnancy record on your device. With your permission, we use privacy-safe analytics to understand which pages and buttons are used, without sending names, notes, symptoms, health details or account data. See our{" "}
              <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 self-end sm:self-auto">
            <button
              onClick={() => savePreference(false)}
              className="px-4 py-2.5 rounded-full bg-white border border-border text-sm font-semibold text-ink"
            >
              Essential only
            </button>
            <button
              onClick={() => savePreference(true)}
              className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Allow analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
