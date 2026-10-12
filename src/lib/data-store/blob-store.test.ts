// BP-DL-01: the swappable upload store. Supabase Storage is mocked; nothing
// here touches a live bucket.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Obj = { name: string; id: string | null };
const { buckets, calls, failRemove } = vi.hoisted(() => ({
  buckets: new Map<string, Map<string, Obj[]>>(), // bucket -> folder -> entries
  calls: [] as { op: string; bucket: string; arg: unknown; opts?: unknown }[],
  failRemove: { on: false },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, data: unknown, opts: unknown) {
            calls.push({ op: "upload", bucket, arg: path, opts });
            return { data: { path }, error: null };
          },
          async createSignedUrl(path: string, ttl: number) {
            calls.push({ op: "sign", bucket, arg: path, opts: ttl });
            return {
              data: { signedUrl: `https://sb.test/${bucket}/${path}?t=${ttl}` },
              error: null,
            };
          },
          async remove(paths: string[]) {
            calls.push({ op: "remove", bucket, arg: paths });
            if (failRemove.on) return { data: null, error: { message: "denied" } };
            return { data: paths, error: null };
          },
          async list(folder: string, opts: { limit: number; offset: number }) {
            calls.push({ op: "list", bucket, arg: folder, opts });
            const all = buckets.get(bucket)?.get(folder) ?? [];
            return { data: all.slice(opts.offset, opts.offset + opts.limit), error: null };
          },
        };
      },
    },
  },
}));

const { SupabaseBlobStore, getBlobStore, AzureBlobStore } = await import("./blob-store");

let savedEnv: string | undefined;
beforeEach(() => {
  buckets.clear();
  calls.length = 0;
  failRemove.on = false;
  savedEnv = process.env.BLOB_STORE;
});
afterEach(() => {
  if (savedEnv === undefined) delete process.env.BLOB_STORE;
  else process.env.BLOB_STORE = savedEnv;
});

describe("getBlobStore", () => {
  it("defaults to Supabase so it connects to the new store out of the box", () => {
    delete process.env.BLOB_STORE;
    expect(getBlobStore()).toBeInstanceOf(SupabaseBlobStore);
  });
  it("returns Azure when BLOB_STORE=azure", () => {
    process.env.BLOB_STORE = "azure";
    expect(getBlobStore()).toBeInstanceOf(AzureBlobStore);
  });
  it("rejects an unknown store name", () => {
    process.env.BLOB_STORE = "s3";
    expect(() => getBlobStore()).toThrow(/BLOB_STORE/);
  });
});

describe("SupabaseBlobStore", () => {
  const store = new SupabaseBlobStore();

  it("uploads without overwriting and with the content type", async () => {
    await store.put("user-uploads", "u1/p1/a.jpg", Buffer.from("x"), "image/jpeg");
    expect(calls[0]).toMatchObject({
      op: "upload",
      bucket: "user-uploads",
      arg: "u1/p1/a.jpg",
      opts: { upsert: false, contentType: "image/jpeg" },
    });
  });

  it("issues a signed URL with the requested lifetime", async () => {
    const before = Date.now();
    const { url, expiresAt } = await store.signedUrl("user-uploads", "u1/p1/a.jpg", 300);
    expect(url).toContain("u1/p1/a.jpg");
    expect(calls[0]).toMatchObject({ op: "sign", opts: 300 });
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 300_000);
  });

  it("deletes one object", async () => {
    await store.delete("user-uploads", "u1/p1/a.jpg");
    expect(calls[0]).toMatchObject({ op: "remove", arg: ["u1/p1/a.jpg"] });
  });

  it("deletes everything under a prefix, through nested folders and past one page", async () => {
    const files = Array.from({ length: 150 }, (_, i) => ({ name: `f${i}.jpg`, id: `id${i}` }));
    buckets.set(
      "user-uploads",
      new Map<string, Obj[]>([
        [
          "u1",
          [
            { name: "p1", id: null },
            { name: "top.jpg", id: "t" },
          ],
        ],
        ["u1/p1", files],
      ]),
    );
    const deleted = await store.deletePrefix("user-uploads", "u1/");
    expect(deleted).toBe(151);
    const removed = calls.filter((c) => c.op === "remove").flatMap((c) => c.arg as string[]);
    expect(removed).toContain("u1/top.jpg");
    expect(removed).toContain("u1/p1/f149.jpg");
    expect(removed.every((p) => p.startsWith("u1/"))).toBe(true);
  });

  it("throws, never reports success, when a delete fails", async () => {
    failRemove.on = true;
    await expect(store.delete("user-uploads", "u1/a.jpg")).rejects.toThrow(/denied/);
  });
});
