import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .inputValidator((data: { secret: string }) => ({ secret: String(data?.secret ?? "").slice(0, 200) }))
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tester_access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const generateAccessCodeBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prefix: string; count: number; startAt?: number; label?: string }) => ({
    prefix: String(d.prefix ?? "TESTA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "TESTA",
    count: Math.max(1, Math.min(50, Math.floor(Number(d.count) || 1))),
    startAt: Math.max(1, Math.floor(Number(d.startAt) || 1)),
    label: String(d.label ?? "").slice(0, 120) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // find existing codes with this prefix to avoid collisions
    const { data: existing } = await supabaseAdmin
      .from("tester_access_codes")
      .select("code")
      .ilike("code", `${data.prefix}%`);
    const used = new Set((existing ?? []).map((r) => String(r.code).toUpperCase()));
    const rows: { code: string; label: string | null; created_by: string }[] = [];
    let n = data.startAt;
    while (rows.length < data.count) {
      const candidate = generateCodeString(data.prefix, n);
      if (!used.has(candidate)) {
        rows.push({ code: candidate, label: data.label, created_by: context.userId });
        used.add(candidate);
      }
      n += 1;
      if (n > 9999) break;
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("tester_access_codes")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return { inserted: inserted ?? [] };
  });

export const createCustomAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; label?: string; notes?: string }) => ({
    code: String(d.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32),
    label: String(d.label ?? "").slice(0, 120) || null,
    notes: String(d.notes ?? "").slice(0, 500) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.code) throw new Error("Code is required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("tester_access_codes")
      .insert({ code: data.code, label: data.label, notes: data.notes, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { code: row };
  });

export const setAccessCodeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "active" | "inactive" }) => ({
    id: String(d.id ?? ""),
    status: d.status === "inactive" ? "inactive" as const : "active" as const,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tester_access_codes")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFeedbackResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("feedback_responses")
      .select("*, tester_access_codes(code, label)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { responses: data ?? [] };
  });

export const adminDashboardSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: codes }, { data: responses }, { count: sessionCount }] = await Promise.all([
      supabaseAdmin.from("tester_access_codes").select("*"),
      supabaseAdmin.from("feedback_responses").select("*"),
      supabaseAdmin.from("tester_sessions").select("*", { count: "exact", head: true }),
    ]);
    return {
      codes: codes ?? [],
      responses: responses ?? [],
      sessionCount: sessionCount ?? 0,
    };
  });
