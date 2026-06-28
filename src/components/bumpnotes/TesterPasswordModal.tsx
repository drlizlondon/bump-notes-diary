import { useState } from "react";
import { FlaskConical, X, Eye, EyeOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { verifyTesterCode } from "@/lib/bumpnotes/tester-feedback.functions";
import { enterTesterMode } from "@/lib/bumpnotes/tester";

export function TesterPasswordModal({ onClose }: { onClose: () => void }) {
  const verify = useServerFn(verifyTesterCode);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [reveal, setReveal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"code" | "welcome">("code");
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const res = await verify({ data: { code: trimmed, userAgent: ua } });
      if (res.ok) {
        setSessionId(res.sessionId);
        setStage("welcome");
      } else if (res.reason === "inactive") {
        setError("That code has been turned off. Get in contact with Lizzie.");
      } else {
        setError("That code didn't work. Get in contact with Lizzie.");
      }
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function enter() {
    enterTesterMode(sessionId);
    onClose();
    navigate({ to: "/onboarding" });
  }


  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[90dvh] overflow-y-auto surface-card p-5 sm:p-6 shadow-2xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="size-4" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold">Tester Mode</span>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 size-8 grid place-items-center text-ink-soft" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {stage === "code" ? (
          <form onSubmit={submit}>
            <h3 className="font-serif text-lg sm:text-xl font-semibold">Enter your access code</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              Tester access is invitation only. Pop in the code we shared with you.
            </p>

            <label className="mt-4 block">
              <span className="sr-only">Access code</span>
              <div className="relative">
                <input
                  type={reveal ? "text" : "password"}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  inputMode="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); if (error) setError(null); }}
                  placeholder="Access code"
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-border text-sm tracking-wide focus:outline-none focus:border-primary/60"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? "Hide access code" : "Show access code"}
                  className="absolute inset-y-0 right-0 px-3 grid place-items-center text-ink-soft"
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="mt-3 text-sm text-coral leading-relaxed" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Checking…" : "Enter Tester Mode"}
            </button>
          </form>
        ) : (
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold">You're in. Thank you for testing 💛</h3>
            <div className="mt-3 text-sm text-ink-soft leading-relaxed space-y-3">
              <p><strong className="text-ink">Please use fake data only.</strong> Don't enter real pregnancy information — this is a sandbox shared for testing.</p>
              <p>Explore the app, tap around, and tell us about anything that feels confusing, broken or missing.</p>
              <p>There's a small feedback button in the corner of every screen.</p>
            </div>
            <button
              onClick={enter}
              className="mt-5 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Start exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
