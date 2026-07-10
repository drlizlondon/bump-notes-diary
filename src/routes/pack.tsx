import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader, PregnancySummaryAside } from "@/components/bumpnotes/AppShell";
import {
  formatGestation,
  formatUKDate,
  formatUKDateLong,
  formatUKDateTime,
  formatUKTime,
  gestationFromDueDate,
} from "@/lib/bumpnotes/gestation";
import { summariseEntry } from "@/lib/bumpnotes/summary";
import { useT, t as tFn } from "@/lib/bumpnotes/i18n";
import {
  buildPregnancySummaryWeeks,
  type PregnancySummarySection,
} from "@/lib/bumpnotes/pregnancy-summary";
import type { Entry, EntryType, Profile, LabourPlan } from "@/lib/bumpnotes/types";
import { downloadSummaryPdf } from "@/lib/bumpnotes/pdf";
import {
  PregnancySummaryPreview,
  hasLabourData,
} from "@/components/bumpnotes/PregnancySummaryPreview";

export const Route = createFileRoute("/pack")({
  head: () => ({ meta: [{ title: "Pregnancy Summary · BumpNotes" }] }),
  component: SummaryPage,
});

function typeLabels(): Record<EntryType, string> {
  return {
    symptom: "Symptoms & Signs",
    question: tFn("type.question"),
    person: tFn("type.person"),
    appointment: tFn("type.person"),
    measurement: tFn("type.measurement"),
    photo: tFn("type.photo"),
    note: tFn("type.note"),
    labour: tFn("sum.labour.title"),
    labour_event: tFn("sum.labour.title"),
    contraction: tFn("type.contraction"),
    feeling: tFn("type.feeling"),
    concern: "Concerns",
  };
}

function defaultIncluded(): Record<EntryType, boolean> {
  return {
    symptom: true,
    question: true,
    person: true,
    appointment: true,
    measurement: true,
    photo: true,
    note: true,
    labour: true,
    labour_event: true,
    contraction: true,
    concern: true,
    feeling: false,
  };
}

function isLabourSummaryEntry(entry: Entry): boolean {
  return entry.type === "labour" || entry.type === "labour_event" || entry.type === "contraction";
}

type Step = 1 | 2 | 3;
type ReviewTarget = { title: string; entryIds: string[] };

function SummaryPage() {
  const { profile, entries, labourPlan } = useAppState();
  const t = useT();
  const [step, setStep] = useState<Step>(1);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [included, setIncluded] = useState<Record<EntryType, boolean>>(defaultIncluded);
  const [groupMeasurements, setGroupMeasurements] = useState(true);
  const [hiddenSummaryItems, setHiddenSummaryItems] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

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
      .filter((e) => (isLabourSummaryEntry(e) ? included.labour : included[e.type]))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [liveEntries, activeWeeks, included]);

  if (!profile) {
    return (
      <>
        <Toaster position="top-center" />
        <AppShell right={<PregnancySummaryAside />}>
          <PageHeader title={t("sum.title")} subtitle={t("sum.subtitle")} />
          <div className="px-4 lg:px-0 pb-10">
            <div className="surface-card blush-bg p-6 text-center">
              <p className="font-serif text-lg font-semibold">
                Create your account to make your first summary
              </p>
              <p className="text-sm text-ink-soft mt-2 leading-relaxed">
                Once you've added a few entries to your pregnancy record, you can build a Pregnancy
                Summary to share with your care team.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
                <a
                  href="/onboarding"
                  className="inline-flex justify-center px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Start your pregnancy record
                </a>
                <a
                  href="/demo"
                  className="inline-flex justify-center px-5 py-3 rounded-full bg-white border border-border text-sm font-medium"
                >
                  See a preview
                </a>
              </div>
            </div>
          </div>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <AppShell right={<PregnancySummaryAside />}>
        <PageHeader title={t("sum.title")} subtitle={t("sum.subtitle")} />
        <div className="px-4 lg:px-0 pb-10 space-y-5">
          <div className="surface-card blush-bg p-4 text-sm text-ink-soft leading-relaxed">
            {t("sum.intro")}
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
            <StepReviewCustomise
              profile={profile}
              entries={selected}
              included={included}
              setIncluded={setIncluded}
              groupMeasurements={groupMeasurements}
              setGroupMeasurements={setGroupMeasurements}
              labourPlan={included.labour ? labourPlan : undefined}
              hiddenItemKeys={hiddenSummaryItems}
              onHideItem={(key) => setHiddenSummaryItems((s) => new Set(s).add(key))}
              onUnhideItem={(key) =>
                setHiddenSummaryItems((s) => {
                  const next = new Set(s);
                  next.delete(key);
                  return next;
                })
              }
              onReviewItem={(title, entryIds) => setReviewTarget({ title, entryIds })}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepCreate
              profile={profile}
              entries={selected}
              groupMeasurements={groupMeasurements}
              labourPlan={included.labour ? labourPlan : undefined}
              hiddenItemKeys={hiddenSummaryItems}
              onBack={() => setStep(2)}
              onCopy={() => {
                const txt = buildText(
                  profile,
                  selected,
                  groupMeasurements,
                  included.labour ? labourPlan : undefined,
                  hiddenSummaryItems,
                );
                navigator.clipboard.writeText(txt).then(() => toast.success(t("sum.copied")));
              }}
              onPrint={() => {
                downloadSummaryPdf({
                  profile,
                  entries: selected,
                  groupMeasurements,
                  labourPlan: included.labour ? labourPlan : undefined,
                  hiddenItemKeys: hiddenSummaryItems,
                });
                toast.success("PDF downloaded");
              }}
              onShare={() =>
                sharePack(
                  profile,
                  selected,
                  groupMeasurements,
                  included.labour ? labourPlan : undefined,
                  hiddenSummaryItems,
                )
              }
            />
          )}
        </div>
        <TesterFeedbackButton />
      </AppShell>
      {reviewTarget && (
        <ReviewRecordsModal
          target={reviewTarget}
          entries={liveEntries}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const t = useT();
  const labels = [t("sum.stepWeeks"), t("sum.stepReview"), t("sum.stepCreate")];
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold mt-2">
        {t("sum.step", { n: step })} · {labels[step - 1]}
      </p>
    </div>
  );
}

function StepWeeks({
  allWeeks,
  selected,
  onChange,
  onNext,
}: {
  allWeeks: number[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
  onNext: () => void;
}) {
  const t = useT();
  function toggle(w: number) {
    const next = new Set(selected.size === 0 ? allWeeks : selected);
    if (next.has(w)) next.delete(w);
    else next.add(w);
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
              <button
                onClick={() => onChange(new Set(allWeeks))}
                className={`px-3.5 py-2 rounded-full text-sm font-medium border ${isAll ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}
              >
                {t("sum.weeks.all")}
              </button>
              <button
                onClick={() => onChange(new Set())}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-white border border-border"
              >
                {t("sum.weeks.reset")}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {allWeeks.map((w) => {
                const active = isAll || selected.has(w);
                return (
                  <button
                    key={w}
                    onClick={() => toggle(w)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}
                  >
                    {t("home.week")} {w}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
      >
        {t("sum.weeks.continue")}
      </button>
    </div>
  );
}

function StepReviewCustomise({
  profile,
  entries,
  included,
  setIncluded,
  groupMeasurements,
  setGroupMeasurements,
  labourPlan,
  hiddenItemKeys,
  onHideItem,
  onUnhideItem,
  onReviewItem,
  onBack,
  onNext,
}: {
  profile: Profile;
  entries: Entry[];
  included: Record<EntryType, boolean>;
  setIncluded: (r: Record<EntryType, boolean>) => void;
  groupMeasurements: boolean;
  setGroupMeasurements: (b: boolean) => void;
  labourPlan?: LabourPlan;
  hiddenItemKeys: Set<string>;
  onHideItem: (key: string) => void;
  onUnhideItem: (key: string) => void;
  onReviewItem: (title: string, entryIds: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const TYPE_LABELS = typeLabels();
  const displayTypes: EntryType[] = [
    "symptom",
    "feeling",
    "question",
    "person",
    "measurement",
    "note",
    "labour",
  ];
  return (
    <div className="space-y-3">
      <div className="surface-card p-4 sm:p-5">
        <h3 className="font-serif text-base font-semibold">{t("sum.include")}</h3>
        <p className="text-xs text-ink-soft mt-1">
          Tap to include or exclude a category. Everything is selected by default.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {displayTypes.map((tp) => {
            const active = included[tp];
            return (
              <button
                key={tp}
                type="button"
                onClick={() => {
                  const next = { ...included, [tp]: !active };
                  if (tp === "person") next.appointment = !active;
                  if (tp === "labour") {
                    next.contraction = !active;
                    next.labour_event = !active;
                  }
                  setIncluded(next);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-border text-ink-soft"
                }`}
              >
                {TYPE_LABELS[tp]}
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex items-start gap-3 pt-3 border-t border-border">
          <input
            type="checkbox"
            checked={groupMeasurements}
            onChange={(e) => setGroupMeasurements(e.target.checked)}
            className="size-4 mt-0.5 accent-[var(--primary)]"
          />
          <span>
            <span className="block text-sm font-medium">{t("sum.groupM")}</span>
            <span className="block text-xs text-ink-soft mt-0.5">{t("sum.groupM.sub")}</span>
          </span>
        </label>
      </div>

      <PreviewCard
        profile={profile}
        entries={entries}
        groupMeasurements={groupMeasurements}
        labourPlan={labourPlan}
        hiddenItemKeys={hiddenItemKeys}
        onHideItem={onHideItem}
        onUnhideItem={onUnhideItem}
        onReviewItem={onReviewItem}
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onBack}
          className="py-3 rounded-full bg-white border border-border text-sm font-medium"
        >
          {t("common.back")}
        </button>
        <button
          onClick={onNext}
          className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

function StepCreate({
  profile,
  entries,
  groupMeasurements,
  labourPlan,
  hiddenItemKeys,
  onBack,
  onCopy,
  onPrint,
  onShare,
}: {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
  hiddenItemKeys: Set<string>;
  onBack: () => void;
  onCopy: () => void;
  onPrint: () => void;
  onShare: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <PreviewCard
        profile={profile}
        entries={entries}
        groupMeasurements={groupMeasurements}
        labourPlan={labourPlan}
        hiddenItemKeys={hiddenItemKeys}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:hidden">
        <button
          onClick={onBack}
          className="py-3 rounded-full bg-white border border-border text-sm font-medium"
        >
          {t("common.back")}
        </button>
        <button
          onClick={onCopy}
          className="py-3 rounded-full bg-white border border-border text-sm font-medium"
        >
          {t("sum.copy")}
        </button>
        <button
          onClick={onShare}
          className="py-3 rounded-full bg-white border border-border text-sm font-medium"
        >
          {t("sum.share")}
        </button>
        <button
          onClick={onPrint}
          className="py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          {t("sum.pdf")}
        </button>
      </div>
    </div>
  );
}

function PreviewCard(props: {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
  hiddenItemKeys?: Set<string>;
  onHideItem?: (key: string) => void;
  onUnhideItem?: (key: string) => void;
  onReviewItem?: (title: string, entryIds: string[]) => void;
}) {
  return <PregnancySummaryPreview {...props} />;
}

function buildText(
  profile: Profile,
  entries: Entry[],
  _groupMeasurements: boolean,
  labourPlan?: LabourPlan,
  hiddenItemKeys?: Set<string>,
) {
  const lines: string[] = [];
  lines.push(tFn("sum.header.title"));
  lines.push(tFn("sum.header.intro"));
  lines.push("");
  lines.push(`${tFn("sum.field.name")}: ${profile.userName}`);
  lines.push(`${tFn("sum.field.baby")}: ${profile.babyNickname?.trim() || tFn("baby.fallback")}`);
  lines.push(`${tFn("sum.field.due")}: ${formatUKDateLong(profile.dueDateISO)}`);
  lines.push(
    `${tFn("sum.field.today")}: ${formatGestation(gestationFromDueDate(profile.dueDateISO))}`,
  );
  lines.push(`${tFn("sum.field.generated")}: ${formatUKDateTime(new Date())}`);
  lines.push("");

  buildPregnancySummaryWeeks(profile, entries, labourPlan, { hiddenItemKeys }).forEach((week) => {
    lines.push(`${tFn("home.week")} ${week.week}`);
    week.sections.forEach((section) => {
      lines.push(section.title);
      lines.push(...sectionTextLines(section));
      lines.push("");
    });
    lines.push("");
  });

  lines.push(tFn("sum.foot").replace("{name}", profile.userName));
  return lines.join("\n");
}

function sectionTextLines(section: PregnancySummarySection): string[] {
  if (section.type === "symptoms") {
    return section.items.flatMap((item) => [
      `• ${item.symptom}${item.count > 1 ? ` ×${item.count}` : ""}`,
      ...item.qualifiers.map((qualifier) => `    • ${qualifier}`),
    ]);
  }
  if (section.type === "feelings") {
    return section.items.map(
      (item) => `• ${item.feeling}${item.days > 1 ? `, ${item.days} days this week` : ""}`,
    );
  }
  if (section.type === "people") {
    return section.groups.flatMap((group) => [
      group.professional,
      ...group.items.map((item) => `• ${item}`),
      "",
    ]);
  }
  if (section.type === "measurements") {
    return section.items.flatMap((item) => [item.label, item.value, ""]);
  }
  return section.items.map((item) => `• ${item.text}`);
}

function ReviewRecordsModal({
  target,
  entries,
  onClose,
}: {
  target: ReviewTarget;
  entries: Entry[];
  onClose: () => void;
}) {
  const matching = entries
    .filter((entry) => target.entryIds.includes(entry.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [editing, setEditing] = useState<Entry | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6">
      <div className="surface-card w-full max-w-[620px] max-h-[86vh] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-border">
          <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">
            Review
          </p>
          <h3 className="font-serif text-lg font-semibold mt-1">{target.title}</h3>
          <p className="text-xs text-ink-soft mt-1">
            These are the underlying records used for this summary item.
          </p>
        </div>
        <div className="p-5 overflow-y-auto max-h-[58vh] space-y-3">
          {matching.length === 0 ? (
            <p className="text-sm text-ink-soft">
              This item is from Labour Journey setup rather than an individual timeline record.
            </p>
          ) : (
            matching.map((entry) => {
              const summary = summariseEntry(entry);
              return (
                <article key={entry.id} className="rounded-xl border border-border bg-white p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                    {formatUKDate(entry.createdAt)} · {formatUKTime(entry.createdAt)}
                  </p>
                  <p className="font-semibold text-sm mt-1">{summary.headline}</p>
                  {summary.detail && <p className="text-sm text-ink-soft mt-1">{summary.detail}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(entry)}
                      className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => store.softDelete(entry.id)}
                      className="rounded-full border border-destructive/30 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </div>
      {editing && <ReviewEditDialog entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function getEditableText(entry: Entry): string {
  switch (entry.type) {
    case "note":
    case "question":
      return entry.text;
    case "concern":
    case "symptom":
    case "feeling":
    case "labour":
    case "labour_event":
    case "contraction":
    case "photo":
      return entry.note ?? "";
    case "appointment":
    case "person":
      return entry.discussed ?? "";
    case "measurement":
      return entry.note ?? "";
    default:
      return "";
  }
}

function ReviewEditDialog({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const t = useT();
  const [text, setText] = useState(() => getEditableText(entry));

  function save() {
    const patch: Partial<Entry> = {};
    switch (entry.type) {
      case "note":
      case "question":
        (patch as { text: string }).text = text;
        break;
      case "concern":
      case "symptom":
      case "feeling":
      case "labour":
      case "labour_event":
      case "contraction":
      case "photo":
      case "measurement":
        (patch as { note?: string }).note = text || undefined;
        break;
      case "appointment":
      case "person":
        (patch as { discussed?: string }).discussed = text || undefined;
        break;
    }
    store.updateEntry(entry.id, patch);
    onClose();
  }

  return (
    <div className="absolute inset-0 z-10 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6">
      <div className="surface-card p-5 w-full max-w-[440px] shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-3">{t("tl.editEntry")}</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm resize-none"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

async function sharePack(
  profile: Profile,
  entries: Entry[],
  groupMeasurements: boolean,
  labourPlan?: LabourPlan,
  hiddenItemKeys?: Set<string>,
) {
  const text = buildText(profile, entries, groupMeasurements, labourPlan, hiddenItemKeys);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: tFn("sum.header.title"), text });
      return;
    } catch {
      /* user cancelled */
    }
  }
  await navigator.clipboard.writeText(text);
  toast.success(tFn("sum.copied"));
}
