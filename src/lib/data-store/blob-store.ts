// The swappable upload store (BP-DL-01, NightMode
// specs/BUMPNOTES-DATA-LAYER-2026-10-11.md). BLOB_STORE picks the backend:
// "azure" (default, the original code moved here unchanged) or "supabase"
// (private Supabase Storage buckets reached with the server-only service role).
// Containers and buckets share the same names; paths are always
// "{internalUserId}/...", so a prefix delete erases one user's files.

import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from "@azure/storage-blob";

export type AttachmentContainer =
  | "user-uploads"
  | "profile-images"
  | "generated-summaries"
  | "exports";

export interface BlobStore {
  put(container: AttachmentContainer, path: string, data: Buffer, mime?: string): Promise<void>;
  signedUrl(
    container: AttachmentContainer,
    path: string,
    ttlSeconds: number,
  ): Promise<{ url: string; expiresAt: Date }>;
  delete(container: AttachmentContainer, path: string): Promise<void>;
  /** Deletes every object under `prefix`; returns how many were deleted. */
  deletePrefix(container: AttachmentContainer, prefix: string): Promise<number>;
}

// --- Azure Blob (AZURE §1.2: managed identity, user-delegation SAS, no keys) ---

const SAS_CLOCK_SKEW_SECONDS = 300; // allow modest clock skew on the SAS start time

export class AzureBlobStore implements BlobStore {
  private client: BlobServiceClient | undefined;

  /** The storage account name (e.g. "bumpnotesproduks"); no key, ever (AZURE §1.2). */
  private accountName(): string {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    if (!accountName) {
      throw new Error("AZURE_STORAGE_ACCOUNT is not set; cannot reach Blob Storage.");
    }
    return accountName;
  }

  private service(): BlobServiceClient {
    if (this.client) return this.client;
    this.client = new BlobServiceClient(
      `https://${this.accountName()}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
    return this.client;
  }

  async put(container: AttachmentContainer, path: string, data: Buffer, mime?: string) {
    const blockBlobClient = this.service().getContainerClient(container).getBlockBlobClient(path);
    await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: mime ? { blobContentType: mime } : undefined,
    });
  }

  async signedUrl(container: AttachmentContainer, path: string, ttlSeconds: number) {
    const client = this.service();
    const now = Date.now();
    const startsOn = new Date(now - SAS_CLOCK_SKEW_SECONDS * 1000);
    const expiresOn = new Date(now + ttlSeconds * 1000);
    // The user-delegation key is itself obtained via the managed identity; it
    // carries the same short lifetime and cannot outlive the identity's grant.
    const userDelegationKey = await client.getUserDelegationKey(startsOn, expiresOn);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: path,
        permissions: BlobSASPermissions.parse("r"),
        protocol: SASProtocol.Https,
        startsOn,
        expiresOn,
      },
      userDelegationKey,
      this.accountName(),
    ).toString();
    const blobUrl = client.getContainerClient(container).getBlockBlobClient(path).url;
    return { url: `${blobUrl}?${sas}`, expiresAt: expiresOn };
  }

  async delete(container: AttachmentContainer, path: string) {
    await this.service().getContainerClient(container).getBlockBlobClient(path).deleteIfExists();
  }

  async deletePrefix(container: AttachmentContainer, prefix: string) {
    const containerClient = this.service().getContainerClient(container);
    let deleted = 0;
    try {
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        await containerClient.getBlockBlobClient(blob.name).deleteIfExists();
        deleted += 1;
      }
    } catch {
      // container may not exist / be inaccessible: skip, keep erasing the rest
    }
    return deleted;
  }
}

// --- Supabase Storage (private buckets; service role only, server side) ---

const LIST_PAGE = 100;

async function storage(container: AttachmentContainer) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin.storage.from(container);
}

export class SupabaseBlobStore implements BlobStore {
  async put(container: AttachmentContainer, path: string, data: Buffer, mime?: string) {
    const bucket = await storage(container);
    const { error } = await bucket.upload(path, data, { upsert: false, contentType: mime });
    if (error) throw new Error(`Upload failed: ${error.message}`);
  }

  async signedUrl(container: AttachmentContainer, path: string, ttlSeconds: number) {
    const bucket = await storage(container);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const { data, error } = await bucket.createSignedUrl(path, ttlSeconds);
    if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? "no data"}`);
    return { url: data.signedUrl, expiresAt };
  }

  async delete(container: AttachmentContainer, path: string) {
    const bucket = await storage(container);
    const { error } = await bucket.remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  async deletePrefix(container: AttachmentContainer, prefix: string) {
    const bucket = await storage(container);
    const files: string[] = [];
    // Supabase lists one folder level at a time; folders come back with id null.
    const walk = async (folder: string): Promise<void> => {
      for (let offset = 0; ; offset += LIST_PAGE) {
        const { data, error } = await bucket.list(folder, { limit: LIST_PAGE, offset });
        if (error) throw new Error(`List failed: ${error.message}`);
        for (const item of data ?? []) {
          const full = `${folder}/${item.name}`;
          if (item.id === null) await walk(full);
          else files.push(full);
        }
        if (!data || data.length < LIST_PAGE) break;
      }
    };
    await walk(prefix.replace(/\/+$/, ""));
    for (let i = 0; i < files.length; i += LIST_PAGE) {
      const { error } = await bucket.remove(files.slice(i, i + LIST_PAGE));
      if (error) throw new Error(`Delete failed: ${error.message}`);
    }
    return files.length;
  }
}

let azure: AzureBlobStore | undefined;
let supabase: SupabaseBlobStore | undefined;

export function getBlobStore(): BlobStore {
  const which = process.env.BLOB_STORE ?? "azure";
  if (which === "azure") return (azure ??= new AzureBlobStore());
  if (which === "supabase") return (supabase ??= new SupabaseBlobStore());
  throw new Error(`BLOB_STORE must be "azure" or "supabase", got "${which}".`);
}
