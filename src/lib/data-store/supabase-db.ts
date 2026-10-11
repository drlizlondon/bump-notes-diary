// BP-DL-04a: the same Db contract over HTTPS, for when the database host
// (Lovable Cloud) gives us no Postgres connection string.
// NightMode specs/BUMPNOTES-DATA-LAYER-2026-10-11.md.
//
// Every query goes to one service-role-only RPC, public.bn_exec
// (supabase/bn-schema/2026-10-11-bn-exec-rpc.sql), which pins search_path to
// bn, substitutes $n as quoted literals in a single pass, and returns
// { rows, rowCount }. Params are serialised exactly as node-pg would, so the
// 42 call sites behave the same on either driver.
//
// Known difference, accepted: timestamps arrive as ISO strings, not Date.
// Every call site already reads them through iso()/dateOnly() helpers that
// accept both.

// @ts-expect-error pg/lib/utils ships no types; prepareValue(unknown) => Buffer | string | null.
import pgUtils from "pg/lib/utils";
import type { Db } from "./db";

export type RpcFn = (
  fn: "bn_exec",
  args: { sql: string; params: (string | null)[] },
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

async function defaultRpc(...args: Parameters<RpcFn>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // The generated Database type does not list bn_exec; the contract is RpcFn.
  return (supabaseAdmin.rpc as unknown as RpcFn)(...args);
}

function serialise(value: unknown): string | null {
  const prepared: unknown = (pgUtils as { prepareValue(v: unknown): unknown }).prepareValue(value);
  if (prepared == null) return null;
  if (typeof prepared !== "string") {
    throw new Error("SupabaseDb cannot send binary parameters; store files in the BlobStore.");
  }
  return prepared;
}

export function createSupabaseDb(rpc: RpcFn = defaultRpc): Db {
  async function query(text: string, values?: unknown[]) {
    const params = (values ?? []).map(serialise);
    const { data, error } = await rpc("bn_exec", { sql: text, params });
    if (error) {
      throw Object.assign(new Error(error.message), error.code ? { code: error.code } : {});
    }
    const payload = data as { rows?: unknown; rowCount?: unknown } | null;
    if (!payload || !Array.isArray(payload.rows) || typeof payload.rowCount !== "number") {
      throw new Error("SupabaseDb received an unexpected response from bn_exec.");
    }
    return { rows: payload.rows, rowCount: payload.rowCount, command: "", fields: [], oid: 0 };
  }

  return { query } as unknown as Db;
}
