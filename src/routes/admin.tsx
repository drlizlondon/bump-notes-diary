import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Plus, Copy, Power, Download, RefreshCcw, MessageSquareHeart } from "lucide-react";
import { PublicShell } from "@/components/bumpnotes/PublicShell";
import { useSyncSnapshot } from "@/lib/bumpnotes/sync";
import {
  checkAdmin, claimAdminWithSecret,
  listAccessCodes, generateAccessCodeBatch, createCustomAccessCode,
  setAccessCodeStatus, listFeedbackResponses, adminDashboardSummary,
} from "@/lib/bumpnotes/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "BumpNotes — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminRoute,
});

type CodeRow = {
  id: string; code: string; label: string | null; notes: string | null; status: string;
  created_at: string; first_used_at: string | null; last_used_at: string | null;
  use_count: number; feedback_submitted_at: string | null;
};
type FeedbackRow = {
  id: string; created_at: string;
  pregnancy_identity_answer: string; professional_identity_answer: string;
  feedback_route: string;
  q1_answer: string | null; q2_answer: string | null; q3_answer: string | null;
  improvement_text: string | null;
  tester_access_codes?: { code: string; label: string | null } | null;
};

function AdminRoute() {
  const navigate = useNavigate();
  const { userId } = useSyncSnapshot();
  const checkAdminFn = useServerFn(checkAdmin);
  const [state, setState] = useState<"loading" | "needs-auth" | "needs-claim" | "ready">("loading");

  useEffect(() => {
    if (!userId) { setState("needs-auth"); return; }
    let cancelled = false;
    checkAdminFn({ data: undefined } as never).then((r) => {
      if (cancelled) return;
      setState(r.isAdmin ? "ready" : "needs-claim");
    }).catch(() => !cancelled && setState("needs-claim"));
    return () => { cancelled = true; };
  }, [userId, checkAdminFn]);

  return (
    <>
      <Toaster position="top-center" />
      <PublicShell>
        <section className="px-4 sm:px-6 py-8 max-w-[1100px] mx-auto w-full">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="size-4" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold">Admin</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Tester access &amp; feedback</h1>

          {state === "loading" && <p className="mt-6 text-sm text-ink-soft">Checking access…</p>}

          {state === "needs-auth" && (
            <div className="mt-6 surface-card p-5">
              <p className="text-sm text-ink-soft">Please sign in to continue.</p>
              <button onClick={() => navigate({ to: "/auth" })} className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Sign in</button>
            </div>
          )}

          {state === "needs-claim" && (
            <ClaimAdmin onClaimed={() => setState("ready")} />
          )}

          {state === "ready" && <AdminDashboard />}
        </section>
      </PublicShell>
    </>
  );
}

function ClaimAdmin({ onClaimed }: { onClaimed: () => void }) {
  const claim = useServerFn(claimAdminWithSecret);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 surface-card p-5 max-w-[440px]">
      <h2 className="font-serif text-lg font-semibold">Become an admin</h2>
      <p className="text-sm text-ink-soft mt-1 leading-relaxed">
        Enter the admin bootstrap secret to grant your signed-in account admin access.
      </p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!secret.trim() || busy) return;
        setBusy(true);
        try {
          await claim({ data: { secret } });
          toast.success("You're now an admin.");
          onClaimed();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "That didn't work");
        } finally { setBusy(false); }
      }}>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-white border border-border text-sm focus:outline-none focus:border-primary/60"
        />
        <button disabled={busy} className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {busy ? "Checking…" : "Grant admin access"}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard() {
  const fetchCodes = useServerFn(listAccessCodes);
  const fetchFeedback = useServerFn(listFeedbackResponses);
  const fetchSummary = useServerFn(adminDashboardSummary);
  const generateBatch = useServerFn(generateAccessCodeBatch);
  const createCustom = useServerFn(createCustomAccessCode);
  const setStatus = useServerFn(setAccessCodeStatus);

  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [c, f, s] = await Promise.all([
        fetchCodes({ data: undefined } as never),
        fetchFeedback({ data: undefined } as never),
        fetchSummary({ data: undefined } as never),
      ]);
      setCodes(c.codes as CodeRow[]);
      setFeedback(f.responses as FeedbackRow[]);
      setSessionCount(s.sessionCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load");
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    const total = codes.length;
    const active = codes.filter((c) => c.status === "active").length;
    const used = codes.filter((c) => c.first_used_at).length;
    const unused = total - used;
    const fbDone = codes.filter((c) => c.feedback_submitted_at).length;
    const completion = used > 0 ? Math.round((fbDone / used) * 100) : 0;
    return { total, active, used, unused, fbDone, completion };
  }, [codes]);

  const breakdown = useMemo(() => {
    const groups: Record<string, number> = { yes_to_both: 0, yes_to_either: 0, no_to_both: 0 };
    for (const r of feedback) groups[r.feedback_route] = (groups[r.feedback_route] ?? 0) + 1;
    const q = (key: "q1_answer" | "q2_answer" | "q3_answer") => {
      const counts: Record<string, number> = {};
      let n = 0;
      for (const r of feedback) {
        const v = r[key];
        if (!v) continue;
        counts[v] = (counts[v] ?? 0) + 1;
        n += 1;
      }
      return { counts, n };
    };
    return { groups, q1: q("q1_answer"), q2: q("q2_answer"), q3: q("q3_answer") };
  }, [feedback]);

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={refresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium bg-white">
          <RefreshCcw className="size-3.5" /> Refresh
        </button>
        <span className="text-xs text-ink-soft">{loading ? "Loading…" : `${sessionCount} tester sessions recorded`}</span>
      </div>

      {/* Overview tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Tile label="Total codes" value={summary.total} />
        <Tile label="Active" value={summary.active} />
        <Tile label="Used" value={summary.used} />
        <Tile label="Unused" value={summary.unused} />
        <Tile label="Feedback" value={summary.fbDone} />
        <Tile label="Completion" value={`${summary.completion}%`} />
      </div>

      <Generators
        onBatch={async (prefix, count, startAt, label) => {
          await generateBatch({ data: { prefix, count, startAt, label } });
          toast.success(`Generated ${count} code(s)`);
          refresh();
        }}
        onCustom={async (code, label, notes) => {
          await createCustom({ data: { code, label, notes } });
          toast.success(`Created ${code.toUpperCase()}`);
          refresh();
        }}
      />

      <CodesTable
        codes={codes}
        onToggle={async (id, next) => {
          await setStatus({ data: { id, status: next } });
          refresh();
        }}
      />

      <FeedbackPanel feedback={feedback} breakdown={breakdown} />

      <p className="text-xs text-ink-soft pt-4">
        <Link to="/welcome" className="text-primary font-medium">← Back to BumpNotes</Link>
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface-card p-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">{label}</p>
      <p className="font-serif text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function Generators({
  onBatch, onCustom,
}: {
  onBatch: (prefix: string, count: number, startAt: number, label: string) => Promise<void>;
  onCustom: (code: string, label: string, notes: string) => Promise<void>;
}) {
  const [prefix, setPrefix] = useState("TESTA");
  const [count, setCount] = useState(5);
  const [startAt, setStartAt] = useState(1);
  const [batchLabel, setBatchLabel] = useState("");

  const [custom, setCustom] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="surface-card p-4">
        <h3 className="font-serif text-base font-semibold flex items-center gap-2"><Plus className="size-4" /> Generate batch</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Field label="Prefix"><input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="adm-input" /></Field>
          <Field label="Count"><input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="adm-input" /></Field>
          <Field label="Start at"><input type="number" min={1} value={startAt} onChange={(e) => setStartAt(Number(e.target.value))} className="adm-input" /></Field>
        </div>
        <Field label="Batch label (optional)"><input value={batchLabel} onChange={(e) => setBatchLabel(e.target.value)} className="adm-input" /></Field>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onBatch(prefix, count, startAt, batchLabel); } finally { setBusy(false); } }}
          className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >Generate</button>
      </div>

      <div className="surface-card p-4">
        <h3 className="font-serif text-base font-semibold flex items-center gap-2"><Plus className="size-4" /> Create custom code</h3>
        <Field label="Code"><input value={custom} onChange={(e) => setCustom(e.target.value.toUpperCase())} placeholder="SOPHIE01" className="adm-input" /></Field>
        <Field label="Label"><input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="adm-input" /></Field>
        <Field label="Notes"><input value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className="adm-input" /></Field>
        <button
          disabled={busy || !custom.trim()}
          onClick={async () => { setBusy(true); try { await onCustom(custom, customLabel, customNotes); setCustom(""); setCustomLabel(""); setCustomNotes(""); } finally { setBusy(false); } }}
          className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >Create</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2 block">
      <span className="block text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mb-1">{label}</span>
      {children}
    </label>
  );
}

function CodesTable({ codes, onToggle }: { codes: CodeRow[]; onToggle: (id: string, next: "active" | "inactive") => Promise<void> }) {
  function exportCsv() {
    const headers = ["code","label","status","first_used_at","last_used_at","use_count","feedback_submitted_at","notes"];
    const rows = codes.map((c) => [c.code, c.label ?? "", c.status, c.first_used_at ?? "", c.last_used_at ?? "", c.use_count, c.feedback_submitted_at ?? "", c.notes ?? ""]);
    download("tester-access-codes.csv", toCsv([headers, ...rows]));
  }
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4">
        <h3 className="font-serif text-base font-semibold">Access codes</h3>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium bg-white">
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-blush-soft text-ink">
            <tr className="text-left">
              {["Code","Label","Status","First used","Last used","Uses","Feedback","Notes",""].map((h) => (
                <th key={h} className="px-3 py-2 text-[11px] uppercase tracking-[0.15em] font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-[13px] font-semibold">{c.code}</td>
                <td className="px-3 py-2">{c.label ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.status === "active" ? "bg-mint/30 text-ink" : "bg-border text-ink-soft"}`}>{c.status}</span>
                </td>
                <td className="px-3 py-2 text-[12px] text-ink-soft whitespace-nowrap">{fmt(c.first_used_at)}</td>
                <td className="px-3 py-2 text-[12px] text-ink-soft whitespace-nowrap">{fmt(c.last_used_at)}</td>
                <td className="px-3 py-2 text-[12px]">{c.use_count}</td>
                <td className="px-3 py-2 text-[12px] text-ink-soft whitespace-nowrap">{c.feedback_submitted_at ? fmt(c.feedback_submitted_at) : "—"}</td>
                <td className="px-3 py-2 text-[12px] text-ink-soft max-w-[200px] truncate">{c.notes ?? ""}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}
                      className="size-7 grid place-items-center rounded-full border border-border bg-white"
                      aria-label="Copy code"
                    ><Copy className="size-3.5" /></button>
                    <button
                      onClick={() => onToggle(c.id, c.status === "active" ? "inactive" : "active")}
                      className="size-7 grid place-items-center rounded-full border border-border bg-white"
                      aria-label="Toggle status"
                    ><Power className="size-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-ink-soft">No codes yet. Generate a batch above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeedbackPanel({
  feedback, breakdown,
}: {
  feedback: FeedbackRow[];
  breakdown: { groups: Record<string, number>; q1: { counts: Record<string, number>; n: number }; q2: { counts: Record<string, number>; n: number }; q3: { counts: Record<string, number>; n: number } };
}) {
  function exportCsv() {
    const headers = ["created_at","code","label","route","pregnancy","professional","q1","q2","q3","improvement"];
    const rows = feedback.map((r) => [
      r.created_at, r.tester_access_codes?.code ?? "", r.tester_access_codes?.label ?? "",
      r.feedback_route, r.pregnancy_identity_answer, r.professional_identity_answer,
      r.q1_answer ?? "", r.q2_answer ?? "", r.q3_answer ?? "", r.improvement_text ?? "",
    ]);
    download("tester-feedback.csv", toCsv([headers, ...rows]));
  }

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif text-base font-semibold flex items-center gap-2"><MessageSquareHeart className="size-4" /> Feedback</h3>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium bg-white">
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Tile label="Yes to both" value={breakdown.groups.yes_to_both ?? 0} />
        <Tile label="Yes to either" value={breakdown.groups.yes_to_either ?? 0} />
        <Tile label="No to both" value={breakdown.groups.no_to_both ?? 0} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mt-4">
        <BreakdownCard title="Question 1" data={breakdown.q1} />
        <BreakdownCard title="Question 2" data={breakdown.q2} />
        <BreakdownCard title="Question 3" data={breakdown.q3} />
      </div>

      <div className="mt-5">
        <h4 className="font-serif text-sm font-semibold mb-2">Written improvements</h4>
        <ul className="space-y-2">
          {feedback.filter((f) => (f.improvement_text ?? "").trim()).map((f) => (
            <li key={f.id} className="rounded-xl border border-border bg-white p-3 text-sm">
              <p className="text-ink whitespace-pre-wrap">{f.improvement_text}</p>
              <p className="text-[11px] text-ink-soft mt-1 font-mono">
                {f.tester_access_codes?.code ?? "—"} · {f.feedback_route} · {fmt(f.created_at)}
              </p>
            </li>
          ))}
          {feedback.filter((f) => (f.improvement_text ?? "").trim()).length === 0 && (
            <li className="text-sm text-ink-soft">No written feedback yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: { counts: Record<string, number>; n: number } }) {
  const keys = Object.keys(data.counts);
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">{title}</p>
      {data.n === 0 ? (
        <p className="text-sm text-ink-soft mt-2">No answers yet</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {keys.map((k) => {
            const pct = Math.round((data.counts[k] / data.n) * 100);
            return (
              <li key={k} className="flex items-center justify-between text-sm">
                <span className="capitalize">{k}</span>
                <span className="text-ink-soft text-[12px]">{pct}% ({data.counts[k]})</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return iso; }
}

function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows.map((r) => r.map((v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",")).join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
