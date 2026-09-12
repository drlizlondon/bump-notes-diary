// Entry server functions (AZURE Phase 3A) — the core journal. Append-only with
// soft delete (PLAN §5.3). Owner-scoped by context.userId; the pregnancy is
// verified to belong to the user on write (INSERT..SELECT guard). `payload` is
// zod-validated per entry type before it is stored.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Entry, EntryPayload } from "../domain/types";
import type { CreateEntryInput, ListEntriesParams } from "../data/repository";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface EntryRow {
  id: string;
  user_id: string;
  pregnancy_id: string;
  person_id: string | null;
  type: string;
  type_version: number;
  occurred_at: Date | string;
  recorded_at: Date | string;
  gestation_weeks: number | null;
  gestation_days: number | null;
  visibility: string;
  payload: EntryPayload;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: Date | string | null): string | null => (v == null ? null : iso(v));

function mapEntryRow(r: EntryRow): Entry {
  return {
    id: r.id,
    userId: r.user_id,
    pregnancyId: r.pregnancy_id,
    personId: r.person_id,
    type: r.type as Entry["type"],
    typeVersion: r.type_version,
    occurredAt: iso(r.occurred_at),
    recordedAt: iso(r.recorded_at),
    gestationWeeks: r.gestation_weeks,
    gestationDays: r.gestation_days,
    visibility: r.visibility as Entry["visibility"],
    payload: r.payload,
    deletedAt: isoOrNull(r.deleted_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const ENTRY_COLUMNS = `id, user_id, pregnancy_id, person_id, type, type_version, occurred_at,
  recorded_at, gestation_weeks, gestation_days, visibility, payload, deleted_at,
  created_at, updated_at`;

const ENTRY_TYPES = [
  "symptom",
  "question",
  "appointment",
  "measurement",
  "upload",
  "note",
  "feeling",
] as const;

// Per-type payload schemas — mirror the EntryPayload union in domain/types.ts.
const payloadSchemas = {
  symptom: z
    .object({
      symptom: z.string().min(1).max(500),
      severity: z.number().int().min(0).max(10).optional(),
      quantifier: z.string().max(200).optional(),
      clarification: z.string().max(2000).optional(),
      location: z.string().max(200).optional(),
      note: z.string().max(2000).optional(),
    })
    .strict(),
  question: z
    .object({
      text: z.string().min(1).max(2000),
      context: z.string().max(2000).optional(),
      answered: z.boolean().optional(),
    })
    .strict(),
  appointment: z
    .object({
      kind: z.string().min(1).max(200),
      whoSeen: z.string().max(200).optional(),
      discussed: z.string().max(4000).optional(),
      advice: z.string().max(4000).optional(),
      followUp: z.string().max(2000).optional(),
    })
    .strict(),
  measurement: z
    .object({
      kind: z.string().min(1).max(200),
      customLabel: z.string().max(200).optional(),
      systolic: z.number().optional(),
      diastolic: z.number().optional(),
      pulse: z.number().optional(),
      value: z.number().optional(),
      unit: z.string().max(50).optional(),
      note: z.string().max(2000).optional(),
    })
    .strict(),
  upload: z
    .object({ tag: z.string().min(1).max(200), note: z.string().max(2000).optional() })
    .strict(),
  note: z.object({ text: z.string().min(1).max(8000) }).strict(),
  feeling: z
    .object({ feeling: z.string().min(1).max(200), note: z.string().max(2000).optional() })
    .strict(),
} as const;

const createEntrySchema = z
  .object({
    pregnancyId: z.string().uuid(),
    personId: z.string().uuid().nullish(),
    type: z.enum(ENTRY_TYPES),
    occurredAt: z.string().datetime(),
    gestationWeeks: z.number().int().min(0).max(45).nullish(),
    gestationDays: z.number().int().min(0).max(6).nullish(),
    visibility: z.enum(["private", "personal", "shareable"]),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((val, ctx) => {
    const result = payloadSchemas[val.type].safeParse(val.payload);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload"],
        message: `payload invalid for type "${val.type}": ${result.error.issues[0]?.message ?? "bad shape"}`,
      });
    }
    // 'feeling' entries are always private (ARCH — feelings never shared).
    if (val.type === "feeling" && val.visibility !== "private") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visibility"],
        message: "feeling entries must be private",
      });
    }
  });

const listEntriesSchema = z
  .object({
    pregnancyId: z.string().uuid(),
    type: z.enum(ENTRY_TYPES).optional(),
    includeDeleted: z.boolean().optional(),
  })
  .strict();

/** Entries for one pregnancy (owner-scoped), newest first. */
export const listEntries = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: ListEntriesParams) => listEntriesSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const clauses = ["user_id = $1", "pregnancy_id = $2"];
    const params: unknown[] = [context.userId, data.pregnancyId];
    if (data.type) {
      params.push(data.type);
      clauses.push(`type = $${params.length}`);
    }
    if (!data.includeDeleted) clauses.push("deleted_at IS NULL");
    const res = await pool.query<EntryRow>(
      `SELECT ${ENTRY_COLUMNS} FROM entries WHERE ${clauses.join(" AND ")} ORDER BY occurred_at DESC`,
      params,
    );
    return res.rows.map(mapEntryRow);
  });

/** Create an entry against one of the user's own pregnancies. */
export const createEntry = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: CreateEntryInput) => createEntrySchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    // INSERT..SELECT FROM pregnancies guarantees the pregnancy is the user's own
    // (no row -> no insert -> RETURNING empty -> we throw).
    const res = await pool.query<EntryRow>(
      `INSERT INTO entries
         (user_id, pregnancy_id, person_id, type, occurred_at, gestation_weeks,
          gestation_days, visibility, payload)
       SELECT $1, p.id, $3, $4, $5::timestamptz, $6, $7, $8, $9::jsonb
       FROM pregnancies p
       WHERE p.id = $2 AND p.user_id = $1
       RETURNING ${ENTRY_COLUMNS}`,
      [
        context.userId,
        data.pregnancyId,
        data.personId ?? null,
        data.type,
        data.occurredAt,
        data.gestationWeeks ?? null,
        data.gestationDays ?? null,
        data.visibility,
        JSON.stringify(data.payload),
      ],
    );
    if (!res.rows[0]) throw new Error("pregnancy not found for this user");
    return mapEntryRow(res.rows[0]);
  });

const softDeleteSchema = z.object({ id: z.string().uuid() }).strict();

/** Soft-delete one of the user's own entries. */
export const softDeleteEntry = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: { id: string }) => softDeleteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query(
      `UPDATE entries SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [data.id, context.userId],
    );
    if (res.rowCount === 0) throw new Error("entry not found");
  });
