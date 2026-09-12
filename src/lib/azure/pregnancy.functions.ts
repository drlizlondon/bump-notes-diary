// Pregnancy server functions (AZURE Phase 3A). Same pattern as
// profile.functions.ts: `requireApiAuth` resolves the internal user id, the pg
// pool runs the query, everything is scoped to context.userId — never a
// client-supplied id. Pregnancy is a first-class episode entity (ARCH §5.2);
// the schema enforces one active pregnancy per user.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Pregnancy } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface PregnancyRow {
  id: string;
  user_id: string;
  edd: Date | string;
  lmp: Date | string | null;
  nickname: string | null;
  birth_place: string | null;
  status: string;
  ended_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: Date | string | null): string | null => (v == null ? null : iso(v));
const dateStr = (v: Date | string): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
const dateOrNull = (v: Date | string | null): string | null => (v == null ? null : dateStr(v));

function mapPregnancyRow(r: PregnancyRow): Pregnancy {
  return {
    id: r.id,
    userId: r.user_id,
    edd: dateStr(r.edd),
    lmp: dateOrNull(r.lmp),
    nickname: r.nickname,
    birthPlace: r.birth_place,
    status: r.status as Pregnancy["status"],
    endedAt: isoOrNull(r.ended_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const PREGNANCY_COLUMNS = `id, user_id, edd, lmp, nickname, birth_place, status, ended_at,
  created_at, updated_at`;

/** All pregnancies for the signed-in user, newest first. */
export const listPregnancies = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<PregnancyRow>(
      `SELECT ${PREGNANCY_COLUMNS} FROM pregnancies WHERE user_id = $1 ORDER BY created_at DESC`,
      [context.userId],
    );
    return res.rows.map(mapPregnancyRow);
  });

/** The user's single active pregnancy, or null. */
export const getActivePregnancy = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<PregnancyRow>(
      `SELECT ${PREGNANCY_COLUMNS} FROM pregnancies WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [context.userId],
    );
    return res.rows[0] ? mapPregnancyRow(res.rows[0]) : null;
  });

const createPregnancySchema = z
  .object({
    edd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "edd must be YYYY-MM-DD"),
    lmp: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "lmp must be YYYY-MM-DD")
      .nullish(),
    nickname: z.string().max(200).nullish(),
    birthPlace: z.string().max(200).nullish(),
  })
  .strict();

type CreatePregnancyInput = z.infer<typeof createPregnancySchema>;

/**
 * Start a new pregnancy (created active). The one-active-per-user unique index
 * rejects a second active pregnancy — the caller ends the previous one first.
 */
export const createPregnancy = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: CreatePregnancyInput) => createPregnancySchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<PregnancyRow>(
      `INSERT INTO pregnancies (user_id, edd, lmp, nickname, birth_place)
       VALUES ($1, $2::date, $3::date, $4, $5)
       RETURNING ${PREGNANCY_COLUMNS}`,
      [context.userId, data.edd, data.lmp ?? null, data.nickname ?? null, data.birthPlace ?? null],
    );
    return mapPregnancyRow(res.rows[0]);
  });

const updatePregnancySchema = z
  .object({
    id: z.string().uuid(),
    edd: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "edd must be YYYY-MM-DD")
      .optional(),
    lmp: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "lmp must be YYYY-MM-DD")
      .nullish(),
    nickname: z.string().max(200).nullish(),
    birthPlace: z.string().max(200).nullish(),
  })
  .strict();

type UpdatePregnancyInput = z.infer<typeof updatePregnancySchema>;

/**
 * Correct an existing pregnancy episode (owner-scoped): due date, nickname,
 * birth place. Only the provided fields change. Not a health entry, so it is a
 * normal in-place update (the append-only rule applies to `entries`, not this).
 */
export const updatePregnancy = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpdatePregnancyInput) => updatePregnancySchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const sets: string[] = [];
    const params: unknown[] = [data.id, context.userId];
    if (data.edd !== undefined) {
      params.push(data.edd);
      sets.push(`edd = $${params.length}::date`);
    }
    if (data.lmp !== undefined) {
      params.push(data.lmp);
      sets.push(`lmp = $${params.length}::date`);
    }
    if (data.nickname !== undefined) {
      params.push(data.nickname);
      sets.push(`nickname = $${params.length}`);
    }
    if (data.birthPlace !== undefined) {
      params.push(data.birthPlace);
      sets.push(`birth_place = $${params.length}`);
    }
    if (sets.length === 0) {
      const cur = await pool.query<PregnancyRow>(
        `SELECT ${PREGNANCY_COLUMNS} FROM pregnancies WHERE id = $1 AND user_id = $2`,
        [data.id, context.userId],
      );
      if (!cur.rows[0]) throw new Error("pregnancy not found");
      return mapPregnancyRow(cur.rows[0]);
    }
    const res = await pool.query<PregnancyRow>(
      `UPDATE pregnancies SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2
       RETURNING ${PREGNANCY_COLUMNS}`,
      params,
    );
    if (!res.rows[0]) throw new Error("pregnancy not found");
    return mapPregnancyRow(res.rows[0]);
  });
