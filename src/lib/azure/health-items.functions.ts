// Health items server functions (AZURE Phase 3A). Current-state facts as
// free-text chips, never coded (ARCH §3.2). Owner-scoped by context.userId.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { HealthItem } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface HealthItemRow {
  id: string;
  user_id: string;
  kind: string;
  text: string;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));

function mapHealthItemRow(r: HealthItemRow): HealthItem {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind as HealthItem["kind"],
    text: r.text,
    active: r.active,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const HEALTH_ITEM_COLUMNS = `id, user_id, kind, text, active, created_at, updated_at`;
const KINDS = ["condition", "allergy", "medication", "operation"] as const;

/** All of the user's health items, newest first. */
export const listHealthItems = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<HealthItemRow>(
      `SELECT ${HEALTH_ITEM_COLUMNS} FROM health_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [context.userId],
    );
    return res.rows.map(mapHealthItemRow);
  });

const upsertHealthItemSchema = z
  .object({
    id: z.string().uuid().optional(),
    kind: z.enum(KINDS),
    text: z.string().min(1).max(500),
    active: z.boolean().optional(),
  })
  .strict();

type UpsertHealthItemInput = z.infer<typeof upsertHealthItemSchema>;

/** Create or update a health item; returns the persisted row. */
export const upsertHealthItem = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UpsertHealthItemInput) => upsertHealthItemSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    if (data.id) {
      const res = await pool.query<HealthItemRow>(
        `UPDATE health_items SET kind = $3, text = $4, active = COALESCE($5, active)
         WHERE id = $1 AND user_id = $2
         RETURNING ${HEALTH_ITEM_COLUMNS}`,
        [data.id, context.userId, data.kind, data.text, data.active ?? null],
      );
      if (!res.rows[0]) throw new Error("health item not found");
      return mapHealthItemRow(res.rows[0]);
    }
    const res = await pool.query<HealthItemRow>(
      `INSERT INTO health_items (user_id, kind, text, active)
       VALUES ($1, $2, $3, COALESCE($4, true))
       RETURNING ${HEALTH_ITEM_COLUMNS}`,
      [context.userId, data.kind, data.text, data.active ?? null],
    );
    return mapHealthItemRow(res.rows[0]);
  });
