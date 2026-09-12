// People (care team) server functions (AZURE Phase 3A). Person-level, not
// pregnancy-scoped (ARCH §3.3). Owner-scoped by context.userId.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Person } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface PersonRow {
  id: string;
  user_id: string;
  name: string;
  role: string;
  contact_details: string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: Date | string | null): string | null => (v == null ? null : iso(v));

function mapPersonRow(r: PersonRow): Person {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    role: r.role as Person["role"],
    contactDetails: r.contact_details,
    archivedAt: isoOrNull(r.archived_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const PERSON_COLUMNS = `id, user_id, name, role, contact_details, archived_at,
  created_at, updated_at`;

const ROLES = [
  "midwife",
  "gp",
  "consultant",
  "sonographer",
  "birth_partner",
  "hospital",
  "other",
] as const;

/** All of the user's people, newest first. */
export const listPeople = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<PersonRow>(
      `SELECT ${PERSON_COLUMNS} FROM people WHERE user_id = $1 ORDER BY created_at DESC`,
      [context.userId],
    );
    return res.rows.map(mapPersonRow);
  });

// Create when `id` is absent, update-in-place when present. On update, only
// provided fields change (COALESCE); `archivedAt` is set explicitly to archive.
const upsertPersonSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    role: z.enum(ROLES),
    contactDetails: z.string().max(1000).nullish(),
    archivedAt: z.string().datetime().nullish(),
  })
  .strict();

type UpsertPersonInput = z.infer<typeof upsertPersonSchema>;

/** Create or update a person; returns the persisted row. */
export const upsertPerson = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpsertPersonInput) => upsertPersonSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    if (data.id) {
      const res = await pool.query<PersonRow>(
        `UPDATE people SET
           name = $3,
           role = $4,
           contact_details = COALESCE($5, contact_details),
           archived_at = $6
         WHERE id = $1 AND user_id = $2
         RETURNING ${PERSON_COLUMNS}`,
        [
          data.id,
          context.userId,
          data.name,
          data.role,
          data.contactDetails ?? null,
          data.archivedAt ?? null,
        ],
      );
      if (!res.rows[0]) throw new Error("person not found");
      return mapPersonRow(res.rows[0]);
    }
    const res = await pool.query<PersonRow>(
      `INSERT INTO people (user_id, name, role, contact_details, archived_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PERSON_COLUMNS}`,
      [context.userId, data.name, data.role, data.contactDetails ?? null, data.archivedAt ?? null],
    );
    return mapPersonRow(res.rows[0]);
  });
