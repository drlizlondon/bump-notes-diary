import { TesterFeedbackButton } from "@/components/bumpnotes/TesterFeedbackButton";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { Play, Square, Plus, X } from "lucide-react";
import { store, useAppState } from "@/lib/bumpnotes/store";
import { AppShell, PageHeader } from "@/components/bumpnotes/AppShell";
import { useT } from "@/lib/bumpnotes/i18n";
import { formatUKDate, formatUKDateTime, formatUKTime } from "@/lib/bumpnotes/gestation";
import { formatDuration } from "@/lib/bumpnotes/summary";
import type { Entry, LabourPlan } from "@/lib/bumpnotes/types";

export const Route = createFileRoute("/labour")({
  head: () => ({ meta: [{ title: "Labour · BumpNotes" }] }),
  component: LabourPage,
});

function LabourPage() {
  const t = useT();
  const { entries, labourPlan } = useAppState();
  const plan: LabourPlan = labourPlan ?? store.getLabourPlan();
  const recording = !!plan.recordingStartISO;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Toaster position="top-center" />
      <AppShell>
        <PageHeader title={t("lab.title")} subtitle={t("lab.subtitle")} />
        <div className="px-4 lg:px-0 pb-10 space-y-5">

          {!recording ? (
            <>
              <button
                onClick={() => setConfirmOpen(true)}
                className="w-full text-left surface-card p-4 flex items-center gap-4 hover:ring-1 hover:ring-primary/30 transition"
              >
                <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-coral-soft">
                  <span className="text-lg">❤️</span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[15px] leading-tight text-ink">{t("lab.cta.iThink")}</span>
                  <span className="block text-[12.5px] text-ink-soft mt-0.5 leading-snug">{t("lab.cta.sub")}</span>
                </span>
              </button>

              <BirthPlanSection plan={plan} />

              <HospitalBagSection plan={plan} />
              <ImportantInfoSection plan={plan} />

              <p className="text-center text-xs text-ink-soft pt-2 px-4 leading-relaxed">
                {t("lab.summary.included")}
              </p>
            </>
          ) : (
            <LabourMode plan={plan} entries={entries} />
          )}

        </div>
        <TesterFeedbackButton />
      </AppShell>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end md:place-items-center px-4 py-6">
          <div className="surface-card p-5 w-full max-w-[440px] shadow-xl">
            <h3 className="font-serif text-lg font-semibold">{t("lab.confirm.title")}</h3>
            <p className="text-sm text-ink-soft mt-2 leading-relaxed">{t("lab.confirm.body")}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium">{t("common.cancel")}</button>
              <button
                onClick={() => { store.startLabourRecording(); setConfirmOpen(false); }}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                {t("lab.confirm.start")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------------- BIRTH PLAN ----------------------------- */

function BirthPlanSection({ plan }: { plan: LabourPlan }) {
  const t = useT();
  const [preferences, setPreferences] = useState(plan.preferences ?? "");
  const [painRelief, setPainRelief] = useState(plan.painRelief ?? "");
  const [partnerNotes, setPartnerNotes] = useState(plan.partnerNotes ?? "");
  const [notes, setNotes] = useState(plan.notes ?? "");

  function save() {
    store.updateLabourPlan({ preferences, painRelief, partnerNotes, notes });
    toast.success(t("lab.savedPlan"));
  }

  return (
    <section className="surface-card p-5 space-y-3">
      <h2 className="font-serif text-lg font-semibold">{t("lab.plan.title")}</h2>
      <Field label={t("lab.plan.prefs")} value={preferences} onChange={setPreferences} />
      <Field label={t("lab.plan.pain")} value={painRelief} onChange={setPainRelief} />
      <Field label={t("lab.plan.partner")} value={partnerNotes} onChange={setPartnerNotes} />
      <Field label={t("lab.plan.notes")} value={notes} onChange={setNotes} rows={4} />
      <button onClick={save} className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        {t("common.save")}
      </button>
    </section>
  );
}

function Field({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">{label}</span>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="mt-1 w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60 resize-none"
      />
    </label>
  );
}

/* ----------------------------- HOSPITAL BAG ----------------------------- */

function HospitalBagSection({ plan }: { plan: LabourPlan }) {
  const t = useT();
  const [newItem, setNewItem] = useState("");

  function toggle(id: string) {
    store.setBag(plan.bag.map((i) => i.id === id ? { ...i, packed: !i.packed } : i));
  }
  function remove(id: string) {
    store.setBag(plan.bag.filter((i) => i.id !== id));
  }
  function add() {
    if (!newItem.trim()) return;
    store.setBag([...plan.bag, { id: crypto.randomUUID(), label: newItem.trim(), packed: false }]);
    setNewItem("");
  }

  return (
    <section className="surface-card p-5">
      <h2 className="font-serif text-lg font-semibold mb-3">{t("lab.bag.title")}</h2>
      <ul className="space-y-1.5">
        {plan.bag.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-1.5">
            <input
              type="checkbox" checked={item.packed} onChange={() => toggle(item.id)}
              className="size-5 accent-[var(--primary)]"
            />
            <span className={`flex-1 text-sm ${item.packed ? "line-through text-ink-soft" : ""}`}>{item.label}</span>
            <button onClick={() => remove(item.id)} aria-label="Remove" className="text-ink-soft hover:text-destructive">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={newItem} onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={t("lab.bag.placeholder")}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
        />
        <button onClick={add} className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1">
          <Plus className="size-4" /> {t("lab.bag.add")}
        </button>
      </div>
    </section>
  );
}

/* ----------------------------- IMPORTANT INFO ----------------------------- */

function ImportantInfoSection({ plan }: { plan: LabourPlan }) {
  const t = useT();
  const [hospital, setHospital] = useState(plan.infoHospital ?? "");
  const [contacts, setContacts] = useState(plan.infoContacts ?? "");
  const [parking, setParking] = useState(plan.infoParking ?? "");
  const [childcare, setChildcare] = useState(plan.infoChildcare ?? "");
  const [notes, setNotes] = useState(plan.infoNotes ?? "");

  function save() {
    store.updateLabourPlan({
      infoHospital: hospital, infoContacts: contacts, infoParking: parking,
      infoChildcare: childcare, infoNotes: notes,
    });
    toast.success(t("common.save"));
  }

  return (
    <section className="surface-card p-5 space-y-3">
      <h2 className="font-serif text-lg font-semibold">{t("lab.info.title")}</h2>
      <Field label={t("lab.info.hospital")} value={hospital} onChange={setHospital} />
      <Field label={t("lab.info.contacts")} value={contacts} onChange={setContacts} />
      <Field label={t("lab.info.parking")} value={parking} onChange={setParking} />
      <Field label={t("lab.info.childcare")} value={childcare} onChange={setChildcare} />
      <Field label={t("lab.info.notes")} value={notes} onChange={setNotes} rows={3} />
      <button onClick={save} className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        {t("common.save")}
      </button>
    </section>
  );
}

/* ----------------------------- LABOUR MODE ----------------------------- */

const QUICK_EVENTS = [
  { key: "Waters broke", tKey: "lab.event.waters" },
  { key: "Show", tKey: "lab.event.show" },
  { key: "Baby movements", tKey: "lab.event.movements" },
  { key: "Spoke to midwife", tKey: "lab.event.midwife" },
  { key: "Hospital visit", tKey: "lab.event.hospital" },
  { key: "Pain relief", tKey: "lab.event.pain" },
  { key: "Other event", tKey: "lab.event.other" },
];

function LabourMode({ plan, entries }: { plan: LabourPlan; entries: Entry[] }) {
  const t = useT();
  const start = plan.recordingStartISO!;
  const labourEntries = useMemo(
    () => entries
      .filter((e) => !e.deletedAt && (e.type === "contraction" || e.type === "labour_event"))
      .filter((e) => e.createdAt >= start)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, start],
  );

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 blush-bg flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink-soft font-semibold">{t("lab.title")}</p>
          <p className="font-mono text-sm mt-0.5">{t("sum.labour.started")}: {formatUKDateTime(start)}</p>
        </div>
        <button
          onClick={() => { store.endLabourRecording(); toast.success(t("lab.endedRecording")); }}
          className="px-4 py-2 rounded-full bg-white border border-border text-xs font-semibold"
        >
          {t("lab.endRecording")}
        </button>
      </div>

      <ContractionRecorder />
      <QuickEvents />

      <section className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold mb-3">{t("lab.timeline.title")}</h3>
        {labourEntries.length === 0 ? (
          <p className="text-sm text-ink-soft">—</p>
        ) : (
          <ul className="space-y-2">
            {labourEntries.map((e) => (
              <li key={e.id} className="text-sm border-b border-border last:border-b-0 pb-2 last:pb-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ink-soft">
                  {formatUKDate(e.createdAt)} · {formatUKTime(e.createdAt)}
                </p>
                {e.type === "contraction" && (
                  <p className="mt-0.5"><span className="font-semibold">{t("type.contraction")}</span> · {formatDuration(e.durationSec)}{e.note ? ` · ${e.note}` : ""}</p>
                )}
                {e.type === "labour_event" && (
                  <p className="mt-0.5"><span className="font-semibold">{e.event}</span>{e.note ? ` · ${e.note}` : ""}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ContractionRecorder() {
  const t = useT();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  // Reference tick so React keeps it in the dep cycle visibly
  void tick;

  function start() { setStartedAt(Date.now()); }
  function stop() {
    if (startedAt === null) return;
    const endMs = Date.now();
    const durationSec = Math.max(1, Math.round((endMs - startedAt) / 1000));
    const startISO = new Date(startedAt).toISOString();
    const endISO = new Date(endMs).toISOString();
    store.addEntry({
      type: "contraction", startISO, endISO, durationSec, createdAt: startISO,
    } as Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt: string });
    toast.success(t("lab.contraction.saved"));
    setStartedAt(null);
  }

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  return (
    <section className="surface-card p-5">
      <h3 className="font-serif text-base font-semibold">{t("lab.contractions")}</h3>
      {startedAt !== null ? (
        <>
          <p className="mt-3 font-mono text-3xl text-primary">{formatDuration(elapsed)}</p>
          <p className="text-xs text-ink-soft mt-0.5">{t("lab.contraction.active")}</p>
          <button onClick={stop} className="mt-4 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2">
            <Square className="size-4" /> {t("lab.contraction.stop")}
          </button>
        </>
      ) : (
        <button onClick={start} className="mt-3 w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2">
          <Play className="size-4" /> {t("lab.contraction.start")}
        </button>
      )}
    </section>
  );
}

function QuickEvents() {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function save() {
    if (!selected) return;
    store.addEntry({
      type: "labour_event", event: selected, note: note || undefined,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    toast.success(t("lab.event.saved"));
    setSelected(null); setNote("");
  }

  return (
    <section className="surface-card p-5 space-y-3">
      <h3 className="font-serif text-base font-semibold">{t("lab.events.title")}</h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_EVENTS.map((q) => (
          <button
            key={q.key} onClick={() => setSelected(q.key)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border ${
              selected === q.key ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"
            }`}
          >
            {t(q.tKey)}
          </button>
        ))}
      </div>
      {selected && (
        <>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder={t("lab.event.note")}
            className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60 resize-none"
          />
          <button onClick={save} className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {t("lab.event.add")}
          </button>
        </>
      )}
    </section>
  );
}
