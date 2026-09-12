// Account-level GDPR data-subject rights (GDPR-1 export, GDPR-2 erasure).
// Owner-scoped by context.userId. See docs/product/GDPR-DATA-RIGHTS-SPEC.md.

import { createServerFn } from "@tanstack/react-start";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";
import { deleteAllUserBlobs, issueDownloadSas } from "./blob-helpers";
import { deleteEntraUser, type EntraDeleteResult } from "./entra-admin";

async function writeAudit(
  pool: { query: (q: string, p: unknown[]) => Promise<unknown> },
  actorUserId: string | null,
  action: string,
  targetId: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id)
     VALUES ($1, $2, 'account', $3)`,
    [actorUserId, action, targetId],
  );
}

/**
 * GDPR-1 — Right of access / portability (Art 15 & 20). Returns a complete,
 * machine-readable copy of everything the signed-in user owns, plus short-lived
 * download URLs for every attachment. Writes a `data_export` audit event.
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const uid = context.userId;
    const one = async (sql: string) => (await pool.query(sql, [uid])).rows;

    const [
      account,
      profile,
      pregnancies,
      people,
      healthItems,
      preferences,
      entries,
      attachments,
      summaries,
      auditTrail,
    ] = await Promise.all([
      one(
        "SELECT id, external_identity_id, email, status, created_at, updated_at FROM users WHERE id = $1",
      ),
      one("SELECT * FROM profiles WHERE user_id = $1"),
      one("SELECT * FROM pregnancies WHERE user_id = $1 ORDER BY created_at"),
      one("SELECT * FROM people WHERE user_id = $1 ORDER BY created_at"),
      one("SELECT * FROM health_items WHERE user_id = $1 ORDER BY created_at"),
      one("SELECT * FROM preferences WHERE user_id = $1"),
      one("SELECT * FROM entries WHERE user_id = $1 ORDER BY occurred_at"),
      one("SELECT * FROM attachments WHERE user_id = $1 ORDER BY uploaded_at"),
      one("SELECT * FROM summaries WHERE user_id = $1 ORDER BY created_at"),
      one(
        "SELECT id, action, target_type, target_id, created_at FROM audit_events WHERE actor_user_id = $1 ORDER BY created_at",
      ),
    ]);

    // Attach a short-lived download URL to each attachment (best-effort).
    const attachmentsWithUrls = await Promise.all(
      (attachments as { id: string }[]).map(async (a) => {
        try {
          const { url, expiresAt } = await issueDownloadSas(pool, uid, a.id);
          return { ...a, downloadUrl: url, downloadUrlExpiresAt: expiresAt.toISOString() };
        } catch {
          return { ...a, downloadUrl: null };
        }
      }),
    );

    await writeAudit(pool, uid, "data_export", uid);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: "v2",
      account: account[0] ?? null,
      profile: profile[0] ?? null,
      pregnancies,
      people,
      healthItems,
      preferences: preferences[0] ?? null,
      entries,
      attachments: attachmentsWithUrls,
      summaries,
      auditTrail,
    };
  });

/**
 * GDPR-2 — Right to erasure (Art 17). Irreversibly deletes the user's data from
 * Postgres (cascades from the users row), every blob under their prefix, and
 * their Entra identity (via Graph, when configured). A de-identified erasure
 * record persists (the audit row's actor is nulled by the cascade). The client
 * should sign the user out after this resolves.
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .handler(async ({ context }) => {
    const pool = getAzurePgPool();
    const uid = context.userId;

    // The Entra object id, captured before the row is deleted.
    const userRow = await pool.query<{ external_identity_id: string | null }>(
      "SELECT external_identity_id FROM users WHERE id = $1",
      [uid],
    );
    const entraObjectId = userRow.rows[0]?.external_identity_id ?? null;

    // 1) Record the erasure first (actor is nulled when the user row is deleted,
    //    leaving a de-identified accountability record — Art 17(3)/Art 30).
    await writeAudit(pool, uid, "account_erasure", uid);

    // 2) Blobs.
    const { deleted: blobsDeleted } = await deleteAllUserBlobs(uid);

    // 3) Postgres — cascades to every owned table.
    await pool.query("DELETE FROM users WHERE id = $1", [uid]);

    // 4) Entra identity (best-effort: unconfigured => recorded as pending).
    let entra: EntraDeleteResult;
    try {
      entra = await deleteEntraUser(entraObjectId);
    } catch (error) {
      console.error("Entra account deletion failed (data already erased):", error);
      entra = { deleted: false, reason: "not_configured" };
    }

    return { erased: true, blobsDeleted, entra };
  });
