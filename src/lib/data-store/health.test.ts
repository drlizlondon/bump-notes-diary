// BP-DL-03: /api/health reports the database, not just the worker.
import { describe, expect, it } from "vitest";
import { healthResponse } from "./health";

describe("healthResponse", () => {
  it("is 200 with db ok when the probe answers", async () => {
    const res = await healthResponse(async () => undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("is 503 and never leaks the error text when the probe fails", async () => {
    const res = await healthResponse(async () => {
      throw new Error("password authentication failed for user secret_user");
    });
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "degraded", db: "down" });
    expect(text).not.toContain("secret_user");
  });

  it("has no debug switch: extra arguments never add the error text", async () => {
    const withExtra = healthResponse as unknown as (...args: unknown[]) => Promise<Response>;
    const res = await withExtra(
      async () => {
        throw new Error("Could not find the function public.bn_exec");
      },
      undefined,
      true,
    );
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "degraded", db: "down" });
    expect(text).not.toContain("bn_exec");
  });

  it("is 503 when the probe hangs past the timeout", async () => {
    const res = await healthResponse(() => new Promise(() => undefined), 20);
    expect(res.status).toBe(503);
  });

  it("is never cached", async () => {
    const res = await healthResponse(async () => undefined);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
