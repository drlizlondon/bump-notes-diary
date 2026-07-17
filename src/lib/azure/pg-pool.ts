// Lazily-created singleton pg Pool for the Azure API layer (AZURE §3 task 2.6).
// Connection string comes from the environment only — never committed (WORK.md §3.13).

import pg from "pg";

let pool: pg.Pool | undefined;

export function getAzurePgPool(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.AZURE_PG_URL;
  if (!connectionString) {
    throw new Error(
      "AZURE_PG_URL is not set. The Azure API auth middleware cannot resolve users without it.",
    );
  }
  pool = new pg.Pool({ connectionString });
  return pool;
}
