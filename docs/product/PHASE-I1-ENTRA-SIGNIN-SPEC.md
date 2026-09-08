# Phase I.1 — Entra-native sign-in (execution-grade spec)

**Written 2026-09-08.** Path B: build the **keeper** identity (Microsoft Entra External ID) rather than the throwaway Supabase bridge. Scoped to a **bounded, safe first milestone** — *sign in with Entra → the Profile slice round-trips to Azure Postgres, pure-UK* — flag-gated and **additive alongside the live Supabase app** (no big-bang cutover; the full surface cutover is Phase 3.9+ / I.3). Written to double as the **reusable identity template** for the healthtech playbook.

## Milestone (what "done" means for this session)
A user can choose "sign in with BumpNotes (new)", complete the Entra email+password flow, and land back in the app holding an **Entra access token** (audience = the API app, scope `access_as_user`). The `useProfile()` hook then reads/writes their profile through the Azure API → PG, validated by the 2.6 middleware's **Entra path** (no Supabase involved). This is the **first pure-UK round-trip**. The existing Supabase login and all un-migrated surfaces are untouched.

## The Entra facts to wire (from the tenant we built)
- **Authority (CIAM):** `https://bumpnotes.ciamlogin.com/23f549b5-2003-4406-9b16-fb823bcee3a8` (tenant `23f549b5-…`, UK/EU).
- **SPA client id:** `3180eb1a-7ec6-46b2-9347-e128f1f83ee1` (SPA platform, PKCE, no secret).
- **API scope to request:** `api://4b749876-187e-4305-b6bb-001461d6ddca/access_as_user`.
- **User flow:** `SignUpSignIn` (email+password+verification), already associated to the SPA app.
- **Redirect URIs to ADD in the SPA app registration** (Entra portal, founder step): the local dev origin (confirm the Vite dev port) and the production/App Service origin's callback path chosen below. (We registered the App Service origin root earlier; add the exact callback path + localhost.)

## Build steps (all additive; nothing removes the Supabase path)
1. **Dep:** `@azure/msal-browser` (sanctioned, AZURE §2). Confirm it bundles into the nitro/rollup build — if it fights bundling like `applicationinsights` did, load it via dynamic `import()` + `import type` (that fixed App Insights).
2. **`src/lib/azure/entra-config.ts`** — the reusable, config-driven MSAL setup (values from env/`VITE_` so the template is portable): `msalConfig` (authority, clientId, knownAuthorities `["bumpnotes.ciamlogin.com"]`, redirectUri), `loginRequest` (`scopes: [".../access_as_user"]`), and a `PublicClientApplication` singleton (initialised once). Cache: `sessionStorage` (per-tab, safer than localStorage for tokens).
3. **`src/lib/azure/entra-auth.ts`** — thin API over MSAL: `signInEntra()` (redirect or popup — recommend redirect for reliability), `signOutEntra()`, `getEntraAccessToken()` (`acquireTokenSilent` → fall back to redirect), `getEntraAccount()`.
4. **Token attach (mirror `attachSupabaseAuth`):** a global client function-middleware that, **when the Entra flag is on and an Entra account is present**, attaches `Authorization: Bearer <entra access token>` to server-fn RPCs. Must coexist with the Supabase attacher — pick Entra when the flag/account is active, else Supabase. Register in `src/start.ts` alongside the existing one.
5. **Flag:** `VITE_ENTRA_AUTH` (build-time) and/or a runtime toggle — gates the "new sign-in" entry point and the token attacher, so the live Supabase login is the default until we deliberately flip. (This is the I.3 cutover switch, kept off.)
6. **UI (minimal, additive):** on the existing sign-in surface, add a secondary, flag-gated **"Try the new sign-in"** action → `signInEntra()`. A callback route/handler completes `handleRedirectPromise()` and routes back. Do **not** touch the primary Supabase form.
7. **Session bridge (minimal):** on Entra sign-in, set the app's user state (the `sync.ts` `setUser`-equivalent) from the Entra account (`sub` + `email`). NOTE: the existing `sync.ts` pulls/pushes data via **Supabase** — so an Entra session does **not** get the old Supabase sync; it uses the **new repository** (`useProfile`, api-repo) instead. Keep these paths separate and flag-gated; do not wire Entra into Supabase sync.
8. **Verify the round-trip** (gated deploy): sign in with Entra on the deployed app; `useProfile()` (wired into a small diagnostic or the profile screen) reads/writes to Azure PG; the 2.6 middleware validates the **Entra** token. **Confirm the access-token `aud`** here (GUID vs `api://…`) and set `AZURE_ENTRA_AUDIENCE` to match — the open item from 2.1.

## Acceptance
1. Entra email+password sign-up/in/verify completes; the app holds a valid Entra access token for the API scope.
2. `useProfile()` round-trips **Entra token → Azure API → PG** (no Supabase), read + write, survives reload.
3. Cross-user isolation holds (API-level scoping).
4. The Supabase login and every un-migrated surface are **unchanged** (flag off by default).
5. `AZURE_ENTRA_AUDIENCE` confirmed against a real token.

## Reusability (feeds the playbook)
`entra-config.ts` + `entra-auth.ts` + the token-attach middleware are the **portable identity template** — config-driven (authority/clientId/scope from env), no product specifics. Product #2 copies these three files, swaps the env values, registers its own SPA/API apps, and has Entra-native sign-in. Capture the final shapes into `~/NightMode/UK-HEALTHTECH-FOUNDATION-PLAYBOOK.md §3` after this ships.

## Out of scope (later)
Full identity cutover (I.3, Entra-only new sign-ins), verified-email account linking (I.2), decommissioning Supabase (I.4), and cutting every surface onto the repository (Phase 3.9+). This slice only proves the pure-UK identity+data path end to end.
