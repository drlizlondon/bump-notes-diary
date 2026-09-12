# Phase 3 — first vertical slice (execution-grade) + the auth gate

**Written 2026-09-08 (coordinator, unsupervised).** Turns "build the data layer" into a precise, code-grounded first slice, so the supervised build is fast and faithful rather than improvised on a live health app. Builds on the applied schema (migrations 001/002) and PLAN §4.6 (the load-bearing state design).

## What's already built (this session, additive + unwired — safe)
- `src/lib/domain/types.ts` (task 3.1) — V2 domain types derived faithfully from the applied schema. Type-checks clean; nothing imports it yet.
- `src/lib/data/repository.ts` (task 3.2, the interface) — the single data-access contract both `ApiRepository` and `LocalRepository` implement.

These are stable contracts (schema-derived). The rest of the slice below involves a real auth decision + live wiring, so it is **specified here for supervised execution**, not built unsupervised.

## The architecture (recon, so no one reinvents it)
- **Discarded (PLAN §4.9):** today's persistence — `src/lib/bumpnotes/store.ts` + `sync.ts` (whole-state Supabase sync) + `types.ts` (V1 `AppState`). Only its *data* migrates (backfill, task 3.7 / PLAN §5.8).
- **Target (PLAN §4.6):** reads via **TanStack Query** keyed `[pregnancyId, entity, params]`; writes via **repository methods** with optimistic cache + a localStorage **outbox** `{id, entity, op, payload, attempts}` drained by a flusher; attachment binaries staged in IndexedDB (not queued). Conflicts = last-write-wins on `updated_at`. `LocalRepository` mirrors the interface for demo/tester (no network).
- Surfaces depend only on `Repository` via a **mode factory** (task 3.6: authed→ApiRepository, demo/tester→LocalRepository).

## 🔑 The auth gate (the real dependency for a LIVE round-trip)
A real authenticated call must carry a bearer token the 2.6 middleware (`requireApiAuth`) can validate — **either a Supabase JWT (bridge) or an Entra token**. The frontend authenticates with **Supabase today** (Entra/MSAL is Phase I, unbuilt). So the slice uses the **Supabase bridge path**, which needs two things — a founder/config decision:
1. Set **`SUPABASE_URL`** + **`SUPABASE_PUBLISHABLE_KEY`** as App Service app settings (currently NOT set — the middleware's Supabase path throws without them). Non-secret publishable key; safe as app settings.
2. `api-repo` sends the current Supabase session's **access token** as `Authorization: Bearer <token>` to the Azure API server functions.
Then `requireApiAuth` verifies it, resolves/creates the internal `users` row (2.6), and the server function is scoped by that internal id.

**Decision to confirm:** proceed via the Supabase bridge for the slice (fast; reuses the live login) vs wait for Entra/MSAL (Phase I). Recommendation: **Supabase bridge** — it's exactly what 2.6 was built for, and it lets the round-trip work against the existing login now.

## The slice: Profile read + upsert (smallest full-stack proof)
Chosen because it exercises the whole stack — auth → user resolution → one per-user row (`profiles`) → PG — without needing a pregnancy to exist first.

Files to add (all additive):
- `src/lib/azure/profile.functions.ts` — two TanStack Start server functions using `requireApiAuth` + `getAzurePgPool()`:
  - `getProfile()` → `SELECT ... FROM profiles WHERE user_id = <ctx.userId>` → map to `Profile | null`.
  - `upsertProfile(patch)` → `INSERT ... ON CONFLICT (user_id) DO UPDATE ...` scoped to `ctx.userId`, zod-validate `patch`, return `Profile`.
- `src/lib/data/api-repo.ts` — `ApiRepository implements Repository`; `getProfile`/`upsertProfile` call the server fns; the rest can `throw new Error("not yet implemented")` until their slices land (keeps the interface honest).
- `src/lib/data/hooks.ts` (partial) — `useProfile()` (TanStack Query) + `useUpsertProfile()` (mutation, optimistic, invalidates `[/, "profile"]`).

**Acceptance (verify on the live Azure app, via a gated deploy):**
1. A signed-in user loads a screen wired to `useProfile()`; it round-trips **Supabase-token → Azure API → PG** and returns their row (or null → then upsert creates it). This is the first true end-to-end DB proof.
2. Editing the profile persists to Azure PG and survives reload.
3. A second user cannot read/write the first user's profile (API-level scoping; no RLS).
4. `AZURE_PG_URL` (Key Vault ref) resolves at runtime (already green) and the pool connects (PG "Allow Azure services" already on).

## §Payload — the one design area to confirm before wiring *writes*
`entries.payload` is JSON; `domain/types.ts` proposes an `EntryPayload` union mirroring the current V1 capture shapes (so the 5.8 backfill maps cleanly). Confirm/adjust this union with the capture-panel needs before building the entries slice; the API zod-validates per `type` on write regardless.

## Sequence after the slice
Profile slice → **entries** slice (the core: create + list + soft-delete, the payload union confirmed) → 3.3 outbox + IndexedDB → 3.4 attachments/EXIF (targets the 2.7 keyless blob helper) → 3.5 LocalRepository → 3.6 mode factory → 3.9–3.13 **cut over each surface** off `store.ts`/`sync.ts` onto the repository (home, timeline, capture, settings) → then the founder-gated **3.8 cutover** (bulk data migration + hosting flip). Each ships code → gated deploy → verify.
