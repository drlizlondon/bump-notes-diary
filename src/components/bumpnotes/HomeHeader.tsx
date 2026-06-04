import type { Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate, formatUKDateLong } from "@/lib/bumpnotes/gestation";

export function HomeHeader({ profile }: { profile: Profile }) {
  const g = gestationFromDueDate(profile.dueDateISO);
  return (
    <header className="px-5 pt-10 pb-2">
      <div className="rounded-[2rem] p-6 bg-gradient-to-br from-peach-soft via-butter-soft to-rose-soft ring-1 ring-peach/30 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft font-semibold">
          {profile.userName} &amp; {profile.babyNickname}
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-5xl font-bold text-primary leading-none">{g.weeks}</span>
          <span className="font-serif italic text-lg text-ink-soft">weeks</span>
          <span className="font-serif text-3xl font-bold text-primary leading-none ml-1">+{g.days}</span>
          <span className="font-serif italic text-lg text-ink-soft">days</span>
        </div>
        <div className="mt-4 pt-4 border-t border-ink/10 flex items-center justify-between text-xs">
          <span className="text-ink-soft">Due {formatUKDateLong(profile.dueDateISO)}</span>
          <span className="font-mono uppercase tracking-widest text-primary font-semibold">
            Week {g.weeks}
          </span>
        </div>
      </div>
    </header>
  );
}
