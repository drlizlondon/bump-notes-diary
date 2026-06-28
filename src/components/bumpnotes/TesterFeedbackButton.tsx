import { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { useTester } from "@/lib/bumpnotes/tester";
import { TesterFeedbackModal } from "./TesterFeedbackModal";

/**
 * "Give feedback when you're ready" button — only renders for testers.
 * Variants:
 *   - "block"  : full-width card-style button used at the bottom of pages
 *   - "inline" : compact pill used inside the home dashboard
 */
export function TesterFeedbackButton({ variant = "block" }: { variant?: "block" | "inline" }) {
  const tester = useTester();
  const [open, setOpen] = useState(false);
  if (!tester) return null;

  const label = "Give feedback when you're ready";

  return (
    <>
      {variant === "inline" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 active:scale-[0.98] transition"
        >
          <MessageSquareHeart className="size-4" /> {label}
        </button>
      ) : (
        <div className="mt-8 px-4 md:px-0 print:hidden">
          <button
            onClick={() => setOpen(true)}
            className="w-full surface-card flex items-center gap-3 px-4 py-4 text-left active:scale-[0.99] transition"
          >
            <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-blush-soft text-primary">
              <MessageSquareHeart className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-[15px] text-ink">{label}</span>
              <span className="block text-[12.5px] text-ink-soft mt-0.5">A minute of honest thoughts helps a lot.</span>
            </span>
            <span className="text-ink-soft text-lg">›</span>
          </button>
        </div>
      )}
      {open && <TesterFeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
