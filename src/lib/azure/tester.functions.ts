// The tester access-code program (footer "Testing BumpNotes? Enter tester
// access code" on the public site + the in-app tester banner/survey),
// re-homed onto Azure Postgres as part of the Supabase retirement
// (~/NightMode/bumpnotes-supabase-retirement-plan-2026-09-21.md, Part 1,
// table row 8). 1:1 port of the removed
// src/lib/bumpnotes/tester-feedback.functions.ts, swapping supabaseAdmin for
// the Azure pg pool. All three functions stay public/unauthenticated by
// design — testers are never signed-in users.
//
// Founder ruling (2026-09-21): the previous Supabase-held tester rows
// (tester_access_codes, tester_sessions, feedback_responses) are BINNED
// (discarded, not migrated) — this starts fresh, empty Azure tables.

import { createServerFn } from "@tanstack/react-start";
import { getAzurePgPool } from "./pg-pool";

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

    const pool = getAzurePgPool();
    const lookup = submitted.toUpperCase();

    const { rows } = await pool.query<{
      id: string;
      status: string;
      use_count: number;
      first_used_at: string | null;
    }>(
      "SELECT id, status, use_count, first_used_at FROM tester_access_codes WHERE upper(code) = $1",
      [lookup],
    );
    const codeRow = rows[0];
    if (!codeRow) return { ok: false as const, reason: "wrong" as const };
    if (codeRow.status !== "active") return { ok: false as const, reason: "inactive" as const };

    const now = new Date().toISOString();
    await pool.query(
      `UPDATE tester_access_codes
       SET use_count = $1, last_used_at = $2, first_used_at = COALESCE(first_used_at, $2)
       WHERE id = $3`,
      [(codeRow.use_count ?? 0) + 1, now, codeRow.id],
    );

    const { device, browser } = detectDevice(data.userAgent);
    const { rows: sessionRows } = await pool.query<{ id: string }>(
      `INSERT INTO tester_sessions (access_code_id, device_type, browser, pages_viewed_count)
       VALUES ($1, $2, $3, 1) RETURNING id`,
      [codeRow.id, device, browser],
    );
    const session = sessionRows[0];
    if (!session) return { ok: false as const, reason: "wrong" as const };

    return {
      ok: true as const,
      sessionId: session.id,
      accessCodeId: codeRow.id,
    };
  });

/** Lightweight heartbeat to update last_seen_at + page count. */
export const pingTesterSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => ({
    sessionId: String(data?.sessionId ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.sessionId) return { ok: false };
    const pool = getAzurePgPool();
    const { rows } = await pool.query<{ pages_viewed_count: number }>(
      "SELECT pages_viewed_count FROM tester_sessions WHERE id = $1",
      [data.sessionId],
    );
    const row = rows[0];
    if (!row) return { ok: false };
    await pool.query(
      "UPDATE tester_sessions SET last_seen_at = $1, pages_viewed_count = $2 WHERE id = $3",
      [new Date().toISOString(), (row.pages_viewed_count ?? 0) + 1, data.sessionId],
    );
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
    const pool = getAzurePgPool();

    const { rows } = await pool.query<{ id: string; access_code_id: string }>(
      "SELECT id, access_code_id FROM tester_sessions WHERE id = $1",
      [data.sessionId],
    );
    const session = rows[0];
    if (!session) throw new Error("Tester session not found");

    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO feedback_responses
         (access_code_id, tester_session_id, pregnancy_identity_answer,
          professional_identity_answer, feedback_route, q1_answer, q2_answer,
          q3_answer, improvement_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        session.access_code_id,
        session.id,
        data.pregnancyIdentity,
        data.professionalIdentity,
        data.feedbackRoute,
        data.q1,
        data.q2,
        data.q3,
        data.improvementText.trim() || null,
      ],
    );

    await pool.query(
      `UPDATE tester_sessions
       SET feedback_started_at = COALESCE(feedback_started_at, $1),
           feedback_completed_at = $1,
           last_seen_at = $1
       WHERE id = $2`,
      [now, session.id],
    );

    await pool.query("UPDATE tester_access_codes SET feedback_submitted_at = $1 WHERE id = $2", [
      now,
      session.access_code_id,
    ]);

    return { ok: true as const };
  });
