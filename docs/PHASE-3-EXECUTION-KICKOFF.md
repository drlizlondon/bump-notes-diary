# BumpNotes Azure — Phase 3 execution kickoff

**Written 2026-09-08, after the Azure stack went live.** This turns the directional Phase 3 in `BUMPNOTES_AZURE_MIGRATION_PLAN.md` §3 into execution-grade work packages with acceptance criteria, wired to the deploy/verify loop we now have. It **does not supersede** the plan — the plan's 3.1–3.13 task content stands; this adds grain, sequencing, and the founder-gated cutover checklist.

## 0. State this builds on (all verified 8 Sep 2026)
- App **live** on App Service `bumpnotes-api` (UK West): `/api/health` → 200 over the internet.
- Schema applied + behaviourally verified on the real Azure `bumpnotes` PG 18 (2.2–2.4).
- Managed identity resolves `AZURE_PG_URL` from Key Vault (green) — **no keys**. Storage Blob Data Contributor granted.
- Entra External ID stack complete (API app + `email` claim, SPA app + consent, user flow, workforce admin).
- **Deploy/verify loop:** every WP below ships the same way (§1). Production (bumpnotes.co.uk on Cloudflare/Supabase) stays untouched until 3.8.

## 1. The loop every Phase 3 WP uses (proven)
1. Branch off `staging`, implement one WP, keep the build green + the PLAN §7 AI-fence lint intact.
2. Land on `staging` (ff-only). The build is verified locally (`npm run build` → `.output/server/index.mjs`; `/api/health` 200).
3. Deploy to App Service via **Actions → "Deploy to Azure App Service (manual)" → confirm `deploy` → Lizzie approves the `azure-app-service` environment gate**. Smoke test runs automatically.
4. Verify the WP's acceptance criteria against the **live** app (not just locally).
- Executor discipline (plan/execute split): one WP per session, no redesign; on spec contradiction, stop + log + ask. Applied migrations are immutable — new files only.

## 2. Work packages (execution grade)

### WP 2.5-fin — App Insights SDK (PII-safe). *Completes 2.5.*
- Add the App Insights SDK (sanctioned dep) and initialise it from `APPLICATIONINSIGHTS_CONNECTION_STRING` (new App Service app setting — copy from `bumpnotes-insight`).
- **PII fence (load-bearing, DTAC §4/3.13):** no entry content, payloads, or free-text in telemetry; scrub request bodies and any `payload`/`snapshot`/journal fields; sample request URLs only (no query strings with identifiers). A test asserts the telemetry initialiser cannot emit those fields.
- **Acceptance:** deploy; make a few requests; App Insights shows request/dependency telemetry; a reviewer confirms **zero** entry content in a sampled trace (the 3.13 spot-check, done once here and repeatable).

### WP 2.7-fin — blob helper to managed identity. *Compliance non-negotiable (§1.2).*
- Replace `StorageSharedKeyCredential`/`AZURE_STORAGE_ACCOUNT_KEY` in `src/lib/azure/blob-helpers.ts` with `@azure/identity` `DefaultAzureCredential` + a **user-delegation SAS**. No account key in config anywhere.
- Keep the existing ownership checks (`attachments.user_id`), 10 MB cap before any storage call, read-only 5-min SAS.
- **Acceptance:** running on App Service (managed identity), upload→issue-SAS→fetch→delete works against a real container; a cross-user request is 403; an over-cap upload is rejected before any storage call; `grep` shows no account-key usage; **disable "Storage account key access"** on `bumpnotesproduks` afterwards and confirm the app still works (proves keylessness).

### WP 3.1 / 3.2 — domain types + `api-repo.ts`. *The data-layer core.*
- 3.1 `lib/domain/types.ts` per PLAN 3.1 (unchanged).
- 3.2 `lib/data/repository.ts` interface + **`api-repo.ts`** — HTTP client to the BumpNotes API server functions (replaces `supabase-repo.ts`). Every server function is scoped by the internal user id from the 2.6 middleware only (`requireApiAuth`), never a raw token claim.
- **Acceptance:** a first real authenticated route (e.g. read/write one entity) round-trips through `api-repo` → API → PG on the **live** app; this is the first true end-to-end DB proof (closes the gap health-checks can't). Cross-user access denied. Unit tests for the repo mapping/zod validation.

### WP 3.3–3.7 — per PLAN (grain already adequate)
Outbox + IndexedDB (3.3), attachments EXIF-strip re-encode targeting 2.7 endpoints (3.4), local-repo + demo fixtures (3.5), query hooks + mode factory (3.6), `ensureMigrated` lazy backfill + read-only fallback + `V2_DATA` flag (3.7). Each ships via §1; each carries its own acceptance test from PLAN.

### WP 3.9–3.13 — cut over the surfaces (after 3.7)
Capture panels, home/timeline, settings/demo → LocalRepository, migrate staging-cohort accounts + delete Group C Supabase code, manual test pass + blob-access checks + the App Insights PII spot-check.

## 3. 🔒 3.8 — Production cutover (FOUNDER-GATED, WINDOWED — never auto-run)
This is the one irreversible step: bulk-copy `bumpnotes_state` → `bumpnotes_state_archive` on Azure, copy blob objects Supabase→Azure containers, archive-lock Supabase (its final migration), and **flip production hosting Cloudflare→App Service.** It moves real pregnancy health records and changes what the public domain serves.

**Pre-cutover checklist (all green before Lizzie picks a window):**
- [ ] 3.1–3.7 shipped and verified on the live Azure app; a real cohort exercised end-to-end.
- [ ] Backfill has checksum verification + a tested rollback; Supabase blob retained read-only one full release cycle.
- [ ] `deleteOwnAccount` covers PG rows + all four containers + Entra deletion + audit event (Phase 8).
- [ ] App Insights PII spot-check clean (3.13).
- [ ] Custom domain / DNS plan for App Service decided (the invite/URL contract).
- [ ] **DCB0129:** CSO engaged and the safety case not blocking a health-data cutover (see `docs/clinical-safety/`).
- [ ] DPIA drafted (data flows are built by now — cheapest moment, DTAC §3).
- [ ] Rollback plan written; status/comms plan for the window.
- [ ] **Lizzie approves the window and clicks the irreversible steps.** The coordinator prepares and verifies around them; it never flips the cutover itself.

## 4. Sequencing
2.5-fin → 2.7-fin (both unblocked now: live managed identity) → 3.1/3.2 (first real DB round-trip) → 3.3–3.7 → 3.9–3.13 → **[gate] 3.8** → Phase I (identity cutover to Entra: MSAL sign-in behind a flag, verified-email linking, then Entra-only; **user comms sign-off = Lizzie**) → Phases 4–8 per PLAN §4 amendments.
