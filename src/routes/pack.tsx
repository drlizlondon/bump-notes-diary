import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import {
  formatGestation, formatUKDate, formatUKDateLong, formatUKDateTime, formatUKTime, gestationFromDueDate,
} from "@/lib/bumpnotes/gestation";
import { formatDuration, measurementLabel, summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import { useT, t as tFn } from "@/lib/bumpnotes/i18n";
import type { ContractionEntry, Entry, EntryType, LabourEventEntry, MeasurementEntry, Profile, LabourPlan } from "@/lib/bumpnotes/types";
import { downloadSummaryPdf } from "@/lib/bumpnotes/pdf";
import { PregnancySummaryPreview, hasLabourData } from "@/components/bumpnotes/PregnancySummaryPreview";

export const Route = createFileRoute("/pack")({
  head: () => ({ meta: [{ title: "Pregnancy Summary · BumpNotes" }] }),
  component: SummaryPage,
});

function typeLabels(): Record<EntryType, string> {
  return {
    symptom: tFn("type.symptom"),
    question: tFn("type.question"),
    person: tFn("type.person"),
    appointment: tFn("type.person"),
    measurement: tFn("type.measurement"),
    photo: tFn("type.photo"),
    note: tFn("type.note"),
    labour: tFn("sum.labour.title"),
    labour_event: tFn("type.labour_event"),
    contraction: tFn("type.contraction"),
    feeling: tFn("type.feeling"),
    concern: "Concerns",
  };
}

function defaultIncluded(): Record<EntryType, boolean> {
  return {
    symptom: true, question: true, person: true, appointment: true,
    measurement: true, photo: true, note: true,
    labour: true, labour_event: true, contraction: true, concern: true,
    feeling: false,
  };
}

type Step = 1 | 2 | 3 | 4;

function SummaryPage() {
  const { profile, entries, labourPlan } = useAppState();
  const t = useT();
  const [step, setStep] = useState<Step>(1);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [included, setIncluded] = useState<Record<EntryType, boolean>>(defaultIncluded);
  const [groupMeasurements, setGroupMeasurements] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const liveEntries = useMemo(() => entries.filter((e) => !e.deletedAt), [entries]);

  const allWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const e of liveEntries) set.add(e.weekDay.weeks);
    return Array.from(set).sort((a, b) => a - b);
  }, [liveEntries]);

  const activeWeeks = selectedWeeks.size === 0 ? new Set(allWeeks) : selectedWeeks;

  const selected = useMemo(() => {
    return liveEntries
      .filter((e) => activeWeeks.has(e.weekDay.weeks))
      .filter((e) => included[e.type])
      .filter((e) => !excluded.has(e.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [liveEntries, activeWeeks, included, excluded]);

  if (!profile) return null;

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("sum.title")} subtitle={t("sum.subtitle")} />
        <div className="px-4 lg:px-0 pb-10 space-y-5">
          <div className="surface-card blush-bg p-4 text-sm text-ink-soft leading-relaxed">
            {t("sum.intro")}
          </div>

          <Stepper step={step} />

          {step === 1 && (
            <StepWeeks allWeeks={allWeeks} selected={selectedWeeks} onChange={setSelectedWeeks} onNext={() => setStep(2)} />
          )}

          {step === 2 && (
            <StepReview
              profile={profile} entries={selected} groupMeasurements={groupMeasurements}
              labourPlan={included.labour ? labourPlan : undefined}
              onRemove={(id) => setExcluded((s) => new Set(s).add(id))}
              onBack={() => setStep(1)} onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepCustomise
              included={included} setIncluded={setIncluded}
              groupMeasurements={groupMeasurements} setGroupMeasurements={setGroupMeasurements}
              onBack={() => setStep(2)} onNext={() => setStep(4)}
            />
          )}

          {step === 4 && (
            <StepCreate
              profile={profile} entries={selected} groupMeasurements={groupMeasurements}
              labourPlan={included.labour ? labourPlan : undefined}
              onBack={() => setStep(3)}
              onCopy={() => {
                const txt = buildText(profile, selected, groupMeasurements, included.labour ? labourPlan : undefined);
                navigator.clipboard.writeText(txt).then(() => toast.success(t("sum.copied")));
              }}
              onPrint={() => {
                downloadSummaryPdf({ profile, entries: selected, groupMeasurements, labourPlan: included.labour ? labourPlan : undefined });
                toast.success("PDF downloaded");
              }}
              onShare={() => sharePack(profile, selected, groupMeasurements, included.labour ? labourPlan : undefined)}
            />
          )}
        </div>
        <TesterFeedbackButton />
      </AppShell>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const t = useT();
  const labels = [t("sum.stepWeeks"), t("sum.stepReview"), t("sum.stepCustomise"), t("sum.stepCreate")];
  return (
    <div>
      <div className="flex gap-2">
        {[1,2,3,4].map((n) => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mt-2">
        {t("sum.step", { n: step })} · {labels[step - 1]}
      </p>
    </div>
  );
}

function StepWeeks({
  allWeeks, selected, onChange, onNext,
}: { allWeeks: number[]; selected: Set<number>; onChange: (s: Set<number>) => void; onNext: () => void }) {
  const t = useT();
  function toggle(w: number) {
    const next = new Set(selected.size === 0 ? allWeeks : selected);
    if (next.has(w)) next.delete(w); else next.add(w);
    onChange(next);
  }
  const isAll = selected.size === 0 || selected.size === allWeeks.length;
  return (
    <div className="space-y-3">
      <div className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold">{t("sum.weeks.title")}</h3>
        <p className="text-sm text-ink-soft mt-1">{t("sum.weeks.subtitle")}</p>
        {allWeeks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">{t("sum.weeks.empty")}</p>
        ) : (
          <>
            <div className="flex gap-2 mt-4">
              <button onClick={() => onChange(new Set(allWeeks))}
                className={`px-3.5 py-2 rounded-full text-sm font-medium border ${isAll ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}>
                {t("sum.weeks.all")}
              </button>
              <button onClick={() => onChange(new Set())} className="px-3.5 py-2 rounded-full text-sm font-medium bg-white border border-border">
                {t("sum.weeks.reset")}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allWeeks.map((w) => {
                const active = isAll || selected.has(w);
                return (
                  <button key={w} onClick={() => toggle(w)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}>
                    {t("home.week")} {w}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <button onClick={onNext} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        {t("sum.weeks.continue")}
      </button>
    </div>
  );
}

function StepReview({
  profile, entries, groupMeasurements, labourPlan, onRemove, onBack, onNext,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean; labourPlan?: LabourPlan;
  onRemove: (id: string) => void; onBack: () => void; onNext: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <PreviewCard profile={profile} entries={entries} groupMeasurements={groupMeasurements} labourPlan={labourPlan} onRemove={onRemove} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">{t("common.back")}</button>
        <button onClick={onNext} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t("common.continue")}</button>
      </div>
    </div>
  );
}

function StepCustomise({
  included, setIncluded, groupMeasurements, setGroupMeasurements, onBack, onNext,
}: {
  included: Record<EntryType, boolean>; setIncluded: (r: Record<EntryType, boolean>) => void;
  groupMeasurements: boolean; setGroupMeasurements: (b: boolean) => void;
  onBack: () => void; onNext: () => void;
}) {
  const t = useT();
  const TYPE_LABELS = typeLabels();
  const displayTypes: EntryType[] = ["symptom","question","person","measurement","photo","note","feeling","labour","contraction","labour_event"];
  return (
    <div className="space-y-3">
      <div className="surface-card p-5 space-y-3">
        <h3 className="font-serif text-base font-semibold">{t("sum.include")}</h3>
        {displayTypes.map((tp) => (
          <label key={tp} className="flex items-center justify-between py-1.5">
            <span className="text-sm font-medium">{TYPE_LABELS[tp]}</span>
            <input type="checkbox" checked={included[tp]}
              onChange={(e) => {
                const next = { ...included, [tp]: e.target.checked };
                if (tp === "person") next.appointment = e.target.checked;
                setIncluded(next);
              }}
              className="size-5 accent-[var(--primary)]" />
          </label>
        ))}
      </div>
      <div className="surface-card p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={groupMeasurements} onChange={(e) => setGroupMeasurements(e.target.checked)} className="size-5 mt-0.5 accent-[var(--primary)]" />
          <span>
            <span className="block text-sm font-medium">{t("sum.groupM")}</span>
            <span className="block text-xs text-ink-soft mt-0.5">{t("sum.groupM.sub")}</span>
          </span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">{t("common.back")}</button>
        <button onClick={onNext} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t("common.continue")}</button>
      </div>
    </div>
  );
}

function StepCreate({
  profile, entries, groupMeasurements, labourPlan, onBack, onCopy, onPrint, onShare,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean; labourPlan?: LabourPlan;
  onBack: () => void; onCopy: () => void; onPrint: () => void; onShare: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <PreviewCard profile={profile} entries={entries} groupMeasurements={groupMeasurements} labourPlan={labourPlan} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:hidden">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">{t("common.back")}</button>
        <button onClick={onCopy} className="py-3 rounded-full bg-white border border-border text-sm font-medium">{t("sum.copy")}</button>
        <button onClick={onShare} className="py-3 rounded-full bg-white border border-border text-sm font-medium">{t("sum.share")}</button>
        <button onClick={onPrint} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t("sum.pdf")}</button>
      </div>
    </div>
  );
}

function PreviewCard({
  profile, entries, groupMeasurements, labourPlan, onRemove,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean; labourPlan?: LabourPlan;
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
        {t("sum.foot")}
      </p>
    </div>
  );
}

function hasLabourData(plan: LabourPlan, entries: Entry[]): boolean {
  if (plan.recordingStartISO) return true;
  return entries.some((e) => e.type === "contraction" || e.type === "labour_event" || e.type === "labour");
}

function LabourSection({ plan, entries }: { plan: LabourPlan; entries: Entry[] }) {
  const t = useT();
  const contractions = entries.filter((e): e is ContractionEntry => e.type === "contraction");
  const events = entries.filter((e): e is LabourEventEntry => e.type === "labour_event");
  return (
    <div className="rounded-xl bg-blush-soft border border-border p-4 space-y-2">
      <p className="font-mono uppercase tracking-widest text-ink-soft text-xs">{t("sum.labour.title")}</p>
      {plan.recordingStartISO && (
        <p className="text-xs"><span className="font-semibold">{t("sum.labour.started")}:</span> {formatUKDateTime(plan.recordingStartISO)}</p>
      )}
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
    </div>
  );
}

function ByWeek({
  entries, groupMeasurements, onRemove,
}: { entries: Entry[]; groupMeasurements: boolean; onRemove?: (id: string) => void }) {
  const t = useT();
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
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

function buildText(profile: Profile, entries: Entry[], groupMeasurements: boolean, labourPlan?: LabourPlan) {
  const lines: string[] = [];
  lines.push(tFn("sum.header.title"));
  lines.push(tFn("sum.header.intro"));
  lines.push("");
  lines.push(`${tFn("sum.field.name")}: ${profile.userName}`);
  lines.push(`${tFn("sum.field.baby")}: ${profile.babyNickname?.trim() || tFn("baby.fallback")}`);
  lines.push(`${tFn("sum.field.due")}: ${formatUKDateLong(profile.dueDateISO)}`);
  lines.push(`${tFn("sum.field.today")}: ${formatGestation(gestationFromDueDate(profile.dueDateISO))}`);
  lines.push(`${tFn("sum.field.generated")}: ${formatUKDateTime(new Date())}`);
  lines.push("");

  const map = new Map<string, Entry[]>();
  for (const e of entries) { const k = weekDayKey(e); if (!map.has(k)) map.set(k, []); map.get(k)!.push(e); }

  const measurementsByWeek = new Map<number, MeasurementEntry[]>();
  if (groupMeasurements) {
    for (const e of entries) {
      if (e.type === "measurement") {
        if (!measurementsByWeek.has(e.weekDay.weeks)) measurementsByWeek.set(e.weekDay.weeks, []);
        measurementsByWeek.get(e.weekDay.weeks)!.push(e);
      }
    }
  }
  const printedWeeks = new Set<number>();

  Array.from(map.entries()).sort(([a],[b]) => {
    const [aw,ad]=a.split("+").map(Number); const [bw,bd]=b.split("+").map(Number);
    return aw-bw || ad-bd;
  }).forEach(([k, list]) => {
    const [w, d] = k.split("+");
    const wn = Number(w);
    const filtered = groupMeasurements ? list.filter((e) => e.type !== "measurement") : list;
    const showM = groupMeasurements && !printedWeeks.has(wn) && measurementsByWeek.has(wn);
    if (showM) printedWeeks.add(wn);
    if (filtered.length === 0 && !showM) return;
    lines.push(`${tFn("home.week")} ${w} + ${d}`);
    filtered.forEach((e) => {
      const s = summariseEntry(e);
      lines.push(`- ${formatUKDate(e.createdAt)} ${formatUKTime(e.createdAt)} — ${s.headline}${s.detail ? ` · ${s.detail}` : ""}`);
    });
    if (showM) {
      const ms = measurementsByWeek.get(wn)!;
      const byKind = new Map<string, MeasurementEntry[]>();
      for (const m of ms) {
        const key = m.kind === "custom" ? (m.customLabel || tFn("m.custom")) : measurementLabel(m);
        if (!byKind.has(key)) byKind.set(key, []);
        byKind.get(key)!.push(m);
      }
      lines.push(`  ${tFn("sum.measThisWeek")}:`);
      byKind.forEach((list, label) => {
        const r = rangeText(list);
        lines.push(`  - ${label}: ${list.length} reading${list.length === 1 ? "" : "s"}${r ? ` · range ${r}` : ""}`);
      });
    }
    lines.push("");
  });

  if (labourPlan && hasLabourData(labourPlan, entries)) {
    lines.push(tFn("sum.labour.title"));
    if (labourPlan.recordingStartISO) lines.push(`- ${tFn("sum.labour.started")}: ${formatUKDateTime(labourPlan.recordingStartISO)}`);
    const contractions = entries.filter((e): e is ContractionEntry => e.type === "contraction");
    contractions.forEach((c) => {
      lines.push(`- ${tFn("type.contraction")}: ${formatUKDate(c.createdAt)} ${formatUKTime(c.createdAt)} · ${formatDuration(c.durationSec)}${c.note ? ` · ${c.note}` : ""}`);
    });
    const events = entries.filter((e): e is LabourEventEntry => e.type === "labour_event");
    events.forEach((e) => {
      lines.push(`- ${e.event}: ${formatUKDate(e.createdAt)} ${formatUKTime(e.createdAt)}${e.note ? ` · ${e.note}` : ""}`);
    });
    lines.push("");
  }

  lines.push(tFn("sum.foot"));
  return lines.join("\n");
}

async function sharePack(profile: Profile, entries: Entry[], groupMeasurements: boolean, labourPlan?: LabourPlan) {
  const text = buildText(profile, entries, groupMeasurements, labourPlan);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: tFn("sum.header.title"), text });
      return;
    } catch { /* user cancelled */ }
  }
  await navigator.clipboard.writeText(text);
  toast.success(tFn("sum.copied"));
}
