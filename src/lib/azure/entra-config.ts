// Entra External ID (MSAL) config (AZURE Phase I.1) — the REUSABLE identity
// template. Config-driven from VITE_ env so it ports to any healthtech product:
// swap the env values, register that product's SPA/API apps, done.
//
// MSAL is loaded via a DYNAMIC import (+ `import type`) so `@azure/msal-browser`
// (a browser lib referencing window/crypto) never enters the server bundle —
// same discipline that fixed the App Insights bundling. The client is created
// lazily, only when the Entra flag is on and config is present (browser only).
//
// Default OFF: with VITE_ENTRA_AUTH unset, getMsal() returns null and every
// caller is a no-op — the live Supabase login is completely unaffected.

import type { PublicClientApplication } from "@azure/msal-browser";

/** Build-time flag. Entra sign-in is inert unless this is exactly "true". */
export const ENTRA_ENABLED = import.meta.env.VITE_ENTRA_AUTH === "true";

const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined; // SPA app client id
const AUTHORITY = import.meta.env.VITE_ENTRA_AUTHORITY as string | undefined; // https://<sub>.ciamlogin.com/<tenantId>
const API_SCOPE = import.meta.env.VITE_ENTRA_API_SCOPE as string | undefined; // api://<apiClientId>/access_as_user

/** The scope(s) requested for the BumpNotes API access token. */
export const loginRequest = { scopes: API_SCOPE ? [API_SCOPE] : [] };

let pcaPromise: Promise<PublicClientApplication | null> | undefined;

function isConfigured(): boolean {
  return ENTRA_ENABLED && !!CLIENT_ID && !!AUTHORITY && typeof window !== "undefined";
}

/** The MSAL app (browser only, initialised once) — or null when Entra is off/unconfigured. */
export function getMsal(): Promise<PublicClientApplication | null> {
  if (pcaPromise) return pcaPromise;
  if (!isConfigured()) {
    pcaPromise = Promise.resolve(null);
    return pcaPromise;
  }
  pcaPromise = (async () => {
    try {
      const { PublicClientApplication } = await import("@azure/msal-browser");
      const pca = new PublicClientApplication({
        auth: {
          clientId: CLIENT_ID!,
          authority: AUTHORITY!,
          knownAuthorities: [new URL(AUTHORITY!).host], // e.g. bumpnotes.ciamlogin.com
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: "sessionStorage" }, // per-tab; tokens not persisted to localStorage
      });
      await pca.initialize();
      return pca;
    } catch {
      return null; // never let identity setup break the app
    }
  })();
  return pcaPromise;
}
