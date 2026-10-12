// /api/health (BP-DL-03): reports whether the database answers, so monitoring
// sees a backend outage instead of a cheerful "ok". Never returns error text.

import { getDb } from "./db";

const DEFAULT_TIMEOUT_MS = 3000;

async function probeDb(): Promise<void> {
  await getDb().query("SELECT 1");
}

export async function healthResponse(
  probe: () => Promise<unknown> = probeDb,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });
  let ok = true;
  try {
    await Promise.race([probe(), timeout]);
  } catch (err) {
    console.error("[health]", err);
    ok = false;
  } finally {
    clearTimeout(timer);
  }
  return new Response(
    JSON.stringify(ok ? { status: "ok", db: "ok" } : { status: "degraded", db: "down" }),
    {
      status: ok ? 200 : 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}
