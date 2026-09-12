// Preferences server functions (AZURE Phase 3A). Singleton per user; ordered
// free-text items (ARCH §3.5). Owner-scoped by context.userId.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Preferences } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface PreferencesRow {
  user_id: string;
  items: string[] | null;
  anything_else: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));

function mapPreferencesRow(r: PreferencesRow): Preferences {
  return {
    userId: r.user_id,
    items: Array.isArray(r.items) ? r.items : [],
    anythingElse: r.anything_else,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const PREFERENCES_COLUMNS = `user_id, items, anything_else, created_at, updated_at`;

/** The user's preferences singleton, or null if never set. */
export const getPreferences = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<PreferencesRow>(
      `SELECT ${PREFERENCES_COLUMNS} FROM preferences WHERE user_id = $1`,
      [context.userId],
    );
    return res.rows[0] ? mapPreferencesRow(res.rows[0]) : null;
  });

// Patch: `items` (when provided) replaces the whole ordered list; `anythingElse`
// (when provided) is set. Omitted fields are kept.
const upsertPreferencesSchema = z
  .object({
    items: z.array(z.string().max(500)).max(100).optional(),
    anythingElse: z.string().max(2000).nullish(),
  })
  .strict();

type UpsertPreferencesInput = z.infer<typeof upsertPreferencesSchema>;

/** Create-or-update the user's preferences singleton; returns the persisted row. */
export const upsertPreferences = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpsertPreferencesInput) => upsertPreferencesSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const itemsJson = data.items === undefined ? null : JSON.stringify(data.items);
    const res = await pool.query<PreferencesRow>(
      `INSERT INTO preferences (user_id, items, anything_else)
       VALUES ($1, COALESCE($2::jsonb, '[]'::jsonb), $3)
       ON CONFLICT (user_id) DO UPDATE SET
         items = COALESCE($2::jsonb, preferences.items),
         anything_else = COALESCE($3, preferences.anything_else)
       RETURNING ${PREFERENCES_COLUMNS}`,
      [context.userId, itemsJson, data.anythingElse ?? null],
    );
    return mapPreferencesRow(res.rows[0]);
  });
