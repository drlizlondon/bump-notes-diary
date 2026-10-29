// BN-INVITE: "No code? Request access". Email only (no health details); requests
// with no code sent are deleted after 90 days. Lizzie sends codes herself.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { requestAccess } from "@/lib/bumpnotes/invite.functions";

export function RequestAccessForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const send = useServerFn(requestAccess);
  const [email, setEmail] = useState(defaultEmail);
  const [heardFrom, setHeardFrom] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await send({ data: { email, heardFrom, consent } });
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="space-y-2 text-center">
        <h2 className="font-serif text-lg font-semibold">Thank you</h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          We've got your request. When a place opens, we'll email your invite code to {email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">Request access</h2>
      <label htmlFor="ra-email" className="block text-sm font-medium">
        Email
      </label>
      <input
        id="ra-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base"
      />
      <label htmlFor="ra-heard" className="block text-sm font-medium">
        How did you hear about BumpNotes?{" "}
        <span className="text-ink-soft font-normal">(optional)</span>
      </label>
      <input
        id="ra-heard"
        value={heardFrom}
        onChange={(e) => setHeardFrom(e.target.value)}
        maxLength={200}
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base"
      />
      <label className="flex gap-2 items-start text-xs text-ink-soft leading-relaxed">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Email me an invite code when there's a place. We keep only your email for this, and delete
          it after 90 days if we haven't sent a code.{" "}
          <Link to="/privacy" className="underline">
            Privacy notice
          </Link>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Sending…" : "Request access"}
      </button>
    </form>
  );
}
