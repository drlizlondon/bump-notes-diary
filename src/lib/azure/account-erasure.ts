// GDPR-2 (Art 17) unified account erasure — the logic behind
// src/lib/azure/account.functions.ts's `deleteOwnAccount`.
//
// Deliberately its OWN module, imported (never re-exported) by
// account.functions.ts: TanStack Start's client/server code-splitting only
// removes a `createServerFn(...).handler()` closure's OWN body from the
// client bundle, not other exported top-level functions it calls — an
// export is treated as part of that file's public surface and kept in both
// bundles. Keeping this orchestration (which pulls in `deleteAllUserBlobs`,
// and transitively `@azure/storage-blob`, a Node-only package) in a separate
// module that account.functions.ts never re-exports keeps it out of the
// client bundle, where `@azure/storage-blob`'s browser entry doesn't export
// `generateBlobSASQueryParameters` and the build fails. Verified empirically
// 2026-09-21: inlining this into `.handler()` builds; extracting it into an
// EXPORTED function in the same file breaks `npm run build`; extracting it
// into its own module that is only imported (not re-exported) builds again.
// Tests import straight from this module.

import { deleteAllUserBlobs } from "./blob-helpers";
import { deleteEntraUser, type EntraDeleteResult } from "./entra-admin";

/** The minimal pool shape this module needs — lets tests inject a plain mock. */
export interface PgQueryable {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

async function writeAudit(
  pool: PgQueryable,
  actorUserId: string | null,
  action: string,
  targetId: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id)
     VALUES ($1, $2, 'account', $3)`,
    [actorUserId, action, targetId],
  );
}

/** One attempted delete against a single Supabase table, for the unified erasure below. */
export interface SupabaseErasureStep {
  table: string;
  matchedBy: string;
  error: string | null;
}

/**
 * Erases this user's Supabase-held rows (DPIA 2026-09-21 §4.8/§6 R3:
 * BumpNotes' "permanently deleted... immediately" claim was false because
 * the live Azure erasure never touched Supabase, and a second, dead,
 * Supabase-only `deleteOwnAccount` in src/lib/bumpnotes/admin.functions.ts
 * cleared Supabase but was never wired to the UI — neither path cleared the
 * other store).
 *
 * Every Supabase table found to hold this user's personal data is covered,
 * matched ONLY by a key that is genuinely this user's own — never a broad or
 * guessed match:
 *
 *  - `supabaseUserId` (Azure `users.supabase_user_id`) — the Supabase
 *    auth.users id this account bridged from during the AZURE §2.6 identity
 *    cutover window. Present only for accounts that once signed in via
 *    Supabase; null for Entra-native accounts, in which case the user_id-
 *    keyed tables below never held this user's data at all and are skipped
 *    (not matched by any other value).
 *  - `email` (Azure `users.email`, the account's own verified email) — used
 *    for rows the app never links to a Supabase user id: the public
 *    /contact form (src/routes/contact.tsx) inserts only name/email/message,
 *    never `user_id`; feedback's optional `reply_email` is free-typed and
 *    not foreign-keyed to any account.
 *
 * Tables checked and why (docs/product/GDPR-DATA-RIGHTS-SPEC.md,
 * src/integrations/supabase/types.ts, supabase/migrations/*.sql):
 *  - bumpnotes_state, feedback_submissions.user_id, user_roles, profiles
 *    (legacy Supabase table) — all keyed by the Supabase auth user id.
 *  - contact_messages, feedback_submissions.reply_email — keyed only by a
 *    free-text email address.
 *  - tester_access_codes / tester_sessions / feedback_responses —
 *    deliberately NOT touched: these hold anonymous tester-session data
 *    keyed by access code / session id, with no user_id or email column at
 *    all (tester mode is explicitly unauthenticated,
 *    src/lib/bumpnotes/tester-feedback.functions.ts). There is no reliable
 *    key to attribute a row to this specific account, so guessing would risk
 *    deleting nothing or the wrong thing; flagged here rather than silently
 *    matched — [Founder/DPO to confirm this residual gap is acceptable].
 *
 * Every step below is attempted even if an earlier one fails (best-effort
 * collection), and only once all are attempted does this function decide
 * success or failure — so a slow/transient error on one table never
 * needlessly aborts deletion of the rest. If ANY step failed, this throws
 * (rather than returning a partial "erased" result), so the caller can never
 * report "permanently deleted" while a Supabase-held row survives.
 */
export async function eraseSupabaseUserData(
  email: string,
  supabaseUserId: string | null,
): Promise<SupabaseErasureStep[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const steps: SupabaseErasureStep[] = [];

  if (supabaseUserId) {
    // bumpnotes_state.user_id is the PRIMARY KEY = the Supabase auth user id.
    {
      const { error } = await supabaseAdmin
        .from("bumpnotes_state")
        .delete()
        .eq("user_id", supabaseUserId);
      steps.push({
        table: "bumpnotes_state",
        matchedBy: "user_id = own supabase_user_id",
        error: error?.message ?? null,
      });
    }
    // feedback_submissions.user_id is set client-side from the signed-in
    // Supabase session only (src/lib/bumpnotes/feedback.ts submitFeedback),
    // so a non-null value is always this account's own id.
    {
      const { error } = await supabaseAdmin
        .from("feedback_submissions")
        .delete()
        .eq("user_id", supabaseUserId);
      steps.push({
        table: "feedback_submissions",
        matchedBy: "user_id = own supabase_user_id",
        error: error?.message ?? null,
      });
    }
    // user_roles: role grants (e.g. the self-service admin/tester bootstrap)
    // tied to this account's Supabase auth id.
    {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", supabaseUserId);
      steps.push({
        table: "user_roles",
        matchedBy: "user_id = own supabase_user_id",
        error: error?.message ?? null,
      });
    }
    // profiles (Supabase, legacy — superseded by the Azure `profiles` table):
    // id IS the Supabase auth user id (primary key = auth.users.id).
    {
      const { error } = await supabaseAdmin.from("profiles").delete().eq("id", supabaseUserId);
      steps.push({
        table: "profiles (supabase, legacy)",
        matchedBy: "id = own supabase_user_id",
        error: error?.message ?? null,
      });
    }
  }

  // contact_messages: the live /contact form never sets user_id, only
  // name/email/message — email is the only reliable key for this account's
  // own submissions.
  {
    const { error } = await supabaseAdmin.from("contact_messages").delete().eq("email", email);
    steps.push({
      table: "contact_messages",
      matchedBy: "email = own account email",
      error: error?.message ?? null,
    });
  }
  // feedback_submissions.reply_email: a user can type any email as an
  // optional reply address regardless of whether user_id was also captured
  // (e.g. signed in via Entra, which never populates the Supabase user_id
  // column at all) — delete rows where they typed their own account email,
  // in addition to the user_id match above.
  {
    const { error } = await supabaseAdmin
      .from("feedback_submissions")
      .delete()
      .eq("reply_email", email);
    steps.push({
      table: "feedback_submissions",
      matchedBy: "reply_email = own account email",
      error: error?.message ?? null,
    });
  }

  const failed = steps.filter((s) => s.error);
  if (failed.length > 0) {
    throw new Error(
      `Supabase erasure incomplete, refusing to report the account as deleted: ${failed
        .map((f) => `${f.table} (${f.matchedBy}): ${f.error}`)
        .join("; ")}`,
    );
  }
  return steps;
}

export interface AccountErasureResult {
  erased: true;
  blobsDeleted: number;
  entra: EntraDeleteResult;
  supabase: SupabaseErasureStep[];
}

/**
 * GDPR-2 — Right to erasure (Art 17), unified across every store that holds
 * this user's data. Deletes: Postgres (cascades from the `users` row), every
 * blob under their prefix, every Supabase-held row that is genuinely theirs
 * (see `eraseSupabaseUserData` above), and their Entra identity (via Graph,
 * when configured). A de-identified erasure record persists (the audit row's
 * actor is nulled by the cascade). The client should sign the user out after
 * this resolves.
 *
 * Ordering is deliberate, not incidental: the Supabase step runs BEFORE the
 * Postgres row is deleted, because `email` and `supabase_user_id` — the only
 * keys that let that step find this user's Supabase rows — live on that row.
 * If the Supabase step fails, it throws and this function does NOT reach the
 * Postgres delete, so the account (and the keys needed to retry) survive
 * intact for a retry, rather than being destroyed while Supabase rows leak.
 * This is "fail loudly": the thrown error propagates to the caller
 * (src/routes/settings.tsx already treats any thrown error as a failure and
 * never shows its "permanently deleted" success copy), so the UI can never
 * claim success while a Supabase-held row remains.
 */
export async function performAccountErasure(
  pool: PgQueryable,
  uid: string,
): Promise<AccountErasureResult> {
  // The Entra object id, email and any bridge-window Supabase identity,
  // captured before the row is deleted — the Supabase erasure step needs
  // `email`/`supabase_user_id` to find this user's rows in the OTHER store,
  // and once this row is gone that link is unrecoverable (AZURE §2.6 / I.4).
  const userRow = await pool.query<{
    external_identity_id: string | null;
    email: string;
    supabase_user_id: string | null;
  }>("SELECT external_identity_id, email, supabase_user_id FROM users WHERE id = $1", [uid]);
  const row = userRow.rows[0];
  if (!row) {
    throw new Error("Account erasure failed: no users row for this id (already erased?)");
  }
  const entraObjectId = row.external_identity_id;

  // 1) Record the erasure first (actor is nulled when the user row is deleted,
  //    leaving a de-identified accountability record — Art 17(3)/Art 30).
  await writeAudit(pool, uid, "account_erasure", uid);

  // 2) Blobs.
  const { deleted: blobsDeleted } = await deleteAllUserBlobs(uid);

  // 3) Supabase-held rows. Deliberately before the Postgres delete — see the
  //    ordering note above. Throws (propagates) on any failure.
  const supabase = await eraseSupabaseUserData(row.email, row.supabase_user_id);

  // 4) Postgres — cascades to every owned table.
  await pool.query("DELETE FROM users WHERE id = $1", [uid]);

  // 5) Entra identity (best-effort: unconfigured => recorded as pending, per
  //    the existing GDPR-5 design — never silently claimed as done).
  let entra: EntraDeleteResult;
  try {
    entra = await deleteEntraUser(entraObjectId);
  } catch (error) {
    console.error("Entra account deletion failed (data already erased):", error);
    entra = { deleted: false, reason: "not_configured" };
  }

  return { erased: true, blobsDeleted, entra, supabase };
}
