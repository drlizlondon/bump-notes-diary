// Entra admin operations via Microsoft Graph (AZURE / GDPR-2, GDPR-5).
//
// Used by account erasure to delete the user's Entra identity after their data
// is removed from Postgres + Blob. Requires an app registration in the EXTERNAL
// tenant with the `User.ReadWrite.All` APPLICATION permission (admin-consented),
// authenticated by client credentials. Config (server-only env):
//   AZURE_ENTRA_ADMIN_TENANT_ID   — the external tenant id (…ciamlogin tenant)
//   AZURE_ENTRA_ADMIN_CLIENT_ID   — the admin app registration id
//   AZURE_ENTRA_ADMIN_CLIENT_SECRET — its secret (store in Key Vault; ref it)
//
// If not configured, deleteEntraUser reports { deleted:false, reason } rather
// than throwing, so DB+blob erasure still completes and the outstanding Entra
// deletion is recorded as pending (never silently "done").

const GRAPH = "https://graph.microsoft.com/v1.0";

function adminConfig(): { tenantId: string; clientId: string; clientSecret: string } | null {
  const tenantId = process.env.AZURE_ENTRA_ADMIN_TENANT_ID;
  const clientId = process.env.AZURE_ENTRA_ADMIN_CLIENT_ID;
  const clientSecret = process.env.AZURE_ENTRA_ADMIN_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;
  return { tenantId, clientId, clientSecret };
}

export function isEntraAdminConfigured(): boolean {
  return adminConfig() !== null;
}

async function getGraphToken(cfg: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  if (!res.ok) {
    throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Graph token response had no access_token");
  return json.access_token;
}

export type EntraDeleteResult =
  | { deleted: true }
  | { deleted: false; reason: "not_configured" | "no_object_id" };

/**
 * Deletes the Entra user by object id (the app's `users.external_identity_id`).
 * Returns a structured result; throws only on an actual Graph failure once
 * configured (so the caller can record a hard error), not when unconfigured.
 */
export async function deleteEntraUser(objectId: string | null): Promise<EntraDeleteResult> {
  if (!objectId) return { deleted: false, reason: "no_object_id" };
  const cfg = adminConfig();
  if (!cfg) return { deleted: false, reason: "not_configured" };

  const token = await getGraphToken(cfg);
  const res = await fetch(`${GRAPH}/users/${encodeURIComponent(objectId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  // 204 = deleted; 404 = already gone (idempotent success).
  if (res.status === 204 || res.status === 404) return { deleted: true };
  throw new Error(`Graph user delete failed: ${res.status} ${await res.text()}`);
}
