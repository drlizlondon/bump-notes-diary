# BumpNotes V2 — Azure Migration Plan (Supabase → Azure workstream)

**Status:** Executable blueprint. **Supersedes PLAN §10 Phases 2–3** and amends Phases 4–8.
**Product source of truth:** `docs/BUMPNOTES_V2_ARCHITECTURE.md` (ARCH) — unchanged by this document.
**Engineering source of truth:** `docs/BUMPNOTES_V2_IMPLEMENTATION_PLAN.md` (PLAN) — still authoritative for everything this document does not explicitly supersede (domain model, summary pipeline, phases 4–8 task content, §5.8 blob mapping table).
**Direction set by:** Liz, 12 July 2026 — Azure for NHS-compliance posture; architecture brief adopted in full (§1).
**Sequencing decision (Liz, 12 July 2026):** Azure-first. V2 persistence is built directly on Azure; the Supabase V2 schema/RLS/bucket tasks (old PLAN 2.1–2.5, 3.2, 3.7 as written) are never built. The risky blob→tables user-data migration happens exactly once, into its final home.

---

## 1. Adopted architecture (Liz's brief, normative)

| Supabase service | Azure replacement |
|---|---|
| Supabase PostgreSQL | Azure Database for PostgreSQL Flexible Server (PG 17, Burstable, UK South) |
| Supabase Storage | Azure Blob Storage (GPv2 account, private containers) |
| Supabase Auth | Microsoft Entra External ID (external tenant) — consumers; workforce tenant — staff/admin |
| Supabase server functions' role | BumpNotes API on Azure App Service; Azure Functions for background jobs only |
| Secrets | Azure Key Vault (+ managed identities, no storage account keys) |
| Logs/monitoring | Application Insights |

Non-negotiables from the brief:

1. **The frontend never connects directly to PostgreSQL and never receives unrestricted storage credentials.** Every sensitive operation passes through the BumpNotes API.
2. **Blob access is short-lived**: API checks ownership, then issues a short-lived SAS URL or streams the file. No permanent public URLs. Encryption at rest, soft delete, versioning where appropriate, lifecycle rules, restricted CORS, managed identities.
3. **Entra authenticates the person; it is not the user database.** Internal `users` table with a BumpNotes UUID and `external_identity_id`; all data references the internal UUID.
4. **Admin is a separate world**: workforce tenant, separate app registration, separate token audience, separate authorisation policy. A valid customer token must never reach admin surface.
5. Database start-state: PG 17, Burstable, UK South, automated backups; HA and private networking deferred but planned before clinical/commercial scale.

## 2. Engineering decisions (made here, reversible in one line each)

- **DECISION — API lives in the existing app.** The repo is TanStack Start; its server functions *are* a conventional persistent API when deployed to App Service (nitro `node-server` preset). One deployable, the existing auth-middleware pattern survives, no second service to operate. A separate API service is the fallback if App Service/SSR constraints bite.
- **DECISION — plain SQL migrations + `pg`, no Prisma.** Timestamped SQL files in `azure/migrations/` (mirroring the existing `supabase/migrations/` convention) applied by a small runner script using `pg`. The repository layer already owns row↔camelCase mapping and zod validation; an ORM adds a second source of truth for types. Reverse this if you want Prisma's migration tooling — say so before task 2.3.
- **DECISION — new dependencies sanctioned for this workstream only:** `pg`, `@azure/storage-blob`, `@azure/identity`, `@azure/msal-browser`, App Insights SDK. Nothing else without escalation.
- **DECISION — authorization is API-level first.** Every repository query is scoped by the authenticated internal user id in the API layer. PostgreSQL RLS (via `SET LOCAL` app user) is a listed hardening task (8A.3), not a launch blocker. Summaries' immutability (no UPDATE, ARCH §5.4) is enforced by API surface **and** a DB trigger, since Supabase's no-UPDATE-policy trick no longer applies.
- **DECISION — containers:** `user-uploads` (journal attachments incl. photos), `profile-images`, `generated-summaries`, `exports`. Paths keep PLAN's shape: `{internalUserId}/{pregnancyId}/...`. Attachment rows store `container`, `blob_path`, `mime`, `size_bytes`, `checksum`, `uploaded_at`, owner — per the brief.
- **DECISION — identity cutover is by verified-email match, after data cutover.** Supabase bcrypt hashes cannot be imported into Entra External ID. Existing users sign in once with Entra using the same email; on first validated Entra token whose verified email matches exactly one existing account, `users.external_identity_id` is linked. No fuzzy matching, no silent merge. The user-facing comms/copy for this is **Liz's sign-off, not mine** (§5).
- **DECISION — the blob archive moves to Azure at cutover.** One-time bulk copy of `bumpnotes_state` rows into an Azure `bumpnotes_state_archive` table (same read-only, checksum-stamped semantics as PLAN §5.2). The lazy per-user backfill (PLAN §5.8 mapping table, unchanged) then runs entirely inside Azure. No steady-state cross-cloud reads.
- **DECISION — no new consent tables in V2.** The brief lists "consent and sharing records" and "audit events" as DB contents. Existing ToS timestamps on `profiles` plus `summaries.shared` cover consent/sharing as the product currently defines them; a minimal `audit_events` table (auth, export, share, delete, migration events — actor, action, target, timestamp; no entry content) ships in 2.4. Anything richer is a product decision ARCH doesn't make — escalate before inventing.

## 3. Phase plan

Phases 0–1 are complete on `staging`. This section **replaces** PLAN §10 Phases 2–3 and inserts Phase I. PLAN Phases 4–8 keep their content with the amendments in §4.

**Phase 2 — Azure foundation** *(app behaviour unchanged; production stays on current hosting + Supabase)*
- [ ] 2.1 **[LIZ/OPS — blocks all of 2.3+]** Provision per checklist §6: resource group (UK South), PG Flexible Server 17, GPv2 storage account + 4 private containers, Key Vault, App Insights, App Service plan, Entra External ID external tenant + app registrations (SPA + API audience), workforce-tenant admin registration. Deliver endpoints/ids as env config (never committed).
- [ ] 2.2 `azure/migrations/` scaffolding + runner script (`pg`); documented apply procedure; CI-free for now.
- [ ] 2.3 Migration 001: `users` (internal UUID, `external_identity_id` nullable unique, `supabase_user_id` nullable unique for the bridge window, email, status, timestamps), `profiles`, `pregnancies`, `people`, `health_items`, `previous_pregnancy_notes`, `preferences` — PLAN §5.3 shapes with `user_id` → internal UUID.
- [ ] 2.4 Migration 002: `entries`, `attachments` (blob metadata per §2), `summaries` (+ immutability trigger), `audit_events`, `bumpnotes_state_archive` (empty until 3.8), indexes per PLAN §5.6.
- [ ] 2.5 Azure deploy target: nitro `node-server` preset build + App Service deployment (staging slot only); Key Vault/managed identity wiring; App Insights; health endpoint. Production traffic untouched.
- [ ] 2.6 API auth middleware: validates **either** a Supabase JWT (bridge window) **or** an Entra access token; resolves/creates the `users` row; all server functions take the internal user id from this middleware only.
- [ ] 2.7 Blob helper endpoints: upload (ownership-checked, size-capped 10 MB), short-lived SAS issuance, delete. Managed identity; no account keys in config.

**Phase 3 — Data layer + cutover** *(supersedes PLAN 3.x; PLAN task content carries over except where noted)*
- [ ] 3.1 `lib/domain/types.ts` — unchanged from PLAN 3.1.
- [ ] 3.2 `lib/data/repository.ts` interface + **`api-repo.ts`** (HTTP to the BumpNotes API server functions; replaces `supabase-repo.ts`).
- [ ] 3.3 Outbox + IndexedDB staging — unchanged from PLAN 3.3.
- [ ] 3.4 `lib/data/attachments.ts` — EXIF-stripping canvas re-encode unchanged; upload/signed-URL calls target 2.7 endpoints.
- [ ] 3.5 `local-repo.ts` + V2 demo fixtures — unchanged from PLAN 3.5.
- [ ] 3.6 Query hooks + mode factory — unchanged from PLAN 3.6.
- [ ] 3.7 `ensureMigrated` server fn + lazy backfill per PLAN §5.8 (mapping table verbatim; photos → `user-uploads`; checksums → `bumpnotes_state_archive.migration_checksum`) + read-only fallback banner + `V2_DATA` flag.
- [ ] 3.8 Cutover prep: bulk-copy `bumpnotes_state` → `bumpnotes_state_archive`; revoke Supabase client writes (archive lock, applied to Supabase as its **final** migration); production hosting cutover current host → App Service. **[LIZ approves the cutover window]**
- [ ] 3.9 Cut over capture panels — PLAN 3.8 content, writes via api-repo.
- [ ] 3.10 Cut over home + timeline — PLAN 3.9 content. `[after 3.9]`
- [ ] 3.11 Cut over settings + demo/tester to LocalRepository — PLAN 3.10 content. `[after 3.10]`
- [ ] 3.12 Migrate staging-cohort accounts; verify checksums; delete Group C files (store/sync/types) + `@supabase/supabase-js` usage outside auth. `[after 3.11]`
- [ ] 3.13 Manual test pass per PLAN 3.12 + blob-access check (SAS expiry, cross-user 403) + App Insights PII spot-check (no entry content in telemetry).

**Phase I — Identity cutover to Entra External ID** `[after 3.x, before Phase 4]`
- [ ] I.1 MSAL sign-in/sign-up flow (email+password, email verification, reset) behind a flag; token validation already live from 2.6.
- [ ] I.2 Linking: first Entra sign-in matches verified email → set `external_identity_id`; ambiguous/no match → support path, never silent merge. Audit event on every link.
- [ ] I.3 Cutover: new sign-ins Entra-only; existing sessions honoured until expiry; **user comms + in-app copy sign-off by Liz before enabling**.
- [ ] I.4 Decommission Supabase: auth off, project archived (export retained), `supabase_user_id` column kept as historical record; delete Supabase client code + bridge branch of 2.6. Admin dashboard auth → workforce tenant, separate audience.

**Phases 4–8** proceed per PLAN §10 with §4 amendments below. The archive-drop (now `bumpnotes_state_archive`) still waits one full release cycle after Phase 3 ships clean.

## 4. Amendments to PLAN Phases 4–8

- **Phase 4 (Onboarding):** step 6 "create account" embeds the MSAL/Entra flow (I.1), not Supabase auth screens. Pre-auth local buffer flush unchanged.
- **Phase 7 (PDF):** upload targets `generated-summaries` container via 2.7; history opens short-lived SAS URLs.
- **Phase 8 (Closeout):** export = V2 entities + PDFs + legacy blob from `bumpnotes_state_archive`; `deleteOwnAccount` = PG rows + all four container prefixes + Entra account deletion (Graph API) + audit event; grep-audit extends to `supabase` references; new task **8A.3**: evaluate PG RLS hardening + private networking + HA enablement gate (pre-scale checklist from §1.5).

## 5. Escalations awaiting Liz (recorded, non-blocking until their task)

1. **Identity-cutover comms and in-app copy** (I.3) — user-facing, trust-sensitive; wording is the feature. Needed before I.3, drafted during Phase 3.
2. **Cutover window approval** (3.8) — brief write-freeze on legacy blob sync while the archive copies.
3. **Provisioning** (2.1) — blocks 2.3 onward; checklist in §6. Includes cost acceptance (Burstable PG + App Service plan + storage, modest at current scale).
4. **Prisma preference** (§2) — say before 2.3 or plain SQL + `pg` stands.
5. **Consent/audit scope** (§2 last DECISION) — if NHS compliance review needs more than `audit_events` + existing ToS/shared fields, that's a product definition to add to ARCH first.

## 6. Provisioning checklist (for 2.1 — human, not model)

In UK South, one resource group (`bumpnotes-prod` suggested): PostgreSQL Flexible Server 17 (Burstable B-series, automated backups ≥14 days, public access temporarily with firewall allow-list until private networking lands) · GPv2 storage account, private containers `user-uploads`, `profile-images`, `generated-summaries`, `exports`, soft delete on, CORS locked to app origin · Key Vault (RBAC mode) · Application Insights · App Service plan (Linux, Node LTS) + staging slot · Entra External ID external tenant: SPA app registration (auth code + PKCE), API app registration (its audience is what 2.6 validates), email+password with verification enabled · workforce-tenant app registration for admin (separate audience, MFA/conditional access) · managed identity for App Service granted: Key Vault secrets get, Storage Blob Data Contributor, PG AAD auth (or connection string in Key Vault as interim). Hand over: tenant ids, client ids, API audience URI, PG host, storage account name, App Insights connection string — as env config only.

## 7. Working-rule deltas (extend WORK.md §3 for this workstream)

- §3.11 applies to `azure/migrations/` type artefacts equally: applied migrations are immutable; new files only.
- §3.13 extends to Azure: never commit connection strings, tenant/client secrets, or SAS tokens; never modify Azure resources as part of a code task — config/infra changes go through Liz or a sanctioned ops task (2.1-style).
- The PLAN §7 AI fence and `lib/summary/**` lint rule are unaffected: the Azure SDK upload helper is the only sanctioned network client in the summary pipeline.

---

*Checklist execution: tasks here tick in this document; PLAN §10 Phases 2–3 are marked superseded and stay unticked forever. Anything undecidable from ARCH + PLAN + this document: escalate, don't guess.*
