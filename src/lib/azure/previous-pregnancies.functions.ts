// Previous Pregnancies server functions (AZURE Phase 3; ARCH §3.4).
//
// About Me STATE, edited in place (§3.1) — not the append-only Record stream.
// One table (`previous_pregnancy_notes`) holds two row shapes: the single
// `is_header` row per user (counts) and prompt-tagged rows (her own words).
// Owner-scoped by context.userId; the API never trusts a client id.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  PreviousPregnancies,
  PreviousPregnancyHeader,
  PreviousPregnancyNote,
} from "../domain/types";
import { PREVIOUS_PREGNANCY_PROMPT_TAGS } from "../bumpnotes/previous-pregnancies";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface Row {
  id: string;
  is_header: boolean;
  pregnancy_count: number | null;
  birth_count: number | null;
  prompt_tag: string | null;
  text: string | null;
  sort: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));
const COLUMNS = `id, is_header, pregnancy_count, birth_count, prompt_tag, text, sort, created_at, updated_at`;

function mapHeader(r: Row): PreviousPregnancyHeader {
  return {
    pregnancyCount: r.pregnancy_count,
    birthCount: r.birth_count,
    updatedAt: iso(r.updated_at),
  };
}
function mapNote(r: Row): PreviousPregnancyNote {
  return {
    id: r.id,
    promptTag: r.prompt_tag ?? "",
    text: r.text ?? "",
    sort: r.sort,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

/** The user's counts header (or null) plus her prompt-tagged notes, in order. */
export const getPreviousPregnancies = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }): Promise<PreviousPregnancies> => {
    const pool = getAzurePgPool();
    const res = await pool.query<Row>(
      `SELECT ${COLUMNS} FROM previous_pregnancy_notes
       WHERE user_id = $1
       ORDER BY is_header DESC, sort NULLS LAST, created_at`,
      [context.userId],
    );
    const headerRow = res.rows.find((r) => r.is_header);
    return {
      header: headerRow ? mapHeader(headerRow) : null,
      notes: res.rows.filter((r) => !r.is_header).map(mapNote),
    };
  });

// Counts. Either may be null; `pregnancyCount` counts PREVIOUS pregnancies
// (0 = first pregnancy). Upserts the single header row (partial unique index).
const upsertHeaderSchema = z
  .object({
    pregnancyCount: z.number().int().min(0).max(60).nullable(),
    birthCount: z.number().int().min(0).max(60).nullable(),
  })
  .strict();
type UpsertHeaderInput = z.infer<typeof upsertHeaderSchema>;

export const upsertPreviousPregnancyHeader = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpsertHeaderInput) => upsertHeaderSchema.parse(data))
  .handler(async ({ data, context }): Promise<PreviousPregnancyHeader> => {
    const pool = getAzurePgPool();
    const res = await pool.query<Row>(
      `INSERT INTO previous_pregnancy_notes (user_id, is_header, pregnancy_count, birth_count)
       VALUES ($1, true, $2, $3)
       ON CONFLICT (user_id) WHERE is_header
       DO UPDATE SET pregnancy_count = $2, birth_count = $3, updated_at = now()
       RETURNING ${COLUMNS}`,
      [context.userId, data.pregnancyCount, data.birthCount],
    );
    return mapHeader(res.rows[0]);
  });

// A prompt's free-text, keyed by prompt_tag (one note per prompt). In-place
// upsert (§3.1). Blank text is rejected — clear a note with delete instead.
const upsertNoteSchema = z
  .object({
    promptTag: z.enum(PREVIOUS_PREGNANCY_PROMPT_TAGS as [string, ...string[]]),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();
type UpsertNoteInput = z.infer<typeof upsertNoteSchema>;

export const upsertPreviousPregnancyNote = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpsertNoteInput) => upsertNoteSchema.parse(data))
  .handler(async ({ data, context }): Promise<PreviousPregnancyNote> => {
    const pool = getAzurePgPool();
    const upd = await pool.query<Row>(
      `UPDATE previous_pregnancy_notes
       SET text = $3, updated_at = now()
       WHERE user_id = $1 AND prompt_tag = $2 AND NOT is_header
       RETURNING ${COLUMNS}`,
      [context.userId, data.promptTag, data.text],
    );
    if (upd.rows[0]) return mapNote(upd.rows[0]);
    const ins = await pool.query<Row>(
      `INSERT INTO previous_pregnancy_notes (user_id, is_header, prompt_tag, text)
       VALUES ($1, false, $2, $3)
       RETURNING ${COLUMNS}`,
      [context.userId, data.promptTag, data.text],
    );
    return mapNote(ins.rows[0]);
  });

const deleteNoteSchema = z
  .object({ promptTag: z.enum(PREVIOUS_PREGNANCY_PROMPT_TAGS as [string, ...string[]]) })
  .strict();
type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;

export const deletePreviousPregnancyNote = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: DeleteNoteInput) => deleteNoteSchema.parse(data))
  .handler(async ({ data, context }): Promise<void> => {
    const pool = getAzurePgPool();
    await pool.query(
      `DELETE FROM previous_pregnancy_notes
       WHERE user_id = $1 AND prompt_tag = $2 AND NOT is_header`,
      [context.userId, data.promptTag],
    );
  });
