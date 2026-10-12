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
  debug: boolean = false,
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });
  let ok = true;
  let detail: string | undefined;
  try {
    await Promise.race([probe(), timeout]);
  } catch (err) {
    console.error("[health]", err);
    ok = false;
    if (debug) detail = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }
  const body: Record<string, unknown> = ok
    ? { status: "ok", db: "ok" }
    : { status: "degraded", db: "down" };
  if (detail) body.detail = detail;

  return new Response(
    JSON.stringify(body),
    {
      status: ok ? 200 : 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}
