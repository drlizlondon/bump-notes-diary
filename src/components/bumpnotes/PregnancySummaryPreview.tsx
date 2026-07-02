import type { ContractionEntry, Entry, LabourEventEntry, LabourPlan, MeasurementEntry, Profile } from "@/lib/bumpnotes/types";
import {
  formatGestation, formatUKDate, formatUKDateLong, formatUKDateTime, formatUKTime, gestationFromDueDate,
} from "@/lib/bumpnotes/gestation";
import { formatDuration, measurementLabel, summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import { useT, t as tFn } from "@/lib/bumpnotes/i18n";

/**
 * The canonical Pregnancy Summary preview card.
 * Used inside the app's /pack flow AND on the public homepage.
 */
export function PregnancySummaryPreview({
  profile, entries, groupMeasurements, labourPlan, onRemove,
}: {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
  onRemove?: (id: string) => void;
}) {
  const t = useT();
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
        <ByWeek entries={entries} groupMeasurements={groupMeasurements} onRemove={onRemove} />
        {labourPlan && hasLabourData(labourPlan, entries) && (
          <LabourSection plan={labourPlan} entries={entries} />
        )}
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
  return entries.some((e) => e.type === "contraction" || e.type === "labour_event" || e.type === "labour");
}

function isLabourSummaryEntry(entry: Entry): boolean {
  return entry.type === "labour" || entry.type === "labour_event" || entry.type === "contraction";
}

function LabourSection({ plan, entries }: { plan: LabourPlan; entries: Entry[] }) {
  const t = useT();
  const contractions = entries.filter((e): e is ContractionEntry => e.type === "contraction");
  const events = entries.filter((e): e is LabourEventEntry => e.type === "labour_event");
  const episodes = plan.episodes ?? [];

  // If no episodes recorded but we have entries, render as a single legacy block
  if (episodes.length === 0) {
    return (
      <div className="rounded-xl bg-blush-soft border border-border p-4 space-y-2">
        <p className="font-mono uppercase tracking-widest text-ink-soft text-xs">{t("sum.labour.title")}</p>
        <LabourEpisodeBody contractions={contractions} events={events} />
      </div>
    );
  }

  const outcomeLabel = (o?: string) => {
    if (o === "baby") return t("lab.outcome.baby");
    if (o === "settled") return t("lab.outcome.settled");
    if (o === "other") return t("lab.outcome.other");
    return null;
  };

  return (
    <div className="space-y-3">
      {episodes
        .slice()
        .sort((a, b) => b.startISO.localeCompare(a.startISO))
        .map((ep) => {
          const inRange = (iso: string) => iso >= ep.startISO && (!ep.endISO || iso <= ep.endISO);
          const eC = contractions.filter((c) => inRange(c.createdAt));
          const eE = events.filter((e) => inRange(e.createdAt));
          const ol = outcomeLabel(ep.outcome);
          return (
            <div key={ep.id} className="rounded-xl bg-blush-soft border border-border p-4 space-y-2">
              <p className="font-mono uppercase tracking-widest text-ink-soft text-xs">{t("sum.labour.title")}</p>
              <p className="text-xs">
                <span className="font-semibold">{t("sum.labour.started")}:</span> {formatUKDateTime(ep.startISO)}
              </p>
              {ep.endISO && (
                <p className="text-xs">
                  <span className="font-semibold">{t("lab.episode.ended")}:</span> {formatUKDateTime(ep.endISO)}
                </p>
              )}
              {ol && (
                <p className="text-xs">
                  <span className="font-semibold">{t("sum.labour.outcome")}:</span> {ol}
                  {ep.outcome === "other" && ep.outcomeNote ? ` — ${ep.outcomeNote}` : ""}
                </p>
              )}
              <LabourEpisodeBody contractions={eC} events={eE} />
            </div>
          );
        })}
    </div>
  );
}

function LabourEpisodeBody({ contractions, events }: { contractions: ContractionEntry[]; events: LabourEventEntry[] }) {
  const t = useT();
  return (
    <>
      {contractions.length > 0 && (
        <div>
          <p className="text-xs font-semibold mt-1">{t("sum.labour.contractions")} ({contractions.length})</p>
          <ul className="text-xs text-ink-soft mt-1 space-y-0.5">
            {contractions.map((c) => (
              <li key={c.id}>
                {formatUKDate(c.createdAt)} {formatUKTime(c.createdAt)} — {formatDuration(c.durationSec)}
                {c.note ? ` · ${c.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {events.length > 0 && (
        <div>
          <p className="text-xs font-semibold mt-1">{t("sum.labour.events")} ({events.length})</p>
          <ul className="text-xs text-ink-soft mt-1 space-y-0.5">
            {events.map((e) => (
              <li key={e.id}>
                {formatUKDate(e.createdAt)} {formatUKTime(e.createdAt)} — {e.event}{e.note ? ` · ${e.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}


function ByWeek({
  entries, groupMeasurements, onRemove,
}: { entries: Entry[]; groupMeasurements: boolean; onRemove?: (id: string) => void }) {
  const t = useT();
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    if (isLabourSummaryEntry(e)) continue;
    const k = weekDayKey(e);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  const groups = Array.from(map.entries()).sort(([a],[b]) => {
    const [aw,ad] = a.split("+").map(Number); const [bw,bd] = b.split("+").map(Number);
    return aw - bw || ad - bd;
  });

  const measurementsByWeek = new Map<number, MeasurementEntry[]>();
  if (groupMeasurements) {
    for (const e of entries) {
      if (e.type === "measurement") {
        const w = e.weekDay.weeks;
        if (!measurementsByWeek.has(w)) measurementsByWeek.set(w, []);
        measurementsByWeek.get(w)!.push(e);
      }
    }
  }
  const printedMeasurementWeeks = new Set<number>();

  return (
    <div className="space-y-4">
      {groups.map(([k, list]) => {
        const [w, d] = k.split("+");
        const weekNum = Number(w);
        const filtered = groupMeasurements ? list.filter((e) => e.type !== "measurement") : list;
        const showMeasurementBlock = groupMeasurements && !printedMeasurementWeeks.has(weekNum) && measurementsByWeek.has(weekNum);
        if (showMeasurementBlock) printedMeasurementWeeks.add(weekNum);
        if (filtered.length === 0 && !showMeasurementBlock) return null;
        return (
          <div key={k}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">{t("home.week")} {w} + {d}</p>
            <ul className="space-y-1.5">
              {filtered.map((e) => <EntryRow key={e.id} entry={e} onRemove={onRemove} />)}
            </ul>
            {showMeasurementBlock && (
              <div className="mt-2">
                <MeasurementSummary measurements={measurementsByWeek.get(weekNum)!} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MeasurementSummary({ measurements }: { measurements: MeasurementEntry[] }) {
  const t = useT();
  const byKind = new Map<string, MeasurementEntry[]>();
  for (const m of measurements) {
    const key = m.kind === "custom" ? (m.customLabel || tFn("m.custom")) : measurementLabel(m);
    if (!byKind.has(key)) byKind.set(key, []);
    byKind.get(key)!.push(m);
  }
  return (
    <div className="rounded-xl bg-blush-soft border border-border p-3 text-xs space-y-2">
      <p className="font-mono uppercase tracking-widest text-ink-soft">{t("sum.measThisWeek")}</p>
      {Array.from(byKind.entries()).map(([label, list]) => (
        <div key={label}>
          <p className="font-semibold">{label}</p>
          <p className="text-ink-soft">{list.length} reading{list.length === 1 ? "" : "s"}</p>
          {rangeText(list) && <p className="text-ink-soft">Range: {rangeText(list)}</p>}
        </div>
      ))}
    </div>
  );
}

function rangeText(list: MeasurementEntry[]): string | null {
  if (list.length === 0) return null;
  const first = list[0];
  if (first.kind === "blood_pressure") {
    const sys = list.map((m) => m.systolic ?? 0).filter(Boolean);
    const dia = list.map((m) => m.diastolic ?? 0).filter(Boolean);
    if (!sys.length || !dia.length) return null;
    return `${Math.min(...sys)}/${Math.min(...dia)} to ${Math.max(...sys)}/${Math.max(...dia)} mmHg`;
  }
  const vals = list.map((m) => m.value).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  const unit = first.unit || "";
  if (Math.min(...vals) === Math.max(...vals)) return `${vals[0]} ${unit}`.trim();
  return `${Math.min(...vals)} to ${Math.max(...vals)} ${unit}`.trim();
}

function EntryRow({ entry, onRemove }: { entry: Entry; onRemove?: (id: string) => void }) {
  const s = summariseEntry(entry);
  return (
    <li className="text-xs leading-snug flex flex-wrap items-start gap-x-2 gap-y-0.5">
      <span className="text-ink-soft shrink-0 whitespace-nowrap">
        {formatUKDate(entry.createdAt)} {formatUKTime(entry.createdAt)} —
      </span>
      <span className="flex-1 min-w-0 break-words">
        <span className="font-medium">{s.headline}</span>
        {s.detail && <span className="text-ink-soft"> · {s.detail}</span>}
      </span>
      {onRemove && (
        <button onClick={() => onRemove(entry.id)} className="text-destructive text-[10px] font-semibold uppercase tracking-wider print:hidden shrink-0">remove</button>
      )}
    </li>
  );
}
