#!/usr/bin/env node
// BumpNotes Azure PostgreSQL migration runner (AZURE plan task 2.2).
//
// Usage:
//   AZURE_PG_URL=postgres://... node azure/migrate.mjs           # apply pending
//   AZURE_PG_URL=postgres://... node azure/migrate.mjs status    # list applied/pending
//
// Rules enforced here (WORK.md §3.12, DTAC_READINESS.md §7):
// - migrations are timestamped SQL files in azure/migrations/, applied in
//   filename order, each inside its own transaction;
// - applied migrations are immutable: a checksum is recorded at apply time
//   and re-verified on every run — drift aborts before anything executes;
// - an advisory lock prevents two runners applying concurrently.

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");
const FILE_PATTERN = /^\d{14}_[a-z0-9_]+\.sql$/;
// Arbitrary constant identifying this app's migration lock.
const ADVISORY_LOCK_KEY = 727680301;

function fail(message) {
  console.error(`migrate: ${message}`);
  process.exit(1);
}

async function loadMigrationFiles() {
  let names;
  try {
    names = await readdir(MIGRATIONS_DIR);
  } catch {
    fail(`migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  const sqlFiles = names.filter((n) => n.endsWith(".sql")).sort();
  const invalid = sqlFiles.filter((n) => !FILE_PATTERN.test(n));
  if (invalid.length > 0) {
    fail(
      `migration filenames must match YYYYMMDDHHMMSS_snake_case.sql — invalid: ${invalid.join(", ")}`,
    );
  }
  return Promise.all(
    sqlFiles.map(async (name) => {
      const sql = await readFile(join(MIGRATIONS_DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { name, sql, checksum };
    }),
  );
}

async function main() {
  const command = process.argv[2] ?? "apply";
  if (!["apply", "status"].includes(command)) {
    fail(`unknown command "${command}" (expected: apply | status)`);
  }
  const url = process.env.AZURE_PG_URL;
  if (!url) {
    fail(
      "AZURE_PG_URL is not set. Provide the PostgreSQL connection string via the environment; never commit it (WORK.md §3.13).",
    );
  }

  const files = await loadMigrationFiles();
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const { rows: lockRows } = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [
      ADVISORY_LOCK_KEY,
    ]);
    if (!lockRows[0].ok) fail("another migration run holds the lock; aborting.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query(
      "SELECT name, checksum FROM schema_migrations ORDER BY name",
    );
    const applied = new Map(appliedRows.map((r) => [r.name, r.checksum]));

    // Immutability check first — always, for both commands.
    for (const [name, checksum] of applied) {
      const file = files.find((f) => f.name === name);
      if (!file) fail(`applied migration ${name} is missing from ${MIGRATIONS_DIR}.`);
      if (file.checksum !== checksum) {
        fail(
          `applied migration ${name} has been edited (checksum drift). Applied migrations are immutable (WORK.md §3.12); write a new migration instead.`,
        );
      }
    }

    const pending = files.filter((f) => !applied.has(f.name));

    if (command === "status") {
      for (const f of files) {
        console.log(`${applied.has(f.name) ? "applied" : "pending"}  ${f.name}`);
      }
      console.log(`${applied.size} applied, ${pending.length} pending.`);
      return;
    }

    if (pending.length === 0) {
      console.log("Nothing to apply; schema is up to date.");
      return;
    }
    for (const f of pending) {
      await client.query("BEGIN");
      try {
        await client.query(f.sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
          f.name,
          f.checksum,
        ]);
        await client.query("COMMIT");
        console.log(`applied  ${f.name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        fail(`${f.name} failed and was rolled back: ${err.message}`);
      }
    }
    console.log(`Done: ${pending.length} migration(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => fail(err.message));
