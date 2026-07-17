// Azure API auth middleware (AZURE §3 task 2.6).
//
// Validates either a Supabase JWT (bridge window, AZURE §2 identity-cutover
// DECISION) or an Entra External ID access token, then resolves/creates the
// internal `users` row. Every server function downstream takes its user id
// from this middleware only — never from a raw token claim (AZURE §1.3).
//
// Phase I email-linking (matching an Entra sign-in to an existing bridge
// account) is out of scope here — see I.2. This middleware only resolves an
// existing row for the identity presented, or creates a fresh one.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type pg from "pg";
import { getAzurePgPool } from "./pg-pool";

export interface ResolvedIdentity {
  source: "supabase" | "entra";
  externalId: string;
  email: string;
}

let entraJwks: JWTVerifyGetKey | undefined;

function getEntraJwks(): JWTVerifyGetKey {
  if (entraJwks) return entraJwks;
  const jwksUri = process.env.AZURE_ENTRA_JWKS_URI;
  if (!jwksUri) {
    throw new Error("AZURE_ENTRA_JWKS_URI is not set; cannot verify Entra access tokens.");
  }
  entraJwks = createRemoteJWKSet(new URL(jwksUri));
  return entraJwks;
}

/** Verifies an Entra access token against the configured tenant/audience. Exported for local testing with an injected JWKS. */
export async function verifyEntraToken(
  token: string,
  jwks: JWTVerifyGetKey = getEntraJwks(),
): Promise<ResolvedIdentity> {
  const issuer = process.env.AZURE_ENTRA_ISSUER;
  const audience = process.env.AZURE_ENTRA_AUDIENCE;
  if (!issuer || !audience) {
    throw new Error("AZURE_ENTRA_ISSUER / AZURE_ENTRA_AUDIENCE are not set.");
  }
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  if (!payload.sub) throw new Error("Unauthorized: Entra token has no sub claim");
  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (!email) throw new Error("Unauthorized: Entra token has no email claim");
  return { source: "entra", externalId: payload.sub, email };
}

/** Verifies a Supabase JWT via the Supabase client, mirroring requireSupabaseAuth. */
async function verifySupabaseToken(token: string): Promise<ResolvedIdentity> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variable(s) for the bridge-window auth path.");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: invalid Supabase token");
  const email = typeof data.claims.email === "string" ? data.claims.email : undefined;
  if (!email) throw new Error("Unauthorized: Supabase token has no email claim");
  return { source: "supabase", externalId: data.claims.sub, email };
}

/**
 * Resolves the internal `users.id` for a verified identity, creating the row
 * on first sight. Matches by the source-specific external id only — no
 * email-based linking (that's Phase I.2).
 */
export async function resolveOrCreateUser(
  client: Pick<pg.Pool, "query">,
  identity: ResolvedIdentity,
): Promise<string> {
  const column = identity.source === "supabase" ? "supabase_user_id" : "external_identity_id";
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE ${column} = $1 AND status = 'active'`,
    [identity.externalId],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO users (${column}, email) VALUES ($1, $2) RETURNING id`,
    [identity.externalId, identity.email],
  );
  return inserted.rows[0].id;
}

async function resolveIdentity(token: string): Promise<ResolvedIdentity> {
  // Entra access tokens are JWTs whose issuer path contains "/oauth2/" or
  // login.microsoftonline.com; Supabase tokens don't decode meaningfully
  // without a matching issuer. Rather than sniff formats, try Supabase first
  // (today's live path) and fall back to Entra — cheap since both are local
  // JWKS/API calls, and wrong-path attempts fail fast on signature/issuer.
  try {
    return await verifySupabaseToken(token);
  } catch {
    return verifyEntraToken(token);
  }
}

export const requireApiAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: no Bearer token provided");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new Error("Unauthorized: empty token");

  const identity = await resolveIdentity(token);
  const pool = getAzurePgPool();
  const userId = await resolveOrCreateUser(pool, identity);

  return next({ context: { userId, identitySource: identity.source } });
});
