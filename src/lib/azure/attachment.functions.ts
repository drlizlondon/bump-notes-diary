// Attachment server functions (AZURE Phase 3A / 3.4). Binary lives in Blob
// Storage only; these functions record/serve the metadata row. Built on the 2.7
// blob helpers (managed identity, user-delegation SAS — no account keys). Every
// operation is owner-scoped by context.userId.
//
// Upload model: the client re-encodes the image to strip EXIF (see
// lib/data/attachments.ts), base64-encodes it, and posts it here; the server
// streams it to Blob Storage via the managed identity. No upload SAS is handed
// to the browser, and the 10 MB cap (2.7) bounds the payload.

import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Attachment } from "../domain/types";
import { requireApiAuth } from "./api-auth-middleware";
import { getAzurePgPool } from "./pg-pool";
import {
  buildBlobPath,
  deleteAttachment as blobDeleteAttachment,
  issueDownloadSas,
  uploadAttachment as blobUploadAttachment,
} from "./blob-helpers";

interface AttachmentRow {
  id: string;
  user_id: string;
  entry_id: string;
  container: string;
  blob_path: string;
  mime: string | null;
  size_bytes: number | null;
  checksum: string | null;
  caption: string | null;
  uploaded_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : String(v));

function mapAttachmentRow(r: AttachmentRow): Attachment {
  return {
    id: r.id,
    userId: r.user_id,
    entryId: r.entry_id,
    container: r.container as Attachment["container"],
    blobPath: r.blob_path,
    mime: r.mime,
    sizeBytes: r.size_bytes,
    checksum: r.checksum,
    caption: r.caption,
    uploadedAt: iso(r.uploaded_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const ATTACHMENT_COLUMNS = `id, user_id, entry_id, container, blob_path, mime, size_bytes,
  checksum, caption, uploaded_at, created_at, updated_at`;

/** Attachments for one of the user's own entries, newest first. */
export const listAttachments = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: { entryId: string }) =>
    z.object({ entryId: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const res = await pool.query<AttachmentRow>(
      `SELECT ${ATTACHMENT_COLUMNS} FROM attachments
       WHERE entry_id = $1 AND user_id = $2 ORDER BY uploaded_at DESC`,
      [data.entryId, context.userId],
    );
    return res.rows.map(mapAttachmentRow);
  });

const uploadSchema = z
  .object({
    entryId: z.string().uuid(),
    filename: z.string().min(1).max(200),
    mime: z.string().min(1).max(100),
    dataBase64: z.string().min(1),
    caption: z.string().max(500).nullish(),
  })
  .strict();

type UploadInput = z.infer<typeof uploadSchema>;

// Keep only a safe basename; the stored name is prefixed with a uuid so uploads
// never collide or overwrite (the deterministic path is uuid-namespaced already).
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
}

/** Upload an image to one of the user's own entries; returns the metadata row. */
export const uploadAttachment = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: UploadInput) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    // The entry must be the user's own; we also need its pregnancy for the path.
    const entryRes = await pool.query<{ pregnancy_id: string }>(
      "SELECT pregnancy_id FROM entries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [data.entryId, context.userId],
    );
    const pregnancyId = entryRes.rows[0]?.pregnancy_id;
    if (!pregnancyId) throw new Error("entry not found for this user");

    const buffer = Buffer.from(data.dataBase64, "base64");
    const blobPath = buildBlobPath(
      context.userId,
      pregnancyId,
      `${randomUUID()}-${safeName(data.filename)}`,
    );
    const { id } = await blobUploadAttachment({
      pool,
      userId: context.userId,
      entryId: data.entryId,
      container: "user-uploads",
      blobPath,
      data: buffer,
      mime: data.mime,
      caption: data.caption ?? undefined,
    });

    const res = await pool.query<AttachmentRow>(
      `SELECT ${ATTACHMENT_COLUMNS} FROM attachments WHERE id = $1`,
      [id],
    );
    return mapAttachmentRow(res.rows[0]);
  });

/** A short-lived, read-only download URL for one of the user's own attachments. */
export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: { attachmentId: string }) =>
    z.object({ attachmentId: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    const { url, expiresAt } = await issueDownloadSas(pool, context.userId, data.attachmentId);
    return { url, expiresAt: expiresAt.toISOString() };
  });

/** Hard-delete one of the user's own attachments (blob + row). */
export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireApiAuth])
  .inputValidator((data: { attachmentId: string }) =>
    z.object({ attachmentId: z.string().uuid() }).strict().parse(data),
  )
  .handler(async ({ data, context }) => {
    const pool = getAzurePgPool();
    await blobDeleteAttachment(pool, context.userId, data.attachmentId);
  });
