import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatGestation } from "@/lib/bumpnotes/gestation";
import { useT } from "@/lib/bumpnotes/i18n";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [babyNickname, setBabyNickname] = useState("");
  const [babyBlank, setBabyBlank] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const t = useT();

  const dueDateISO = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).toISOString() : "";
  const babyOk = babyBlank || babyNickname.trim().length > 0;
  const canFinish = userName && babyOk && dueDateISO;

  const gest = dueDateISO ? gestationFromDueDate(dueDateISO) : null;

  return (
    <div className="app-shell flex flex-col bg-background">
      <div className="flex-1 flex flex-col px-6 pt-10 pb-10">



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
              className="mt-auto w-full max-w-[320px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
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

            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full min-h-[64px] px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base flex items-center justify-between text-left",
                    !dueDate && "text-ink-soft",
                  )}
                >
                  <span>{dueDate ? format(dueDate, "dd/MM/yyyy") : t("onb.due.tap")}</span>
                  <CalendarIcon className="size-5 text-ink-soft shrink-0 ml-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => { setDueDate(d ?? undefined); if (d) setDatePickerOpen(false); }}
                  initialFocus
                  weekStartsOn={1}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {gest && (
              <div className="rounded-2xl bg-blush-soft p-4 ring-1 ring-coral/15">
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
              className="mt-auto w-full max-w-[320px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {t("onb.finish")}
            </button>
          </div>
        )}

        {step > 0 && step < 4 && (
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
        onKeyDown={(e) => { if (e.key === "Enter" && !disabled) onNext(); }}
        className="w-full px-5 py-4 rounded-2xl bg-white ring-1 ring-black/10 text-base"
      />
      <button
        onClick={onNext}
        disabled={disabled}
        className="mt-auto w-full max-w-[320px] mx-auto py-4 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        {cta}
      </button>
    </div>
  );
}
