// In-app feedback button (the floating "Send feedback" heart in AppShell),
// re-homed onto Azure Postgres as part of the Supabase retirement
// (~/NightMode/bumpnotes-supabase-retirement-plan-2026-09-21.md, Part 1,
// table row 9). The old Supabase-backed version lived entirely client-side
// (a single insert relying on Supabase RLS to allow both signed-in and
// anonymous/tester writers); Azure has no RLS layer, so this is split into
// two server fns per the plan's own note: an authed path for signed-in users
// (their identity is resolved server-side via requireApiAuth — never trusted
// from the client) and a public path for tester-mode submissions (unchanged
// risk profile from the Supabase original, which was also anonymous-writable).
//
// Founder ruling (2026-09-21): the previous Supabase-held feedback rows are
// BINNED (discarded, not migrated) — this starts a fresh, empty table.

import { createServerFn } from "@tanstack/react-start";
import { getAzurePgPool } from "./pg-pool";
import { requireApiAuth } from "./api-auth-middleware";

export type FeedbackCategory = "improvement" | "problem" | "love" | "question" | "other";
const CATEGORIES: FeedbackCategory[] = ["improvement", "problem", "love", "question", "other"];

interface FeedbackFields {
  category: FeedbackCategory;
  message: string;
  replyEmail: string | null;
  pagePath: string | null;
  appVersion: string | null;
  userAgent: string | null;
  viewport: string | null;
  language: string | null;
}

function normalizeFields(data: {
  category: string;
  message: string;
  replyEmail?: string | null;
  pagePath?: string | null;
  appVersion?: string | null;
  userAgent?: string | null;
  viewport?: string | null;
  language?: string | null;
}): FeedbackFields {
  return {
    category: CATEGORIES.includes(data.category as FeedbackCategory)
      ? (data.category as FeedbackCategory)
      : "other",
    message: String(data.message ?? "").slice(0, 5000),
    replyEmail: data.replyEmail?.trim() ? data.replyEmail.trim().slice(0, 320) : null,
    pagePath: data.pagePath?.slice(0, 500) ?? null,
    appVersion: data.appVersion?.slice(0, 40) ?? null,
    userAgent: data.userAgent?.slice(0, 500) ?? null,
    viewport: data.viewport?.slice(0, 40) ?? null,
    language: data.language?.slice(0, 40) ?? null,
  };
}

async function insertFeedback(
  fields: FeedbackFields,
  extra: { userId: string | null; isTester: boolean; testerSessionId: string | null },
) {
  if (!fields.message.trim()) throw new Error("Message is required");
  const pool = getAzurePgPool();
  await pool.query(
    `INSERT INTO feedback_submissions
       (user_id, category, message, reply_email, tester_session_id, is_tester,
        page_path, app_version, user_agent, viewport, context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      extra.userId,
      fields.category,
      fields.message.trim(),
      fields.replyEmail,
      extra.testerSessionId,
      extra.isTester,
      fields.pagePath,
      fields.appVersion,
      fields.userAgent,
      fields.viewport,
      JSON.stringify({ language: fields.language, timestamp: new Date().toISOString() }),
    ],
  );
}

/** Signed-in submission — identity resolved server-side by requireApiAuth. */
export const submitFeedbackAuthed = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator(
    (data: {
      category: string;
      message: string;
      replyEmail?: string | null;
      pagePath?: string | null;
      appVersion?: string | null;
      userAgent?: string | null;
      viewport?: string | null;
      language?: string | null;
    }) => normalizeFields(data),
  )
  .handler(async ({ data, context }) => {
    await insertFeedback(data, { userId: context.userId, isTester: false, testerSessionId: null });
    return { ok: true as const };
  });

/**
 * Public submission for tester-mode (unauthenticated by design, mirroring
 * the Supabase original's anonymous-writable behaviour). `testerSessionId`
 * is only recorded if it matches a real tester_sessions row.
 */
export const submitFeedbackPublic = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      category: string;
      message: string;
      replyEmail?: string | null;
      testerSessionId?: string | null;
      pagePath?: string | null;
      appVersion?: string | null;
      userAgent?: string | null;
      viewport?: string | null;
      language?: string | null;
    }) => ({
      ...normalizeFields(data),
      testerSessionId: data.testerSessionId ? String(data.testerSessionId).slice(0, 64) : null,
    }),
  )
  .handler(async ({ data }) => {
    const pool = getAzurePgPool();
    let sessionId: string | null = null;
    if (data.testerSessionId) {
      const { rows } = await pool.query<{ id: string }>(
        "SELECT id FROM tester_sessions WHERE id = $1",
        [data.testerSessionId],
      );
      sessionId = rows[0]?.id ?? null;
    }
    await insertFeedback(data, { userId: null, isTester: true, testerSessionId: sessionId });
    return { ok: true as const };
  });
