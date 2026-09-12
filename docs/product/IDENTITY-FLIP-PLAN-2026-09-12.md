# Identity flip (B1/B2) — execution-grade plan (12 Sep 2026)

The last reversible step before the domain cutover: move the app's sign-in and
session from Supabase to Entra-native. **Flag-gated** by `VITE_ENTRA_NATIVE` —
default off means the live app is unchanged; on means the native path. Native
sign-in itself is already **proven end-to-end** at `/entra` against the real CIAM
tenant (`ENTRA-CUSTOM-SIGNIN-FIX-SPEC.md`); this plan wires it into the real
front door and the app session.

## Current state (verified in code)
- `/signin` = 100% Supabase (`signInWithPassword` / `signInWithOtp` /
  `resetPasswordForEmail`).
- Every app gate reads `useSyncSnapshot()` (`src/lib/bumpnotes/sync.ts`) →
  `{ userId, email, status }` sourced from Supabase.
- Native engine (`src/lib/azure/entra-native.ts`): `getNativeAccount()` (async,
  MSAL cache in **sessionStorage** — per-tab, not persisted), `getNativeAccessToken()`,
  `nativeSignIn/SignUp/StartPasswordReset/SignOut`, `ENTRA_NATIVE_ENABLED`.
- Native session is used only by `/entra` today; API calls carry the Entra token
  via the auth attacher (the `/entra` round-trip proves this works).

## B1 — session abstraction
New `useAppSession()` returning `{ userId, email, loading }`:
- `ENTRA_NATIVE_ENABLED` → a small reactive native-session store: query
  `getNativeAccount()` on mount; `userId`/`email` = account username; `loading`
  true until the first check resolves; expose `refreshNativeSession()` to re-query
  after sign-in/out (native has no event bus — dispatch a window event from
  `nativeSignIn`/`nativeSignOut`, or call refresh from the sign-in component).
- else → pass through `useSyncSnapshot()` (`loading = status === "syncing"`).
Rewire the gates (index, timeline, details, pack, settings, onboarding, welcome,
signin) from `useSyncSnapshot`/`status === "syncing"` to `useAppSession`/`loading`.
With the flag off this is a behaviour-preserving refactor (verify: tester mode +
the Supabase path unchanged).

## B2 — /signin native form
Extract the `EntraNativeSignIn` component from `src/routes/entra.tsx` into a shared
component; `/signin` renders it when `ENTRA_NATIVE_ENABLED`, else the existing
Supabase form. Onboarding's "create account" uses the same native sign-up flow.

## B4 — copy sign-off (founder gate)
Lizzie signs off the user-facing wording ("sign in with Microsoft", or however it
reads) before B2 faces a real user. Standing rule (I.3).

## Verification — why this is NOT lab-verifiable like A5
Tester mode bypasses auth, so the flag-**off** path is fully verifiable locally
(tester + Supabase unchanged), but the flag-**on** path can only be proven by a
**real sign-in against the live Entra tenant**: a test account, `VITE_ENTRA_NATIVE=true`,
and the deployed same-origin CORS proxy. That live pass is a founder-supervised
step, sequenced with the cutover — not something a local build can shortcut.
Recommended: build B1+B2 flag-gated (green, flag-off verified), then a live pass
(flag on, test sign-in: sign-up, sign-in, reset, session persists, API round-trip,
sign-out) before the flag is ever on in production.

## Sequencing
B1/B2 are reversible (flag off). They come after A5 (done) and before the domain
cutover. The domain cutover stays LAST. Do not turn the flag on in production
until the live pass is green and B4 is signed off.

---
*Document read: ☐ Lizzie — not yet. (Tick to ☑ with the date, or tell any session "read IDENTITY-FLIP-PLAN", and it gets recorded.)*
