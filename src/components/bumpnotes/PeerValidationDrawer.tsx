import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Send, X } from "lucide-react";
import { submitFeedback } from "@/lib/bumpnotes/feedback";

const PERSPECTIVES = [
  { id: "clinician", label: "🩺 Clinician / Midwife" },
  { id: "healthtech", label: "💻 Healthtech" },
  { id: "parent", label: "🤰 Parent / Partner" },
  { id: "founder", label: "💡 Founder / Investor" },
  { id: "curious", label: "👀 Curious Visitor" },
] as const;

type PerspectiveId = (typeof PERSPECTIVES)[number]["id"];

const STORAGE_KEY = "bumpnotes_peer_val_dismissed";

export function PeerValidationDrawer() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [perspective, setPerspective] = useState<PerspectiveId | null>(null);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in this session
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "true") return;
    } catch {
      // sessionStorage unavailable
    }

    // Trigger after 8 seconds
    const timer = setTimeout(() => {
      setOpen(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // sessionStorage unavailable
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setBusy(true);
    try {
      const selectedRole =
        PERSPECTIVES.find((p) => p.id === perspective)?.label || "Not specified";
      const fullMessage = `[Perspective: ${selectedRole}]\n\n${message.trim()}`;

      await submitFeedback({
        category: "question",
        message: fullMessage,
        replyEmail: contact.trim() || undefined,
      });

      setSubmitted(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // sessionStorage unavailable
      }

      setTimeout(() => {
        setOpen(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Peer feedback"
      className="fixed z-50 bottom-0 inset-x-0 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-[430px] p-3 sm:p-0 print:hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="w-full rounded-2xl border border-border bg-white p-5 shadow-2xl">
        {/* Top header with dismiss ✕ */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <h3 className="font-serif text-base sm:text-[17px] font-semibold text-ink">
              What's your take on BumpNotes?
            </h3>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss feedback form"
            className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-full text-ink-soft hover:bg-muted hover:text-ink transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="size-8 text-green-600 mx-auto" />
            <p className="font-medium text-ink text-sm">Thank you for your feedback!</p>
            <p className="text-xs text-ink-soft">
              Dr Lizzie and the team really appreciate your perspective.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
            <p className="text-xs text-ink-soft leading-relaxed">
              We're sharing BumpNotes early with healthtech peers, clinicians, and parents to validate
              the concept. What's your immediate reaction or experience?
            </p>

            {/* Comment / Story Textarea first */}
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your thoughts, questions, or a pregnancy appointment story you've observed..."
                rows={3}
                required
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:bg-white focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Qualification Pills */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Which describes your perspective?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PERSPECTIVES.map((p) => {
                  const selected = perspective === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPerspective(selected ? null : p.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-muted/40 text-ink-soft border-border hover:border-ink-soft/40 hover:text-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Contact Details */}
            <div>
              <label className="block text-[11px] text-ink-soft mb-1">
                Email or LinkedIn{" "}
                <span className="text-ink-soft/70">(optional, if you'd like a reply)</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="name@example.com / linkedin.com/in/..."
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-ink-soft hover:text-ink px-3 py-2"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={busy || !message.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? "Sending..." : "Send Feedback"}
                <Send className="size-3" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
