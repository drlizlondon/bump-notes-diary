import { useState } from "react";
import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatGestation, formatUKDateLong } from "@/lib/bumpnotes/gestation";
import { useT, setLang, useLang, type Lang } from "@/lib/bumpnotes/i18n";

function formatDateDisplay(iso: string) {
  try { return formatUKDateLong(iso); } catch { return iso; }
}

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState("");
  const [babyNickname, setBabyNickname] = useState("");
  const [babyBlank, setBabyBlank] = useState(false);
  const [dueDateISO, setDueDateISO] = useState("");
  const t = useT();
  const lang = useLang();

  const babyOk = babyBlank || babyNickname.trim().length > 0;
  const canFinish = userName && babyOk && dueDateISO;

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
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-balance">{t("onb.baby.title")}</h2>
              <p className="mt-2 text-ink-soft text-sm">{t("onb.baby.subtitle")}</p>
            </div>
            <input
              autoFocus
              value={babyNickname}
              onChange={(e) => { setBabyNickname(e.target.value); if (e.target.value) setBabyBlank(false); }}
              placeholder={t("onb.baby.placeholder")}
              disabled={babyBlank}
              className="w-full px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base disabled:opacity-50"
            />
            <label className="flex items-start gap-3 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={babyBlank}
                onChange={(e) => { setBabyBlank(e.target.checked); if (e.target.checked) setBabyNickname(""); }}
                className="size-5 mt-0.5 accent-[var(--primary)] shrink-0"
              />
              <span>
                <span className="block text-sm font-medium">{t("onb.baby.blank")}</span>
                <span className="block text-xs text-ink-soft mt-1 leading-relaxed">{t("onb.baby.blankHelp")}</span>
              </span>
            </label>
            <button
              onClick={() => babyOk && setStep(3)}
              disabled={!babyOk}
              className="mt-auto w-full max-w-[360px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {t("common.continue")}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold">{t("onb.due.title")}</h2>
              <p className="mt-2 text-ink-soft text-sm">{t("onb.due.subtitle")}</p>
            </div>
            <div className="relative w-full">
              <div
                className={`block w-full min-h-[64px] px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base flex items-center ${dueDateISO ? "text-ink" : "text-ink-soft"}`}
                aria-hidden="true"
              >
                {dueDateISO ? formatDateDisplay(dueDateISO) : t("onb.due.tap")}
              </div>
              <input
                type="date"
                value={dueDateISO}
                onChange={(e) => setDueDateISO(e.target.value)}
                aria-label={t("onb.due.title")}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ WebkitAppearance: "none", touchAction: "manipulation" }}
              />
            </div>
            {gest && (
              <div className="rounded-2xl bg-peach-soft p-4 ring-1 ring-peach/30">
                <p className="text-sm leading-relaxed">
                  {t("onb.due.today", { name: babyNickname.trim() || t("baby.fallback"), gest: formatGestation(gest) })}
                </p>
              </div>
            )}
            <button
              onClick={() => canFinish && onDone({
                userName: userName.trim(),
                babyNickname: babyBlank ? "" : babyNickname.trim(),
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
