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
  profile, entries, labourPlan, hiddenItemKeys, onHideItem, onUnhideItem, onReviewItem,
}: {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
  hiddenItemKeys?: Set<string>;
  onHideItem?: (key: string) => void;
  onUnhideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  const t = useT();
  const weeks = buildPregnancySummaryWeeks(profile, entries, labourPlan, { hiddenItemKeys });
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
              {week.sections.map((section) => (
                <SummarySection
                  key={section.type}
                  section={section}
                  onHideItem={onHideItem}
                  onReviewItem={onReviewItem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {hiddenItemKeys && hiddenItemKeys.size > 0 && onUnhideItem && (
        <div className="mt-5 rounded-xl border border-border bg-white p-3 text-xs">
          <p className="font-semibold text-ink">Hidden from this summary</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(hiddenItemKeys).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onUnhideItem(key)}
                className="rounded-full border border-border bg-white px-3 py-1.5 font-medium text-ink-soft hover:text-ink"
              >
                Show again
              </button>
            ))}
          </div>
        </div>
      )}

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

function SummarySection({
  section,
  onHideItem,
  onReviewItem,
}: {
  section: PregnancySummarySection;
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <div className="rounded-xl bg-blush-soft border border-border p-3 text-xs">
      <p className="font-mono uppercase tracking-widest text-ink-soft mb-2">{section.title}</p>
      {section.type === "symptoms" && <SymptomList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "feelings" && <FeelingList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "questions" && <BulletList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "people" && <PeopleCareList groups={section.groups} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "measurements" && <MeasurementList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "notes" && <BulletList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
      {section.type === "labour" && <BulletList items={section.items} onHideItem={onHideItem} onReviewItem={onReviewItem} />}
    </div>
  );
}

function SymptomList({
  items,
  onHideItem,
  onReviewItem,
}: {
  items: SymptomSummaryItem[];
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.symptom}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-ink">
              • {item.symptom}{item.count > 1 ? ` ×${item.count}` : ""}
            </p>
            <ItemActions
              itemKey={item.key}
              title={item.symptom}
              entryIds={item.entryIds}
              onHideItem={onHideItem}
              onReviewItem={onReviewItem}
            />
          </div>
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

function FeelingList({
  items,
  onHideItem,
  onReviewItem,
}: {
  items: FeelingSummaryItem[];
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <ul className="space-y-1 text-ink">
      {items.map((item) => (
        <li key={item.feeling} className="flex items-start justify-between gap-2">
          <span>• {item.feeling}{item.days > 1 ? `, ${item.days} days this week` : ""}</span>
          <ItemActions itemKey={item.key} title={item.feeling} entryIds={item.entryIds} onHideItem={onHideItem} onReviewItem={onReviewItem} />
        </li>
      ))}
    </ul>
  );
}

function PeopleCareList({
  groups,
  onHideItem,
  onReviewItem,
}: {
  groups: PeopleCareSummaryGroup[];
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.professional}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-ink">{group.professional}</p>
            <ItemActions itemKey={group.key} title={group.professional} entryIds={group.entryIds} onHideItem={onHideItem} onReviewItem={onReviewItem} />
          </div>
          <SimpleBulletList items={group.items} />
        </div>
      ))}
    </div>
  );
}

function MeasurementList({
  items,
  onHideItem,
  onReviewItem,
}: {
  items: MeasurementSummaryItem[];
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-ink">{item.label}</p>
            <ItemActions itemKey={item.key} title={item.label} entryIds={item.entryIds} onHideItem={onHideItem} onReviewItem={onReviewItem} />
          </div>
          <p className="text-ink-soft">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function BulletList({
  items,
  onHideItem,
  onReviewItem,
}: {
  items: Array<{ key: string; text: string; entryIds: string[] }>;
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return (
    <ul className="space-y-1 text-ink">
      {items.map((item) => (
        <li key={item.key} className="flex items-start justify-between gap-2">
          <span>• {item.text}</span>
          <ItemActions itemKey={item.key} title={item.text} entryIds={item.entryIds} onHideItem={onHideItem} onReviewItem={onReviewItem} />
        </li>
      ))}
    </ul>
  );
}

function SimpleBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-ink">
      {items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
    </ul>
  );
}

function ItemActions({
  itemKey,
  title,
  entryIds,
  onHideItem,
  onReviewItem,
}: {
  itemKey: string;
  title: string;
  entryIds: string[];
  onHideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  if (!onHideItem && !onReviewItem) return null;
  return (
    <span className="flex shrink-0 gap-1 print:hidden">
      {onReviewItem && (
        <button
          type="button"
          onClick={() => onReviewItem(title, entryIds)}
          className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft"
        >
          Review
        </button>
      )}
      {onHideItem && (
        <button
          type="button"
          onClick={() => onHideItem(itemKey)}
          className="rounded-full border border-border bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft"
        >
          Hide
        </button>
      )}
    </span>
  );
}
