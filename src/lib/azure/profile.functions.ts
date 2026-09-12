// Profile server functions (AZURE Phase 3 — first vertical slice).
//
// The first consumers of the 2.6 auth middleware (`requireApiAuth`) and the
// Azure PG pool. Scoped strictly by the internal user id the middleware
// resolves — never a client-supplied id (AZURE §1.3, §2 API-level authz).
// The browser attaches the Supabase bearer token automatically via the global
// `attachSupabaseAuth` function-middleware, which `requireApiAuth` validates
// (Supabase bridge path) — so no token plumbing is needed here.
//
// Requires SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY as App Service settings (the
// bridge path) and AZURE_PG_URL (Key Vault reference, already resolving).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Profile } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  is_tester: boolean;
  accepted_terms_at: Date | string | null;
  accepted_privacy_at: Date | string | null;
  preferred_name: string | null;
  date_of_birth: Date | string | null;
  health_identifier: string | null;
  health_identifier_label: string;
  photo_path: string | null;
  v2_notice_dismissed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: Date | string | null): string | null => (v == null ? null : iso(v));
const dateOrNull = (v: Date | string | null): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

function mapProfileRow(r: ProfileRow): Profile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    isTester: r.is_tester,
    acceptedTermsAt: isoOrNull(r.accepted_terms_at),
    acceptedPrivacyAt: isoOrNull(r.accepted_privacy_at),
    preferredName: r.preferred_name,
    dateOfBirth: dateOrNull(r.date_of_birth),
    healthIdentifier: r.health_identifier,
    healthIdentifierLabel: r.health_identifier_label,
    photoPath: r.photo_path,
    v2NoticeDismissedAt: isoOrNull(r.v2_notice_dismissed_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const PROFILE_COLUMNS = `user_id, display_name, is_tester, accepted_terms_at, accepted_privacy_at,
  preferred_name, date_of_birth, health_identifier, health_identifier_label, photo_path,
  v2_notice_dismissed_at, created_at, updated_at`;

/** Read the signed-in user's profile (null if not yet created). */
export const getProfile = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<ProfileRow>(
      `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE user_id = $1`,
      [context.userId],
    );
    return res.rows[0] ? mapProfileRow(res.rows[0]) : null;
  });

// Patch semantics: a provided field is set; an omitted/null field is kept
// (COALESCE with the existing value). Clearing a field to null is out of scope
// for this slice.
const profilePatchSchema = z
  .object({
    displayName: z.string().max(200).nullish(),
    preferredName: z.string().max(200).nullish(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be YYYY-MM-DD")
      .nullish(),
    healthIdentifier: z.string().max(100).nullish(),
    healthIdentifierLabel: z.string().min(1).max(100).nullish(),
    photoPath: z.string().max(500).nullish(),
  })
  .strict();

type ProfilePatch = z.infer<typeof profilePatchSchema>;

/** Create-or-update the signed-in user's profile; returns the persisted row. */
export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: ProfilePatch) => profilePatchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const p = [
      context.userId,
      data.displayName ?? null,
      data.preferredName ?? null,
      data.dateOfBirth ?? null,
      data.healthIdentifier ?? null,
      data.healthIdentifierLabel ?? null,
      data.photoPath ?? null,
    ];
    const res = await pool.query<ProfileRow>(
      `INSERT INTO profiles (user_id, display_name, preferred_name, date_of_birth,
         health_identifier, health_identifier_label, photo_path)
       VALUES ($1, $2, $3, $4::date, $5, COALESCE($6, 'NHS number'), $7)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = COALESCE($2, profiles.display_name),
         preferred_name = COALESCE($3, profiles.preferred_name),
         date_of_birth = COALESCE($4::date, profiles.date_of_birth),
         health_identifier = COALESCE($5, profiles.health_identifier),
         health_identifier_label = COALESCE($6, profiles.health_identifier_label),
         photo_path = COALESCE($7, profiles.photo_path)
       RETURNING ${PROFILE_COLUMNS}`,
      p,
    );
    return mapProfileRow(res.rows[0]);
  });
