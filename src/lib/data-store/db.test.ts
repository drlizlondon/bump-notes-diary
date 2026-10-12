// BP-DL-01: the one Postgres entry point. pg.Client is mocked; nothing here
// opens a socket.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { clients } = vi.hoisted(() => ({
  clients: [] as {
    connectionString: string;
    queries: { text: string; values?: unknown[] }[];
    ended: boolean;
    failOn?: string;
  }[],
}));

vi.mock("pg", () => {
  class Client {
    state: (typeof clients)[number];
    constructor(opts: { connectionString: string }) {
      this.state = { connectionString: opts.connectionString, queries: [], ended: false };
      clients.push(this.state);
    }
    async connect() {}
    async query(text: string, values?: unknown[]) {
      this.state.queries.push({ text, values });
      if (process.env.__FAIL_SQL && text.includes(process.env.__FAIL_SQL)) throw new Error("boom");
      return { rows: [{ ok: 1 }], rowCount: 1 };
    }
    async end() {
      this.state.ended = true;
    }
  }
  return { default: { Client }, Client };
});

vi.mock("./supabase-db", () => ({
  createSupabaseDb: () => ({ query: async () => ({ rows: [{ via: "supabase" }], rowCount: 1 }) }),
}));

const { getDb } = await import("./db");

const ENV_KEYS = ["DATABASE_URL", "AZURE_PG_URL", "DB_SCHEMA", "DB_DRIVER", "__FAIL_SQL"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  clients.length = 0;
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getDb", () => {
  it("defaults to DB_DRIVER=supabase (needs no connection string)", async () => {
    const res = await getDb().query("SELECT 1");
    expect(res.rows).toEqual([{ via: "supabase" }]);
    expect(clients).toHaveLength(0);
  });

  it("prefers DATABASE_URL over AZURE_PG_URL when DB_DRIVER=pg", async () => {
    process.env.DB_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://new";
    process.env.AZURE_PG_URL = "postgres://azure";
    await getDb().query("SELECT 1");
    expect(clients[0].connectionString).toBe("postgres://new");
  });

  it("falls back to AZURE_PG_URL so Azure stays a config-only switch", async () => {
    process.env.DB_DRIVER = "pg";
    process.env.AZURE_PG_URL = "postgres://azure";
    await getDb().query("SELECT 1");
    expect(clients[0].connectionString).toBe("postgres://azure");
  });

  it("throws a clear error when neither is set (under DB_DRIVER=pg)", () => {
    process.env.DB_DRIVER = "pg";
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });

  it("uses a fresh client per query and always ends it (Workers forbid cross-request sockets)", async () => {
    process.env.DB_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://new";
    const db = getDb();
    const result = await db.query("SELECT $1", [1]);
    await db.query("SELECT 2");
    expect(result.rows).toEqual([{ ok: 1 }]);
    expect(clients).toHaveLength(2);
    expect(clients.every((c) => c.ended)).toBe(true);
    expect(clients[0].queries).toEqual([{ text: "SELECT $1", values: [1] }]);
  });

  it("ends the client even when the query throws", async () => {
    process.env.DB_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://new";
    process.env.__FAIL_SQL = "BAD";
    await expect(getDb().query("BAD SQL")).rejects.toThrow("boom");
    expect(clients[0].ended).toBe(true);
  });

  it("sets search_path first when DB_SCHEMA is set, and not otherwise", async () => {
    process.env.DB_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://new";
    process.env.DB_SCHEMA = "bn";
    await getDb().query("SELECT 1");
    expect(clients[0].queries.map((q) => q.text)).toEqual(["SET search_path TO bn", "SELECT 1"]);
    delete process.env.DB_SCHEMA;
    await getDb().query("SELECT 1");
    expect(clients[1].queries.map((q) => q.text)).toEqual(["SELECT 1"]);
  });

  it("rejects an unsafe DB_SCHEMA value", () => {
    process.env.DB_DRIVER = "pg";
    process.env.DATABASE_URL = "postgres://new";
    process.env.DB_SCHEMA = "bn; drop table x";
    expect(() => getDb()).toThrow(/DB_SCHEMA/);
  });

  it("DB_DRIVER=supabase explicitly uses the service-role RPC Db", async () => {
    process.env.DB_DRIVER = "supabase";
    const res = await getDb().query("SELECT 1");
    expect(res.rows).toEqual([{ via: "supabase" }]);
    expect(clients).toHaveLength(0);
  });

  it("rejects an unknown DB_DRIVER", () => {
    process.env.DB_DRIVER = "sqlite";
    expect(() => getDb()).toThrow(/DB_DRIVER/);
  });
});
