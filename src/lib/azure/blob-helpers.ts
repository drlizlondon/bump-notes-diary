// Upload helper endpoints (AZURE §3 task 2.7; store made swappable in BP-DL-01).
//
// The frontend never receives storage credentials (AZURE §1.3): every
// operation here is ownership-checked against the internal `users.id` from
// requireApiAuth (2.6) and either streams through this server or issues a
// short-lived signed URL. No permanent public URLs, no keys handed out.
// Which store holds the bytes (Azure Blob or Supabase Storage) is config only:
// see getBlobStore in @/lib/data-store/blob-store.

import type pg from "pg";
import { getBlobStore, type AttachmentContainer } from "@/lib/data-store/blob-store";

export type { AttachmentContainer };

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (AZURE plan task 2.7)
export const SAS_TTL_SECONDS = 300; // short-lived, per AZURE §1.2

/** Deterministic path per PLAN §5.8: {internalUserId}/{pregnancyId}/{filename}. */
export function buildBlobPath(userId: string, pregnancyId: string, filename: string): string {
  return `${userId}/${pregnancyId}/${filename}`;
}

interface UploadAttachmentParams {
  pool: Pick<pg.Pool, "query">;
  userId: string;
  entryId: string;
  container: AttachmentContainer;
  blobPath: string;
  data: Buffer;
  mime?: string;
  caption?: string;
}

/** Uploads an attachment for an entry the caller owns; rejects oversized payloads. */
export async function uploadAttachment(params: UploadAttachmentParams): Promise<{ id: string }> {
  const { pool, userId, entryId, container, blobPath, data, mime, caption } = params;

  if (data.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload exceeds the ${MAX_UPLOAD_BYTES} byte cap (AZURE plan task 2.7).`);
  }

  const entry = await pool.query<{ id: string }>(
    "SELECT id FROM entries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
    [entryId, userId],
  );
  if (!entry.rows[0]) {
    throw new Error("Forbidden: entry not found or not owned by the caller.");
  }

  await getBlobStore().put(container, blobPath, data, mime);

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO attachments (user_id, entry_id, container, blob_path, mime, size_bytes, caption)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [userId, entryId, container, blobPath, mime ?? null, data.byteLength, caption ?? null],
  );
  return { id: inserted.rows[0].id };
}

interface OwnedAttachment {
  container: AttachmentContainer;
  blob_path: string;
}

async function loadOwnedAttachment(
  pool: Pick<pg.Pool, "query">,
  userId: string,
  attachmentId: string,
): Promise<OwnedAttachment> {
  const result = await pool.query<OwnedAttachment>(
    "SELECT container, blob_path FROM attachments WHERE id = $1 AND user_id = $2",
    [attachmentId, userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Forbidden: attachment not found or not owned by the caller.");
  return row;
}

/**
 * Issues a short-lived, read-only signed URL for an attachment the caller
 * owns (Azure: user-delegation SAS via the managed identity, AZURE §1.2;
 * Supabase: a Storage signed URL). Never a permanent link.
 */
export async function issueDownloadSas(
  pool: Pick<pg.Pool, "query">,
  userId: string,
  attachmentId: string,
): Promise<{ url: string; expiresAt: Date }> {
  const { container, blob_path } = await loadOwnedAttachment(pool, userId, attachmentId);
  return getBlobStore().signedUrl(container, blob_path, SAS_TTL_SECONDS);
}

/** All containers that may hold user-owned blobs, keyed under a `{userId}/` prefix. */
const USER_BLOB_CONTAINERS: AttachmentContainer[] = [
  "user-uploads",
  "profile-images",
  "generated-summaries",
  "exports",
];

/**
 * Deletes EVERY blob under the user's `{userId}/` prefix across all containers
 * (GDPR erasure, Art 17); returns the count deleted. Azure skips a missing
 * container (unchanged); Supabase throws on any failure, so erasure stops
 * before the database row goes. Callers own the DB-row deletion.
 */
export async function deleteAllUserBlobs(userId: string): Promise<{ deleted: number }> {
  const store = getBlobStore();
  const prefix = `${userId}/`;
  let deleted = 0;
  for (const container of USER_BLOB_CONTAINERS) {
    deleted += await store.deletePrefix(container, prefix);
  }
  return { deleted };
}

/** Deletes an attachment's blob and row; ownership-checked, hard delete (not soft, per Storage semantics). */
export async function deleteAttachment(
  pool: Pick<pg.Pool, "query">,
  userId: string,
  attachmentId: string,
): Promise<void> {
  const { container, blob_path } = await loadOwnedAttachment(pool, userId, attachmentId);
  await getBlobStore().delete(container, blob_path);
  await pool.query("DELETE FROM attachments WHERE id = $1 AND user_id = $2", [
    attachmentId,
    userId,
  ]);
}
