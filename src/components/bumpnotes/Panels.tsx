import { useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { store } from "@/lib/bumpnotes/store";
import type { Entry, MeasurementKind } from "@/lib/bumpnotes/types";
import { toast } from "sonner";

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
  label: string;
  helper?: string;
  tone: Tone;
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const t = tonemap[tone];
  return (
    <div className={`surface-card overflow-hidden transition-all ${open ? "ring-1 " + t.ring : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-4 text-left"
      >
        <span className={`size-11 shrink-0 rounded-2xl grid place-items-center ${t.bg}`}>
          <span className={`text-ink`}>{icon}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[15px] leading-tight text-ink">{label}</span>
          {helper && <span className="block text-[12.5px] text-ink-soft mt-0.5 truncate">{helper}</span>}
        </span>
        <ChevronDown
          className={`size-5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
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
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-ink border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function LoggedToast(label: string) {
  toast.success(label, { icon: <Check className="size-4 text-mint" />, duration: 2200 });
}

const inputClass = "w-full px-4 py-3 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60";
const primaryBtn = "w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50";
const secondaryBtn = "flex-1 py-3 rounded-full bg-white border border-border text-sm font-medium";

/* -------------------------------- SYMPTOM -------------------------------- */

const SYMPTOMS = [
  "Headache","Visual changes","Swelling","Abdominal pain","Pelvic pain","Back pain",
  "Vaginal bleeding","Fluid loss","Itching","Breathlessness","Nausea","Vomiting",
  "Dizziness","Reduced movements","More movements than usual","Cramps","Other symptom",
];
const PAIN_LIKE = new Set(["Headache","Abdominal pain","Pelvic pain","Back pain","Cramps"]);

export function SymptomPanelBody() {
  const [selected, setSelected] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [note, setNote] = useState("");

  function reset() { setSelected(null); setSeverity(null); setNote(""); }
  function save() {
    if (!selected) return;
    store.addEntry({
      type: "symptom",
      symptom: selected,
      severity: severity ?? undefined,
      note: note || undefined,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast(`${selected} saved`);
    reset();
  }

  return (
    <div className="space-y-4 pt-4">
      <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold">What are you noticing?</p>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((s) => (
          <Chip key={s} active={selected === s} onClick={() => { setSelected(s); setSeverity(null); }}>{s}</Chip>
        ))}
      </div>
      {selected && (
        <div className="space-y-4 pt-2 border-t border-border">
          {PAIN_LIKE.has(selected) && (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">Severity</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setSeverity(n)}
                    className={`h-9 rounded-lg text-xs font-semibold border ${severity === n ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional)" rows={2} className={inputClass + " resize-none"} />
          <div className="flex gap-2">
            <button onClick={reset} className={secondaryBtn}>Cancel</button>
            <button onClick={save} className={primaryBtn + " flex-[2]"}>Save symptom</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- QUESTION ------------------------------- */

const COMMON_PROMPTS = [
  "What does this result mean?",
  "Why is this being recommended?",
  "What are my options?",
  "What happens if I want more time?",
  "Who should I contact if I am worried?",
  "What should I look out for?",
];

export function QuestionPanelBody() {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  function save(q: string, ctx?: string) {
    if (!q.trim()) return;
    store.addEntry({ type: "question", text: q.trim(), context: ctx?.trim() || undefined } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast("Question saved");
    setText(""); setContext("");
  }
  return (
    <div className="space-y-3 pt-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Your question for your next appointment" rows={2} className={inputClass + " resize-none"} />
      <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context (optional)" rows={2} className={inputClass + " resize-none"} />
      <button onClick={() => save(text, context)} disabled={!text.trim()} className={primaryBtn}>Save question</button>
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">Common prompts</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PROMPTS.map((q) => (
            <button key={q} onClick={() => save(q)} className="px-3.5 py-2 rounded-full bg-white border border-border text-sm text-left hover:border-primary/40">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ PEOPLE & CARE ----------------------------- */

const ROLES = ["Midwife","Obstetrician","Sonographer","GP","Nurse","Health visitor","Doula","Triage","Other"];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PeopleCarePanelBody() {
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()));
  const [name, setName] = useState("");
  const [role, setRole] = useState("Midwife");
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
      role: role || undefined,
      discussed: discussed || undefined,
      advised: advised || undefined,
      note: note || undefined,
      dataUrl: dataUrl || undefined,
      createdAt: iso,
    } as Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt: string });
    LoggedToast("People & Care saved");
    setName(""); setDiscussed(""); setAdvised(""); setNote(""); setDataUrl(null);
  }

  return (
    <div className="space-y-3 pt-4">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ink-soft font-semibold">Date and time</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass + " mt-1"} />
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={inputClass} />
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>)}
      </div>
      <textarea value={discussed} onChange={(e) => setDiscussed(e.target.value)} placeholder="What was discussed?" rows={2} className={inputClass + " resize-none"} />
      <textarea value={advised} onChange={(e) => setAdvised(e.target.value)} placeholder="What did they advise or say?" rows={2} className={inputClass + " resize-none"} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional)" rows={2} className={inputClass + " resize-none"} />
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full rounded-xl border border-border" />
      ) : (
        <label className="block w-full py-4 rounded-xl bg-white border border-dashed border-border text-center text-sm text-ink-soft cursor-pointer">
          Attach a photo or document
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      <button onClick={save} className={primaryBtn}>Save</button>
    </div>
  );
}

/* ------------------------------ MEASUREMENTS ------------------------------ */

const MEASUREMENT_KINDS: { key: MeasurementKind; label: string; unit?: string }[] = [
  { key: "blood_pressure", label: "Blood pressure" },
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "blood_sugar", label: "Blood sugar", unit: "mmol/L" },
  { key: "movements", label: "Baby movements", unit: "movements" },
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "custom", label: "Custom" },
];

export function MeasurementPanelBody() {
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
    LoggedToast("Measurement saved");
    reset();
  }

  const preset = MEASUREMENT_KINDS.find((m) => m.key === kind);

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap gap-2">
        {MEASUREMENT_KINDS.map((m) => (
          <Chip key={m.key} active={kind === m.key} onClick={() => { setKind(m.key); reset(); }}>{m.label}</Chip>
        ))}
      </div>

      {kind === "custom" && (
        <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="What are you measuring?" className={inputClass} />
      )}

      {kind === "blood_pressure" ? (
        <div className="grid grid-cols-3 gap-2">
          <input inputMode="numeric" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="Systolic" className={inputClass} />
          <input inputMode="numeric" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="Diastolic" className={inputClass} />
          <input inputMode="numeric" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="Pulse" className={inputClass} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className={inputClass} />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={preset?.unit || "Unit"} className={inputClass} />
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional)" rows={2} className={inputClass + " resize-none"} />
      <p className="text-[11px] text-ink-soft">BumpNotes records your readings. It does not interpret them.</p>
      <button onClick={save} className={primaryBtn}>Save measurement</button>
    </div>
  );
}

/* --------------------------------- PHOTO --------------------------------- */

const PHOTO_TAGS = ["Bump","Swelling","Skin","Document","Scan","Other"];

export function PhotoPanelBody() {
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
    LoggedToast("Photo saved");
    setDataUrl(null); setNote("");
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap gap-2">
        {PHOTO_TAGS.map((t) => <Chip key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Chip>)}
      </div>
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full aspect-square object-cover rounded-xl border border-border" />
      ) : (
        <label className="block w-full aspect-[4/3] rounded-xl bg-white border border-dashed border-border grid place-items-center text-sm text-ink-soft cursor-pointer">
          Tap to choose a photo or document
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!dataUrl} className={primaryBtn}>Save photo</button>
    </div>
  );
}

/* -------------------------------- FEELING -------------------------------- */

const FEELINGS = ["Calm","Happy","Excited","Tired","Anxious","Worried","Overwhelmed","Frustrated","Sad","Other"];

export function FeelingPanelBody() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  function save() {
    if (!selected) return;
    store.addEntry({ type: "feeling", feeling: selected, note: note || undefined, privateOnly: true } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast(`Feeling: ${selected}`);
    setSelected(null); setNote("");
  }
  return (
    <div className="space-y-3 pt-4">
      <p className="text-xs text-ink-soft">Kept out of your summary unless you choose to include it.</p>
      <div className="flex flex-wrap gap-2">
        {FEELINGS.map((f) => <Chip key={f} active={selected === f} onClick={() => setSelected(f)}>{f}</Chip>)}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!selected} className={primaryBtn}>Save feeling</button>
    </div>
  );
}

/* ---------------------------------- NOTE --------------------------------- */

export function NotePanelBody() {
  const [text, setText] = useState("");
  function save() {
    if (!text.trim()) return;
    store.addEntry({ type: "note", text: text.trim() } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast("Note saved");
    setText("");
  }
  return (
    <div className="space-y-3 pt-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Notes, thoughts or anything else" rows={4} className={inputClass + " resize-none"} />
      <button onClick={save} disabled={!text.trim()} className={primaryBtn}>Save note</button>
    </div>
  );
}
