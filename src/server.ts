import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// App Service health probe (AZURE plan task 2.5). Answered before SSR/auth/DB
// so it stays cheap and never depends on anything App Service is checking for.
function isHealthCheck(request: Request): boolean {
  return new URL(request.url).pathname === "/api/health";
}

// --- Entra External ID native-auth CORS proxy (AZURE Phase I.1, "B" login) ---
//
// Native authentication's CIAM API does NOT support CORS, so the browser SDK
// cannot call it directly; Microsoft's own guidance is to put a same-origin
// proxy in front of it. Because BumpNotes is a server-rendered app, that proxy
// is just a route HERE — no Azure Front Door, no separate service to run. The
// browser calls `<origin>/api/ciam/...` (same-origin, so no CORS is even
// involved), and this server forwards it to CIAM server-to-server.
//
// The MSAL custom-auth SDK is configured with `authApiProxyUrl = <origin>/api/ciam`
// and appends the native-auth endpoint path (e.g. `/oauth2/v2.0/initiate`,
// `/signup/v1.0/start`), so a request arrives here as `/api/ciam/oauth2/v2.0/...`.
// We strip the `/api/ciam` prefix and forward the tail (plus query string) to
// the tenant base — reusable across products by swapping AZURE_CIAM_PROXY_TARGET.
const CIAM_PROXY_PREFIX = "/api/ciam/";
// Tenant native-auth base: https://<subdomain>.ciamlogin.com/<tenantId>
const CIAM_PROXY_TARGET =
  process.env.AZURE_CIAM_PROXY_TARGET ??
  "https://bumpnotes.ciamlogin.com/23f549b5-2003-4406-9b16-fb823bcee3a8";

// Headers we must not copy onto the outbound request (host/origin belong to us;
// the rest are hop-by-hop or set by fetch itself).
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "origin",
  "referer",
  "connection",
  "content-length",
]);
// Encoding/length headers are stripped from the response because fetch has
// already decoded the body we stream back.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

function corsHeaders(): Record<string, string> {
  // Same-origin in practice (so these are belt-and-braces), but they keep the
  // proxy correct if authApiProxyUrl is ever pointed cross-origin.
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers":
      "Content-Type, Authorization, x-client-SKU, x-client-VER, client-request-id, x-ms-request-id",
    "access-control-max-age": "86400",
  };
}

function isCiamProxy(request: Request): boolean {
  return new URL(request.url).pathname.startsWith(CIAM_PROXY_PREFIX);
}

async function proxyCiam(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const tail = url.pathname.slice(CIAM_PROXY_PREFIX.length); // e.g. "oauth2/v2.0/initiate"
  const base = CIAM_PROXY_TARGET.endsWith("/") ? CIAM_PROXY_TARGET : `${CIAM_PROXY_TARGET}/`;
  const targetUrl = new URL(tail, base);
  targetUrl.search = url.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const isToken = tail.startsWith("oauth2/v2.0/token");
  let reqBuf = hasBody ? await request.arrayBuffer() : undefined;

  // Ask CIAM to include client_info in the token response (idempotent). CIAM's
  // native-auth token endpoint ignores this today (see synthesizeClientInfo
  // below), but it costs nothing and is correct if that ever changes. NB: never
  // log this body — it carries the password on the sign-in grant.
  if (isToken && reqBuf) {
    const body = new TextDecoder().decode(reqBuf);
    if (!/(^|&)client_info=/.test(body)) {
      reqBuf = new TextEncoder().encode(`${body}${body.length ? "&" : ""}client_info=1`).buffer;
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: reqBuf,
      redirect: "manual",
    });
  } catch (error) {
    console.error("CIAM proxy fetch failed:", error);
    return new Response(JSON.stringify({ error: "ciam_proxy_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json", ...corsHeaders() },
    });
  }

  const outHeaders = new Headers(corsHeaders());
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) outHeaders.set(key, value);
  });

  // CIAM's native-auth token endpoint returns a valid token but omits the
  // `client_info` field, and its id_token lacks `oid` — so MSAL can't build the
  // account and throws "client_info_missing". We synthesize client_info from the
  // token's own oid+tid so MSAL can cache the account. Only touches successful
  // token responses that are missing the field.
  if (isToken && upstream.status === 200) {
    const bodyText = await upstream.text();
    const patched = injectClientInfo(bodyText);
    outHeaders.delete("content-length");
    return new Response(patched, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

/** base64url-decode a JWT segment to its JSON claims (no verification — read-only). */
function jwtClaims(jwt: string): Record<string, unknown> | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * If a token response lacks `client_info`, add one built from the access/id
 * token's `oid` (user object id) and `tid` (tenant id) — the same {uid, utid}
 * MSAL would have read from a real client_info. Returns the body unchanged when
 * client_info is already present or the claims can't be read.
 */
function injectClientInfo(bodyText: string): string {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
  if (json.client_info || typeof json.access_token !== "string") return bodyText;
  const claims = jwtClaims(json.access_token) ?? jwtClaims(String(json.id_token ?? ""));
  const uid = claims?.oid;
  const utid = claims?.tid;
  if (typeof uid !== "string" || typeof utid !== "string") return bodyText;
  json.client_info = Buffer.from(JSON.stringify({ uid, utid }), "utf8").toString("base64url");
  return JSON.stringify(json);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (isHealthCheck(request)) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (isCiamProxy(request)) {
      return proxyCiam(request);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
