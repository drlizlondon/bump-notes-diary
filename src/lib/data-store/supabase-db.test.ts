// BP-DL-04a: the HTTPS (service-role RPC) Db. The rpc function is injected;
// nothing here touches a live project.
import { describe, expect, it } from "vitest";
import { createSupabaseDb, type RpcFn } from "./supabase-db";

function recorder(result: { data: unknown; error: unknown }) {
  const calls: { fn: string; args: { sql: string; params: (string | null)[] } }[] = [];
  const rpc: RpcFn = async (fn, args) => {
    calls.push({ fn, args });
    return result as Awaited<ReturnType<RpcFn>>;
  };
  return { rpc, calls };
}

describe("createSupabaseDb", () => {
  it("calls public.bn_exec with the SQL text and node-pg-serialised params", async () => {
    const { rpc, calls } = recorder({ data: { rows: [], rowCount: 0 }, error: null });
    const when = new Date("2026-10-11T20:00:00.000Z");
    await createSupabaseDb(rpc).query("SELECT $1, $2, $3, $4, $5", [
      "a",
      7,
      when,
      { k: "v" },
      null,
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe("bn_exec");
    expect(calls[0].args.sql).toBe("SELECT $1, $2, $3, $4, $5");
    const [s, n, d, o, z] = calls[0].args.params;
    expect([s, n, o, z]).toEqual(["a", "7", '{"k":"v"}', null]);
    expect(new Date(d as string).toISOString()).toBe(when.toISOString());
  });

  it("serialises arrays as Postgres array literals and undefined as NULL", async () => {
    const { rpc, calls } = recorder({ data: { rows: [], rowCount: 0 }, error: null });
    await createSupabaseDb(rpc).query("SELECT $1, $2", [["x", "y,z"], undefined]);
    expect(calls[0].args.params).toEqual(['{"x","y,z"}', null]);
  });

  it("sends an empty params array when no values are given", async () => {
    const { rpc, calls } = recorder({ data: { rows: [], rowCount: 0 }, error: null });
    await createSupabaseDb(rpc).query("SELECT 1");
    expect(calls[0].args.params).toEqual([]);
  });

  it("refuses binary params (no bytea columns exist; uploads go to the BlobStore)", async () => {
    const { rpc } = recorder({ data: { rows: [], rowCount: 0 }, error: null });
    await expect(createSupabaseDb(rpc).query("SELECT $1", [Buffer.from("x")])).rejects.toThrow(
      /binary/,
    );
  });

  it("passes rows and rowCount through in the pg.QueryResult shape", async () => {
    const { rpc } = recorder({ data: { rows: [{ id: "u1" }], rowCount: 1 }, error: null });
    const res = await createSupabaseDb(rpc).query("UPDATE x SET y = 1 RETURNING id");
    expect(res.rows).toEqual([{ id: "u1" }]);
    expect(res.rowCount).toBe(1);
    expect(res.fields).toEqual([]);
  });

  it("reports rowCount 0 so callers' 'not found' checks still fire", async () => {
    const { rpc } = recorder({ data: { rows: [], rowCount: 0 }, error: null });
    const res = await createSupabaseDb(rpc).query("UPDATE x SET y = 1 WHERE id = $1", ["nope"]);
    expect(res.rowCount).toBe(0);
  });

  it("throws the RPC error with its SQLSTATE as .code", async () => {
    const { rpc } = recorder({
      data: null,
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
    });
    const err = await createSupabaseDb(rpc)
      .query("INSERT INTO x VALUES (1)")
      .then(
        () => null,
        (e: unknown) => e as Error & { code?: string },
      );
    if (!err) throw new Error("expected the query to reject");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/duplicate key/);
    expect(err.code).toBe("23505");
  });

  it("throws on a malformed RPC payload instead of returning undefined rows", async () => {
    const { rpc } = recorder({ data: null, error: null });
    await expect(createSupabaseDb(rpc).query("SELECT 1")).rejects.toThrow(/unexpected/);
  });
});
