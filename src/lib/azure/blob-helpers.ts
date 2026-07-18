// Azure Blob Storage helper endpoints (AZURE §3 task 2.7).
//
// The frontend never receives storage credentials (AZURE §1.3): every
// operation here is ownership-checked against the internal `users.id` from
// requireApiAuth (2.6) and either streams through this server or issues a
// short-lived SAS URL. No permanent public URLs, no account keys handed out.

import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import type pg from "pg";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB (AZURE plan task 2.7)
export const SAS_TTL_SECONDS = 300; // short-lived, per AZURE §1.2

export type AttachmentContainer =
  | "user-uploads"
  | "profile-images"
  | "generated-summaries"
  | "exports";

let blobServiceClient: BlobServiceClient | undefined;
let sharedKeyCredential: StorageSharedKeyCredential | undefined;

function getCredential(): StorageSharedKeyCredential {
  if (sharedKeyCredential) return sharedKeyCredential;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME / AZURE_STORAGE_ACCOUNT_KEY are not set.");
  }
  sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  return sharedKeyCredential;
}

export function getBlobServiceClient(): BlobServiceClient {
  if (blobServiceClient) return blobServiceClient;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set.");
  }
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient;
}

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

  const containerClient = getBlobServiceClient().getContainerClient(container);
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  await blockBlobClient.uploadData(data, {
    blobHTTPHeaders: mime ? { blobContentType: mime } : undefined,
  });

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

/** Issues a short-lived, read-only SAS URL for an attachment the caller owns. */
export async function issueDownloadSas(
  pool: Pick<pg.Pool, "query">,
  userId: string,
  attachmentId: string,
): Promise<{ url: string; expiresAt: Date }> {
  const { container, blob_path } = await loadOwnedAttachment(pool, userId, attachmentId);
  const credential = getCredential();
  const expiresOn = new Date(Date.now() + SAS_TTL_SECONDS * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: container,
      blobName: blob_path,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential,
  ).toString();

  const containerClient = getBlobServiceClient().getContainerClient(container);
  const blobUrl = containerClient.getBlockBlobClient(blob_path).url;
  return { url: `${blobUrl}?${sas}`, expiresAt: expiresOn };
}

/** Deletes an attachment's blob and row; ownership-checked, hard delete (not soft, per Storage semantics). */
export async function deleteAttachment(
  pool: Pick<pg.Pool, "query">,
  userId: string,
  attachmentId: string,
): Promise<void> {
  const { container, blob_path } = await loadOwnedAttachment(pool, userId, attachmentId);
  const containerClient = getBlobServiceClient().getContainerClient(container);
  await containerClient.getBlockBlobClient(blob_path).deleteIfExists();
  await pool.query("DELETE FROM attachments WHERE id = $1 AND user_id = $2", [
    attachmentId,
    userId,
  ]);
}
