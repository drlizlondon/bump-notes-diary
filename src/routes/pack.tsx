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
import { summariseEntry, weekDayKey } from "@/lib/bumpnotes/summary";
import type { Entry, EntryType } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/pack")({
  head: () => ({ meta: [{ title: "Appointment Pack · BumpNotes" }] }),
  component: PackPage,
});

type Format = "week" | "type" | "both";

const TYPE_LABELS: Record<EntryType, string> = {
  concern: "Concerns",
  symptom: "Symptoms",
  question: "Questions for my team",
  appointment: "Appointments",
  photo: "Photos",
  labour: "Labour events",
  feeling: "Feelings",
  note: "Notes",
};

function defaultIncluded(): Record<EntryType, boolean> {
  return {
    concern: true, symptom: true, question: true, appointment: true,
    photo: true, labour: true, note: true,
    feeling: false, // off by default
  };
}

function PackPage() {
  const { profile, entries } = useAppState();
  const [included, setIncluded] = useState<Record<EntryType, boolean>>(defaultIncluded);
  const [format, setFormat] = useState<Format>("week");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const selected = useMemo(() => {
    return entries
      .filter((e) => !e.deletedAt)
      .filter((e) => included[e.type])
      .filter((e) => !excluded.has(e.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [entries, included, excluded]);

  if (!profile) return null;

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title="Appointment Pack" subtitle="A factual summary you control." />
        <div className="px-4 pb-8 space-y-5">
          <Stepper step={step} />

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">Include</p>
              {(Object.keys(TYPE_LABELS) as EntryType[]).map((t) => (
                <label key={t} className="flex items-center justify-between bg-card rounded-2xl px-5 py-4 ring-1 ring-black/5">
                  <span className="text-sm font-medium">{TYPE_LABELS[t]}</span>
                  <input
                    type="checkbox"
                    checked={included[t]}
                    onChange={(e) => setIncluded({ ...included, [t]: e.target.checked })}
                    className="size-5 accent-[var(--color-primary)]"
                  />
                </label>
              ))}
              <button onClick={() => setStep(2)} className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold">
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">Format</p>
              {([
                ["week", "Timeline by week"],
                ["type", "Grouped by entry type"],
                ["both", "Both"],
              ] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFormat(k)}
                  className={`w-full text-left px-5 py-4 rounded-2xl ring-1 transition ${
                    format === k ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5"
                  }`}>
                  {label}
                </button>
              ))}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-full bg-muted text-sm font-medium">Back</button>
                <button onClick={() => setStep(3)} className="flex-[2] py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Preview pack
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <Preview
              profile={profile}
              entries={selected}
              format={format}
              onRemove={(id) => setExcluded((s) => new Set(s).add(id))}
              onBack={() => setStep(2)}
              onShare={() => sharePack(profile, selected, format)}
              onCopy={() => {
                const text = buildText(profile, selected, format);
                navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
              }}
              onPrint={() => window.print()}
            />
          )}
        </div>
      </AppShell>
    </>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-2">
      {[1,2,3].map((n) => (
        <div key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}

function Preview({
  profile, entries, format, onRemove, onBack, onShare, onCopy, onPrint,
}: {
  profile: NonNullable<ReturnType<typeof useAppState>["profile"]>;
  entries: Entry[]; format: Format;
  onRemove: (id: string) => void;
  onBack: () => void; onShare: () => void; onCopy: () => void; onPrint: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-3xl ring-1 ring-black/5 p-5 print:shadow-none print:ring-0" id="pack-print">
        <h2 className="font-serif text-xl font-semibold">BumpNotes Appointment Pack</h2>
        <p className="text-xs text-ink-soft mt-1">A factual summary from my own pregnancy record.</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-ink-soft">Name</dt><dd className="font-medium">{profile.userName}</dd>
          <dt className="text-ink-soft">Baby</dt><dd className="font-medium">{profile.babyNickname}</dd>
          <dt className="text-ink-soft">Due date</dt><dd className="font-medium">{formatUKDateLong(profile.dueDateISO)}</dd>
          <dt className="text-ink-soft">Today</dt><dd className="font-medium">{formatGestation(gestationFromDueDate(profile.dueDateISO))}</dd>
          <dt className="text-ink-soft">Generated</dt><dd className="font-medium">{formatUKDateTime(new Date())}</dd>
        </dl>

        <div className="mt-5 space-y-5">
          {(format === "week" || format === "both") && <ByWeek entries={entries} onRemove={onRemove} />}
          {(format === "type" || format === "both") && <ByType entries={entries} onRemove={onRemove} />}
        </div>

        <p className="mt-6 text-[11px] text-ink-soft leading-relaxed border-t border-black/5 pt-4">
          This is a personal record created by the user to help them remember and discuss their
          pregnancy, symptoms, questions and concerns with their birthing team. It does not provide
          medical advice, diagnosis or triage.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <button onClick={onBack} className="py-3 rounded-full bg-muted text-sm font-medium">Back</button>
        <button onClick={onCopy} className="py-3 rounded-full bg-card ring-1 ring-black/10 text-sm font-medium">Copy text</button>
        <button onClick={onPrint} className="py-3 rounded-full bg-card ring-1 ring-black/10 text-sm font-medium">Download PDF</button>
        <button onClick={onShare} className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Share</button>
      </div>
    </div>
  );
}

function ByWeek({ entries, onRemove }: { entries: Entry[]; onRemove: (id: string) => void }) {
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
  return (
    <div className="space-y-4">
      <h3 className="font-serif font-semibold">Timeline</h3>
      {groups.map(([k, list]) => {
        const [w,d] = k.split("+");
        return (
          <div key={k}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">Week {w} + {d}</p>
            <ul className="space-y-1.5">
              {list.map((e) => <EntryRow key={e.id} entry={e} onRemove={onRemove} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ByType({ entries, onRemove }: { entries: Entry[]; onRemove: (id: string) => void }) {
  const map = new Map<EntryType, Entry[]>();
  for (const e of entries) {
    if (!map.has(e.type)) map.set(e.type, []);
    map.get(e.type)!.push(e);
  }
  return (
    <div className="space-y-4">
      <h3 className="font-serif font-semibold">By type</h3>
      {(Object.keys(TYPE_LABELS) as EntryType[]).map((t) => {
        const list = map.get(t);
        if (!list || list.length === 0) return null;
        return (
          <div key={t}>
            <p className="text-xs font-mono uppercase tracking-widest text-ink-soft mb-1">{TYPE_LABELS[t]}</p>
            <ul className="space-y-1.5">
              {list.map((e) => <EntryRow key={e.id} entry={e} onRemove={onRemove} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ entry, onRemove }: { entry: Entry; onRemove: (id: string) => void }) {
  const s = summariseEntry(entry);
  return (
    <li className="text-xs leading-snug flex items-start gap-2">
      <span className="text-ink-soft shrink-0">
        Week {entry.weekDay.weeks} + {entry.weekDay.days}, {formatUKDate(entry.createdAt)} at {formatUKTime(entry.createdAt)} —
      </span>
      <span className="flex-1">
        <span className="font-medium">{s.headline}</span>
        {s.detail && <span className="text-ink-soft"> · {s.detail}</span>}
      </span>
      <button onClick={() => onRemove(entry.id)} className="text-destructive text-[10px] font-semibold uppercase tracking-wider print:hidden">remove</button>
    </li>
  );
}

function buildText(profile: NonNullable<ReturnType<typeof useAppState>["profile"]>, entries: Entry[], format: Format) {
  const lines: string[] = [];
  lines.push("BumpNotes Appointment Pack");
  lines.push("A factual summary from my own pregnancy record.");
  lines.push("");
  lines.push(`Name: ${profile.userName}`);
  lines.push(`Baby: ${profile.babyNickname}`);
  lines.push(`Due date: ${formatUKDateLong(profile.dueDateISO)}`);
  lines.push(`Today: ${formatGestation(gestationFromDueDate(profile.dueDateISO))}`);
  lines.push(`Generated: ${formatUKDateTime(new Date())}`);
  lines.push("");
  const renderEntry = (e: Entry) => {
    const s = summariseEntry(e);
    return `- Week ${e.weekDay.weeks} + ${e.weekDay.days}, ${formatUKDate(e.createdAt)} at ${formatUKTime(e.createdAt)} — ${s.headline}${s.detail ? ` · ${s.detail}` : ""}`;
  };
  if (format === "week" || format === "both") {
    lines.push("== Timeline ==");
    const map = new Map<string, Entry[]>();
    for (const e of entries) { const k = weekDayKey(e); if (!map.has(k)) map.set(k, []); map.get(k)!.push(e); }
    Array.from(map.entries()).sort(([a],[b]) => {
      const [aw,ad]=a.split("+").map(Number); const [bw,bd]=b.split("+").map(Number);
      return aw-bw || ad-bd;
    }).forEach(([k, list]) => {
      const [w,d]=k.split("+"); lines.push(`Week ${w} + ${d}`); list.forEach((e) => lines.push(renderEntry(e))); lines.push("");
    });
  }
  if (format === "type" || format === "both") {
    lines.push("== By type ==");
    const map = new Map<EntryType, Entry[]>();
    for (const e of entries) { if (!map.has(e.type)) map.set(e.type, []); map.get(e.type)!.push(e); }
    (Object.keys(TYPE_LABELS) as EntryType[]).forEach((t) => {
      const list = map.get(t); if (!list?.length) return;
      lines.push(TYPE_LABELS[t]); list.forEach((e) => lines.push(renderEntry(e))); lines.push("");
    });
  }
  lines.push("This is a personal record created by the user to help them remember and discuss their pregnancy, symptoms, questions and concerns with their birthing team. It does not provide medical advice, diagnosis or triage.");
  return lines.join("\n");
}

async function sharePack(profile: NonNullable<ReturnType<typeof useAppState>["profile"]>, entries: Entry[], format: Format) {
  const text = buildText(profile, entries, format);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "BumpNotes Appointment Pack", text });
      return;
    } catch { /* user cancelled */ }
  }
  await navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}
