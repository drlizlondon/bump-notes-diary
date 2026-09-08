// Attaches the Entra API access token to server-fn RPCs (AZURE Phase I.1).
// Registered as a global client functionMiddleware AFTER attachSupabaseAuth, so
// when Entra sign-in is active it overrides the Supabase bearer; when Entra is
// off or no token is available it passes through untouched (Supabase's header
// stands). `requireApiAuth` (2.6) validates whichever token arrives.

import { createMiddleware } from "@tanstack/react-start";
import { getEntraAccessToken } from "./entra-auth";
import { ENTRA_NATIVE_ENABLED, getNativeAccessToken } from "./entra-native";

export const attachEntraAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  // Prefer the native-auth token (BumpNotes' own sign-in form) when that path is
  // on; otherwise fall back to the redirect/popup MSAL token. Either way, no
  // token available -> passthrough (the Supabase bearer, if any, stands).
  const token =
    (ENTRA_NATIVE_ENABLED ? await getNativeAccessToken() : null) ?? (await getEntraAccessToken());
  return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
});
