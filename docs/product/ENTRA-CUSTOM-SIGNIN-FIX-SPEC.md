# Fix — keep BumpNotes' own sign-in UI, powered by Entra (spec)

**Founder ask 2026-09-08 (verbatim intent):** "I still want these login options with BumpNotes" — keep the existing BumpNotes sign-in screen (email + password, "magic link", "Start your pregnancy record"), and make **Microsoft Entra External ID** the engine underneath, replacing Supabase. One sign-in, on-brand, no confusing double.

**Proven already:** Entra email+password sign-up/sign-in works live on the Azure instance (`/entra` diagnostic; a real account was created). This spec is about the *product* sign-in UX, not whether Entra works.

## The two approaches (decide first)
- **(A) Branded Entra-hosted pages (quick).** The BumpNotes sign-in buttons trigger an Entra **redirect** to a login page styled with **company branding** (logo, colours, background) so it reads as BumpNotes. Least build; standard CIAM pattern. Trade-off: it's a redirect to Entra's page, not the exact embedded form on `signin.tsx`.
- **(B) This exact embedded form, Entra native authentication (more build) — the founder's actual ask.** Keep `signin.tsx` as-is visually; wire its fields to Entra External ID **native authentication** (custom auth API / MSAL custom-auth SDK) so credential entry stays on BumpNotes' own page. Bigger build; verify the native-auth capability is enabled on the tenant.

**DECISION (founder, 2026-09-08): (B) — our own branded form, Entra as the engine (native auth).** De-risked: **Entra External ID native authentication for JS SPAs is Generally Available** (GA March 2026), incl. email/SMS OTP MFA, social IdPs, SSO. It's a supported path — **MSAL for JavaScript + the native-authentication extensions** — not a bet. Build it as a **reusable login package** (config-driven module + themeable form) so every future company inherits it (the "identity" pillar of `~/NightMode/UK-HEALTHTECH-FOUNDATION-PLAYBOOK.md §3`). NOT "roll our own auth" — Entra remains the identity engine; we only own the UI. Refs: devblogs.microsoft.com/identity native-auth GA posts.

**Reusable-package shape:** `entra-native.ts` = config-driven flows (start sign-up/in, submit password, submit email OTP, reset) with authority/clientId/scope from env; a themeable `<SignInForm>` component (brand = a theme, not a fork). Company #2 = new Entra tenant + native-auth enabled + swap env + apply brand theme. Extract the shared package properly at the *second* use (don't pre-abstract).

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
