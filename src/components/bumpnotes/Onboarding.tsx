import { useState } from "react";
import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatGestation } from "@/lib/bumpnotes/gestation";
import { useT, setLang, useLang, type Lang } from "@/lib/bumpnotes/i18n";

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState("");
  const [babyNickname, setBabyNickname] = useState("");
  const [dueDateISO, setDueDateISO] = useState("");
  const t = useT();
  const lang = useLang();

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
              <h1 className="font-serif text-4xl font-semibold">{t("onb.welcome.title")}</h1>
              <p className="mt-3 text-ink-soft text-base leading-relaxed text-balance">
                {t("onb.welcome.subtitle")}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <label className="sr-only" htmlFor="lang-select">{t("lang.select")}</label>
              <div className="relative">
                <select
                  id="lang-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="appearance-none bg-transparent border border-border rounded-full pl-4 pr-9 py-2 text-sm font-medium focus:outline-none focus:border-primary/60"
                >
                  <option value="en">{t("lang.english")}</option>
                  <option value="tr">{t("lang.turkish")}</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft text-xs">▼</span>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="mt-2 w-full max-w-[360px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold"
            >
              {t("onb.welcome.cta")}
            </button>
          </div>
        )}

        {step === 1 && (
          <Step
            title={t("onb.name.title")}
            value={userName}
            onChange={setUserName}
            placeholder={t("onb.name.placeholder")}
            onNext={() => setStep(2)}
            disabled={!userName.trim()}
            cta={t("common.continue")}
          />
        )}

        {step === 2 && (
          <Step
            title={t("onb.baby.title")}
            subtitle={t("onb.baby.subtitle")}
            value={babyNickname}
            onChange={setBabyNickname}
            placeholder={t("onb.baby.placeholder")}
            onNext={() => setStep(3)}
            disabled={!babyNickname.trim()}
            cta={t("common.continue")}
          />
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold">{t("onb.due.title")}</h2>
              <p className="mt-2 text-ink-soft text-sm">{t("onb.due.subtitle")}</p>
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
                  {t("onb.due.today", { name: babyNickname || "Baby", gest: formatGestation(gest) })}
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
              className="mt-auto w-full max-w-[360px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {t("onb.finish")}
            </button>
          </div>
        )}

        {step > 0 && step < 3 && (
          <button onClick={() => setStep(step - 1)} className="mt-6 text-sm text-ink-soft self-center">
            {t("common.back")}
          </button>
        )}
      </div>
    </div>
  );
}

function Step({
  title, subtitle, value, onChange, placeholder, onNext, disabled, cta,
}: {
  title: string; subtitle?: string; value: string; onChange: (s: string) => void;
  placeholder: string; onNext: () => void; disabled: boolean; cta: string;
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
        className="mt-auto w-full max-w-[360px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {cta}
      </button>
    </div>
  );
}
