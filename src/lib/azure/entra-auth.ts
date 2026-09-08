// Entra sign-in API (AZURE Phase I.1) — thin, reusable wrapper over MSAL.
// All functions no-op when Entra is off/unconfigured (getMsal() -> null), so
// they are safe to call unconditionally. Browser only.

import type { AccountInfo } from "@azure/msal-browser";
import { getMsal, loginRequest } from "./entra-config";

/** Complete a redirect sign-in (call once on app load). Safe when Entra is off. */
export async function handleEntraRedirect(): Promise<void> {
  const msal = await getMsal();
  if (!msal) return;
  try {
    await msal.handleRedirectPromise();
  } catch {
    /* surfaced via getEntraAccount() being null */
  }
}

/** Start the Entra email+password sign-up/sign-in (redirect flow). */
export async function signInEntra(): Promise<void> {
  const msal = await getMsal();
  if (!msal) return;
  await msal.loginRedirect(loginRequest);
}

export async function signOutEntra(): Promise<void> {
  const msal = await getMsal();
  if (!msal) return;
  const account = msal.getAllAccounts()[0];
  await msal.logoutRedirect(account ? { account } : undefined);
}

/** The signed-in Entra account, or null. */
export async function getEntraAccount(): Promise<AccountInfo | null> {
  const msal = await getMsal();
  if (!msal) return null;
  return msal.getAllAccounts()[0] ?? null;
}

/**
 * A fresh API access token, or null if not signed in. Tries silent acquisition;
 * on failure falls back to an interactive redirect (returns null — the redirect
 * navigates away and the token is available after it completes).
 */
export async function getEntraAccessToken(): Promise<string | null> {
  const msal = await getMsal();
  if (!msal) return null;
  const account = msal.getAllAccounts()[0];
  if (!account) return null;
  try {
    const result = await msal.acquireTokenSilent({ ...loginRequest, account });
    return result.accessToken;
  } catch {
    try {
      await msal.acquireTokenRedirect({ ...loginRequest, account });
    } catch {
      /* ignore */
    }
    return null;
  }
}
