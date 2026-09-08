// Attaches the Entra API access token to server-fn RPCs (AZURE Phase I.1).
// Registered as a global client functionMiddleware AFTER attachSupabaseAuth, so
// when Entra sign-in is active it overrides the Supabase bearer; when Entra is
// off or no token is available it passes through untouched (Supabase's header
// stands). `requireApiAuth` (2.6) validates whichever token arrives.

import { createMiddleware } from "@tanstack/react-start";
import { getEntraAccessToken } from "./entra-auth";

export const attachEntraAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = await getEntraAccessToken();
  return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
});
