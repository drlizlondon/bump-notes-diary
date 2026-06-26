import { useState } from "react";
import { MessageCircleHeart, X } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback, type FeedbackCategory } from "@/lib/bumpnotes/feedback";

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: "improvement", label: "Suggest an improvement", emoji: "✨" },
  { value: "problem", label: "Report a problem", emoji: "🩹" },
  { value: "love", label: "Tell us what you love", emoji: "💛" },
  { value: "question", label: "Ask a question", emoji: "💬" },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [wantReply, setWantReply] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setCategory(null); setMessage(""); setReplyEmail(""); setWantReply(false);
  }

  async function send() {
    if (!category || !message.trim()) return;
    setBusy(true);
    try {
      await submitFeedback({
        category,
        message: message.trim(),
        replyEmail: wantReply ? replyEmail.trim() : undefined,
      });
      toast.success("Thanks — we read every message.");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed z-40 right-3 lg:right-6 bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6 size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center active:scale-95 transition print:hidden"
      >
        <MessageCircleHeart className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center px-3 py-4 sm:p-6" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] max-h-[90dvh] overflow-y-auto surface-card p-5 shadow-2xl"
            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold">Tell us what's on your mind</h3>
                <p className="text-xs text-ink-soft mt-1">Your message goes straight to the BumpNotes team.</p>
              </div>
              <button onClick={() => setOpen(false)} className="-mr-1 -mt-1 size-8 grid place-items-center text-ink-soft" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-3 rounded-2xl text-left text-sm border transition ${
                    category === c.value ? "border-primary bg-primary/10 text-ink" : "border-border bg-white text-ink hover:border-primary/40"
                  }`}
                >
                  <span className="mr-1.5">{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would you like to share?"
              rows={4}
              maxLength={5000}
              className="mt-3 w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none focus:outline-none focus:border-primary/60"
            />

            <label className="flex items-start gap-2 mt-3 text-sm cursor-pointer">
              <input type="checkbox" checked={wantReply} onChange={(e) => setWantReply(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
              <span>I'd like a reply</span>
            </label>
            {wantReply && (
              <input
                type="email"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                placeholder="Your email"
                className="mt-2 w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
              />
            )}

            <button
              disabled={!category || !message.trim() || busy}
              onClick={send}
              className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send to BumpNotes"}
            </button>
            <p className="text-[11px] text-ink-soft mt-3 leading-relaxed text-center">
              We attach your page, browser and a tester/account ID so we can help.
              No pregnancy details are sent unless you type them.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
