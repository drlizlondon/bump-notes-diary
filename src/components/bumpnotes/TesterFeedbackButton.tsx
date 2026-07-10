import { useEffect, useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { useTester } from "@/lib/bumpnotes/tester";
import { TesterFeedbackModal } from "./TesterFeedbackModal";

const SAGE = "#5F8A6F";
const SAGE_DARK = "#2F5F47";
const SAGE_PALE = "#EEF7F1";
const SAGE_BORDER = "#C9E2D0";

const PULSED_KEY = "bumpnotes:tester_feedback_clicked";

/**
 * "Give feedback when you're ready" — tester-only, sage-accented.
 * Variants:
 *   - "block"    : inline card at bottom of pages
 *   - "inline"   : pill used inside the home dashboard
 *   - "floating" : fixed FAB visible across the app for testers
 */
export function TesterFeedbackButton({
  variant = "block",
}: {
  variant?: "block" | "inline" | "floating";
}) {
  const tester = useTester();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (variant !== "floating" || !tester) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(PULSED_KEY) === "1") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    setPulse(true);
  }, [variant, tester]);

  function handleOpen() {
    setOpen(true);
    setPulse(false);
    try {
      window.localStorage.setItem(PULSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!tester) return null;

  const label = "Give feedback when you're ready";

  if (variant === "floating") {
    return (
      <>
        <style>{`
          @keyframes bn-sage-pulse {
            0%, 100% { box-shadow: 0 8px 24px -10px rgba(47,95,71,0.35), 0 0 0 0 rgba(95,138,111,0.45); }
            50% { box-shadow: 0 8px 24px -10px rgba(47,95,71,0.35), 0 0 0 12px rgba(95,138,111,0); }
          }
          .bn-feedback-pulse { animation: bn-sage-pulse 2.4s ease-out 1s 2; }
          @media (prefers-reduced-motion: reduce) { .bn-feedback-pulse { animation: none; } }
        `}</style>
        <button
          onClick={handleOpen}
          aria-label="Share feedback"
          className={`fixed z-40 right-3 lg:right-6 bottom-[calc(env(safe-area-inset-bottom)+76px)] lg:bottom-6 inline-flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg active:scale-95 transition print:hidden ${pulse ? "bn-feedback-pulse" : ""}`}
          style={{ backgroundColor: SAGE }}
        >
          <MessageSquareHeart className="size-4" />
          <span className="hidden xs:inline sm:inline">Feedback</span>
        </button>
        {open && <TesterFeedbackModal onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      {variant === "inline" ? (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-sm active:scale-[0.98] transition"
          style={{ backgroundColor: SAGE }}
        >
          <MessageSquareHeart className="size-4" /> {label}
        </button>
      ) : (
        <div className="mt-8 px-4 md:px-0 print:hidden">
          <button
            onClick={handleOpen}
            className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-2xl border shadow-[0_2px_10px_-6px_rgba(47,95,71,0.25)] active:scale-[0.99] transition"
            style={{ backgroundColor: SAGE_PALE, borderColor: SAGE_BORDER }}
          >
            <span
              className="size-11 shrink-0 rounded-2xl grid place-items-center"
              style={{
                backgroundColor: "#fff",
                color: SAGE_DARK,
                border: `1px solid ${SAGE_BORDER}`,
              }}
            >
              <MessageSquareHeart className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-bold text-[15px]" style={{ color: SAGE_DARK }}>
                {label}
              </span>
              <span
                className="block text-[12.5px] mt-0.5"
                style={{ color: SAGE_DARK, opacity: 0.75 }}
              >
                A minute of honest thoughts helps a lot.
              </span>
            </span>
            <span className="text-lg" style={{ color: SAGE_DARK }}>
              ›
            </span>
          </button>
        </div>
      )}
      {open && <TesterFeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
