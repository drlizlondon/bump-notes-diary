# BumpNotes — Handover + "all live on main" cutover plan (9 Sep 2026)

Written after the B-login + full round-trip was proven live on Azure. This is the durable state-of-play and the ordered list of what remains to make the Azure/Entra stack the real production product on `main`. Reconciles with `docs/BUMPNOTES_AZURE_MIGRATION_PLAN.md` (task numbers referenced); the "start from new" founder ruling simplifies several tasks (marked **[SIMPLIFIED]** / **[DROPPED]**).

---

## Part 1 — Handover: where things stand today

### ✅ Done and proven
- **Azure UK foundation (Phase 2):** PostgreSQL Flexible Server (`bumpnotes`, UK South), Blob, Key Vault (`bumpnotes-kv`, RBAC), App Service (`bumpnotes-api`, UK West, Linux/Node 24), managed identity, App Insights resource. Migrations 001/002 applied.
- **Deploy pipeline (2.5):** manual, approval-gated GitHub Actions workflow (OIDC, no stored secrets), deploys from `staging` to the App Service. Health smoke-test passes.
- **API auth (2.6):** middleware validates the Entra access token (JWKS/issuer/audience env set on the App Service).
- **Blob helpers (2.7):** DefaultAzureCredential + user-delegation SAS (no account keys).
- **Identity — the "B" login (Phase I.1): DONE + PROVEN LIVE.** BumpNotes' OWN branded form on Entra External ID **native authentication** — sign-in, sign-up (email verification), and forgot-password all work through our page (no Microsoft redirect). Reusable engine in `src/lib/azure/entra-native.ts`; same-origin CORS proxy in `src/server.ts`; proof surface at `/entra`. **The full pure-UK round-trip is proven on the deployed instance:** own form → native auth → Entra token → Azure API → **wrote + read a profile row in UK Postgres**. See `ENTRA-CUSTOM-SIGNIN-FIX-SPEC.md`.
- **Data layer — Profile slice only (part of 3.1/3.2):** domain types, repository interface, `api-repo.ts` with **Profile wired** (rest throw `notYet`), profile server functions, query hooks.

### ⚠️ Immediate tidy-ups (small; do before or alongside cutover work)
1. **Move `AZURE_PG_URL` back into Key Vault.** It is currently the **plaintext** connection string in App Service settings (temporary unblock — a health-app no-no long-term). The KV reference is configured perfectly but App Service wouldn't serve the resolved secret even after restart + settings change (an App Service KV-ref caching quirk). Candidates: let the KV cache expire (~24h) then re-point the setting to `@Microsoft.KeyVault(VaultName=bumpnotes-kv;SecretName=AzurePgUrl)`, or delete+re-add the reference, or move the app to a user-assigned identity for KV. Re-verify `/entra` after.
2. **Remove the throwaway `KV_REFRESH` app setting** added during debugging.
3. **DB password** was rotated this session; the working value lives in the `AzurePgUrl` KV secret (and currently, plaintext, in the app setting). Any future password: no `/ : ? # % & = + @` or spaces, so the connection string always URL-parses.

### 🔑 Load-bearing facts for whoever picks this up
- `getaddrinfo ENOTFOUND base` **always** means "AZURE_PG_URL isn't a valid `postgres://` URL at runtime" — `base` is `pg`'s fallback host, never a real typo.
- Live `bumpnotes.co.uk` is unchanged: **Cloudflare Pages serving `main`, on Supabase**. The Azure instance is a parallel stack; the native-auth work is on `staging`, flag-gated (`VITE_ENTRA_NATIVE`), so it does not touch production.
- Founder rulings that shape the cutover: **start from new** (do NOT migrate the ~4 Supabase users); **honesty-first** on any NHS/DTAC claims; the production cutover is **founder-gated + windowed**.

---

## Part 2 — What's left to make everything live on `main` (the cutover)

Ordered. **[GATE]** = needs Liz. The big chunk is the data layer; identity is essentially done.

### A. Finish the data layer (Phase 3.2–3.6, 3.9–3.11) — the largest remaining work
The app's screens still read/write **Supabase** (`useSyncSnapshot` → `pullFromCloud`/`pushToCloud`). Only Profile is on Azure. To cut over:
- [ ] **A1. Server functions for every entity** (like `profile.functions.ts`): Pregnancy, Person, HealthItem, Preferences, Entry (+ payload), Attachment, Summary — each `requireApiAuth` + pg pool + zod, owner-scoped by `context.userId`.
- [ ] **A2. Wire `api-repo.ts`** to all of them (remove the `notYet` stubs).
- [ ] **A3. Attachments (3.4):** EXIF-strip re-encode + upload/signed-URL via the 2.7 blob endpoints; wire `attachments.ts`.
- [ ] **A4. Offline/outbox (3.3) + local/demo repo (3.5) + query hooks + mode factory (3.6)** — per plan (largely carries over; **[SIMPLIFIED]** no migration backfill).
- [ ] **A5. Cut the screens over (3.9–3.11):** capture panels, home + timeline, settings/demo/tester — from Supabase to the Azure repository.

### B. Identity + session cutover (Phase I.1 flip → I.3)
- [ ] **B1. App session on Entra, not Supabase.** Switch the app's global auth/session (what `useSyncSnapshot().userId` provides) from `supabase.auth.getSession()` to the Entra native account (`getNativeAccount`), so the *whole app* is gated on Entra sign-in — not just `/entra`.
- [ ] **B2. Flip the real `/signin`** to the native form (the engine is built + proven; today it lives on `/entra`). Onboarding "create account" (Phase 4 step 6) uses the same native flow.
- [ ] **B3. [DROPPED] I.2 identity-linking** — no existing users to link (start-from-new). Remove I.2 from the plan.
- [ ] **B4. [GATE] I.3 comms + in-app copy** — user-facing wording that new sign-ins are Entra-only; Liz signs off before enabling.

### C. Production hosting cutover (3.8) — **[GATE] windowed**
- [ ] **C1. Point production at the App Service.** Decide: `bumpnotes.co.uk` → App Service directly (custom domain + App Service managed cert) OR keep Cloudflare in front proxying to the App Service origin. This is the moment prod stops being served by Cloudflare-Pages-on-Supabase.
- [ ] **C2. Merge `staging` → `main`** so `main` is the Azure/Entra product. (Until the flip, keep `VITE_ENTRA_NATIVE` handling so a `main` build can't accidentally serve a half-cutover state.)
- [ ] **C3. [SIMPLIFIED] No data copy** — the old 3.8 `bumpnotes_state` → archive bulk-copy is dropped (start-from-new). What remains of 3.8: revoke Supabase client writes and do the hosting flip.

### D. Retire Supabase cleanly (Phase I.4) — **[GATE]**
- [ ] **D1. [GATE] Handle the ~3 real Supabase users** before switching auth off: notify them + export-or-delete their data (their records must not be silently stranded). Founder-run.
- [ ] **D2. Turn Supabase auth off; archive the project (keep an export).** Delete `@supabase/*` client code + the 2.6 Supabase-token bridge branch. Admin dashboard auth → workforce tenant (separate audience).

### E. Pre-launch hardening (config + 8A.3)
- [ ] **E1.** `AZURE_PG_URL` back in Key Vault (tidy-up #1) + remove `KV_REFRESH`.
- [ ] **E2. PG networking:** replace "Allow Azure services" with a **Private Endpoint** (8A.3).
- [ ] **E3.** App Insights SDK wired PII-safe (was reverted for a bundling issue — revisit), or accept App-Service-level logging for launch.
- [ ] **E4. Verification pass (3.13):** full manual test, blob SAS expiry + cross-user 403, PII spot-check (no entry content in telemetry).
- [ ] **E5.** Consider PG RLS hardening + HA enablement gate (pre-scale, 8A.3) — likely post-launch.

### F. Compliance (parallel track, not code)
- [ ] **F1.** DCB0129 clinical-safety case (CRMP / Hazard Log / CSCR) with the fractional CSO — **[GATE]** Liz engages the vendor. Independent of the cutover but required before any NHS-readiness claim goes public (honesty-first).

---

## Suggested sequence
1. **Now:** tidy-ups E1 (KV) — small, closes the security gap from tonight.
2. **Biggest lift:** A (data layer) — this is where most sessions go. Can be built + verified on `staging`/the Azure instance behind the flag while prod stays on Supabase.
3. **Then B** (session + `/signin` flip) once A is solid.
4. **Then C** (hosting cutover + merge to `main`) — **[GATE] windowed**, after A+B verify end to end.
5. **Then D** (retire Supabase) — **[GATE]**, after the 3 users are handled.
6. **E hardening** folds in before the public launch; **F compliance** runs in parallel on its own gate.

**Honest scale:** identity is done; the **data layer (A) is the real remaining engineering**, and the hosting flip (C), user handling (D), and comms (B4/F) are the founder-gated moments. Nothing here is blocked on unknowns — it's build + gated cutover.
