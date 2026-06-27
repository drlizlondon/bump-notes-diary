import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { store } from "@/lib/bumpnotes/store";
import type { Entry, MeasurementKind } from "@/lib/bumpnotes/types";
import { toast } from "sonner";
import { useT } from "@/lib/bumpnotes/i18n";
import { UndoStrip } from "./UndoStrip";

type Tone = "coral" | "blush" | "mint" | "butter" | "lavender" | "primary";

const tonemap: Record<Tone, { bg: string; chip: string; ring: string; dot: string }> = {
  coral:    { bg: "bg-coral-soft",     chip: "bg-coral/15",    ring: "ring-coral/30",    dot: "bg-coral" },
  blush:    { bg: "bg-blush-soft",     chip: "bg-blush/40",    ring: "ring-coral/20",    dot: "bg-coral" },
  mint:     { bg: "bg-mint-soft",      chip: "bg-mint/40",     ring: "ring-mint/40",     dot: "bg-mint" },
  butter:   { bg: "bg-butter-soft",    chip: "bg-butter/40",   ring: "ring-butter/40",   dot: "bg-butter" },
  lavender: { bg: "bg-lavender-soft",  chip: "bg-lavender/40", ring: "ring-lavender/40", dot: "bg-lavender" },
  primary:  { bg: "bg-primary/10",     chip: "bg-primary/15",  ring: "ring-primary/25",  dot: "bg-primary" },
};

export function ActionCard({
  label, helper, tone, open, onToggle, icon, children,
}: {
  label: string; helper?: string; tone: Tone; open: boolean;
  onToggle: () => void; icon: ReactNode; children: ReactNode;
}) {
  const tn = tonemap[tone];
  return (
    <div className={`surface-card overflow-hidden transition-all ${open ? "ring-1 " + tn.ring : ""}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-4 py-4 text-left">
        <span className={`size-11 shrink-0 rounded-2xl grid place-items-center ${tn.bg}`}>
          <span className="text-ink">{icon}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[15px] leading-tight text-ink">{label}</span>
          {helper && <span className="block text-[12.5px] text-ink-soft mt-0.5 truncate">{helper}</span>}
        </span>
        <ChevronDown className={`size-5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-5 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

export function Chip({
  active, onClick, children,
}: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
        active ? "bg-primary text-primary-foreground border-primary"
               : "bg-white text-ink border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function loggedToast(label: string) {
  toast.success(label, { icon: <Check className="size-4 text-mint" />, duration: 2200 });
}

const inputClass = "w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60";
const primaryBtn = "w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50";
const secondaryBtn = "flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium";

/* -------------------------------- SYMPTOM -------------------------------- */

// Symptom keys + quantifier sets
type QtyKey = "severity" | "bleeding" | "movement" | null;

const SYMPTOMS: { key: string; tKey: string; qty: QtyKey }[] = [
  { key: "Headache", tKey: "sym.headache", qty: "severity" },
  { key: "Visual changes", tKey: "sym.visual", qty: null },
  { key: "Swelling", tKey: "sym.swelling", qty: "severity" },
  { key: "Abdominal pain", tKey: "sym.abdominal", qty: "severity" },
  { key: "Pelvic pain", tKey: "sym.pelvic", qty: "severity" },
  { key: "Back pain", tKey: "sym.back", qty: "severity" },
  { key: "Vaginal bleeding", tKey: "sym.bleeding", qty: "bleeding" },
  { key: "Fluid loss", tKey: "sym.fluid", qty: null },
  { key: "Itching", tKey: "sym.itching", qty: "severity" },
  { key: "Breathlessness", tKey: "sym.breathless", qty: "severity" },
  { key: "Nausea", tKey: "sym.nausea", qty: "severity" },
  { key: "Vomiting", tKey: "sym.vomiting", qty: "severity" },
  { key: "Dizziness", tKey: "sym.dizziness", qty: "severity" },
  { key: "Reduced movements", tKey: "sym.reducedMov", qty: "movement" },
  { key: "More movements than usual", tKey: "sym.moreMov", qty: "movement" },
  { key: "Cramps", tKey: "sym.cramps", qty: "severity" },
  { key: "Other symptom", tKey: "sym.other", qty: null },
];

const PAIN_LIKE = new Set(["Headache", "Abdominal pain", "Pelvic pain", "Back pain", "Cramps"]);

export function SymptomPanelBody() {
  const t = useT();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [quantifier, setQuantifier] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showUndo, setShowUndo] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function record(symptom: string) {
    // Re-tapping the same chip is a no-op
    if (selected === symptom && entryId) return;
    const e = store.addEntry({ type: "symptom", symptom } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    setEntryId(e.id);
    setSelected(symptom);
    setSeverity(null);
    setQuantifier(null);
    setNote("");
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5200);
  }

  function undo() {
    if (entryId) store.hardDelete(entryId);
    setEntryId(null); setSelected(null); setSeverity(null); setQuantifier(null); setNote("");
    toast.dismiss();
  }

  function patch(p: Partial<Entry>) {
    if (!entryId) return;
    store.updateEntry(entryId, p);
  }

  const def = selected ? SYMPTOMS.find((s) => s.key === selected) : undefined;
  const qtyOptions: { key: string; label: string }[] = (() => {
    if (!def) return [];
    if (def.qty === "severity") return [
      { key: "Mild", label: t("qty.mild") },
      { key: "Moderate", label: t("qty.moderate") },
      { key: "Severe", label: t("qty.severe") },
    ];
    if (def.qty === "bleeding") return [
      { key: "Spotting", label: t("qty.spotting") },
      { key: "Light", label: t("qty.light") },
      { key: "Moderate", label: t("qty.moderate") },
      { key: "Heavy", label: t("qty.heavy") },
    ];
    if (def.qty === "movement") return [
      { key: "Less than usual", label: t("qty.lessThanUsual") },
      { key: "Usual", label: t("qty.usual") },
      { key: "More than usual", label: t("qty.moreThanUsual") },
    ];
    return [];
  })();

  function commitNote(value: string) {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => patch({ note: value || undefined } as Partial<Entry>), 300);
  }

  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);

  return (
    <div className="space-y-4 pt-4">
      <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">{t("sym.prompt")}</p>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((s) => (
          <Chip key={s.key} active={selected === s.key} onClick={() => record(s.key)}>
            {t(s.tKey)}
          </Chip>
        ))}
      </div>

      {selected && entryId && (
        <div className="space-y-4 pt-2 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
          {showUndo && (
            <UndoStrip label={`${t(def?.tKey || "sym.other")} recorded`} onUndo={undo} />
          )}

          {qtyOptions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">{t("sym.quantifier")}</p>
              <div className="flex flex-wrap gap-2">
                {qtyOptions.map((q) => (
                  <Chip
                    key={q.key}
                    active={quantifier === q.key}
                    onClick={() => {
                      const next = quantifier === q.key ? null : q.key;
                      setQuantifier(next);
                      patch({ quantifier: next ?? undefined } as Partial<Entry>);
                    }}
                  >
                    {q.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {PAIN_LIKE.has(selected) && (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">{t("sym.severity")}</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => { setSeverity(n); patch({ severity: n } as Partial<Entry>); }}
                    className={`h-9 rounded-lg text-xs font-semibold border ${severity === n ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); commitNote(e.target.value); }}
            onBlur={() => patch({ note: note || undefined } as Partial<Entry>)}
            placeholder={t("common.notes")}
            rows={2}
            className={inputClass + " resize-none"}
          />
          <button
            type="button"
            onClick={() => { setEntryId(null); setSelected(null); setSeverity(null); setQuantifier(null); setNote(""); setShowUndo(false); }}
            className="text-xs text-ink-soft underline"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- QUESTION ------------------------------- */

const COMMON_PROMPTS = [
  "prompt.result", "prompt.why", "prompt.options",
  "prompt.time", "prompt.contact", "prompt.lookout",
];

export function QuestionPanelBody() {
  const t = useT();
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  function save(q: string, ctx?: string) {
    if (!q.trim()) return;
    store.addEntry({ type: "question", text: q.trim(), context: ctx?.trim() || undefined } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    loggedToast(t("q.saved"));
    setText(""); setContext("");
  }
  return (
    <div className="space-y-3 pt-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("q.placeholder")} rows={2} className={inputClass + " resize-none"} />
      <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder={t("q.context")} rows={2} className={inputClass + " resize-none"} />
      <button onClick={() => save(text, context)} disabled={!text.trim()} className={primaryBtn}>{t("q.save")}</button>
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">{t("q.common")}</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PROMPTS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setText(t(k))}
              className="px-3.5 py-2 rounded-full bg-white border border-border text-sm text-left hover:border-primary/40"
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ------------------------------ PEOPLE & CARE ----------------------------- */

const ROLE_KEYS = ["role.midwife","role.obstetrician","role.sonographer","role.gp","role.nurse","role.healthVisitor","role.doula","role.triage","role.other"];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PeopleCarePanelBody() {
  const t = useT();
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()));
  const [name, setName] = useState("");
  const [role, setRole] = useState("role.midwife");
  const [discussed, setDiscussed] = useState("");
  const [advised, setAdvised] = useState("");
  const [note, setNote] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function save() {
    const iso = new Date(when).toISOString();
    store.addEntry({
      type: "person",
      whenISO: iso,
      name: name || undefined,
      role: t(role) || undefined,
      discussed: discussed || undefined,
      advised: advised || undefined,
      note: note || undefined,
      dataUrl: dataUrl || undefined,
      createdAt: iso,
    } as Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt: string });
    loggedToast(t("p.saved"));
    setName(""); setDiscussed(""); setAdvised(""); setNote(""); setDataUrl(null);
  }

  return (
    <div className="space-y-3 pt-4">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ink-soft font-semibold">{t("p.dt")}</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass + " mt-1"} />
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("p.name")} className={inputClass} />
      <div className="flex flex-wrap gap-2">
        {ROLE_KEYS.map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{t(r)}</Chip>)}
      </div>
      <textarea value={discussed} onChange={(e) => setDiscussed(e.target.value)} placeholder={t("p.discussed")} rows={2} className={inputClass + " resize-none"} />
      <textarea value={advised} onChange={(e) => setAdvised(e.target.value)} placeholder={t("p.advised")} rows={2} className={inputClass + " resize-none"} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("common.notes")} rows={2} className={inputClass + " resize-none"} />
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full rounded-xl border border-border" />
      ) : (
        <label className="block w-full py-4 rounded-xl bg-white border border-dashed border-border text-center text-sm text-ink-soft cursor-pointer">
          {t("p.attach")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      <button onClick={save} className={primaryBtn}>{t("common.save")}</button>
    </div>
  );
}

/* ------------------------------ MEASUREMENTS ------------------------------ */

const MEASUREMENT_KINDS: { key: MeasurementKind; tKey: string; unit?: string }[] = [
  { key: "blood_pressure", tKey: "m.bp" },
  { key: "weight", tKey: "m.weight", unit: "kg" },
  { key: "blood_sugar", tKey: "m.bloodSugar", unit: "mmol/L" },
  { key: "movements", tKey: "m.movements", unit: "movements" },
  { key: "temperature", tKey: "m.temp", unit: "°C" },
  { key: "custom", tKey: "m.custom" },
];

export function MeasurementPanelBody() {
  const t = useT();
  const [kind, setKind] = useState<MeasurementKind>("blood_pressure");
  const [customLabel, setCustomLabel] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setSystolic(""); setDiastolic(""); setPulse(""); setValue(""); setUnit(""); setNote(""); setCustomLabel("");
  }

  function save() {
    const base = {
      type: "measurement" as const,
      kind,
      customLabel: kind === "custom" ? (customLabel || undefined) : undefined,
      note: note || undefined,
    };
    if (kind === "blood_pressure") {
      if (!systolic || !diastolic) return;
      store.addEntry({
        ...base,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : undefined,
      } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    } else {
      if (!value) return;
      store.addEntry({
        ...base,
        value: Number(value),
        unit: unit || MEASUREMENT_KINDS.find((m) => m.key === kind)?.unit,
      } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    }
    loggedToast(t("m.saved"));
    reset();
  }

  const preset = MEASUREMENT_KINDS.find((m) => m.key === kind);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap gap-2">
        {MEASUREMENT_KINDS.map((m) => (
          <Chip key={m.key} active={kind === m.key} onClick={() => { setKind(m.key); reset(); }}>{t(m.tKey)}</Chip>
        ))}
      </div>

      {kind === "custom" && (
        <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder={t("m.customLabel")} className={inputClass} />
      )}

      {kind === "blood_pressure" ? (
        <div className="grid grid-cols-3 gap-2">
          <input inputMode="numeric" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder={t("m.systolic")} className={inputClass} />
          <input inputMode="numeric" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder={t("m.diastolic")} className={inputClass} />
          <input inputMode="numeric" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder={t("m.pulse")} className={inputClass} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("m.value")} className={inputClass} />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={preset?.unit || t("m.unit")} className={inputClass} />
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("common.notes")} rows={2} className={inputClass + " resize-none"} />
      <p className="text-[11px] text-ink-soft">{t("m.disclaimer")}</p>
      <button onClick={save} className={primaryBtn}>{t("m.save")}</button>
    </div>
  );
}

/* --------------------------------- PHOTO --------------------------------- */

const PHOTO_TAGS = [
  { key: "Bump", tKey: "ph.bump" },
  { key: "Swelling", tKey: "ph.swelling" },
  { key: "Skin", tKey: "ph.skin" },
  { key: "Document", tKey: "ph.document" },
  { key: "Scan", tKey: "ph.scan" },
  { key: "Other", tKey: "ph.other" },
];

export function PhotoPanelBody() {
  const t = useT();
  const [tag, setTag] = useState("Bump");
  const [note, setNote] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function save() {
    if (!dataUrl) return;
    store.addEntry({ type: "photo", tag, dataUrl, note: note || undefined } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    loggedToast(t("ph.saved"));
    setDataUrl(null); setNote("");
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap gap-2">
        {PHOTO_TAGS.map((p) => <Chip key={p.key} active={tag === p.key} onClick={() => setTag(p.key)}>{t(p.tKey)}</Chip>)}
      </div>
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full aspect-square object-cover rounded-xl border border-border" />
      ) : (
        <label className="block w-full aspect-[4/3] rounded-xl bg-white border border-dashed border-border grid place-items-center text-sm text-ink-soft cursor-pointer">
          {t("ph.choose")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("ph.optionalNote")} rows={2} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!dataUrl} className={primaryBtn}>{t("ph.save")}</button>
    </div>
  );
}

/* -------------------------------- FEELING -------------------------------- */

const FEELINGS = [
  { key: "Calm", tKey: "f.calm" }, { key: "Happy", tKey: "f.happy" },
  { key: "Excited", tKey: "f.excited" }, { key: "Tired", tKey: "f.tired" },
  { key: "Anxious", tKey: "f.anxious" }, { key: "Worried", tKey: "f.worried" },
  { key: "Overwhelmed", tKey: "f.overwhelmed" }, { key: "Frustrated", tKey: "f.frustrated" },
  { key: "Sad", tKey: "f.sad" }, { key: "Other", tKey: "f.other" },
];

export function FeelingPanelBody() {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  function save() {
    if (!selected) return;
    store.addEntry({ type: "feeling", feeling: selected, note: note || undefined, privateOnly: true } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    loggedToast(`${t("type.feeling")}: ${selected}`);
    setSelected(null); setNote("");
  }
  return (
    <div className="space-y-3 pt-4">
      <p className="text-xs text-ink-soft">{t("f.note")}</p>
      <div className="flex flex-wrap gap-2">
        {FEELINGS.map((f) => <Chip key={f.key} active={selected === f.key} onClick={() => setSelected(f.key)}>{t(f.tKey)}</Chip>)}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("ph.optionalNote")} rows={2} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!selected} className={primaryBtn}>{t("f.save")}</button>
    </div>
  );
}

/* ---------------------------------- NOTE --------------------------------- */

export function NotePanelBody() {
  const t = useT();
  const [text, setText] = useState("");
  function save() {
    if (!text.trim()) return;
    store.addEntry({ type: "note", text: text.trim() } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    loggedToast(t("n.saved"));
    setText("");
  }
  return (
    <div className="space-y-3 pt-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("n.placeholder")} rows={4} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!text.trim()} className={primaryBtn}>{t("n.save")}</button>
    </div>
  );
}
