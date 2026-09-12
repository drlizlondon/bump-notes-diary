import { createServerFn } from "@tanstack/react-start";

type Answer = "yes" | "no";
type Q1 = "yes" | "mostly" | "no";
type Q23 = "yes" | "maybe" | "no";

function detectDevice(ua: string | null | undefined): { device: string; browser: string } {
  const s = (ua ?? "").toLowerCase();
  let device = "desktop";
  if (/iphone|ipod|android.+mobile|windows phone/.test(s)) device = "mobile";
  else if (/ipad|tablet/.test(s)) device = "tablet";
  let browser = "unknown";
  if (/edg\//.test(s)) browser = "edge";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "chrome";
  else if (/safari\//.test(s) && !/chrome\//.test(s)) browser = "safari";
  else if (/firefox\//.test(s)) browser = "firefox";
  return { device, browser };
}

/**
 * Validate a tester access code, record usage and start a session.
 * Public server fn — no auth required (testers are not signed-in users).
 */
export const verifyTesterCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; userAgent?: string | null }) => ({
    code: String(data?.code ?? "").slice(0, 64),
    userAgent: typeof data?.userAgent === "string" ? data.userAgent.slice(0, 500) : null,
  }))
  .handler(async ({ data }) => {
    const submitted = data.code.trim();
    if (!submitted) return { ok: false as const, reason: "empty" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lookup = submitted.toUpperCase();

    const { data: codeRow, error: lookupErr } = await supabaseAdmin
      .from("tester_access_codes")
      .select("id, code, status, use_count, first_used_at")
      .ilike("code", lookup)
      .maybeSingle();
    if (lookupErr) return { ok: false as const, reason: "wrong" as const };
    if (!codeRow) return { ok: false as const, reason: "wrong" as const };
    if (codeRow.status !== "active") return { ok: false as const, reason: "inactive" as const };

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("tester_access_codes")
      .update({
        use_count: (codeRow.use_count ?? 0) + 1,
        last_used_at: now,
        first_used_at: codeRow.first_used_at ?? now,
      })
      .eq("id", codeRow.id);

    const { device, browser } = detectDevice(data.userAgent);
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("tester_sessions")
      .insert({
        access_code_id: codeRow.id,
        device_type: device,
        browser,
        pages_viewed_count: 1,
      })
      .select("id")
      .single();
    if (sessionErr || !session) return { ok: false as const, reason: "wrong" as const };

    return {
      ok: true as const,
      sessionId: session.id as string,
      accessCodeId: codeRow.id as string,
    };
  });

/** Lightweight heartbeat to update last_seen_at + page count. */
export const pingTesterSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => ({
    sessionId: String(data?.sessionId ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.sessionId) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tester_sessions")
      .select("pages_viewed_count")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!row) return { ok: false };
    await supabaseAdmin
      .from("tester_sessions")
      .update({
        last_seen_at: new Date().toISOString(),
        pages_viewed_count: (row.pages_viewed_count ?? 0) + 1,
      })
      .eq("id", data.sessionId);
    return { ok: true };
  });

/** Submit the tester feedback form. Public server fn gated by valid session id. */
export const submitTesterFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      sessionId: string;
      pregnancyIdentity: Answer;
      professionalIdentity: Answer;
      feedbackRoute: "yes_to_both" | "yes_to_either" | "no_to_both";
      q1: Q1 | null;
      q2: Q23 | null;
      q3: Q23 | null;
      improvementText: string;
    }) => ({
      sessionId: String(data?.sessionId ?? ""),
      pregnancyIdentity: data.pregnancyIdentity === "yes" ? ("yes" as const) : ("no" as const),
      professionalIdentity:
        data.professionalIdentity === "yes" ? ("yes" as const) : ("no" as const),
      feedbackRoute: data.feedbackRoute,
      q1: data.q1 ?? null,
      q2: data.q2 ?? null,
      q3: data.q3 ?? null,
      improvementText: String(data?.improvementText ?? "").slice(0, 4000),
    }),
  )
  .handler(async ({ data }) => {
    if (!data.sessionId) throw new Error("Missing tester session");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: session, error: sessErr } = await supabaseAdmin
      .from("tester_sessions")
      .select("id, access_code_id, feedback_started_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sessErr || !session) throw new Error("Tester session not found");

    const now = new Date().toISOString();

    const { error: insErr } = await supabaseAdmin.from("feedback_responses").insert({
      access_code_id: session.access_code_id,
      tester_session_id: session.id,
      pregnancy_identity_answer: data.pregnancyIdentity,
      professional_identity_answer: data.professionalIdentity,
      feedback_route: data.feedbackRoute,
      q1_answer: data.q1,
      q2_answer: data.q2,
      q3_answer: data.q3,
      improvement_text: data.improvementText.trim() || null,
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("tester_sessions")
      .update({
        feedback_started_at: session.feedback_started_at ?? now,
        feedback_completed_at: now,
        last_seen_at: now,
      })
      .eq("id", session.id);

    await supabaseAdmin
      .from("tester_access_codes")
      .update({ feedback_submitted_at: now })
      .eq("id", session.access_code_id);

    return { ok: true as const };
  });
