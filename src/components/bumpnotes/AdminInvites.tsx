// BN-INVITE admin: access requests (make a code, then email it yourself) and
// the accounts that are in, with the code each used. Founder 2026-10-29.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  adminCreateCodeForRequest,
  adminListAccessRequests,
  adminListInvitedAccounts,
} from "@/lib/bumpnotes/invite.functions";

type RequestRow = {
  id: string;
  email: string;
  heard_from: string | null;
  created_at: string;
  handled_at: string | null;
  code: string | null;
  use_count: number | null;
};
type InvitedRow = { email: string; code: string | null; label: string | null; redeemed_at: string };

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function AdminInvites() {
  const listRequests = useServerFn(adminListAccessRequests);
  const listInvited = useServerFn(adminListInvitedAccounts);
  const makeCode = useServerFn(adminCreateCodeForRequest);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [invited, setInvited] = useState<InvitedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, i] = await Promise.all([listRequests(), listInvited()]);
      setRequests((r as { requests: RequestRow[] }).requests);
      setInvited((i as { accounts: InvitedRow[] }).accounts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load invites");
    } finally {
      setLoading(false);
    }
  }, [listRequests, listInvited]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function create(id: string) {
    try {
      const { code, email } = await makeCode({ data: { id } });
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        /* copy is a convenience */
      }
      toast.success(`Code ${code} made for ${email} (copied). Email it to them yourself.`);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't make a code");
    }
  }

  const waiting = requests.filter((r) => !r.handled_at).length;

  return (
    <section className="surface-card p-4 space-y-4">
      <h2 className="font-serif text-xl font-semibold">Invites</h2>
      <p className="text-xs text-ink-soft">
        Real accounts need a code while BumpNotes is invite-only. Make one per person here or under
        Access codes below. Requests with no code are deleted after 90 days.
      </p>

      <div>
        <h3 className="font-serif text-base font-semibold mb-2">
          Access requests {loading ? "" : `(${waiting} waiting)`}
        </h3>
        {requests.length === 0 ? (
          <p className="text-sm text-ink-soft">{loading ? "Loading…" : "No requests yet."}</p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="py-2 flex flex-wrap items-center gap-2 justify-between">
                <span className="min-w-0">
                  <span className="font-medium break-all">{r.email}</span>
                  <span className="block text-xs text-ink-soft">
                    {day(r.created_at)}
                    {r.heard_from ? ` · heard from: ${r.heard_from}` : ""}
                  </span>
                </span>
                {r.code ? (
                  <span className="text-xs">
                    Code <b className="tracking-wider">{r.code}</b>
                    {r.use_count ? " · used" : " · not used yet"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void create(r.id)}
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    Create code
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-serif text-base font-semibold mb-2">Who's in ({invited.length})</h3>
        {invited.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {loading ? "Loading…" : "No invited accounts yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {invited.map((a) => (
              <li
                key={`${a.email}-${a.redeemed_at}`}
                className="py-2 text-sm flex flex-wrap justify-between gap-2"
              >
                <span className="break-all">{a.email}</span>
                <span className="text-xs text-ink-soft">
                  {a.code ?? "code deleted"}
                  {a.label ? ` (${a.label})` : ""} · {day(a.redeemed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
