import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { verifyTesterPassword } from "@/lib/bumpnotes/tester-auth.functions";
import { enterTesterMode } from "@/lib/bumpnotes/tester";

export function TesterPasswordModal({ onClose }: { onClose: () => void }) {
  const verify = useServerFn(verifyTesterPassword);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"password" | "welcome">("password");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    try {
      const res = await verify({ data: { password } });
      if (res.ok) {
        setStage("welcome");
      } else if (res.reason === "disabled") {
        toast.error("Tester mode is not available right now.");
      } else {
        toast.error("That password didn't work. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function enter() {
    enterTesterMode();
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
            <FlaskConical className="size-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Tester access</span>
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 size-8 grid place-items-center text-ink-soft" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {stage === "password" ? (
          <form onSubmit={submit}>
            <h3 className="font-serif text-xl font-semibold">Enter your tester password</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              Tester access is invitation only. Enter the password we shared with you to enter the sandbox.
            </p>
            <input
              type="password"
              autoFocus
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tester password"
              className="mt-4 w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={busy || !password.trim()}
              className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Checking…" : "Enter tester mode"}
            </button>
          </form>
        ) : (
          <div>
            <h3 className="font-serif text-xl font-semibold">You're in. Thank you for testing 💛</h3>
            <div className="mt-3 text-sm text-ink-soft leading-relaxed space-y-3">
              <p><strong className="text-ink">Please use fake data only.</strong> Don't enter real pregnancy information — this is a sandbox shared for testing.</p>
              <p>Explore the app, tap around, and tell us about anything that feels confusing, broken or missing.</p>
              <p>There's a small feedback button in the corner of every screen.</p>
              <p>Thank you so much for helping shape BumpNotes.</p>
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
