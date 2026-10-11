// The one Postgres entry point for every server function (BP-DL-01,
// NightMode specs/BUMPNOTES-DATA-LAYER-2026-10-11.md).
//
// Which server is used is config only: DATABASE_URL (Supabase for the beta),
// falling back to AZURE_PG_URL so Azure stays a secret change, never a code
// change. DB_SCHEMA (e.g. "bn") sets search_path so the V2 tables can live in
// their own schema without qualifying any of the queries.
//
// Each query gets its own client, opened and ended in the same call.
// Cloudflare Workers forbid reusing a socket from another request, so a
// module-level pool would fail there; there are no transactions in this app,
// so nothing needs a held connection.
//
// Connection strings come from the environment only; never commit one.

import pg from "pg";

export type Db = Pick<pg.Pool, "query">;

const SAFE_SCHEMA = /^[a-z_][a-z0-9_]*$/;

export function getDb(): Db {
  const connectionString = process.env.DATABASE_URL ?? process.env.AZURE_PG_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set; the data layer cannot reach Postgres.");
  }
  const schema = process.env.DB_SCHEMA;
  if (schema && !SAFE_SCHEMA.test(schema)) {
    throw new Error("DB_SCHEMA must be a plain lower-case schema name.");
  }

  async function query(text: string, values?: unknown[]) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      if (schema) await client.query(`SET search_path TO ${schema}`);
      return await client.query(text, values);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  return { query } as unknown as Db;
}
