# A5 screen cutover — build notes & the one remaining decision (12 Sep 2026)

Companion to `A5-SCREEN-CUTOVER-PLAN.md`. That plan listed the model-mapping
decisions; the founder settled all of them live on 12 Sep (DECISIONS-LOG). This
note records **what has been built**, **the mechanical mappings now resolved**,
and **the single genuine product/clinical decision that gates the live-surface
cutover** — surfaced rather than improvised, because it sets the semantics of a
DTAC health record.

Branch: `a5-screen-cutover-2026-09-12` (off labour-archive tip `b491619`).
Everything here is BRANCH-ONLY, behind flags, no push/deploy/DNS. Live
`bumpnotes.co.uk` is untouched (still Cloudflare Pages + Supabase).

---

## 1. Decisions settled (founder, 12 Sep — DECISIONS-LOG)

- **D1** labour/contraction: archived, not in launch (done earlier, branch
  `bumpnotes-archive-labour-2026-09-12`). triagePhone/labourWardPhone: **leave on
  the live V1 profile until A5 drops them** (no live-prod change now).
- **D2** People: old `person` entries + profile care contacts (midwife / GP /
  consultant / hospital / birth partner) → **People** rows; the "who I saw"
  capture writes a People row (+ an `appointment` entry referencing it).
- **D3** Profile↔Pregnancy: on first cutover create one active Pregnancy from the
  due date; `userName`→`displayName`, `babyNickname`→`Pregnancy.nickname`.
- **D4** legacy types: fold `concern`→`question`; drop legacy `labour`.

## 2. Built this session (green: `tsc --noEmit` 0, `lint` 0 errors, `build` ok)

1. **`src/lib/data/entry-adapter.ts`** — the pure core the whole cutover rides on:
   - `storeEntryFromV2()` — V2 `Entry` → old store `Entry` for rendering in the
     proven panels/timeline (all 7 V2 types; `upload`→`photo` metadata, binary
     resolved separately via `getAttachmentUrl`).
   - `createInputFromCapture()` — old-shape capture draft → V2 `CreateEntryInput`;
     encodes D4 (`concern`→`question`).
   - D2 (person→People) and photo→attachment are intentionally at the surface
     layer (they are cross-entity — need `listPeople()`/`getAttachmentUrl` in
     scope), documented in the file header.
2. **eslint baseline restored** — the 2 pre-existing prettier errors in
   `domain/types.ts` (from Phase 3A) fixed so A5 commits land green (WORK.md §7).

The data layer this builds on (A1–A4: `repository.ts`, `api-repo.ts`,
`local-repo.ts`, `hooks.ts`, `repository-context.tsx`, attachments) was already
complete and is confirmed present + type-consistent with the adapter.

## 3. THE decision that gates the live-surface cutover: append-only vs mutable entries

**What it is.** Migration 002 declares entries *"Append-only with soft delete"*
and the `Repository` interface exposes **only `createEntry` + `softDeleteEntry`,
no update**. But the `entries` table is **not** trigger-immutable (only
`audit_events` and `summaries` are) — so the DB *permits* updates; the contract
just doesn't. The old V1 app, by contrast, edits entries in place:
- **Symptom capture** creates on the first chip tap, then *patches* severity /
  quantifier / note live (instant-save-then-enrich, with a 5.2s undo strip).
- **`EntryEditDialog`** edits a past entry's fields.
- **Question "answered"** toggles a stored entry later.

So "cut the panels onto the repository" forces a choice the founder should make,
because it defines the record's semantics on a DTAC product (audit/provenance,
and likely a Hazard-Log entry):

- **Option A — keep entries append-only (recommended).** No entry-mutation API on
  the health DB (a security + audit win; matches the schema's stated intent).
  Adapt the few edit affordances:
  - Symptom → **compose-then-save** (collect fields, one `createEntry` on done).
    Minor UX change; still one-screen-fast. Undo becomes post-save soft-delete.
  - Question answered / `EntryEditDialog` → either a lightweight **soft-delete +
    re-add** ("correct" = new immutable fact), or defer these edit features to a
    later packet. They are not on the capture critical path.
- **Option B — add `updateEntry` to the contract.** Preserves the V1 edit UX
  exactly. Cost: a new owner-scoped, zod-validated, audited server function that
  **mutates health entries in place** — more surface area on the riskiest data,
  and against the append-only intent. (Mechanically small: mirrors the existing
  `softDeleteEntry` UPDATE pattern in `entry.functions.ts`.)

**Recommendation: Option A** — append-only is the stronger clinical-record
posture; the UX cost is small and contained to the symptom panel + two deferrable
edit features. Awaiting the founder's ruling before cutting live surfaces.

## 4. Surface cutover plan (execution-grade; unblocks once §3 is ruled)

Coupling that shapes the order: the capture **Panels are shared** between `/demo`
and the live `/` home. So panels must be made repository-aware **and** the home's
read source switched **together** — a half-cut (demo on repo, home on store, one
shared Panels) would either break the live home or need a two-writer bridge. Cut
per-coherent-surface, not per-panel. Each step green + deployable (WORK.md §7):

1. **Panels → repository writes** (create-only per §3-A): each panel builds a
   `CaptureDraft` → `createInputFromCapture` → `useCreateEntry`. Symptom reworked
   to compose-then-save. Photo → `useCreateEntry(upload)` + `useUploadAttachment`
   (EXIF-strip already in `lib/data/attachments.ts` — verify it fires). People
   panel → `useUpsertPerson` (+ optional appointment entry) per D2.
2. **`/demo` route** → `<RepositoryProvider mode="demo">` + read via `useEntries`
   + `storeEntryFromV2`; ThisWeekCard/timeline off the adapter. Safest first live
   cut (LocalRepository, zero real-data risk).
3. **`/` home + `/timeline`** → same provider (mode `api` for authed; `tester`
   under the tester flag) + adapter reads. This is where D2's appointment↔person
   join renders (name from `listPeople()`).
4. **`/settings` + `/onboarding`** → `useProfile`/`usePreferences`/`useHealthItems`
   + People; onboarding creates the Profile + one active Pregnancy from the due
   date (D3). GDPR export/delete buttons wire here (backend already built).
5. **Retire** old `store`/`sync`/`useAppState` + `@supabase/*` reads once every
   surface is off them (plan 3.12). Drop triagePhone/labourWardPhone here (D1).

Then, separately and later (identity + hosting), per the cutover runbook:
`/signin` Supabase→Entra (B1/B2), portal confirms, and the domain cutover LAST.

## 5. Guardrails honoured

Branch-only; no push/deploy/DNS; applied migrations untouched (adapter + note are
additive files only); no health data in logs; EXIF-strip preserved (to re-verify
when the photo panel is cut); the append-only decision surfaced, not improvised.

## 6. STATUS — A5 screen cutover COMPLETE (2026-09-12, end of session)

Founder ruled **append-only** ("uk compliant then easy", DECISIONS-LOG). Every
app surface is now cut onto the V2 repository via the adapter and **verified in
tester mode** (against the production build, `node .output/server`): onboarding →
home → capture → timeline, plus details, pack (summary), settings. Branch
`a5-screen-cutover-2026-09-12`, 7 commits, **unpushed** (founder-gated), green at
every commit (`tsc`/`lint`/`build`).

Append-only consequences applied (all defensible; flag for founder awareness):
- **Symptom capture → compose-then-save** in repository mode (create-once on
  Save; still one-screen-fast). Legacy instant-save-then-enrich kept only on the
  now-unused store path.
- **In-place entry Edit deferred** (timeline + pack review): delete-and-re-add is
  the correction path. `EntryEditDialog` is now unimported (dead; delete at retire).
- **Recently-deleted / restore / hard-delete removed** from settings (append-only
  has no un-delete); the old store-based full "delete pregnancy record" is gone —
  permanent deletion = account deletion (GDPR-2, wired).
- **Photo/person attachments: images only** in repository mode for now (non-image
  uploads = a follow-up); timeline shows an "upload ready" placeholder rather than
  a blob thumbnail (attachment-URL thumbnails = a follow-up).

`updatePregnancy` was added (repository + server fn + local-repo + hook) so the
due date / nickname can be corrected — a pregnancy-episode edit, explicitly NOT
the append-only-covered health entries.

**How it stays safe / how it goes live:** the switch is inert on the deployed
site until this branch is deployed at the gated cutover. Authed users use the
ApiRepository (Supabase-bridge auth, 2.6) — launch-fresh, so they land in
onboarding with an empty Azure record, by design.

### Remaining tail (NOT A5 screen-wiring — sequenced with identity/GDPR/retire)
1. `auth.tsx` still reads the store (identity signal) — folds into B1/B2 (Entra
   sign-in flip). Cosmetic staleness only until then.
2. Full retirement: delete `store.ts` / `sync.ts` / `EntryEditDialog` / the store
   path in `Panels.tsx` + `@supabase/*` reads — plan 3.12, after cutover.
3. GDPR-3/4 (consent capture, retention) — governance decision first.
4. Follow-ups: non-image attachment uploads; timeline attachment thumbnails;
   optional demo-mode banner (was tied to the retired store demo flag).

---
*Document read: ☐ Lizzie — not yet. (Tick to ☑ with the date, or tell any session "read A5-BUILD-NOTES", and it gets recorded.)*
