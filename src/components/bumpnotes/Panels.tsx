import { useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { store } from "@/lib/bumpnotes/store";
import type { Entry } from "@/lib/bumpnotes/types";
import { toast } from "sonner";

type Tone = "peach" | "rose" | "sage" | "butter" | "lilac" | "primary";

const tonemap: Record<Tone, { bg: string; chip: string; ring: string; dot: string }> = {
  peach:   { bg: "bg-peach-soft", chip: "bg-peach/30", ring: "ring-peach/30", dot: "bg-peach" },
  rose:    { bg: "bg-rose-soft", chip: "bg-rose/25", ring: "ring-rose/30", dot: "bg-rose" },
  sage:    { bg: "bg-sage-soft", chip: "bg-sage/30", ring: "ring-sage/30", dot: "bg-sage" },
  butter:  { bg: "bg-butter-soft", chip: "bg-butter/35", ring: "ring-butter/30", dot: "bg-butter" },
  lilac:   { bg: "bg-lilac-soft", chip: "bg-lilac/30", ring: "ring-lilac/30", dot: "bg-lilac" },
  primary: { bg: "bg-primary/15", chip: "bg-primary/20", ring: "ring-primary/30", dot: "bg-primary" },
};

export function ActionCard({
  label,
  tone,
  open,
  onToggle,
  badge,
  children,
}: {
  label: string;
  tone: Tone;
  open: boolean;
  onToggle: () => void;
  badge?: number;
  children: ReactNode;
}) {
  const t = tonemap[tone];
  return (
    <div className={`${t.bg} rounded-3xl ring-1 ${t.ring} overflow-hidden transition-all`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className={`size-2.5 rounded-full ${t.dot}`} />
          <span className="font-semibold text-base">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="text-[10px] font-mono bg-white/70 rounded-full px-2 py-0.5">
              {badge} today
            </span>
          )}
        </span>
        <ChevronDown
          className={`size-5 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-5 pt-1">{children}</div>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium ring-1 transition-all ${
        active
          ? "bg-primary text-primary-foreground ring-primary shadow-sm"
          : "bg-white/80 text-ink ring-black/5 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function LoggedToast(label: string) {
  toast.success(label, {
    icon: <Check className="size-4 text-sage" />,
    duration: 2200,
  });
}

/* -------------------------------- SYMPTOM -------------------------------- */

const SYMPTOMS = [
  "Headache","Visual changes","Swelling","Abdominal pain","Pelvic pain","Back pain",
  "Vaginal bleeding","Fluid loss","Itching","Breathlessness","Nausea","Vomiting",
  "Dizziness","Reduced movements","More movements than usual","Cramps","Contractions","Other symptom",
];

const PAIN_LIKE = new Set(["Headache","Abdominal pain","Pelvic pain","Back pain","Cramps","Contractions"]);
const LOCATION_LIKE = new Set(["Abdominal pain","Pelvic pain","Back pain","Cramps"]);

export function SymptomPanelBody({ onLogged }: { onLogged?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [severity, setSeverity] = useState<number | null>(null);
  const [clarification, setClarification] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [note, setNote] = useState<string>("");

  function reset() {
    setSelected(null);
    setSeverity(null);
    setClarification("");
    setLocation("");
    setNote("");
  }

  function save() {
    if (!selected) return;
    store.addEntry({
      type: "symptom",
      symptom: selected,
      severity: severity ?? undefined,
      clarification: clarification || undefined,
      location: location || undefined,
      note: note || undefined,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast(`${selected} saved`);
    reset();
    onLogged?.();
  }

  const clarifyOptions: Record<string, string[]> = {
    "Vaginal bleeding": ["Light","Moderate","Heavy","Unsure"],
    "Fluid loss": ["Small amount","Gush","Ongoing leaking","Unsure"],
    "Visual changes": ["Blurred vision","Flashing lights","Spots","Other"],
    "Swelling": ["Hands","Feet","Face","Other"],
    "Itching": ["Hands/feet","Generalised","Other"],
    "Breathlessness": ["Mild","Moderate","Severe"],
    "Nausea": ["Mild","Moderate","Severe"],
    "Vomiting": ["Mild","Moderate","Severe"],
  };

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold px-1">
        What are you noticing?
      </p>
      <div className="flex flex-wrap gap-2">
        {SYMPTOMS.map((s) => (
          <Chip key={s} active={selected === s} onClick={() => { setSelected(s); setSeverity(null); setClarification(""); }}>
            {s}
          </Chip>
        ))}
      </div>

      {selected && (
        <div className="space-y-4 pt-2 border-t border-black/5 mt-2">
          {(PAIN_LIKE.has(selected)) && (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2 px-1">
                Severity
              </p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setSeverity(n)}
                    className={`h-9 rounded-xl text-xs font-semibold ring-1 transition ${
                      severity === n
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-white/80 ring-black/5"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {clarifyOptions[selected] && (
            <div className="flex flex-wrap gap-2">
              {clarifyOptions[selected].map((o) => (
                <Chip key={o} active={clarification === o} onClick={() => setClarification(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          )}

          {LOCATION_LIKE.has(selected) && (
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where? (optional)"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm"
            />
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            rows={2}
            className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none"
          />

          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-full bg-white/70 ring-1 ring-black/5 text-sm font-medium">
              Cancel
            </button>
            <button onClick={save} className="flex-[2] py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              Save symptom
            </button>
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
  "What happens if I say no or want more time?",
  "Who should I contact if I am worried?",
  "Can you explain that again?",
  "What should I look out for?",
  "Can this be written in my notes?",
];

export function QuestionPanelBody() {
  const [text, setText] = useState("");
  function save(q: string) {
    if (!q.trim()) return;
    store.addEntry({ type: "question", text: q.trim() } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast("Question saved");
    setText("");
  }
  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a question to remember…"
        rows={2}
        className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none"
      />
      <button
        onClick={() => save(text)}
        disabled={!text.trim()}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        Add question
      </button>
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2 px-1">
          Common prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => save(q)}
              className="px-4 py-2 rounded-full bg-white/80 ring-1 ring-black/5 text-sm text-left hover:bg-white"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ APPOINTMENT ------------------------------ */

const APPT_KINDS = ["Midwife","Consultant","Scan","Triage","GP","Blood test","Growth scan","Hospital visit","Other"];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentPanelBody() {
  const [kind, setKind] = useState("Midwife");
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()));
  const [whoSeen, setWhoSeen] = useState("");
  const [discussed, setDiscussed] = useState("");
  const [advice, setAdvice] = useState("");
  const [questionsAnswered, setQuestionsAnswered] = useState("");
  const [followUp, setFollowUp] = useState("");

  function save() {
    const iso = new Date(when).toISOString();
    store.addEntry({
      type: "appointment",
      kind,
      whenISO: iso,
      whoSeen: whoSeen || undefined,
      discussed: discussed || undefined,
      advice: advice || undefined,
      questionsAnswered: questionsAnswered || undefined,
      followUp: followUp || undefined,
      createdAt: iso,
    } as Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt: string });
    LoggedToast("Appointment saved");
    setWhoSeen(""); setDiscussed(""); setAdvice(""); setQuestionsAnswered(""); setFollowUp("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {APPT_KINDS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ink-soft font-semibold">When</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm" />
      </label>
      {[
        ["Who I saw", whoSeen, setWhoSeen],
        ["What was discussed", discussed, setDiscussed],
        ["Advice given", advice, setAdvice],
        ["Questions answered", questionsAnswered, setQuestionsAnswered],
        ["Follow-up mentioned", followUp, setFollowUp],
      ].map(([label, val, set]) => (
        <textarea
          key={label as string}
          value={val as string}
          onChange={(e) => (set as (s: string) => void)(e.target.value)}
          placeholder={label as string}
          rows={2}
          className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none"
        />
      ))}
      <button onClick={save} className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        Save appointment
      </button>
    </div>
  );
}

/* --------------------------------- PHOTO --------------------------------- */

const PHOTO_TAGS = ["Bump","Swelling","Rash/skin","Medication","Letter/document","Scan","Other"];

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
    store.addEntry({
      type: "photo", tag, dataUrl, note: note || undefined,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast("Photo saved");
    setDataUrl(null); setNote("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PHOTO_TAGS.map((t) => <Chip key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Chip>)}
      </div>
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full aspect-square object-cover rounded-2xl ring-1 ring-black/5" />
      ) : (
        <label className="block w-full aspect-[4/3] rounded-2xl bg-white/70 ring-1 ring-dashed ring-black/15 grid place-items-center text-sm text-ink-soft cursor-pointer">
          <span>Tap to choose a photo</span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2}
        className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none"
      />
      <button onClick={save} disabled={!dataUrl}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
        Save photo
      </button>
    </div>
  );
}

/* -------------------------------- LABOUR --------------------------------- */

const LABOUR_EVENTS = [
  "Contraction","Waters broke","Bleeding","Pressure","Pain","Called triage",
  "Going to hospital","Arrived at hospital","Seen by midwife/doctor","Other",
];

export function LabourPanelBody({ contractionsToday }: { contractionsToday: { id: string; createdAt: string }[] }) {
  function log(ev: string) {
    store.addEntry({ type: "labour", event: ev } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast(ev);
  }
  return (
    <div className="space-y-4">
      <button
        onClick={() => log("I think I'm in labour")}
        className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold"
      >
        I think I'm in labour
      </button>
      <div className="flex flex-wrap gap-2">
        {LABOUR_EVENTS.map((e) => (
          <Chip key={e} onClick={() => log(e)}>{e}</Chip>
        ))}
      </div>
      {contractionsToday.length > 0 && (
        <div className="bg-white/70 rounded-2xl p-3 ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold mb-2">
            Contractions today
          </p>
          <ul className="space-y-1 font-mono text-xs">
            {contractionsToday.slice(0, 12).map((c, i) => (
              <li key={c.id} className="flex justify-between">
                <span>#{contractionsToday.length - i}</span>
                <span>{new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- FEELING -------------------------------- */

const FEELINGS = ["Happy","Excited","Calm","Tired","Anxious","Worried","Overwhelmed","Frustrated","Scared","Sad","Other"];

export function FeelingPanelBody() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  function save() {
    if (!selected) return;
    store.addEntry({
      type: "feeling", feeling: selected, note: note || undefined, privateOnly: true,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    LoggedToast(`Feeling: ${selected}`);
    setSelected(null); setNote("");
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft px-1">Private diary — kept out of shared packs unless you choose to include it.</p>
      <div className="flex flex-wrap gap-2">
        {FEELINGS.map((f) => <Chip key={f} active={selected === f} onClick={() => setSelected(f)}>{f}</Chip>)}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2}
        className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none" />
      <button onClick={save} disabled={!selected}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
        Save feeling
      </button>
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
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Something to remember…" rows={4}
        className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none" />
      <button onClick={save} disabled={!text.trim()}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
        Save note
      </button>
    </div>
  );
}

/* -------------------------------- CONCERN -------------------------------- */

const CONCERNS = [
  "Something does not feel right","Worried about baby","Worried about myself",
  "Worried about symptoms","Worried about labour","Worried after an appointment","Other concern",
];

export function ConcernPanelBody() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"choose" | "saved">("choose");
  const [savedId, setSavedId] = useState<string | null>(null);

  function saveConcern() {
    if (!selected) return;
    const e = store.addEntry({
      type: "concern", concern: selected, note: note || undefined,
    } as Omit<Entry, "id" | "createdAt" | "weekDay">);
    setSavedId(e.id);
    setPhase("saved");
  }

  function asQuestion(addAsQ: boolean) {
    if (addAsQ && selected) {
      store.addEntry({ type: "question", text: selected } as Omit<Entry, "id" | "createdAt" | "weekDay">);
      LoggedToast("Added as question");
    }
    if (savedId) store.updateEntry(savedId, { saveAsQuestion: addAsQ } as Partial<Entry>);
    setSelected(null); setNote(""); setPhase("choose"); setSavedId(null);
  }

  if (phase === "saved") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white/80 ring-1 ring-black/5 p-4 text-sm leading-relaxed">
          <p className="font-semibold mb-1">Concern saved.</p>
          <p className="text-ink-soft">
            If you are worried about your health or your baby&rsquo;s health, please contact your
            maternity team, midwife, GP, maternity triage or emergency services as appropriate.
          </p>
        </div>
        <p className="text-sm font-medium px-1">Would you like to save this as a question for your team?</p>
        <div className="flex gap-2">
          <button onClick={() => asQuestion(false)} className="flex-1 py-3 rounded-full bg-white/80 ring-1 ring-black/5 text-sm font-medium">
            No, just save concern
          </button>
          <button onClick={() => asQuestion(true)} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            Yes, add question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CONCERNS.map((c) => <Chip key={c} active={selected === c} onClick={() => setSelected(c)}>{c}</Chip>)}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2}
        className="w-full px-4 py-3 rounded-2xl bg-white/80 ring-1 ring-black/5 text-sm resize-none" />
      <button onClick={saveConcern} disabled={!selected}
        className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
        Save concern
      </button>
    </div>
  );
}
