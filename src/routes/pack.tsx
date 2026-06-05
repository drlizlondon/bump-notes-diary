import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import {
  formatGestation,
  formatUKDate,
  formatUKDateLong,
  formatUKDateTime,
  formatUKTime,
  gestationFromDueDate,
} from "@/lib/bumpnotes/gestation";
import { measurementLabel, measurementValue, summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import type { Entry, EntryType, MeasurementEntry, Profile } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/pack")({
  head: () => ({ meta: [{ title: "Pregnancy Summary · BumpNotes" }] }),
  component: SummaryPage,
});

const TYPE_LABELS: Record<EntryType, string> = {
  symptom: "Symptoms",
  question: "Saved questions",
  person: "People & Care",
  appointment: "People & Care",
  measurement: "Measurements",
  photo: "Photos",
  note: "Notes",
  labour: "Labour events",
  feeling: "Feelings",
  concern: "Concerns",
};

function defaultIncluded(): Record<EntryType, boolean> {
  return {
    symptom: true, question: true, person: true, appointment: true,
    measurement: true, photo: true, note: true,
    labour: true, concern: true,
    feeling: false,
  };
}

type Step = 1 | 2 | 3 | 4;

function SummaryPage() {
  const { profile, entries } = useAppState();
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

  // Default: all weeks selected once we know them
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
        <PageHeader title="Pregnancy Summary" subtitle="Your record. Your summary. Your way." />
        <div className="px-4 lg:px-0 pb-10 space-y-5">
          <div className="surface-card blush-bg p-4 text-sm text-ink-soft leading-relaxed">
            Everything you add is organised in your timeline. When you're ready, create a clear summary to share with your care team.
          </div>

          <Stepper step={step} />

          {step === 1 && (
            <StepWeeks
              allWeeks={allWeeks}
              selected={selectedWeeks}
              onChange={setSelectedWeeks}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepReview
              profile={profile}
              entries={selected}
              groupMeasurements={groupMeasurements}
              onRemove={(id) => setExcluded((s) => new Set(s).add(id))}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepCustomise
              included={included}
              setIncluded={setIncluded}
              groupMeasurements={groupMeasurements}
              setGroupMeasurements={setGroupMeasurements}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}

          {step === 4 && (
            <StepCreate
              profile={profile}
              entries={selected}
              groupMeasurements={groupMeasurements}
              onBack={() => setStep(3)}
              onCopy={() => {
                const t = buildText(profile, selected, groupMeasurements);
                navigator.clipboard.writeText(t).then(() => toast.success("Copied to clipboard"));
              }}
              onPrint={() => window.print()}
              onShare={() => sharePack(profile, selected, groupMeasurements)}
            />
          )}
        </div>
      </AppShell>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Choose weeks", "Review", "Customise", "Create summary"];
  return (
    <div>
      <div className="flex gap-2">
        {[1,2,3,4].map((n) => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mt-2">
        Step {step} of 4 · {labels[step - 1]}
      </p>
    </div>
  );
}

function StepWeeks({
  allWeeks, selected, onChange, onNext,
}: { allWeeks: number[]; selected: Set<number>; onChange: (s: Set<number>) => void; onNext: () => void }) {
  function toggle(w: number) {
    const next = new Set(selected.size === 0 ? allWeeks : selected);
    if (next.has(w)) next.delete(w); else next.add(w);
    onChange(next);
  }
  const isAll = selected.size === 0 || selected.size === allWeeks.length;
  return (
    <div className="space-y-3">
      <div className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold">Which weeks to include?</h3>
        <p className="text-sm text-ink-soft mt-1">Pick the pregnancy weeks you want in this summary.</p>
        {allWeeks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Nothing logged yet. Add entries from Home first.</p>
        ) : (
          <>
            <div className="flex gap-2 mt-4">
              <button onClick={() => onChange(new Set(allWeeks))}
                className={`px-3.5 py-2 rounded-full text-sm font-medium border ${isAll ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}>
                All weeks
              </button>
              <button onClick={() => onChange(new Set())}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-white border border-border">
                Reset
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allWeeks.map((w) => {
                const active = isAll || selected.has(w);
                return (
                  <button key={w} onClick={() => toggle(w)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}>
                    Week {w}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <button onClick={onNext} className="w-full py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        Continue to review
      </button>
    </div>
  );
}

function StepReview({
  profile, entries, groupMeasurements, onRemove, onBack, onNext,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean;
  onRemove: (id: string) => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <PreviewCard profile={profile} entries={entries} groupMeasurements={groupMeasurements} onRemove={onRemove} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">Back</button>
        <button onClick={onNext} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Continue</button>
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
  // Display types: only show ones the user actually uses today
  const displayTypes: EntryType[] = ["symptom","question","person","measurement","photo","note","feeling","concern","labour"];
  return (
    <div className="space-y-3">
      <div className="surface-card p-5 space-y-3">
        <h3 className="font-serif text-base font-semibold">What to include</h3>
        {displayTypes.map((t) => (
          <label key={t} className="flex items-center justify-between py-1.5">
            <span className="text-sm font-medium">{TYPE_LABELS[t]}</span>
            <input type="checkbox" checked={included[t]}
              onChange={(e) => {
                const next = { ...included, [t]: e.target.checked };
                // appointment is legacy mirror of person
                if (t === "person") next.appointment = e.target.checked;
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
            <span className="block text-sm font-medium">Group repeated measurements by week</span>
            <span className="block text-xs text-ink-soft mt-0.5">Shows a count and range per week instead of every reading.</span>
          </span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">Back</button>
        <button onClick={onNext} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Continue</button>
      </div>
    </div>
  );
}

function StepCreate({
  profile, entries, groupMeasurements, onBack, onCopy, onPrint, onShare,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean;
  onBack: () => void; onCopy: () => void; onPrint: () => void; onShare: () => void;
}) {
  return (
    <div className="space-y-3">
      <PreviewCard profile={profile} entries={entries} groupMeasurements={groupMeasurements} />
      <div className="grid grid-cols-2 gap-2 print:hidden">
        <button onClick={onBack} className="py-3 rounded-full bg-white border border-border text-sm font-medium">Back</button>
        <button onClick={onCopy} className="py-3 rounded-full bg-white border border-border text-sm font-medium">Copy text</button>
        <button onClick={onPrint} className="py-3 rounded-full bg-white border border-border text-sm font-medium">Download PDF</button>
        <button onClick={onShare} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Share</button>
      </div>
    </div>
  );
}

function PreviewCard({
  profile, entries, groupMeasurements, onRemove,
}: {
  profile: Profile; entries: Entry[]; groupMeasurements: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="surface-card p-5 print:shadow-none print:border-0" id="pack-print">
      <h2 className="font-serif text-xl font-semibold">BumpNotes Pregnancy Summary</h2>
      <p className="text-xs text-ink-soft mt-1">A factual summary from my own pregnancy record.</p>
      <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-ink-soft">Name</dt><dd className="font-medium">{profile.userName}</dd>
        <dt className="text-ink-soft">Baby</dt><dd className="font-medium">{profile.babyNickname}</dd>
        <dt className="text-ink-soft">Due date</dt><dd className="font-medium">{formatUKDateLong(profile.dueDateISO)}</dd>
        <dt className="text-ink-soft">Today</dt><dd className="font-medium">{formatGestation(gestationFromDueDate(profile.dueDateISO))}</dd>
        <dt className="text-ink-soft">Generated</dt><dd className="font-medium">{formatUKDateTime(new Date())}</dd>
      </dl>

      <div className="mt-5 space-y-5">
        <ByWeek entries={entries} groupMeasurements={groupMeasurements} onRemove={onRemove} />
      </div>

      <p className="mt-6 text-[11px] text-ink-soft leading-relaxed border-t border-border pt-4">
        This is a personal record created by the user to help them remember and discuss their pregnancy
        with their care team. It does not provide medical advice, diagnosis or triage.
      </p>
    </div>
  );
}

function ByWeek({
  entries, groupMeasurements, onRemove,
}: { entries: Entry[]; groupMeasurements: boolean; onRemove?: (id: string) => void }) {
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

  // For measurement grouping, group by week (not week+day)
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

  // Track which week we've printed a measurement summary for
  const printedMeasurementWeeks = new Set<number>();

  return (
    <div className="space-y-4">
      {groups.map(([k, list]) => {
        const [w, d] = k.split("+");
        const weekNum = Number(w);
        const filtered = groupMeasurements
          ? list.filter((e) => e.type !== "measurement")
          : list;
        const showMeasurementBlock = groupMeasurements
          && !printedMeasurementWeeks.has(weekNum)
          && measurementsByWeek.has(weekNum);
        if (showMeasurementBlock) printedMeasurementWeeks.add(weekNum);
        if (filtered.length === 0 && !showMeasurementBlock) return null;
        return (
          <div key={k}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">Week {w} + {d}</p>
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
  const byKind = new Map<string, MeasurementEntry[]>();
  for (const m of measurements) {
    const key = m.kind === "custom" ? (m.customLabel || "Custom") : measurementLabel(m);
    if (!byKind.has(key)) byKind.set(key, []);
    byKind.get(key)!.push(m);
  }
  return (
    <div className="rounded-xl bg-blush-soft border border-border p-3 text-xs space-y-2">
      <p className="font-mono uppercase tracking-widest text-ink-soft">Measurements this week</p>
      {Array.from(byKind.entries()).map(([label, list]) => (
        <div key={label}>
          <p className="font-semibold">{label}</p>
          <p className="text-ink-soft">{list.length} reading{list.length === 1 ? "" : "s"} recorded</p>
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
    <li className="text-xs leading-snug flex items-start gap-2">
      <span className="text-ink-soft shrink-0">
        {formatUKDate(entry.createdAt)} at {formatUKTime(entry.createdAt)} —
      </span>
      <span className="flex-1">
        <span className="font-medium">{s.headline}</span>
        {s.detail && <span className="text-ink-soft"> · {s.detail}</span>}
      </span>
      {onRemove && (
        <button onClick={() => onRemove(entry.id)} className="text-destructive text-[10px] font-semibold uppercase tracking-wider print:hidden">remove</button>
      )}
    </li>
  );
}

function buildText(profile: Profile, entries: Entry[], groupMeasurements: boolean) {
  const lines: string[] = [];
  lines.push("BumpNotes Pregnancy Summary");
  lines.push("A factual summary from my own pregnancy record.");
  lines.push("");
  lines.push(`Name: ${profile.userName}`);
  lines.push(`Baby: ${profile.babyNickname}`);
  lines.push(`Due date: ${formatUKDateLong(profile.dueDateISO)}`);
  lines.push(`Today: ${formatGestation(gestationFromDueDate(profile.dueDateISO))}`);
  lines.push(`Generated: ${formatUKDateTime(new Date())}`);
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
    lines.push(`Week ${w} + ${d}`);
    filtered.forEach((e) => {
      const s = summariseEntry(e);
      lines.push(`- ${formatUKDate(e.createdAt)} at ${formatUKTime(e.createdAt)} — ${s.headline}${s.detail ? ` · ${s.detail}` : ""}`);
    });
    if (showM) {
      const ms = measurementsByWeek.get(wn)!;
      const byKind = new Map<string, MeasurementEntry[]>();
      for (const m of ms) {
        const key = m.kind === "custom" ? (m.customLabel || "Custom") : measurementLabel(m);
        if (!byKind.has(key)) byKind.set(key, []);
        byKind.get(key)!.push(m);
      }
      lines.push(`  Measurements this week:`);
      byKind.forEach((list, label) => {
        const r = rangeText(list);
        lines.push(`  - ${label}: ${list.length} reading${list.length === 1 ? "" : "s"}${r ? ` · range ${r}` : ""}`);
      });
    }
    lines.push("");
  });

  lines.push("This is a personal record. It does not provide medical advice, diagnosis or triage.");
  return lines.join("\n");
}

async function sharePack(profile: Profile, entries: Entry[], groupMeasurements: boolean) {
  const text = buildText(profile, entries, groupMeasurements);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "BumpNotes Pregnancy Summary", text });
      return;
    } catch { /* user cancelled */ }
  }
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

function measurementValueUnused(_: MeasurementEntry) { return measurementValue(_); }
void measurementValueUnused;
