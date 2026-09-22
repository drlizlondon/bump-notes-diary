import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Inbox,
  Lightbulb,
  LockKeyhole,
  Pencil,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { Button } from "@/components/ui/button";
import { maternityDemo, maternityStages } from "@/lib/bumpnotes/maternity-services-demo";
import { submitMaternityServiceInterest } from "@/lib/azure/maternity-interest.functions";

export const Route = createFileRoute("/maternity-services")({
  head: () => ({
    meta: [
      { title: "BumpNotes for maternity services" },
      {
        name: "description",
        content:
          "Explore a fictional interactive demonstration of how patient-generated BumpNotes information could move from a woman's private journal to a maternity service.",
      },
      { property: "og:title", content: "BumpNotes for maternity services" },
      {
        property: "og:description",
        content:
          "An interactive concept showing the patient-generated layer around maternity care. Currently in development.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaternityServicesPage,
});

function MaternityServicesPage() {
  const demoRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function startDemo() {
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <PublicShell>
      <Toaster position="top-center" />
      <section className="px-5 sm:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20 border-b border-border bg-blush-soft/40">
        <div className="max-w-[1120px] mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink">
              <Sparkles className="size-3.5 text-primary" /> Interactive demo · Currently in development
            </div>
            <h1 className="mt-5 font-serif text-[38px] sm:text-[54px] lg:text-[64px] leading-[1.02] font-semibold text-ink text-balance">
              BumpNotes for maternity services
            </h1>
            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-ink max-w-[650px]">
              The patient-generated layer around maternity care.
            </p>
            <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-ink-soft max-w-[650px]">
              See how a woman could choose information from her private pregnancy journal, share an exact summary with her maternity team, and help services understand patient-generated themes without BumpNotes interpreting her record.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button onClick={startDemo} className="h-12 rounded-full px-6 text-[15px]">
                Explore the maternity-service demo <ArrowRight />
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full px-6 text-[15px] bg-white">
                <Link to="/demo">Try BumpNotes</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink-soft">
              Fictional people, service names and activity. This is not a live maternity-service deployment and contains no real patient data.
            </p>
          </div>
          <JourneyMap />
        </div>
      </section>

      <section ref={demoRef} className="scroll-mt-20 px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-[760px]">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">Guided product journey</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-ink text-balance">
              Follow information from her journal to the service view
            </h2>
            <p className="mt-3 text-ink-soft leading-relaxed">
              You control each step. Nothing in this demonstration assesses, prioritises or gives clinical advice.
            </p>
          </div>
          <GuidedDemo onValidate={() => formRef.current?.scrollIntoView({ behavior: "smooth" })} />
        </div>
      </section>

      <section className="border-y border-border bg-mint-soft/55 px-5 sm:px-8 py-12 sm:py-16">
        <div className="max-w-[980px] mx-auto grid md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <ShieldCheck className="size-8 text-ink" />
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold">Records, never interprets</h2>
            <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
              BumpNotes organises information entered by the woman. It does not diagnose, triage, rank, flag or recommend clinical action. Maternity professionals remain responsible for clinical interpretation.
            </p>
          </div>
          <div>
            <LockKeyhole className="size-8 text-ink" />
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold">The woman stays in control</h2>
            <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
              Her journal is private. A service sees only the exact summary she actively chooses to share. Private content is never automatically visible to a maternity team.
            </p>
          </div>
        </div>
      </section>

      <section ref={formRef} className="scroll-mt-20 px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-[980px] mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">Help validate the proposition</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-semibold text-balance">
              Could this help your maternity service?
            </h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              We are speaking with maternity professionals, service leaders and patient-experience teams to test the problem, workflow and value before building a live service product.
            </p>
            <div className="mt-6 space-y-3 text-sm text-ink">
              {["No sales commitment", "Feedback-only responses welcome", "No patient information required"].map((item) => (
                <p key={item} className="flex gap-2 items-center"><Check className="size-4 text-primary" /> {item}</p>
              ))}
            </div>
          </div>
          <ValidationForm />
        </div>
      </section>
    </PublicShell>
  );
}

function JourneyMap() {
  const items = [
    { icon: UserRound, title: "Woman", body: "Records in her own private journal" },
    { icon: Send, title: "Share", body: "Chooses an exact summary" },
    { icon: Users, title: "Maternity team", body: "Receives patient-generated information" },
    { icon: BarChart3, title: "Maternity service", body: "Views example aggregate themes" },
  ];
  return (
    <div className="relative rounded-2xl border border-border bg-white p-5 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-serif text-lg font-semibold">One patient-controlled journey</p>
          <p className="text-xs text-ink-soft mt-1">Example data · not connected to a service</p>
        </div>
        <span className="rounded-full bg-lavender-soft px-2.5 py-1 text-[10px] font-bold tracking-wider">DEMO</span>
      </div>
      <div className="mt-5 space-y-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-3">
              <span className="size-10 shrink-0 rounded-full bg-blush-soft grid place-items-center text-primary"><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-ink-soft">{item.body}</p>
              </div>
              {index < items.length - 1 && <ChevronRight className="size-4 text-ink-soft" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuidedDemo({ onValidate }: { onValidate: () => void }) {
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(maternityDemo.summarySections.map((x) => x.id)),
  );
  const [shared, setShared] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [archived, setArchived] = useState(false);
  const [note, setNote] = useState("");

  const next = () => setStage((current) => Math.min(maternityStages.length - 1, current + 1));
  const back = () => setStage((current) => Math.max(0, current - 1));
  const reset = () => {
    setStage(0);
    setShared(false);
    setReviewed(false);
    setArchived(false);
    setNote("");
    setSelected(new Set(maternityDemo.summarySections.map((x) => x.id)));
  };
  const toggle = (id: string) => setSelected((current) => {
    const nextSet = new Set(current);
    if (nextSet.has(id)) nextSet.delete(id); else nextSet.add(id);
    return nextSet;
  });

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border bg-lavender-soft/55 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase">Interactive demo · Example data</p>
          <p className="text-xs text-ink-soft truncate">{maternityStages[stage]}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reset} title="Exit and restart demo" aria-label="Exit and restart demo"><X /></Button>
      </div>
      <div className="px-4 sm:px-6 py-4 border-b border-border overflow-x-auto no-scrollbar">
        <ol className="flex gap-2 min-w-max">
          {maternityStages.map((label, index) => (
            <li key={label}>
              <Button
                variant={index === stage ? "default" : index < stage ? "secondary" : "outline"}
                size="sm"
                onClick={() => setStage(index)}
                className="rounded-full"
              >
                {index < stage ? <Check /> : <span>{index + 1}</span>} {label}
              </Button>
            </li>
          ))}
        </ol>
      </div>
      <div className="min-h-[610px] bg-background">
        {stage === 0 && <WomanJournal onNext={next} />}
        {stage === 1 && <SummaryBuilder selected={selected} onToggle={toggle} onNext={next} />}
        {stage === 2 && <Sharing selected={selected} shared={shared} setShared={setShared} onNext={next} />}
        {stage === 3 && <TeamInbox reviewed={reviewed} setReviewed={setReviewed} archived={archived} setArchived={setArchived} note={note} setNote={setNote} onNext={next} />}
        {stage === 4 && <ServiceDashboard onNext={next} />}
        {stage === 5 && <Insights onValidate={onValidate} />}
      </div>
      <div className="border-t border-border px-4 sm:px-6 py-4 flex items-center justify-between gap-3 bg-white">
        <Button variant="outline" onClick={back} disabled={stage === 0} className="rounded-full"><ArrowLeft /> Back</Button>
        <span className="text-xs text-ink-soft">{stage + 1} of {maternityStages.length}</span>
        {stage < maternityStages.length - 1 ? (
          <Button onClick={next} className="rounded-full">Next <ArrowRight /></Button>
        ) : (
          <Button onClick={onValidate} className="rounded-full">Share feedback <ArrowRight /></Button>
        )}
      </div>
    </div>
  );
}

function DemoFrame({ children, area }: { children: ReactNode; area: "woman" | "team" }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.16em] ${area === "woman" ? "bg-coral-soft" : "bg-mint-soft"}`}>
          {area === "woman" ? "WOMAN’S VIEW · DEMO" : "MATERNITY-SERVICE VIEW · DEMO DATA"}
        </span>
        <span className="text-[11px] text-ink-soft">Fictional example</span>
      </div>
      {children}
    </div>
  );
}

function WomanJournal({ onNext }: { onNext: () => void }) {
  const toneClasses = {
    coral: "bg-coral-soft",
    mint: "bg-mint-soft",
    butter: "bg-butter-soft",
    lavender: "bg-lavender-soft",
  } as const;
  return (
    <DemoFrame area="woman">
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <aside className="rounded-xl border border-border bg-white p-4 h-fit">
          <p className="font-serif text-xl font-semibold">Hello, Amelia</p>
          <p className="mt-1 text-sm text-ink-soft">{maternityDemo.woman.gestation}</p>
          <div className="mt-4 rounded-lg bg-mint-soft p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold">Care service</p>
            <p className="mt-1 text-sm font-semibold">{maternityDemo.woman.service}</p>
            <p className="mt-1 text-xs text-ink-soft">{maternityDemo.woman.team}</p>
          </div>
          <p className="mt-4 text-xs text-ink-soft leading-relaxed flex gap-2"><LockKeyhole className="size-4 shrink-0" /> Your journal stays private until you choose something to share.</p>
        </aside>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs text-primary font-semibold">Your pregnancy record</p><h3 className="font-serif text-2xl font-semibold">Recent entries</h3></div>
            <Button variant="outline" className="rounded-full"><ClipboardCheck /> Prepare for my appointment</Button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {maternityDemo.journal.map((item) => (
              <div key={item.type} className={`rounded-xl border border-border p-4 ${toneClasses[item.tone]}`}>
                <p className="text-sm font-semibold">{item.type}</p><p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.detail}</p><p className="mt-3 text-[11px] text-ink-soft">{item.date}</p>
              </div>
            ))}
          </div>
          <Button onClick={onNext} className="mt-5 h-12 rounded-full px-6 motion-safe:animate-pulse"><Send /> Share with my maternity team</Button>
        </div>
      </div>
    </DemoFrame>
  );
}

function SummaryBuilder({ selected, onToggle, onNext }: { selected: Set<string>; onToggle: (id: string) => void; onNext: () => void }) {
  return (
    <DemoFrame area="woman">
      <div className="max-w-[820px] mx-auto">
        <p className="text-xs text-primary font-semibold">Prepare a summary</p>
        <h3 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold">Choose exactly what you want to show</h3>
        <p className="mt-2 text-sm text-ink-soft">All sections start included. Untick anything you do not want in this example summary.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full"><Pencil /> Edit</Button>
          <Button variant="outline" className="rounded-full"><FileText /> Preview</Button>
          <Button variant="outline" className="rounded-full"><Save /> Save for later</Button>
        </div>
        <div className="mt-5 space-y-3">
          {maternityDemo.summarySections.map((section) => {
            const active = selected.has(section.id);
            return (
              <Button key={section.id} type="button" variant="ghost" onClick={() => onToggle(section.id)} className={`h-auto w-full whitespace-normal text-left items-start justify-start rounded-xl border p-4 transition ${active ? "border-primary/35 bg-white" : "border-border bg-muted opacity-60"}`}>
                <span className="flex items-center justify-between gap-3"><span className="font-serif text-lg font-semibold">{section.title}</span><span className={`size-6 rounded-full grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-white border border-border"}`}>{active && <Check className="size-3.5" />}</span></span>
                {active && <ul className="mt-3 space-y-1.5">{section.lines.map((line) => <li key={line} className="text-sm text-ink-soft">“{line}”</li>)}</ul>}
              </Button>
            );
          })}
        </div>
        <Button onClick={onNext} className="mt-5 rounded-full">Preview and share <ArrowRight /></Button>
      </div>
    </DemoFrame>
  );
}

function Sharing({ selected, shared, setShared, onNext }: { selected: Set<string>; shared: boolean; setShared: (value: boolean) => void; onNext: () => void }) {
  const visible = maternityDemo.summarySections.filter((section) => selected.has(section.id));
  return (
    <DemoFrame area="woman">
      <div className="max-w-[780px] mx-auto">
        {!shared ? (
          <>
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold">This is exactly what your team will receive</h3>
            <p className="mt-2 text-sm text-ink-soft">Nothing else from your BumpNotes journal is included.</p>
            <div className="mt-5 rounded-xl border border-border bg-white p-5 sm:p-7">
              <div className="flex justify-between gap-3 border-b border-border pb-4"><div><p className="font-serif text-xl font-semibold">Pregnancy Summary</p><p className="text-sm text-ink-soft">{maternityDemo.woman.name} · {maternityDemo.woman.gestation}</p></div><span className="text-[10px] font-bold bg-lavender-soft rounded-full px-2.5 py-1 h-fit">EXAMPLE</span></div>
              {visible.map((section) => <div key={section.id} className="py-4 border-b border-border last:border-0"><p className="font-semibold text-sm">{section.title}</p>{section.lines.map((line) => <p key={line} className="mt-1 text-sm text-ink-soft">{line}</p>)}</div>)}
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-xl bg-mint-soft p-4 text-sm leading-relaxed"><input type="checkbox" defaultChecked className="mt-1 accent-[var(--primary)]" /><span>I choose to share this summary with {maternityDemo.woman.team}. I understand this sends only the information shown above.</span></label>
            <Button onClick={() => setShared(true)} className="mt-5 h-12 rounded-full px-6"><Send /> Share this summary</Button>
          </>
        ) : (
          <div className="text-center py-8 sm:py-14">
            <CheckCircle2 className="size-14 text-primary mx-auto" />
            <h3 className="mt-4 font-serif text-3xl font-semibold">Summary shared</h3>
            <p className="mt-2 text-ink-soft">Sent to {maternityDemo.woman.team} on 22/09/2026 at 16:42.</p>
            <div className="mt-6 max-w-[520px] mx-auto text-left rounded-xl border border-border bg-white p-4"><p className="text-xs uppercase tracking-wider font-bold">Sharing history</p><p className="mt-2 text-sm font-semibold">Pregnancy Summary · {visible.length} sections</p><p className="text-xs text-ink-soft mt-1">Shared by Amelia · 22/09/2026 · 16:42</p></div>
            <Button onClick={onNext} className="mt-6 rounded-full">Enter the maternity-team demo <ArrowRight /></Button>
          </div>
        )}
      </div>
    </DemoFrame>
  );
}

function TeamInbox(props: { reviewed: boolean; setReviewed: (v: boolean) => void; archived: boolean; setArchived: (v: boolean) => void; note: string; setNote: (v: string) => void; onNext: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <DemoFrame area="team">
      <div className="grid lg:grid-cols-[190px_1fr] gap-5">
        <aside className="rounded-xl bg-ink text-background p-4 h-fit">
          <p className="font-serif text-lg font-semibold">Service workspace</p>
          <nav className="mt-5 space-y-1 text-sm"><p className="rounded-lg bg-background/15 px-3 py-2 flex gap-2"><Inbox className="size-4" /> Inbox</p><p className="px-3 py-2 opacity-70 flex gap-2"><BarChart3 className="size-4" /> Dashboard</p><p className="px-3 py-2 opacity-70 flex gap-2"><Lightbulb className="size-4" /> Insights</p></nav>
        </aside>
        <div>
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-primary">Patient-generated summaries</p><h3 className="font-serif text-2xl font-semibold">Maternity team inbox</h3></div><span className="text-xs bg-lavender-soft rounded-full px-3 py-1">3 example summaries</span></div>
          {!open ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-border bg-white">
              {maternityDemo.inbox.map((row, index) => <Button key={row.name} type="button" variant="ghost" onClick={() => index === 0 && setOpen(true)} className="h-auto w-full whitespace-normal text-left p-4 rounded-none border-b border-border last:border-0 flex items-center justify-between gap-3 hover:bg-blush-soft"><div><p className="font-semibold text-sm">{row.name}</p><p className="text-xs text-ink-soft mt-1">{row.detail}</p></div><span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${row.status === "New" ? "bg-coral-soft" : "bg-mint-soft"}`}>{row.status}</span></Button>)}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-white p-5">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}><ArrowLeft /> Inbox</Button>
              <div className="mt-3 flex items-start justify-between gap-3"><div><h4 className="font-serif text-xl font-semibold">{maternityDemo.woman.name}</h4><p className="text-xs text-ink-soft">Patient-generated summary · shared 22/09/2026 at 16:42</p></div><span className="text-[10px] font-bold bg-lavender-soft rounded-full px-2.5 py-1">DEMO DATA</span></div>
              <div className="mt-4 rounded-lg bg-blush-soft p-4 text-sm text-ink-soft">This information was selected and shared by Amelia. BumpNotes has organised her words and values without clinical interpretation.</div>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">{maternityDemo.summarySections.slice(0, 3).map((s) => <div key={s.id} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{s.title}</p><p className="mt-1 text-xs text-ink-soft">{s.lines[0]}</p></div>)}</div>
              <label className="block mt-4 text-xs font-semibold">Internal demo note<textarea value={props.note} onChange={(e) => props.setNote(e.target.value)} placeholder="Add a fictional internal note" className="mt-1 w-full min-h-20 rounded-lg border border-border bg-white p-3 text-sm font-normal" /></label>
              <div className="mt-4 flex flex-wrap gap-2"><Button variant={props.reviewed ? "secondary" : "default"} onClick={() => props.setReviewed(!props.reviewed)}><ClipboardCheck /> {props.reviewed ? "Reviewed" : "Mark reviewed"}</Button><Button variant="outline" onClick={() => props.setArchived(!props.archived)}><Save /> {props.archived ? "Archived" : "Archive"}</Button><Button variant="outline" onClick={props.onNext}><BarChart3 /> Service dashboard</Button></div>
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}

function ServiceDashboard({ onNext }: { onNext: () => void }) {
  return (
    <DemoFrame area="team">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-primary">Example service activity</p><h3 className="font-serif text-2xl sm:text-3xl font-semibold">Service dashboard</h3></div><Button variant="outline" onClick={onNext}><Lightbulb /> View insights</Button></div>
      <p className="mt-2 text-sm text-ink-soft">Fictional demonstration metrics. They are not live service data or performance measures.</p>
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">{maternityDemo.metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-border bg-white p-4"><p className="font-serif text-2xl sm:text-3xl font-semibold">{metric.value}</p><p className="mt-1 text-sm font-semibold">{metric.label}</p><p className="mt-1 text-[11px] text-ink-soft">{metric.note}</p></div>)}</div>
      <div className="mt-5 grid lg:grid-cols-2 gap-4"><div className="rounded-xl border border-border bg-white p-5"><p className="font-serif text-lg font-semibold">Example adoption funnel</p>{[["Invited to BumpNotes", "w-full", 100], ["Started a journal", "w-[74%]", 74], ["Prepared a summary", "w-[46%]", 46], ["Chose to share", "w-[31%]", 31]].map(([label, width, value]) => <div key={String(label)} className="mt-4"><div className="flex justify-between text-xs"><span>{label}</span><span>{value}%</span></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${width}`} /></div></div>)}</div><div className="rounded-xl border border-border bg-white p-5"><p className="font-serif text-lg font-semibold">Example sharing activity</p><div className="mt-5 grid grid-cols-7 gap-2 items-end h-40">{["h-[35%]", "h-[55%]", "h-[42%]", "h-[76%]", "h-[61%]", "h-[88%]", "h-[70%]"].map((height, i) => <div key={i} className="h-full flex items-end"><div className={`w-full rounded-t bg-mint ${height}`} /></div>)}</div><p className="mt-3 text-xs text-ink-soft">Among fictional BumpNotes users · last seven days</p></div></div>
    </DemoFrame>
  );
}

function Insights({ onValidate }: { onValidate: () => void }) {
  return (
    <DemoFrame area="team">
      <div className="max-w-[900px] mx-auto"><p className="text-xs font-semibold text-primary">Example aggregate insight</p><h3 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">What BumpNotes users chose to record and share</h3><p className="mt-2 text-sm text-ink-soft">Descriptive themes only. BumpNotes does not infer clinical meaning, risk or service recommendations.</p>
        <div className="mt-5 space-y-4">{maternityDemo.themes.map((theme, index) => <div key={theme.label}><div className="flex justify-between gap-3 text-sm"><span className="font-medium">{theme.label}</span><span>{theme.value}%</span></div><div className="mt-2 h-3 rounded-full bg-muted"><div className={`h-full rounded-full bg-lavender ${["w-[68%]", "w-[54%]", "w-[39%]", "w-[31%]"][index]}`} /></div></div>)}</div>
        <div className="mt-8 rounded-xl bg-blush-soft p-5"><p className="text-xs uppercase tracking-wider font-bold text-primary">Journey complete</p><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">{["WOMAN", "SHARE", "MATERNITY TEAM", "MATERNITY SERVICE"].map((item) => <div key={item} className="rounded-lg bg-white border border-border p-3 text-center text-xs font-bold">{item}</div>)}</div><p className="mt-4 text-sm text-ink-soft leading-relaxed">The woman records and chooses. The team receives her selected information. The service sees carefully qualified aggregate patterns. BumpNotes records information; it does not interpret it.</p></div>
        <Button onClick={onValidate} className="mt-6 h-12 rounded-full px-6"><HeartHandshake /> Help us validate this</Button>
      </div>
    </DemoFrame>
  );
}

function ValidationForm() {
  const submit = useServerFn(submitMaternityServiceInterest);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactPreference, setContactPreference] = useState<"feedback" | "contact">("feedback");
  const [pilotUpdates, setPilotUpdates] = useState(false);
  const needsEmail = contactPreference === "contact" || pilotUpdates;

  if (sent) return <div className="rounded-2xl border border-border bg-mint-soft p-7 sm:p-9"><CheckCircle2 className="size-10 text-ink" /><h3 className="mt-4 font-serif text-2xl font-semibold">Thank you for helping us learn</h3><p className="mt-2 text-sm text-ink-soft leading-relaxed">Your response has been received. If you asked us to contact you, the BumpNotes team will use the email you provided.</p><Button variant="outline" className="mt-5 bg-white rounded-full" onClick={() => setSent(false)}>Send another response</Button></div>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await submit({ data: {
        firstName: String(form.get("firstName") ?? ""), role: String(form.get("role") ?? ""), organisation: String(form.get("organisation") ?? ""),
        contactPreference, email: String(form.get("email") ?? "") || undefined,
        problem: String(form.get("problem") ?? ""), usefulness: String(form.get("usefulness") ?? ""), validationInterest: String(form.get("validationInterest") ?? "feedback-only") as "conversation" | "demo" | "pilot" | "feedback-only",
        notes: String(form.get("notes") ?? "") || undefined, pilotUpdates,
        pagePath: window.location.pathname, userAgent: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}`,
      } });
      setSent(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't send your response. Please try again."); }
    finally { setBusy(false); }
  }

  const inputClass = "mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-white p-5 sm:p-7 shadow-sm space-y-5">
      <div><h3 className="font-serif text-2xl font-semibold">Share your perspective</h3><p className="mt-1 text-xs text-ink-soft">Fields marked * are required. Do not include patient information.</p></div>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">First name *<input name="firstName" required maxLength={100} className={inputClass} /></label><label className="text-sm font-semibold">Your role *<select name="role" required className={inputClass} defaultValue=""><option value="" disabled>Select a role</option><option>Midwife</option><option>Obstetrician</option><option>Maternity service leader</option><option>Digital or transformation lead</option><option>Patient experience or engagement</option><option>Information governance</option><option>Other</option></select></label></div>
      <label className="block text-sm font-semibold">Area or organisation *<input name="organisation" required maxLength={200} className={inputClass} placeholder="Trust, service, region or organisation" /></label>
      <fieldset><legend className="text-sm font-semibold">What would you like to do? *</legend><div className="mt-2 grid sm:grid-cols-2 gap-2">{[["feedback", "Give feedback only"], ["contact", "Ask BumpNotes to contact me"]].map(([value, label]) => <label key={value} className={`rounded-lg border p-3 text-sm cursor-pointer ${contactPreference === value ? "border-primary/50 bg-blush-soft" : "border-border"}`}><input type="radio" name="contactPreference" value={value} checked={contactPreference === value} onChange={() => setContactPreference(value as "feedback" | "contact")} className="mr-2 accent-[var(--primary)]" />{label}</label>)}</div></fieldset>
      <label className="block text-sm font-semibold">Email {needsEmail ? "*" : "(optional)"}<input name="email" type="email" required={needsEmail} maxLength={320} className={inputClass} /></label>
      <label className="block text-sm font-semibold">What problem could this help your service address? *<textarea name="problem" required maxLength={1500} className={`${inputClass} min-h-24`} /></label>
      <label className="block text-sm font-semibold">What could make this useful or not useful? *<textarea name="usefulness" required maxLength={1500} className={`${inputClass} min-h-24`} /></label>
      <label className="block text-sm font-semibold">How would you like to help validate it? *<select name="validationInterest" required className={inputClass}><option value="feedback-only">Feedback only</option><option value="conversation">A short conversation</option><option value="demo">A demonstration for colleagues</option><option value="pilot">Explore a future pilot</option></select></label>
      <label className="block text-sm font-semibold">Anything else? (optional)<textarea name="notes" maxLength={2000} className={`${inputClass} min-h-20`} /></label>
      <label className="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" checked={pilotUpdates} onChange={(e) => setPilotUpdates(e.target.checked)} className="mt-1 accent-[var(--primary)]" /><span>Keep me updated about future maternity-service validation and pilot opportunities.</span></label>
      <Button disabled={busy} type="submit" className="w-full h-12 rounded-full">{busy ? "Sending…" : "Send response"} <ArrowRight /></Button>
      <p className="text-xs text-center text-ink-soft">Prefer email? <a href="mailto:hello@bumpnotes.co.uk" className="text-primary font-semibold underline">hello@bumpnotes.co.uk</a></p>
    </form>
  );
}
