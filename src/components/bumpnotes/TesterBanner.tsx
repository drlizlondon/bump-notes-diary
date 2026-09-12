import { useState } from "react";
import { FlaskConical, MessageSquareHeart, X } from "lucide-react";
import { toast } from "sonner";
import { exitTesterMode, useTester } from "@/lib/bumpnotes/tester";
import { store } from "@/lib/bumpnotes/store";
import { TesterFeedbackModal } from "./TesterFeedbackModal";

export function TesterBanner() {
  const tester = useTester();
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  if (!tester) return null;

  function reset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    store.clearAll();
    toast.success("Tester workspace reset.");
    setConfirmReset(false);
  }
  function exit() {
    store.clearAll();
    exitTesterMode();
    if (typeof window !== "undefined") window.location.href = "/welcome";
  }

  return (
    <>
      <div className="sticky top-0 z-30 bg-butter-soft border-b border-butter/50 print:hidden">
        <div className="max-w-[1200px] mx-auto px-3 py-2 flex flex-wrap items-center gap-2 text-[12px]">
          <FlaskConical className="size-4 shrink-0" />
          <span className="font-semibold">Tester mode.</span>
          <span className="text-ink-soft hidden sm:inline">
            Explore BumpNotes. When you're ready, complete the tester feedback.
          </span>
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="px-2.5 py-1 rounded-full bg-[#5F8A6F] text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
            >
              <MessageSquareHeart className="size-3" /> Give feedback
            </button>
            <button
              onClick={reset}
              className="px-2.5 py-1 rounded-full bg-white border border-border text-[11px] font-medium"
            >
              {confirmReset ? "Tap to confirm" : "Reset"}
            </button>
            <button
              onClick={exit}
              className="px-2.5 py-1 rounded-full bg-white border border-border text-[11px] font-medium inline-flex items-center gap-1"
            >
              <X className="size-3" /> Exit
            </button>
          </div>
        </div>
      </div>
      {feedbackOpen && <TesterFeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
