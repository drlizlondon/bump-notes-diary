# Azure database migrations

Schema migrations for Azure Database for PostgreSQL Flexible Server (AZURE plan §3, Phase 2). Mirrors the `supabase/migrations/` convention.

## Writing a migration

- One timestamped file per change set in `migrations/`: `YYYYMMDDHHMMSS_short_snake_description.sql` (UTC timestamp).
- **Applied migrations are immutable** (WORK.md §3.12). The runner records a SHA-256 checksum at apply time and refuses to run if any applied file has changed. To alter something, write a new migration.
- Each file runs inside a single transaction; keep statements transaction-safe (no `CREATE INDEX CONCURRENTLY` — at current scale plain `CREATE INDEX` is fine).
- Additive only during the migration window (PLAN §5.7 discipline carries over). No destructive statements against user data without an explicit sanctioned task.

## Applying

```sh
AZURE_PG_URL="postgres://<user>:<password>@<host>:5432/<db>?sslmode=require" npm run migrate:azure          # apply pending
AZURE_PG_URL=... npm run migrate:azure -- status                                                            # list applied/pending
```

- The connection string comes from the environment (Key Vault / local shell) and is **never committed** (WORK.md §3.13).
- The runner takes a Postgres advisory lock, so concurrent runs are safe (second run aborts).
- Failures roll back the failing file's transaction and stop; earlier files in the run stay applied (they committed individually).
- Apply procedure until CI exists: run manually against staging first, verify with `status`, then against production during an agreed window. Record the run (who/when/output) in the task's commit or PR description — this is the change-control evidence trail (DTAC_READINESS.md §7).
