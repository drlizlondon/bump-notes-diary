import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { submitTesterFeedback } from "@/lib/bumpnotes/tester-feedback.functions";
import { getTesterSessionId } from "@/lib/bumpnotes/tester";

type Yes = "yes" | "no";
type Mostly = "yes" | "mostly" | "no";
type YN = "yes" | "no";

type Stage = "intro" | "identity" | "route" | "done";
type Route = "yes_to_both" | "yes_to_either" | "no_to_both";

const YN_OPTS: { v: Yes; label: string }[] = [
  { v: "yes", label: "Yes" },
  { v: "no", label: "No" },
];

const MOSTLY: { v: Mostly; label: string }[] = [
  { v: "yes", label: "Yes" },
  { v: "mostly", label: "Mostly" },
  { v: "no", label: "No" },
];

export function TesterFeedbackModal({ onClose }: { onClose: () => void }) {
  const submit = useServerFn(submitTesterFeedback);

  const [stage, setStage] = useState<Stage>("intro");
  const [pregnancy, setPregnancy] = useState<Yes | null>(null);
  const [professional, setProfessional] = useState<Yes | null>(null);
  const [q1, setQ1] = useState<Mostly | null>(null);
  const [personalUse, setPersonalUse] = useState<YN | null>(null);
  const [personalWhy, setPersonalWhy] = useState("");
  const [proUse, setProUse] = useState<YN | null>(null);
  const [proWhy, setProWhy] = useState("");
  const [neitherWho, setNeitherWho] = useState("");
  const [improvement, setImprovement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const route: Route | null =
    pregnancy === "yes" && professional === "yes"
      ? "yes_to_both"
      : pregnancy === "yes" || professional === "yes"
        ? "yes_to_either"
        : pregnancy === "no" && professional === "no"
          ? "no_to_both"
          : null;

  const showPersonal = pregnancy === "yes";
  const showPro = professional === "yes";
  const showNeither = pregnancy === "no" && professional === "no";

  async function send() {
    if (!route || !pregnancy || !professional) return;
    const sessionId = getTesterSessionId();
    if (!sessionId) {
      setError("Your tester session has expired. Please re-enter your access code.");
      return;
    }
    setBusy(true);
    setError(null);

    // Pack the "why" reasoning and any extra notes into improvement_text.
    const parts: string[] = [];
    if (showPersonal) {
      parts.push(
        `Personal use: ${personalUse ?? "—"}${personalWhy.trim() ? ` — ${personalWhy.trim()}` : ""}`,
      );
    }
    if (showPro) {
      parts.push(`Professional use: ${proUse ?? "—"}${proWhy.trim() ? ` — ${proWhy.trim()}` : ""}`);
    }
    if (showNeither && neitherWho.trim()) {
      parts.push(`Who is it for: ${neitherWho.trim()}`);
    }
    if (improvement.trim()) {
      parts.push(`Improve / add / change: ${improvement.trim()}`);
    }

    try {
      await submit({
        data: {
          sessionId,
          pregnancyIdentity: pregnancy,
          professionalIdentity: professional,
          feedbackRoute: route,
          q1,
          // Reuse legacy fields: q2 = personal yes/no, q3 = professional yes/no.
          q2: personalUse ? (personalUse === "yes" ? "yes" : "no") : null,
          q3: proUse ? (proUse === "yes" ? "yes" : "no") : null,
          improvementText: parts.join("\n\n"),
        },
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const canContinueFromIdentity = pregnancy !== null && professional !== null;
  const canSubmit =
    q1 !== null && (!showPersonal || personalUse !== null) && (!showPro || proUse !== null);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] max-h-[92dvh] overflow-y-auto surface-card p-5 sm:p-6 shadow-2xl"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="size-4" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold">
              Tester feedback
            </span>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 size-8 grid place-items-center text-ink-soft"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {stage === "intro" && (
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold leading-snug">
              Thank you so much for trying BumpNotes.
            </h3>
            <div className="mt-3 text-sm text-ink-soft leading-relaxed space-y-3">
              <p>
                This is just for people helping me test the early version. Please be honest, I'm
                trying to understand whether it feels clear, easy to use and genuinely useful.
              </p>
              <p>It should only take a minute.</p>
            </div>
            <button
              onClick={() => setStage("identity")}
              className="mt-5 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Start
            </button>
          </div>
        )}

        {stage === "identity" && (
          <div>
            <h3 className="font-serif text-lg font-semibold">A quick bit about you</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Two short questions so the rest can be tailored.
            </p>

            <ChoiceQuestion
              label="Have you ever been pregnant, are you currently pregnant, or are you planning a pregnancy?"
              value={pregnancy}
              options={YN_OPTS}
              onChange={setPregnancy}
            />
            <ChoiceQuestion
              label="Are you a clinician or professional who works with pregnant people, such as a GP, midwife, doula, or other support role?"
              value={professional}
              options={YN_OPTS}
              onChange={setProfessional}
            />

            <button
              disabled={!canContinueFromIdentity}
              onClick={() => setStage("route")}
              className="mt-5 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {stage === "route" && route && (
          <div>
            <RouteIntro route={route} />

            <ChoiceQuestion
              label="Was BumpNotes easy to understand and use?"
              value={q1}
              options={MOSTLY}
              onChange={setQ1}
            />

            {showPersonal && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-primary">
                  As someone close to pregnancy
                </p>
                <ChoiceQuestion
                  label="Would you use BumpNotes yourself?"
                  value={personalUse}
                  options={YN_OPTS}
                  onChange={setPersonalUse}
                />
                <TextField
                  label="Why? / Why not?"
                  value={personalWhy}
                  onChange={setPersonalWhy}
                  placeholder="A sentence or two is plenty."
                />
              </div>
            )}

            {showPro && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-primary">
                  As a professional
                </p>
                <ChoiceQuestion
                  label="Would you recommend BumpNotes to someone you support?"
                  value={proUse}
                  options={YN_OPTS}
                  onChange={setProUse}
                />
                <TextField
                  label="Why? / Why not?"
                  value={proWhy}
                  onChange={setProWhy}
                  placeholder="What would help or get in the way?"
                />
              </div>
            )}

            {showNeither && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <TextField
                  label="Can you imagine who BumpNotes would be useful for?"
                  value={neitherWho}
                  onChange={setNeitherWho}
                  placeholder="Optional — anyone who comes to mind."
                />
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-border/60">
              <TextField
                label="What would you improve, add or change?"
                value={improvement}
                onChange={setImprovement}
                placeholder="Optional — anything that comes to mind."
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-coral leading-relaxed" role="alert">
                {error}
              </p>
            )}

            <button
              disabled={!canSubmit || busy}
              onClick={send}
              className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send feedback"}
            </button>
          </div>
        )}

        {stage === "done" && (
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold leading-snug">
              Thank you so much, I really appreciate you taking the time to do this.
            </h3>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed">
              If anything else comes to mind afterwards, please feel free to message me directly or
              send over any extra thoughts. Even small bits of feedback are really helpful.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Back to BumpNotes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceQuestion<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-[13.5px] font-semibold text-ink leading-snug">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-ink hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="block text-[13px] font-semibold text-ink mb-1.5">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none focus:outline-none focus:border-primary/60"
      />
    </label>
  );
}

function RouteIntro({ route }: { route: Route }) {
  if (route === "yes_to_both") {
    return (
      <p className="text-sm text-ink-soft leading-relaxed">
        Thank you, this is especially helpful because you can look at BumpNotes from both sides.
        There are a couple of questions for each perspective below.
      </p>
    );
  }
  if (route === "yes_to_either") {
    return (
      <p className="text-sm text-ink-soft leading-relaxed">
        Thank you, your feedback is really helpful because BumpNotes is designed for people who are
        close to pregnancy in some way.
      </p>
    );
  }
  return (
    <p className="text-sm text-ink-soft leading-relaxed">
      Thank you, this is still really helpful. Even if BumpNotes isn't directly relevant to you, I'd
      love to know whether it makes sense and feels easy to use.
    </p>
  );
}
