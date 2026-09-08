# Fix — keep BumpNotes' own sign-in UI, powered by Entra (spec)

**Founder ask 2026-09-08 (verbatim intent):** "I still want these login options with BumpNotes" — keep the existing BumpNotes sign-in screen (email + password, "magic link", "Start your pregnancy record"), and make **Microsoft Entra External ID** the engine underneath, replacing Supabase. One sign-in, on-brand, no confusing double.

**Proven already:** Entra email+password sign-up/sign-in works live on the Azure instance (`/entra` diagnostic; a real account was created). This spec is about the *product* sign-in UX, not whether Entra works.

## The two approaches (decide first)
- **(A) Branded Entra-hosted pages (quick).** The BumpNotes sign-in buttons trigger an Entra **redirect** to a login page styled with **company branding** (logo, colours, background) so it reads as BumpNotes. Least build; standard CIAM pattern. Trade-off: it's a redirect to Entra's page, not the exact embedded form on `signin.tsx`.
- **(B) This exact embedded form, Entra native authentication (more build) — the founder's actual ask.** Keep `signin.tsx` as-is visually; wire its fields to Entra External ID **native authentication** (custom auth API / MSAL custom-auth SDK) so credential entry stays on BumpNotes' own page. Bigger build; verify the native-auth capability is enabled on the tenant.

**DECISION (founder, 2026-09-08): (B) — our own branded form, Entra as the engine (native auth).** De-risked: **Entra External ID native authentication for JS SPAs is Generally Available** (GA March 2026), incl. email/SMS OTP MFA, social IdPs, SSO. It's a supported path — **MSAL for JavaScript + the native-authentication extensions** — not a bet. Build it as a **reusable login package** (config-driven module + themeable form) so every future company inherits it (the "identity" pillar of `~/NightMode/UK-HEALTHTECH-FOUNDATION-PLAYBOOK.md §3`). NOT "roll our own auth" — Entra remains the identity engine; we only own the UI. Refs: devblogs.microsoft.com/identity native-auth GA posts.

**Reusable-package shape:** `entra-native.ts` = config-driven flows (start sign-up/in, submit password, submit email OTP, reset) with authority/clientId/scope from env; a themeable `<SignInForm>` component (brand = a theme, not a fork). Company #2 = new Entra tenant + native-auth enabled + swap env + apply brand theme. Extract the shared package properly at the *second* use (don't pre-abstract).

## FINDINGS from the build spike (8 Sep 2026) — the decision is genuinely reopened
Built the native-auth module against the real SDK types (`@azure/msal-browser/custom-auth`, `CustomAuthPublicClientApplication`; API confirmed: `create()`, `signIn({username,password,scopes})`, `signUp()`, `resetPassword()`, `getCurrentAccount()`, state machine `isCompleted()/isPasswordRequired()/isCodeRequired()/isFailed()` + `state.submitPassword()/submitCode()/resendCode()`, account via `CustomAuthAccountData.getAccessToken()`). Two real costs surfaced:
1. **`customAuth.authApiProxyUrl` is REQUIRED** — native auth needs a **CORS proxy** for the CIAM native-auth API. That's **extra infrastructure to run and maintain per product** (a proxy endpoint), which cuts against the "just a browser SDK" premise and the playbook's low-maintenance goal.
2. **Sign-up ≠ signed-in** — sign-up and sign-in are separate multi-step flows (sign-up completes, then you sign in); the UI/module must handle both, not one form.
- Also noted: the SDK's `this is X & {state}` type guards don't negative-narrow cleanly (build against them with explicit per-branch handling).

**Reopened decision (founder to weigh):**
- **(A) Branded Entra-hosted redirect** — Entra's page, company-branded (logo/colours/background), redirect flow. **Zero extra infra, low maintenance, standard.** Not the pixel-exact embedded form.
- **(B) Native auth (your exact form)** — embedded form, but **you run a CORS proxy** + own the sign-up/in/reset flows + maintain the UI.
**Coordinator recommendation: (A) branded redirect** — the proxy + flow-maintenance of (B) is real ongoing cost for a login screen, and restraint says spend that on the product, not auth chrome. If the embedded form genuinely matters, (B) is viable (GA) — just go in eyes-open about the proxy. The reusable Entra *core* (`entra-config`/`entra-auth`/token attacher) already landed serves BOTH.

## Option → Entra mapping (both approaches)
- **Email + password** → Entra user flow email+password (already built: `SignUpSignIn`).
- **"Email me a magic link"** → Entra **email one-time passcode (OTP)** — a code, not a link. Same passwordless feel; relabel to "Email me a code".
- **"Start your pregnancy record" (sign-up)** → Entra sign-up (same user flow).
- **"Forgot password?"** → Entra password reset (part of the user flow / a reset flow).

## Build outline (for B)
1. Confirm/enable **native authentication** on the BumpNotes external tenant; register the SPA app for native auth if required.
2. Add the MSAL custom-auth SDK; a small `entra-native.ts` (start sign-in, submit password, submit OTP, sign-up, reset) — config-driven, reusable (feeds the playbook).
3. Rewire `signin.tsx` (and the sign-up entry) to call `entra-native.*` instead of `supabase.auth.*`, behind the `VITE_ENTRA_AUTH` flag so the Supabase path stays until we cut over.
4. On success, set app user state from the Entra account; the data layer already uses the Entra token via the attacher (proven).
5. Remove the standalone `/entra` diagnostic once the real form is Entra-powered.
6. Verify end-to-end on a gated deploy; confirm the profile round-trip on the real sign-in; confirm the access-token `aud`.

## Out of scope for the fix
The full identity cutover (Entra-only for everyone, Supabase decommission — I.3/I.4) and the surface cutover onto the repository (Phase 3.9+). This fix makes the *sign-in* Entra-native while keeping BumpNotes' UI; the rest follows.

## BUILD DONE — 8 Sep 2026 (evening) — (B) native auth, built and half-proven
Commit `43743b6` on `staging`. Build green, tsc clean, lint clean; `custom-auth` SDK confirmed absent from the server bundle (dynamic import held, unlike the App Insights attempt).

**The proxy question is resolved — cheaply.** The CORS proxy native auth requires is NOT extra infrastructure for us: because BumpNotes is server-rendered, it's a single same-origin route in `src/server.ts` (`/api/ciam`, forwarding to the CIAM native-auth API, reusable via `AZURE_CIAM_PROXY_TARGET`). No Azure Front Door, no separate service to run/maintain. This substantially dissolves the main cost that reopened the A/B decision — (B)'s ongoing cost is now essentially just owning the form UI, which is exactly what the founder asked for.

**Proven live (local built server, 8 Sep):** POST `/api/ciam/oauth2/v2.0/initiate` forwards correctly to Microsoft CIAM (real ESTS response + headers, CORS injected, path-strip correct). So the proxy + routing are proven end-to-end against the real Microsoft endpoint.

**Blocker surfaced by that probe (founder portal action):** CIAM returned `AADSTS550022: Confidential Client is not supported in Native Authentication API flow`. Two portal settings on the **external tenant** are needed before native sign-in completes:
1. **Enable native authentication** on the BumpNotes external tenant (Entra admin center → External Identities settings).
2. Make the **SPA app registration (`3180eb1a-…`) a public client** for native auth — enable "Allow public client flows"; it must not be treated as confidential (no client secret expected on the native flow).
These are Lizzie's to click; I can't and shouldn't do portal/tenant changes.

**What's built (all flag-gated by `VITE_ENTRA_NATIVE`, default OFF — live Supabase login untouched):**
- `src/server.ts` — same-origin CIAM CORS proxy.
- `src/lib/azure/entra-native.ts` — reusable, config-driven native-auth engine (email+password, email OTP, password reset) exposed as an SDK-free normalized surface (closures per next-step) so the form never touches SDK types. Documents the `this is this & {state}` guard collapse + the `flags()` workaround for the next product.
- `src/routes/entra.tsx` — the `/entra` surface is now BumpNotes' own branded native sign-in form (same visual language as `/signin`) + the Azure-API→Postgres profile round-trip proof.
- `entra-auth-attacher.ts` — prefers the native token when the native path is on.

**Honest sequencing — login proven ≠ live front door yet.** The live app's session and data are still Supabase-backed (`useSyncSnapshot` reads `supabase.auth.getSession()`; app state comes from `pullFromCloud`/`pushToCloud` on Supabase tables). So a successful Entra native sign-in cannot yet land a user in the working app — that requires the **Phase 3 surface cutover** (app state onto the Azure repository). We therefore prove the login on `/entra` and deliberately do NOT rewire the live `/signin` yet; flipping `/signin` to native rides *with* the Phase 3 cutover so users land somewhere that works. This is the load-bearing "don't build breadth before the loop closes" call.

**Next steps (in order):** (1) Lizzie enables native auth + public-client on the tenant/app; (2) rebuild+deploy staging with `VITE_ENTRA_NATIVE=true` (founder-gated); (3) verify the full round-trip on `/entra` (sign in with our form → token → Azure API → Postgres profile); (4) then plan the Phase 3 surface cutover that lets native sign-in become the real `/signin`.
