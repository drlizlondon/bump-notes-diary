// Unit tests for the unified account-erasure fix (GDPR-2 / Art 17).
//
// These tests MOCK the Azure blob/Entra helpers and the Supabase admin
// client — nothing here ever touches a live datastore, and no real record is
// ever deleted anywhere. They assert:
//   1. every Supabase table is deleted with the correct user-scoped key
//      (supabase_user_id where the row is keyed by the Supabase auth user
//      id, email where it is keyed only by a free-text email address);
//   2. the user_id-keyed tables are skipped (not guessed at) when the
//      account never had a Supabase identity;
//   3. a simulated Supabase-delete failure is surfaced (thrown), never
//      swallowed into a false "erased: true";
//   4. the Postgres `users` row is never deleted if the Supabase step fails,
//      so a failed erasure can be retried rather than leaving an orphaned
//      Supabase remnant with no way back to it.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PgQueryable } from "./account-erasure";

// --- Supabase admin client mock -------------------------------------------
// Hoisted so the vi.mock factory below (which runs before imports) can close
// over the same call log / error map the tests configure.
const { supabaseCalls, supabaseErrors } = vi.hoisted(() => ({
  supabaseCalls: [] as { table: string; column: string; value: string }[],
  supabaseErrors: new Map<string, string>(), // key: `${table}:${column}`
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        delete() {
          return {
            eq(column: string, value: string) {
              supabaseCalls.push({ table, column, value });
              const message = supabaseErrors.get(`${table}:${column}`);
              return Promise.resolve({ error: message ? { message } : null });
            },
          };
        },
      };
    },
  },
}));

// --- Blob + Entra mocks (not this fix's concern, but deleteOwnAccount calls
// them, so they need a stable, harmless default). -------------------------
vi.mock("./blob-helpers", () => ({
  deleteAllUserBlobs: vi.fn(async () => ({ deleted: 3 })),
  issueDownloadSas: vi.fn(),
}));
vi.mock("./entra-admin", () => ({
  deleteEntraUser: vi.fn(async () => ({ deleted: true }) as const),
}));

// Imported AFTER the mocks above so the module under test picks them up.
const { performAccountErasure, eraseSupabaseUserData } = await import("./account-erasure");

interface UserRow {
  external_identity_id: string | null;
  email: string;
  supabase_user_id: string | null;
}

function makePool(row: UserRow | null) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const pool: PgQueryable = {
    async query<T = unknown>(sql: string, params: unknown[] = []) {
      queries.push({ sql, params });
      if (sql.includes("SELECT external_identity_id")) {
        return { rows: (row ? [row] : []) as T[] };
      }
      return { rows: [] as T[] };
    },
  };
  return { pool, queries };
}

beforeEach(() => {
  supabaseCalls.length = 0;
  supabaseErrors.clear();
});

describe("eraseSupabaseUserData", () => {
  it("deletes every personal-data table using the correct user-scoped key when the account has a bridged Supabase identity", async () => {
    await eraseSupabaseUserData("liz@example.com", "sb-uid-1");

    expect(supabaseCalls).toEqual(
      expect.arrayContaining([
        { table: "bumpnotes_state", column: "user_id", value: "sb-uid-1" },
        { table: "feedback_submissions", column: "user_id", value: "sb-uid-1" },
        { table: "user_roles", column: "user_id", value: "sb-uid-1" },
        { table: "profiles", column: "id", value: "sb-uid-1" },
        { table: "contact_messages", column: "email", value: "liz@example.com" },
        { table: "feedback_submissions", column: "reply_email", value: "liz@example.com" },
      ]),
    );
    // Never matches another user's id or a guessed value.
    expect(
      supabaseCalls.every((c) => c.value === "sb-uid-1" || c.value === "liz@example.com"),
    ).toBe(true);
  });

  it("skips the user_id-keyed tables (never guesses) for an Entra-native account with no Supabase identity, but still matches its own email", async () => {
    await eraseSupabaseUserData("entra-only@example.com", null);

    const userIdKeyedTables = supabaseCalls.filter(
      (c) => c.column === "user_id" || c.column === "id",
    );
    expect(userIdKeyedTables).toHaveLength(0);

    expect(supabaseCalls).toEqual(
      expect.arrayContaining([
        { table: "contact_messages", column: "email", value: "entra-only@example.com" },
        {
          table: "feedback_submissions",
          column: "reply_email",
          value: "entra-only@example.com",
        },
      ]),
    );
  });

  it("attempts every table (best-effort) even after one fails, then throws rather than reporting success", async () => {
    supabaseErrors.set("feedback_submissions:user_id", "connection reset");

    await expect(eraseSupabaseUserData("liz@example.com", "sb-uid-1")).rejects.toThrow(
      /feedback_submissions.*connection reset/,
    );

    // The failure on one table did not stop the others from being attempted.
    expect(supabaseCalls).toEqual(
      expect.arrayContaining([
        { table: "bumpnotes_state", column: "user_id", value: "sb-uid-1" },
        { table: "user_roles", column: "user_id", value: "sb-uid-1" },
        { table: "profiles", column: "id", value: "sb-uid-1" },
        { table: "contact_messages", column: "email", value: "liz@example.com" },
      ]),
    );
  });
});

describe("performAccountErasure", () => {
  const row: UserRow = {
    external_identity_id: "entra-obj-1",
    email: "liz@example.com",
    supabase_user_id: "sb-uid-1",
  };

  it("returns erased:true with the Supabase step results, and deletes the Postgres users row, when everything succeeds", async () => {
    const { pool, queries } = makePool(row);

    const result = await performAccountErasure(pool, "azure-uid-1");

    expect(result.erased).toBe(true);
    expect(result.blobsDeleted).toBe(3);
    expect(result.supabase.every((s) => s.error === null)).toBe(true);
    expect(queries.some((q) => q.sql.includes("DELETE FROM users"))).toBe(true);
  });

  it("does NOT delete the Postgres users row, and propagates the error, when a Supabase delete fails", async () => {
    supabaseErrors.set("bumpnotes_state:user_id", "permission denied");
    const { pool, queries } = makePool(row);

    await expect(performAccountErasure(pool, "azure-uid-1")).rejects.toThrow(/permission denied/);

    // The account is not partially destroyed in a way that loses the keys
    // needed to retry — the Postgres row (and its email/supabase_user_id)
    // must still exist.
    expect(queries.some((q) => q.sql.includes("DELETE FROM users"))).toBe(false);
  });

  it("throws rather than silently no-op'ing when the users row cannot be found", async () => {
    const { pool } = makePool(null);
    await expect(performAccountErasure(pool, "missing-uid")).rejects.toThrow(/no users row/);
    // Never even reaches Supabase deletion for a user we can't identify.
    expect(supabaseCalls).toHaveLength(0);
  });
});
