import {
  formatGestation, formatUKDateLong, formatUKDateTime, gestationFromDueDate,
} from "@/lib/bumpnotes/gestation";
import {
  buildPregnancySummaryWeeks,
  type FeelingSummaryItem,
  type MeasurementSummaryItem,
  type PeopleCareSummaryGroup,
  type PregnancySummarySection,
  type SymptomSummaryItem,
} from "@/lib/bumpnotes/pregnancy-summary";
import type { Entry, LabourPlan, Profile } from "@/lib/bumpnotes/types";
import { useT } from "@/lib/bumpnotes/i18n";

/**
 * The canonical Pregnancy Summary preview card.
 * Used inside the app's /pack flow AND on the public homepage.
 */
export function PregnancySummaryPreview({
  profile, entries, labourPlan, onRemove: _onRemove,
}: {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
  onRemove?: (id: string) => void;
}) {
  const t = useT();
  const weeks = buildPregnancySummaryWeeks(profile, entries, labourPlan);
  return (
    <div className="surface-card p-4 sm:p-5 print:shadow-none print:border-0 overflow-hidden" id="pack-print">
      <h2 className="font-serif text-lg sm:text-xl font-semibold break-words">{t("sum.header.title")}</h2>
      <p className="text-xs text-ink-soft mt-1">{t("sum.header.intro")}</p>
      <dl className="mt-4 grid grid-cols-[auto,1fr] sm:grid-cols-[auto,1fr,auto,1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-ink-soft">{t("sum.field.name")}</dt><dd className="font-medium break-words">{profile.userName}</dd>
        <dt className="text-ink-soft">{t("sum.field.baby")}</dt><dd className="font-medium break-words">{profile.babyNickname?.trim() || t("baby.fallback")}</dd>
        <dt className="text-ink-soft">{t("sum.field.due")}</dt><dd className="font-medium break-words">{formatUKDateLong(profile.dueDateISO)}</dd>
        <dt className="text-ink-soft">{t("sum.field.today")}</dt><dd className="font-medium break-words">{formatGestation(gestationFromDueDate(profile.dueDateISO))}</dd>
        <dt className="text-ink-soft">{t("sum.field.generated")}</dt><dd className="font-medium break-words">{formatUKDateTime(new Date())}</dd>
      </dl>

      <div className="mt-5 space-y-5">
        {weeks.map((week) => (
          <section key={week.week} className="space-y-3">
            <h3 className="text-sm font-serif font-semibold text-primary">{t("home.week")} {week.week}</h3>
            <div className="space-y-4">
              {week.sections.map((section) => <SummarySection key={section.type} section={section} />)}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-ink-soft leading-relaxed border-t border-border pt-4">
        {t("sum.foot").replace("{name}", profile.userName)}
      </p>
    </div>
  );
}

export function hasLabourData(plan: LabourPlan, entries: Entry[]): boolean {
  if (plan.recordingStartISO) return true;
  if ((plan.episodes?.length ?? 0) > 0) return true;
  return entries.some((entry) => entry.type === "contraction" || entry.type === "labour_event" || entry.type === "labour");
}

function SummarySection({ section }: { section: PregnancySummarySection }) {
  return (
    <div className="rounded-xl bg-blush-soft border border-border p-3 text-xs">
      <p className="font-mono uppercase tracking-widest text-ink-soft mb-2">{section.title}</p>
      {section.type === "symptoms" && <SymptomList items={section.items} />}
      {section.type === "feelings" && <FeelingList items={section.items} />}
      {section.type === "questions" && <BulletList items={section.items} />}
      {section.type === "people" && <PeopleCareList groups={section.groups} />}
      {section.type === "measurements" && <MeasurementList items={section.items} />}
      {section.type === "notes" && <BulletList items={section.items} />}
      {section.type === "labour" && <BulletList items={section.items} />}
    </div>
  );
}

function SymptomList({ items }: { items: SymptomSummaryItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.symptom}>
          <p className="font-medium text-ink">
            • {item.symptom}{item.count > 1 ? ` ×${item.count}` : ""}
          </p>
          {item.qualifiers.length > 0 && (
            <ul className="mt-1 ml-5 space-y-0.5 text-ink-soft">
              {item.qualifiers.map((qualifier) => <li key={qualifier}>• {qualifier}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function FeelingList({ items }: { items: FeelingSummaryItem[] }) {
  return (
    <ul className="space-y-1 text-ink">
      {items.map((item) => (
        <li key={item.feeling}>
          • {item.feeling}{item.days > 1 ? `, ${item.days} days this week` : ""}
        </li>
      ))}
    </ul>
  );
}

function PeopleCareList({ groups }: { groups: PeopleCareSummaryGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.professional}>
          <p className="font-medium text-ink">{group.professional}</p>
          <BulletList items={group.items} />
        </div>
      ))}
    </div>
  );
}

function MeasurementList({ items }: { items: MeasurementSummaryItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <p className="font-medium text-ink">{item.label}</p>
          <p className="text-ink-soft">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-ink">
      {items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
    </ul>
  );
}
