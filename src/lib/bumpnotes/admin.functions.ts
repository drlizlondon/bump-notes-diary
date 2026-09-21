import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAzurePgPool } from "@/lib/azure/pg-pool";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Permission check failed");
  if (!data) throw new Error("Forbidden");
}

function generateCodeString(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(2, "0")}`;
}

/** Check whether the current signed-in user is an admin. */
export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

/**
 * Bootstrap: a signed-in user can grant themselves admin by submitting the
 * server-side TESTER_PASSWORD (which doubles as the initial admin secret).
 * Once at least one admin exists, this still works but is harmless because
 * the secret is server-only.
 */
export const claimAdminWithSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { secret: string }) => ({
    secret: String(data?.secret ?? "").slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    const expected = process.env.TESTER_PASSWORD;
    if (!expected) throw new Error("Admin bootstrap is not configured");
    if (data.secret.trim().toLowerCase() !== expected.trim().toLowerCase()) {
      throw new Error("That secret didn't match");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List access codes. */
export const listAccessCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    const { rows } = await pool.query("SELECT * FROM tester_access_codes ORDER BY created_at DESC");
    return { codes: rows };
  });

export const generateAccessCodeBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prefix: string; count: number; startAt?: number; label?: string }) => ({
    prefix:
      String(d.prefix ?? "TESTA")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12) || "TESTA",
    count: Math.max(1, Math.min(50, Math.floor(Number(d.count) || 1))),
    startAt: Math.max(1, Math.floor(Number(d.startAt) || 1)),
    label: String(d.label ?? "").slice(0, 120) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    // find existing codes with this prefix to avoid collisions
    const { rows: existing } = await pool.query<{ code: string }>(
      "SELECT code FROM tester_access_codes WHERE code ILIKE $1",
      [`${data.prefix}%`],
    );
    const used = new Set(existing.map((r) => r.code.toUpperCase()));
    const codes: string[] = [];
    let n = data.startAt;
    while (codes.length < data.count) {
      const candidate = generateCodeString(data.prefix, n);
      if (!used.has(candidate)) {
        codes.push(candidate);
        used.add(candidate);
      }
      n += 1;
      if (n > 9999) break;
    }
    const { rows: inserted } = await pool.query(
      `INSERT INTO tester_access_codes (code, label, created_by)
       SELECT * FROM unnest($1::text[], $2::text[], $3::uuid[])
       RETURNING *`,
      [codes, codes.map(() => data.label), codes.map(() => context.userId)],
    );
    return { inserted };
  });

export const createCustomAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; label?: string; notes?: string }) => ({
    code: String(d.code ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 32),
    label: String(d.label ?? "").slice(0, 120) || null,
    notes: String(d.notes ?? "").slice(0, 500) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.code) throw new Error("Code is required");
    const pool = getAzurePgPool();
    const { rows } = await pool.query(
      `INSERT INTO tester_access_codes (code, label, notes, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.code, data.label, data.notes, context.userId],
    );
    return { code: rows[0] };
  });

export const setAccessCodeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "active" | "inactive" }) => ({
    id: String(d.id ?? ""),
    status: d.status === "inactive" ? ("inactive" as const) : ("active" as const),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    await pool.query("UPDATE tester_access_codes SET status = $1 WHERE id = $2", [
      data.status,
      data.id,
    ]);
    return { ok: true };
  });

/** Permanently delete an access code (tester sessions / feedback responses cascade). */
export const deleteAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.id) throw new Error("id required");
    const pool = getAzurePgPool();
    await pool.query("DELETE FROM tester_access_codes WHERE id = $1", [data.id]);
    return { ok: true };
  });

/** Bulk delete unused codes (no first_used_at). Useful housekeeping. */
export const deleteUnusedAccessCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    const { rows } = await pool.query(
      "DELETE FROM tester_access_codes WHERE first_used_at IS NULL RETURNING id",
    );
    return { deleted: rows.length };
  });

export const listFeedbackResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    const { rows } = await pool.query(
      `SELECT fr.*, tac.code AS tac_code, tac.label AS tac_label
       FROM feedback_responses fr
       LEFT JOIN tester_access_codes tac ON tac.id = fr.access_code_id
       ORDER BY fr.created_at DESC`,
    );
    const responses = rows.map((r) => {
      const { tac_code, tac_label, ...rest } = r;
      return {
        ...rest,
        tester_access_codes: tac_code != null ? { code: tac_code, label: tac_label } : null,
      };
    });
    return { responses };
  });

export const adminDashboardSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    const [
      { rows: codes },
      { rows: responses },
      {
        rows: [{ count: sessionCount }],
      },
    ] = await Promise.all([
      pool.query("SELECT * FROM tester_access_codes"),
      pool.query("SELECT * FROM feedback_responses"),
      pool.query<{ count: string }>("SELECT count(*) FROM tester_sessions"),
    ]);
    return {
      codes,
      responses,
      sessionCount: Number(sessionCount),
    };
  });

/* ============================================================
   Feedback submissions (bug reports / suggestions from the in-app button)
   ============================================================ */

export const listFeedbackSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const pool = getAzurePgPool();
    const { rows } = await pool.query(
      "SELECT * FROM feedback_submissions ORDER BY created_at DESC",
    );
    return { submissions: rows };
  });

export const deleteFeedbackSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.id) throw new Error("id required");
    const pool = getAzurePgPool();
    await pool.query("DELETE FROM feedback_submissions WHERE id = $1", [data.id]);
    return { ok: true };
  });

/* ============================================================
   User accounts
   ============================================================ */

export const listUserAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: usersList }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const users = (usersList?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider: u.app_metadata?.provider ?? "email",
      is_tester: profileMap.get(u.id)?.is_tester ?? false,
      display_name: profileMap.get(u.id)?.display_name ?? null,
      accepted_terms_at: profileMap.get(u.id)?.accepted_terms_at ?? null,
      accepted_privacy_at: profileMap.get(u.id)?.accepted_privacy_at ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
    return { users };
  });

/** Admin: permanently delete another user's account and all their BumpNotes data. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => ({ userId: String(d.userId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.userId) throw new Error("userId required");
    if (data.userId === context.userId) {
      throw new Error("Use 'Delete my account' in Settings to remove your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("bumpnotes_state").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("feedback_submissions").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("contact_messages").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// The self-service `deleteOwnAccount` that used to live here (Supabase-only,
// never wired into the live Settings screen) was removed as part of the
// unified-erasure fix — the live self-service erasure path is
// `deleteOwnAccount` in src/lib/azure/account.functions.ts, which now also
// covers Supabase (see `eraseSupabaseUserData` in src/lib/azure/account-erasure.ts).
// Keeping two same-named functions that each cleared only one datastore was
// exactly the bug: neither erasure path cleared the other store (DPIA
// 2026-09-21 §4.8 R3).
