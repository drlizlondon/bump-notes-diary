import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

// A slim, honest beta strip across the public pages. Frames BumpNotes as an
// early-beta health product being tested carefully, and invites expectant
// parents, clinicians and charities to get in touch. Dismissible; the choice
// is remembered per-device. Shown on the marketing site only (PublicShell),
// never inside the authed app.
const DISMISS_KEY = "bumpnotes:betaBanner.dismissed.v1";

export function BetaBanner() {
  // Render visible by default so SSR and the first client paint match; hide
  // after mount if this device already dismissed it (avoids a hydration flash).
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    } catch {
      /* localStorage unavailable — keep the banner visible */
    }
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (hidden) return null;

  return (
    <div className="bg-blush-soft border-b border-border text-ink print:hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2 flex items-start gap-3 text-[12.5px] sm:text-[13px] leading-snug">
        <p className="flex-1 m-0">
          <span className="font-semibold">BumpNotes is in early beta.</span> We're building
          carefully and testing with a small group of women. If you're an expectant parent,
          clinician or charity who'd like to know more, we'd love to hear from you.{" "}
          <Link
            to="/contact"
            className="font-semibold text-primary underline underline-offset-2 whitespace-nowrap"
          >
            Get in touch →
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss beta notice"
          className="shrink-0 size-6 grid place-items-center rounded-full text-ink-soft hover:text-ink hover:bg-white/60"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
