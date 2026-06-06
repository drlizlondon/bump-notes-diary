import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatUKDateLong } from "@/lib/bumpnotes/gestation";
import { useT } from "@/lib/bumpnotes/i18n";

export function HomeHeader({ profile }: { profile: Profile }) {
  const g = gestationFromDueDate(profile.dueDateISO);
  const t = useT();
  return (
    <header className="px-4 lg:px-0 pt-6 lg:pt-2 pb-2">
      <div className="surface-card p-5 lg:p-6 blush-bg">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">
          {profile.userName} &amp; {profile.babyNickname}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-5xl font-semibold text-primary leading-none">{g.weeks}</span>
          <span className="font-serif italic text-base text-ink-soft">{t("home.weeks")}</span>
          <span className="font-serif text-3xl font-semibold text-primary leading-none ml-2">+{g.days}</span>
          <span className="font-serif italic text-base text-ink-soft">{t("home.days")}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
          <span className="text-ink-soft">{t("home.due")} {formatUKDateLong(profile.dueDateISO)}</span>
          <span className="font-mono uppercase tracking-widest text-primary font-semibold">{t("home.week")} {g.weeks}</span>
        </div>
      </div>
    </header>
  );
}
