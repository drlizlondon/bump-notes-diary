import { useState } from "react";
import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatGestation } from "@/lib/bumpnotes/gestation";

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState("");
  const [babyNickname, setBabyNickname] = useState("");
  const [dueDateISO, setDueDateISO] = useState("");

  const canFinish = userName && babyNickname && dueDateISO;
  const gest = dueDateISO ? gestationFromDueDate(dueDateISO) : null;

  return (
    <div className="app-shell flex flex-col bg-cream">
      <div className="flex-1 flex flex-col px-6 pt-16 pb-10">
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center text-center justify-center gap-6">
            <div className="size-24 rounded-full bg-gradient-to-br from-peach via-butter to-rose grid place-items-center shadow-lg shadow-peach/40">
              <span className="font-serif text-4xl text-white">b</span>
            </div>
            <div>
              <h1 className="font-serif text-4xl font-semibold">Welcome to BumpNotes</h1>
              <p className="mt-3 text-ink-soft text-base leading-relaxed text-balance">
                A simple place to record your pregnancy, your way.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-4 w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold"
            >
              Get started
            </button>
          </div>
        )}

        {step === 1 && (
          <Step
            title="What should we call you?"
            value={userName}
            onChange={setUserName}
            placeholder="Your name"
            onNext={() => setStep(2)}
            disabled={!userName.trim()}
          />
        )}

        {step === 2 && (
          <Step
            title="What would you like to call your baby for now?"
            subtitle="You can use Baby, a nickname, or their name if you know it."
            value={babyNickname}
            onChange={setBabyNickname}
            placeholder="Baby, Peanut, Nugget, Pearl, Diamond"
            onNext={() => setStep(3)}
            disabled={!babyNickname.trim()}
          />
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold">What is your estimated due date?</h2>
              <p className="mt-2 text-ink-soft text-sm">You can change this later in Pregnancy Details.</p>
            </div>
            <input
              type="date"
              value={dueDateISO}
              onChange={(e) => setDueDateISO(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base"
            />
            {gest && (
              <div className="rounded-2xl bg-peach-soft p-4 ring-1 ring-peach/30">
                <p className="text-sm leading-relaxed">
                  Today, <span className="font-semibold">{babyNickname || "Baby"}</span> is{" "}
                  <span className="font-semibold text-primary">{formatGestation(gest)}</span>.
                </p>
              </div>
            )}
            <button
              onClick={() => canFinish && onDone({
                userName: userName.trim(),
                babyNickname: babyNickname.trim(),
                dueDateISO,
                onboarded: true,
              })}
              disabled={!canFinish}
              className="mt-auto w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              Open BumpNotes
            </button>
          </div>
        )}

        {step > 0 && step < 3 && (
          <button onClick={() => setStep(step - 1)} className="mt-6 text-sm text-ink-soft self-center">
            Back
          </button>
        )}
      </div>
    </div>
  );
}

function Step({
  title, subtitle, value, onChange, placeholder, onNext, disabled,
}: {
  title: string; subtitle?: string; value: string; onChange: (s: string) => void;
  placeholder: string; onNext: () => void; disabled: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-balance">{title}</h2>
        {subtitle && <p className="mt-2 text-ink-soft text-sm">{subtitle}</p>}
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base"
      />
      <button
        onClick={onNext}
        disabled={disabled}
        className="mt-auto w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}
