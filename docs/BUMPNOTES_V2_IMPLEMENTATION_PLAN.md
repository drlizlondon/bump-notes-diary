# BumpNotes V2 — Engineering Implementation Plan

**Status:** Executable blueprint for migrating the current Lovable-generated codebase to the V2 architecture
**Source of truth for product decisions:** `docs/BUMPNOTES_V2_ARCHITECTURE.md` (referenced below as "ARCH §n")
**Intended executor:** Claude Sonnet, working phase by phase. Every decision needed to implement is made in this document; where a judgement call was possible, it has been made and marked **DECISION**.
**Date:** 10 July 2026 · Audited at commit `9602e2b` on `staging`

---

# 1. Executive Summary

## Current state

- **Stack:** TanStack Start (React 19, Vite 7, Tailwind 4, TanStack Router file routes), Supabase (auth + Postgres), jsPDF client-side, GA4 analytics, deployed from a Lovable-generated scaffold (`@lovable.dev/vite-tanstack-config`).
- **State model:** a single in-memory singleton store (`src/lib/bumpnotes/store.ts`, `useSyncExternalStore`) holding `AppState = { profile, entries[], labourPlan }`, persisted whole to `localStorage["bumpnotes:v1"]`, and synced whole (debounced 1.2 s, last-write-wins) to one JSONB row per user in `bumpnotes_state` (`src/lib/bumpnotes/sync.ts`).
- **Files/photos:** base64 `dataUrl` strings embedded inside entries inside the blob. Supabase Storage is not used anywhere.
- **Summaries:** built on the fly (`pregnancy-summary.ts`), previewed (`PregnancySummaryPreview.tsx`), exported via jsPDF (`pdf.ts`) or plain text. Never persisted. Week-picker + category-toggle + preview 3-step flow in `routes/pack.tsx`.
- **About Me:** one flat 10-field form (`routes/details.tsx`) writing directly to `Profile`.
- **Labour:** a substantial sub-product (`routes/labour.tsx`, 433 lines: birth plan, hospital bag, contraction timer, labour mode, episodes) plus 4 entry types and `LabourPlan` in the schema.
- **Side systems:** demo mode (sessionStorage store swap), tester mode (access codes, sessions, feedback tables), admin dashboard (role-gated server functions using service role), marketing pages, single-locale i18n dictionary (729 lines).
- **No AI features. No edge functions. No summary history. No multi-pregnancy support.**

## Target state

Per ARCH: normalized per-entity Postgres schema with a first-class `pregnancies` entity; attachments in Supabase Storage; visibility tiers on entries; a five-card About Me (including My Preferences); 7-step onboarding (account after pregnancy); single summary flow (date range → generate → review → share); summaries as immutable snapshots that join the record; V2 PDF (page-1 Summary Sheet + date-scoped appendix); all labour features removed; core principle enforced structurally (no interpretation anywhere, zero model calls in the snapshot→PDF pipeline).

## Major architectural changes

1. **Blob → normalized tables.** `bumpnotes_state` is retired as the live store (retained read-only as archive during a verification window). New tables: `pregnancies`, `entries`, `people`, `health_items`, `previous_pregnancy_notes`, `preferences`, `summaries`, `attachments`.
2. **Base64 → Supabase Storage.** Two private buckets (`attachments`, `summary-pdfs`) with per-user path RLS.
3. **Whole-blob sync → repository layer + outbox.** Typed repositories per entity; optimistic writes with a localStorage outbox for offline capture; TanStack Query (already a dependency, barely used) becomes the read layer. A `LocalRepository` implementation backs demo and tester modes so the sandbox concept survives without the blob.
4. **Summary becomes an artifact.** Generation produces a frozen snapshot row + a stored PDF; the review screen renders the snapshot; timeline shows summary events.
5. **Full rewrites** (safer than refactor — see §4.9): onboarding, About Me, summary flow, summary document renderer, PDF layout, store/sync layer. **Refactors:** capture panels, timeline, settings, home. **Deletions:** everything labour, plus substantial Lovable dead code.

## Biggest technical risks

1. **The blob→tables data migration** (user data, photos, multi-device timing). Mitigated by lazy per-user migration with verification counts, retained read-only blob, and dual-read fallback (§5.8, §9).
2. **Losing offline capture.** The current blob store works offline by accident. The outbox pattern (§4.6) must ship in the same phase as the repository cutover, not later.
3. **The cutover phase (Phase 3)** touches every data-reading component at once. Contained by making the repository API mimic the current store's read shapes first, then migrating screens one at a time within the phase.
4. **Demo/tester/admin side systems** silently depend on the blob store; they break invisibly if forgotten (§2.16, Phase 8).

---

# 2. Repository Audit

Every path relative to repo root. "Complexity" = engineering effort/risk of reaching target (LOW/MED/HIGH).

## 2.1 Routing

- **Current:** TanStack Router file routes in `src/routes/`: `__root`, `index` (home), `welcome` (landing), `onboarding`, `auth`, `auth.callback`, `signin`, `reset-password`, `timeline`, `pack` (summary), `details` (About Me), `labour`, `settings`, `demo`, `tester`, `admin`, `contact`, `terms`, `privacy`, `features`, `our-story`. `routeTree.gen.ts` is generated.
- **Target:** same system. `/pack` → `/summary` (with redirect route), `/details` → `/about-me` (with redirect route), `/labour` deleted, new `/summary/history` (My Summaries list; the review screen is a step inside `/summary`, not a route).
- **Complexity:** LOW. **Dependencies:** none.

## 2.2 Onboarding

- **Current:** `routes/onboarding.tsx` + `components/bumpnotes/Onboarding.tsx` — 3 steps (name → baby nickname → due date), writes a `Profile` with `onboarded: true`, then navigates to `/auth` if signed out. Redirect logic lives in `routes/index.tsx` (waits for sync status before deciding — a symptom of blob hydration racing).
- **Target (ARCH §4.1):** 7 steps — welcome → create pregnancy → EDD (required; LMP alternative computing an editable EDD) → first pregnancy? (optional; if "no", one deferral line, no data collection) → nickname (optional) → create account → home. Pre-auth answers buffered locally, flushed into `profiles`/`pregnancies` after signup.
- **Complexity:** MED (auth handoff + buffer flush is the fiddly part). **Dependencies:** V2 schema, repository layer.

## 2.3 Home screen

- **Current:** `routes/index.tsx` — greeting header (`HomeHeader.tsx`), "This week" stats card, capture ActionCards (symptom, question, people, measurement, photo, note, feelings) plus a Labour link card, tester feedback button, `PregnancySummaryAside` on desktop.
- **Target (ARCH §4.4):** near-identical. Remove the Labour link card; show next appointment if one is recorded (informational — derived from the most recent future-dated appointment entry; no countdown styling); keep Generate Summary CTA (aside + nav). Capture panels persist through repositories.
- **Complexity:** LOW–MED (data source swap dominates). **Dependencies:** repository layer.

## 2.4 Journal (Record / capture)

- **Current:** `components/bumpnotes/Panels.tsx` (555 lines) — one panel body per entry type, writing via `store.addEntry`. Feelings hard-coded `privateOnly: true`. `saveAsQuestion` flag on symptoms creates cross-type linkage. Photos read as base64 into `dataUrl`.
- **Target (ARCH §3.6, §5.3):** same UX. Writes go to `entries` via repository; every entry gets a `visibility` tier (`private` default for feelings, `personal` for notes, `shareable` otherwise) settable at capture; photo/file capture uploads to Storage and stores an `attachment_id`; "save as question" creates a second `question` entry (two rows, no flag); People & Care panel gains a person picker backed by the `people` table (free-text fallback preserved).
- **Complexity:** MED. **Dependencies:** schema, repositories, Storage.

## 2.5 Timeline

- **Current:** `routes/timeline.tsx` (401 lines) — groups by gestation week+day, search, type filters, edit/soft-delete, labour-episode cards, inline base64 image rendering.
- **Target (ARCH §3.6):** keep. Remove labour filter + `LabourEpisodeCard`; render attachments from Storage (signed URLs); add summary events (from `summaries` table, tappable to the archived PDF); reads via repository.
- **Complexity:** MED. **Dependencies:** repositories, summaries table.

## 2.6 About Me

- **Current:** `routes/details.tsx` — flat form: name, nickname, EDD, hospital, midwife, consultant, GP, birth partner, triage phone, labour ward phone. All strings on `Profile`.
- **Target (ARCH §3.2–3.5):** full rewrite as five optional prompt-to-summary cards: Personal Details (`profiles` + health identifier), My Health (`health_items`), My Pregnancy (`pregnancies` + care team via `people`), Previous Pregnancies (`previous_pregnancy_notes`, incl. the bereavement-aware counts flow), My Preferences (`preferences`, incl. "anything else" free text). No completion percentages.
- **Complexity:** HIGH (most new UI in the project). **Dependencies:** schema, repositories.

## 2.7 Summaries (flow + document model)

- **Current:** `routes/pack.tsx` (537 lines) — Step 1 week picker, Step 2 category toggles + preview with per-item hide + record-editing modals, Step 3 preview + copy/share/PDF. Document model in `pregnancy-summary.ts` (361 lines): week-grouped sections with aggregation (symptom counts, feelings "N days this week"). Nothing persisted. Feelings excluded by default via a hard-coded map.
- **Target (ARCH §4.3, §5.4, §6, §7):** full rewrite. Flow: date range (since last summary default / last 4 weeks / whole pregnancy / custom) → generate draft → review (live document; section eye-toggles; entry-level exclusion; tier badges) → share (PDF / show my screen) or keep. Document model: page-1 Summary Sheet (header band, alert strip, preferences, open questions, previous pregnancies, care team) + date-scoped appendix grouped by type. Generation freezes a snapshot row (rendered content copy, range, manifest, `type='standard'`, `layout_version='summary_layout_v2'`) and stores the PDF. My Summaries list + timeline events. Aggregation ("×3", "N days this week") is **dropped** — it is borderline interpretation and the appendix is date-scoped chronology per ARCH §6.2.
- **Complexity:** HIGH (the centrepiece). **Dependencies:** schema, repositories, Storage, PDF v2.

## 2.8 PDF generation

- **Current:** `lib/bumpnotes/pdf.ts` (158 lines) — jsPDF, week-based body mirroring the preview, compressed header, page-numbers + disclaimer footer.
- **Target (ARCH §8):** full rewrite, still client-side jsPDF (**DECISION:** no server rendering — no server PDF infra exists, determinism is achievable client-side, and the snapshot is the contract; revisit only if fonts/layout demand it). Input is the frozen snapshot object only (structurally enforcing "zero model calls / no live data"). Page-1 sheet always one page; every page self-sufficient (name, DOB, gestation, page X/Y, provenance footer); B&W-safe; her words visually distinct (bold/size, since jsPDF ships Helvetica only — no new fonts in this migration); attachments as thumbnail index; EXIF never embedded (thumbnails are re-encoded via canvas, which strips it).
- **Complexity:** MED–HIGH. **Dependencies:** snapshot model.

## 2.9 Authentication

- **Current:** Supabase email/password + OAuth (`auth.tsx`, `signin.tsx`, `auth.callback.tsx`, `reset-password.tsx`, `supabase-auth-redirect.ts`, auth-attacher/middleware for server functions). RLS blocks anonymous JWTs. Account deletion via `deleteOwnAccount` server function.
- **Target:** unchanged mechanics. Onboarding reorder means signup happens at step 6 with a local buffer flush. `deleteOwnAccount` must delete V2 tables + Storage objects (§7.4).
- **Complexity:** LOW. **Dependencies:** onboarding V2.

## 2.10 Supabase (schema)

- **Current tables:** `bumpnotes_state` (the blob), `profiles` (tester flag, ToS timestamps, display_name), `contact_messages`, `feedback_submissions`, `feedback_responses`, `tester_access_codes`, `tester_sessions`, `user_roles` (+ `has_role`). All with sane RLS. Anonymous-JWT writes blocked.
- **Target:** §5 in full.
- **Complexity:** HIGH (migration + backfill). **Dependencies:** none (additive first).

## 2.11 Storage

- **Current:** none (base64 in blob; localStorage for auth token).
- **Target:** buckets `attachments` (private; path `userId/pregnancyId/entryId/filename`) and `summary-pdfs` (private; path `userId/pregnancyId/summaryId.pdf`); RLS by first path segment = `auth.uid()`; signed URLs for display; size cap 10 MB/object enforced client-side and by bucket config.
- **Complexity:** MED. **Dependencies:** schema.

## 2.12 AI features

- **Current:** none (verified — no model SDKs, no endpoints).
- **Target:** none in V2. Guardrail: ARCH §12.5's fence is recorded here as an engineering rule — the summary/PDF modules must not import any network client other than Supabase Storage for persisting the already-rendered artifact.
- **Complexity:** —.

## 2.13 Settings

- **Current:** `routes/settings.tsx` — account (sign out / tester exit), view stored info, JSON export (blob dump), delete pregnancy record, delete account, recently-deleted restore (30-day soft delete), privacy links.
- **Target:** same surface, V2 data. Export = full JSON of all V2 entities **plus** all stored PDFs (zip or sequential downloads — **DECISION:** sequential downloads; no new zip dependency) **plus** the legacy blob if present. Delete flows cover V2 tables + Storage + blob. Recently-deleted reads `entries.deleted_at`.
- **Complexity:** MED. **Dependencies:** repositories.

## 2.14 Reusable components

- **Current:** `components/ui/` — ~50 shadcn components; **only `popover` and `calendar` are imported by app code** (plus their internal `button` dependency chain — verify at deletion time). `components/bumpnotes/` — 17 components; `BottomNav.tsx` and `SilhouetteIllustration.tsx` are dead (defined, never imported).
- **Target:** prune `components/ui` to actually-imported set; delete dead bumpnotes components; new components per §6 phases.
- **Complexity:** LOW. **Dependencies:** none.

## 2.15 Shared state

- **Current:** singleton store + blob sync (§1). TanStack Query installed but used only as boilerplate context. Demo mode = sessionStorage store swap; tester mode = localStorage flag gating a local-only sandbox.
- **Target:** repository layer (§4.6): `Repository` interface with `SupabaseRepository` (authed users; TanStack Query cache + outbox) and `LocalRepository` (demo, tester; in-memory/sessionStorage). `store.ts`/`sync.ts` deleted at end of Phase 3.
- **Complexity:** HIGH (the load-bearing change). **Dependencies:** schema.

## 2.16 Navigation & side systems

- **Current nav:** `AppShell.tsx` (mobile top bar + desktop sidebar; `useNavItems`: Home, Timeline, Summary, Labour, Baby/details, Settings).
- **Target nav:** Home, Timeline, Summary, About Me, Settings (Labour removed; "Baby" label → "About Me").
- **Side systems to preserve:** tester mode + feedback (tables, modals, server functions), admin dashboard (`admin.tsx`, `admin.functions.ts` — update its `bumpnotes_state` references), demo mode (rebuild `demo-dashboard.ts`/`demo-summary.ts` fixtures in V2 shapes), analytics (`lib/analytics.ts` — keep; adjust event names where flows change), i18n dictionary (keep; prune labour keys, add V2 keys), marketing pages (keep; refresh copy referencing removed features — `features.tsx` mentions labour).
- **Complexity:** MED (breadth, not depth).

---

# 3. Feature Migration Matrix

Classification of every existing feature. REPLACE = same job, new implementation; MODIFY = incremental change; KEEP = untouched (verify only).

| # | Feature | Where | Verdict | Reason |
|---|---|---|---|---|
| 1 | Home capture panels (7 types) | `Panels.tsx`, `index.tsx` | **MODIFY** | ARCH freezes Record UX; only persistence, tiers, person picker, upload path change. |
| 2 | "This week" stats card | `index.tsx` | **KEEP** | Counting is not interpretation; reads move to repository transparently. |
| 3 | Labour link card on home | `index.tsx` | **REMOVE** | Labour removed (ARCH §10). |
| 4 | Timeline (grouping, search, filters, edit, delete) | `timeline.tsx` | **MODIFY** | Kept per ARCH; labour cards out, summary events + Storage images in. |
| 5 | Labour episode cards on timeline | `timeline.tsx` | **REMOVE** | Labour removed. |
| 6 | About Me flat form | `details.tsx` | **REPLACE** | Five-card model is a different information architecture (ARCH §3.2). |
| 7 | Care contact phone fields | `details.tsx`, `Profile` | **REPLACE** | Data survives on `people.contact_details` (ARCH §10); the fields/screen die. |
| 8 | Onboarding (3-step) | `Onboarding.tsx` | **REPLACE** | 7-step flow, account after pregnancy, first-pregnancy question (ARCH §4.1). |
| 9 | Summary flow (weeks → toggles → create) | `pack.tsx` | **REPLACE** | Date-range → draft → review → share (ARCH §4.3); week-picker and category checklist are the "decide inclusion twice" bug ARCH deletes. |
| 10 | Per-item hide + record-edit modals in summary | `pack.tsx` | **REPLACE** | Survives as entry-level exclusion + tier badges in the review screen (ARCH §7). |
| 11 | Summary text copy/share (navigator.share) | `pack.tsx` | **MODIFY** | Keep as share affordances for the snapshot's text rendering. |
| 12 | Week-aggregated summary document | `pregnancy-summary.ts` | **REPLACE** | Page-1 sheet + type-grouped chronological appendix (ARCH §6.2); aggregation counts dropped (borderline interpretation). |
| 13 | Summary preview component | `PregnancySummaryPreview.tsx` | **REPLACE** | New `SummaryDocument` renders a snapshot; shared by review, show-my-screen, and history. |
| 14 | PDF generation | `pdf.ts` | **REPLACE** | New layout contract `summary_layout_v2` (ARCH §8). |
| 15 | Feelings `privateOnly` | `types.ts`, `pack.tsx` | **REPLACE** | Generalised to three visibility tiers (ARCH §5.3). |
| 16 | `saveAsQuestion` flag | `types.ts`, `Panels.tsx` | **REPLACE** | Same UX; implementation becomes a second `question` entry row. |
| 17 | Birth plan / preferences / partner notes | `labour.tsx` | **REMOVE** | ARCH §10. No data migration (parked feature; blob archive retains it). |
| 18 | Hospital bag checklist | `labour.tsx` | **REMOVE** | ARCH §10. |
| 19 | Important info (parking, childcare…) | `labour.tsx` | **REMOVE** | ARCH §10. |
| 20 | Labour mode + episodes + outcome modal | `labour.tsx`, store | **REMOVE** | ARCH §10. |
| 21 | Contraction timer + quick events | `labour.tsx` | **REMOVE** | ARCH §10 (triage-adjacent, device-boundary risk). |
| 22 | Blob store (`store.ts`) | lib | **REPLACE** | Normalized repositories (§4.6). |
| 23 | Blob sync (`sync.ts`) | lib | **REPLACE** | Per-entity writes + outbox; conflict-prompt hack dies with the blob. |
| 24 | Local JSON export | `settings.tsx` | **MODIFY** | Reworked to export V2 entities + PDFs + legacy blob. |
| 25 | Delete pregnancy record / delete account | `settings.tsx`, `admin.functions.ts` | **MODIFY** | Must cover V2 tables + Storage + blob. |
| 26 | Recently-deleted (30-day restore) | `settings.tsx`, store | **MODIFY** | `deleted_at` on `entries`; purge via repository. |
| 27 | Demo mode (sessionStorage swap) | store, `demo.tsx`, fixtures | **MODIFY** | Survives via `LocalRepository`; fixtures rebuilt in V2 shapes. |
| 28 | Tester mode (codes, sessions, feedback) | `tester*.ts(x)`, tables | **KEEP** | Orthogonal to V2; sandbox retargets to `LocalRepository`. |
| 29 | Admin dashboard + server functions | `admin.tsx`, `admin.functions.ts` | **MODIFY** | Update blob references and deletion paths; otherwise keep. |
| 30 | Feedback button/modal + tables | components, DB | **KEEP** | Orthogonal. |
| 31 | Auth screens + OAuth callback + reset | routes | **KEEP** | Mechanics unchanged; entry point moves to onboarding step 6. |
| 32 | Marketing pages (welcome, features, our-story, contact, terms, privacy) | routes | **MODIFY** (copy only) | Remove labour references; update summary description; `welcome.tsx` demo preview retargets to V2 fixtures. |
| 33 | i18n dictionary | `i18n.ts` | **MODIFY** | Prune `lab.*` keys; add V2 keys; keep `t()` mechanism (ARCH §12.2 readiness). |
| 34 | Analytics + consent | `analytics.ts`, `CookieNotice` | **KEEP** | Add/rename events for new flows only. |
| 35 | Gestation/date helpers | `gestation.ts` | **MODIFY** | Add LMP→EDD arithmetic; otherwise keep (UK date formats stay for now; i18n later per ARCH §12.1). |
| 36 | `summariseEntry` headline builder | `summary.ts` | **MODIFY** | Keep for timeline cards; extend for V2 payloads; drop labour branches. |
| 37 | AppShell / nav / PageHeader | `AppShell.tsx` | **MODIFY** | Nav items list only. |
| 38 | `PregnancySummaryAside` | `AppShell.tsx` | **KEEP** | Matches ARCH home CTA. |
| 39 | `BottomNav.tsx`, `SilhouetteIllustration.tsx` | components | **REMOVE** | Dead code (never imported). |
| 40 | `UndoStrip.tsx` | components | **KEEP** | Used by Panels. |
| 41 | ~48 unused shadcn `components/ui/*` | components | **REMOVE** | Dead weight; keep only imported set + dependency chain. |
| 42 | `lib/api/example.functions.ts` | lib | **REMOVE** | Lovable scaffold sample. |
| 43 | Lovable error reporting | `lovable-error-reporting.ts`, `__root.tsx` | **KEEP** (for now) | Still the deployed error channel; replace only when hosting moves off Lovable — out of scope. |
| 44 | Root meta ("Lovable App", R2 OG images) | `__root.tsx` | **MODIFY** | Brand correctly; real OG image into `public/`. |
| 45 | Dual lockfiles (`bun.lock` + `package-lock.json`) | root | **MODIFY** | **DECISION:** keep `package-lock.json` (npm), delete `bun.lock`, unless CI proves bun-based. |
| 46 | Legacy entry types (`concern`, `labour*`, legacy `appointment`) | `types.ts` | **REMOVE** from V2 model | Migration maps `concern`→`note`, legacy `appointment`→`appointment` payload v2; labour types stay only in the read-only blob archive. |
| 47 | `bumpnotes_state` table | DB | **MODIFY** → archive | Read-only archive during verification window; scheduled deletion after (§5.8). |

Nothing else exists in the repository (routes, components, lib files, and tables enumerated in §2 are exhaustive as of the audit commit).

---

# 4. Lovable Migration Strategy

## 4.1 What Lovable left behind (technical debt inventory)

1. **The blob.** One JSONB row as the entire data model — the central debt; everything in §5–§6 exists to retire it.
2. **Base64 media in state.** Photos inflate localStorage, the network payload of *every* sync, and the DB row; localStorage's ~5 MB quota is a silent data-loss cliff. Highest-urgency debt after the blob itself.
3. **Dead scaffold:** ~48 unused shadcn components, `example.functions.ts`, `BottomNav`, `SilhouetteIllustration`, "Lovable App" root meta, R2-hosted OG image, dual lockfiles.
4. **Copy-paste divergence:** `getEditableText`/edit-dialog duplicated in `timeline.tsx` and `pack.tsx`; nav items duplicated in `AppShell` and dead `BottomNav`; PDF/text/preview each re-implement section rendering (three renderers for one document).
5. **Route-level god files:** `pack.tsx` (537), `labour.tsx` (433), `admin.tsx` (925) hold components, business logic, and text building inline.
6. **Hydration races:** `index.tsx` waits on sync status to route to onboarding — a workaround for whole-blob hydration that disappears with per-entity reads.

## 4.2 Where full rewrite beats incremental refactor

**Rewrite (do not attempt to evolve in place):**
- `store.ts` + `sync.ts` → repository layer. The blob's shape *is* the old product; evolving it means writing migration code for a thing being deleted.
- `pack.tsx` + `pregnancy-summary.ts` + `pdf.ts` + `PregnancySummaryPreview.tsx` → new `src/lib/summary/` + `src/routes/summary.tsx`. The document model (week-aggregated) and the flow (inclusion-first) are both wrong per ARCH; nothing structural survives.
- `details.tsx` → `about-me.tsx`. Flat form → card system shares no code.
- `Onboarding.tsx` → new. Step content, order, and auth position all change.

**Refactor in place:** `Panels.tsx`, `timeline.tsx`, `settings.tsx`, `index.tsx`, `AppShell.tsx` — their UX is explicitly frozen by ARCH; only data plumbing changes.

**Delete:** `labour.tsx` and every labour-only symbol.

## 4.3 Folder structure (target)

```
src/
  lib/
    domain/            # types.ts (V2 entities), gestation.ts, entry-display.ts (ex summary.ts)
    data/              # repository.ts (interface), supabase-repo.ts, local-repo.ts,
                       # outbox.ts, migrate-blob.ts, attachments.ts (upload/signed URLs)
    summary/           # build-snapshot.ts, document-model.ts, render-pdf.ts, render-text.ts
    bumpnotes/         # (dissolved into the above by end of migration; tester/admin/feedback stay)
  components/
    bumpnotes/         # app components (existing pattern kept)
    summary/           # SummaryDocument.tsx, ReviewControls.tsx, section components
    about-me/          # card components
    ui/                # pruned shadcn set
  routes/              # unchanged conventions; /summary, /about-me replace /pack, /details
```

**Naming conventions:** V2 entity types live in `lib/domain/types.ts` and are the only exported entry/profile types (`EntryV2` aliases forbidden — the old names die with the old files). DB columns snake_case, TS camelCase, mapped in the repository only. Route files stay kebab/flat per TanStack convention.

## 4.4 Components to delete / refactor / split

Delete list is §8. Splits:
- `pack.tsx` → route shell + `components/summary/*` + `lib/summary/*` (the one deliberate decomposition; everything else stays route-local until it hurts — simplicity over flexibility).
- `admin.tsx` stays a god file (**DECISION:** admin is internal tooling; not worth decomposition risk in this migration).
- Shared edit dialog: one `EntryEditDialog` in `components/bumpnotes/`, used by timeline (review-screen editing is exclusion-only per ARCH §7, so it needs no editor).

## 4.5 Hooks & contexts

Current custom hooks (`useAppState`, `useSyncSnapshot`, `useDemoMode`, `useTester`, `use-mobile`) are all `useSyncExternalStore`-based; no React contexts exist beyond QueryClient. Target: `useTester` and `use-mobile` keep; `useAppState`/`useSyncSnapshot`/`useDemoMode` are replaced by TanStack Query hooks exported from `lib/data/hooks.ts` (`usePregnancy()`, `useEntries(range?)`, `usePeople()`, `useHealthItems()`, `usePreferences()`, `usePreviousPregnancyNotes()`, `useSummaries()`, `useSession()` (auth + mode: real/demo/tester)). No new context providers — the repository instance is selected by a module-level factory keyed on mode, mirroring today's pattern.

## 4.6 State management (the load-bearing design)

- **Reads:** TanStack Query, keyed `[pregnancyId, entity, params]`, `staleTime` generous (single-writer data), invalidated by writes.
- **Writes:** repository methods with optimistic cache updates. Every mutation is also appended to a localStorage **outbox** (`{id, entity, op, payload, attempts}`); a flusher drains it on regained connectivity/auth. Attachment binaries are **not** queued (size); an entry captured offline with a photo stores the file in an IndexedDB staging area referenced by the queued op. This preserves the current product's accidental-but-real offline capture guarantee (§1 risk 2).
- **Conflicts:** per-row last-write-wins on `updated_at`. Acceptable because entries are effectively single-writer append-only; the blob-era "remote wins + prompt" hack is deleted without replacement.
- **Demo/tester:** `LocalRepository` implements the same interface over sessionStorage(demo)/localStorage(tester) with V2 shapes; no Supabase traffic, satisfying the current sandbox guarantees.

## 4.7 Shared layouts & reusable UI

`AppShell`, `PageHeader`, `PublicShell`, `ActionCard`, `Chip`, `UndoStrip`, `Logo`, `CookieNotice`, feedback/tester components: all keep. The design language (surface-card, tone classes, Fraunces/Instrument Sans) is untouched — this migration changes plumbing and information architecture, not visual identity. Google Fonts stay on route heads (note: the V2 PDF does not use them; jsPDF Helvetica only).

## 4.8 Opportunities to simplify (claimed by this plan)

1. One document renderer (`SummaryDocument` + snapshot) instead of three (preview/text/PDF each rebuilding sections).
2. Delete the sync-status state machine, migration prompt, and hydration-race workarounds (blob-era artifacts).
3. Delete ~48 UI components, 2 dead components, ~120 labour i18n keys, 4 labour entry types, `LabourPlan`, and the `pack.tsx` step machinery.
4. `profiles` table absorbs person-level identity (display name already there; add DOB, preferred name, health identifier, photo) — no new "user profile" concept needed.

## 4.9 Where the Lovable architecture is discarded entirely

The **persistence architecture** (blob store + whole-state sync + base64 media) is discarded, not migrated — only its *data* is migrated (§5.8). The **summary pipeline** (flow, document model, renderers) is discarded. The **component scaffold** (unused shadcn inventory) is discarded. Everything else — framework, routing, auth, styling, side systems — is retained and was a sound foundation.

---

# 5. Database Migration

Strategy only; SQL is written during Phase 2 (§10, tasks 2.x). All new tables get RLS mirroring the existing owner-only pattern **including the existing anonymous-JWT denial**, `GRANT` to `authenticated`/`service_role` only, and `updated_at` touch triggers reusing the existing trigger-function pattern.

## 5.1 Tables to keep unchanged
`contact_messages`, `feedback_submissions`, `feedback_responses`, `tester_access_codes`, `tester_sessions`, `user_roles` (+ `has_role`).

## 5.2 Tables to modify
- **`profiles`** — add: `preferred_name text`, `date_of_birth date`, `health_identifier text`, `health_identifier_label text` (ARCH §12.1; label stored per user, default "NHS number"), `photo_path text` (Storage path), `v2_notice_dismissed_at timestamptz` (one-time migrated-user "what's new" card, ARCH §11.6; server-persisted so dismissal holds across devices). Existing tester/ToS columns keep.
- **`bumpnotes_state`** — becomes archive: revoke client INSERT/UPDATE/DELETE (SELECT stays for owner + service role), add `migrated_at timestamptz`, `migration_checksum jsonb` (per-type counts). No structural change.

## 5.3 New tables (owner-scoped by `user_id` unless noted)

| Table | Key columns (beyond id/user_id/timestamps) | Notes |
|---|---|---|
| `pregnancies` | `edd date NOT NULL`, `lmp date`, `nickname text`, `birth_place text`, `status text CHECK (active/ended) DEFAULT active`, `ended_at` | One `active` per user enforced by partial unique index. |
| `people` | `name text NOT NULL`, `role text NOT NULL` (midwife/gp/consultant/sonographer/birth_partner/hospital/other), `contact_details text`, `archived_at` | Person-level (not pregnancy-scoped) per ARCH §3.3. |
| `health_items` | `kind text CHECK (condition/allergy/medication/operation)`, `text text NOT NULL`, `active bool DEFAULT true` | |
| `previous_pregnancy_notes` | `pregnancy_count int`, `birth_count int`, `prompt_tag text NULL`, `text text`, `sort int` | Counts stored on a single `prompt_tag IS NULL AND text IS NULL` header row? **No — DECISION:** counts live in two columns on a dedicated singleton row per user (`is_header bool`); simpler than a second table. |
| `preferences` | `items jsonb NOT NULL DEFAULT '[]'` (ordered strings), `anything_else text`, singleton per user | Versioning = `updated_at`; full history not required by ARCH (only summaries freeze copies). |
| `entries` | `pregnancy_id FK NOT NULL`, `type text NOT NULL` (symptom/question/appointment/measurement/upload/note/feeling), `type_version int DEFAULT 2`, `occurred_at timestamptz NOT NULL`, `recorded_at timestamptz NOT NULL DEFAULT now()`, `gestation_weeks int`, `gestation_days int`, `visibility text CHECK (private/personal/shareable)`, `payload jsonb NOT NULL`, `person_id FK NULL`, `deleted_at` | Append-only + soft delete. Gestation stored (not derived) so EDD edits don't rewrite history — matches current `weekDay` behaviour. |
| `attachments` | `entry_id FK`, `storage_path text NOT NULL`, `mime text`, `size_bytes int`, `caption text` | Binary lives in Storage only. |
| `summaries` | `pregnancy_id FK NOT NULL`, `type text DEFAULT 'standard'`, `layout_version text DEFAULT 'summary_layout_v2'`, `range_start date`, `range_end date`, `snapshot jsonb NOT NULL` (frozen document model), `manifest jsonb NOT NULL` (included/excluded ids+sections), `pdf_path text`, `shared bool DEFAULT false` | Immutable: RLS grants INSERT/SELECT/DELETE to owner, **no UPDATE policy** (except service role). |

## 5.4 Removed tables
None dropped during the migration window. `bumpnotes_state` is scheduled for drop one full release cycle after Phase 3 ships with clean verification metrics (§5.8, §9).

## 5.5 Relationships
`pregnancies.user_id → auth.users`; `entries.pregnancy_id → pregnancies` (CASCADE); `entries.person_id → people` (SET NULL); `attachments.entry_id → entries` (CASCADE); `summaries.pregnancy_id → pregnancies` (CASCADE). Person-level tables FK to `auth.users` (CASCADE) as today.

## 5.6 Indexes
`entries (pregnancy_id, occurred_at DESC)` — the timeline/summary query; `entries (pregnancy_id, type) WHERE deleted_at IS NULL` — filters + open questions (`payload->>'answered'` filtered in app; volume is per-user tiny); `summaries (pregnancy_id, created_at DESC)`; `people (user_id) WHERE archived_at IS NULL`; `health_items (user_id)`; partial unique `pregnancies (user_id) WHERE status='active'`.

## 5.7 Supabase migration files
One additive migration per Phase-2 task group (schema, RLS, buckets), following the existing timestamped-file convention in `supabase/migrations/`. Regenerate `src/integrations/supabase/types.ts` after each.

## 5.8 Backfill (blob → V2), the critical path

**Mechanism:** lazy, per-user, server-side (TanStack `createServerFn` using the service role, same pattern as `admin.functions.ts`). Trigger: on authed app load, client asks `ensureMigrated()`; server checks `bumpnotes_state.migrated_at IS NULL AND state != '{}'` and no `pregnancies` row → runs migration in one transaction (Storage uploads first, then rows; on any failure, rows roll back and orphaned Storage objects are re-uploaded idempotently next attempt — paths are deterministic).

**Mapping:**

| Blob field | Target |
|---|---|
| `profile.userName` | `profiles.display_name` (only if empty) |
| `profile.babyNickname`, `dueDateISO` | new `pregnancies` row (status `active`) |
| `profile.hospital` (+ `triagePhone`, `labourWardPhone`) | `people` row, role `hospital`, phones concatenated into `contact_details` labelled "Triage: … · Labour ward: …" |
| `profile.midwife` / `consultant` / `gp` / `birthPartner` | one `people` row each (role accordingly); skipped if blank |
| `entries[type=symptom]` | `entries` type `symptom`, payload `{symptom, severity, quantifier, clarification, location, note}`, visibility `shareable`; embedded `dataUrl` → Storage + `attachments` row |
| `entries[type=question]` | type `question`, payload `{text, context, answered}` |
| `entries[type=person\|appointment]` | type `appointment`, payload `{kind?, whoSeen/name, role, discussed, advised/advice, followUp, note}`, `person_id NULL` (no fuzzy person-matching — historical text stays text) |
| `entries[type=measurement]` | type `measurement`, payload as-is |
| `entries[type=photo]` | type `upload`, `dataUrl` decoded → Storage object + `attachments` row, payload `{tag, note}` |
| `entries[type=note]` | type `note`, visibility `personal` |
| `entries[type=concern]` | type `note`, text = `concern` (+ ` — note`), visibility `personal` |
| `entries[type=feeling]` | type `feeling`, visibility `private` |
| `entries[type=labour\|labour_event\|contraction]`, `labourPlan` | **not migrated** — remain in the read-only blob archive; included in data export; deleted with the archive |
| `createdAt` | both `occurred_at` and `recorded_at` (blob never distinguished) |
| `weekDay` | `gestation_weeks/days` |
| `deletedAt` | `deleted_at` |

**Verification:** per-type counts (blob vs inserted, minus labour types) written to `migration_checksum`; mismatch → transaction aborts, `migrated_at` stays NULL, client falls back to **read-only blob mode** (banner: "We're upgrading your record — capture is paused, nothing is lost") and the failure is surfaced in the admin dashboard. No partial migrations can be observed.

**Ordering guarantee:** repositories refuse writes until `ensureMigrated()` resolves for users with an unmigrated blob (prevents a V2 write racing the backfill).

---

# 6. Frontend Migration (phases)

Each phase ends green: `npm run build` + `npm run lint` pass, app deployable, all user data intact. Phases are ordered so no screen is ever broken on `staging`.

- **Phase 0 — Hygiene** (no behaviour change): delete dead code (§8 group A), fix root meta/branding, single lockfile, extract shared `EntryEditDialog`. *Objective: shrink the surface every later diff touches.*
- **Phase 1 — Labour removal** (pure deletion, blob still live): remove route, nav item, home card, timeline episode UI, i18n keys, `features.tsx` copy. Store keeps reading old blobs safely (unknown entry types already fall through switches — verify). *Objective: V2 scope only, before the expensive work.*
- **Phase 2 — Schema + Storage** (additive; app unchanged): migrations for §5.2–5.6, buckets + policies, regenerate DB types. *Objective: target exists in production, unused.*
- **Phase 3 — Data layer + cutover** (the big one): repository interface + Supabase/Local implementations + outbox + hooks; `ensureMigrated()` server function + backfill + read-only fallback mode; then migrate screens in-phase in this order: capture panels → home → timeline → settings; delete `store.ts`/`sync.ts`/blob types last. Demo/tester fixtures rebuilt here (they block deleting the old store). *Objective: V2 persistence is the only persistence.*
- **Phase 4 — Onboarding V2**: 7 steps, LMP alternative, pre-auth buffer → post-signup flush, welcome-page CTA rewiring, analytics events. *Objective: new users are born on V2 shapes.*
- **Phase 5 — About Me V2**: `/about-me` (redirect from `/details`), five cards, People management UI, previous-pregnancies flow with the ARCH §3.4 sensitivity rules, My Preferences with placeholder examples (ARCH §3.5 copy is flagship work — copy strings reviewed by Liz before merge), one-time migrated-user "what's new" card on Home (ARCH §11.6 — ships here, not in Phase 3, because it links to About Me and must never point at the old `/details` form). *Objective: the V2 state model has its UI.*
- **Phase 6 — Summary V2**: `lib/summary/` (document model, snapshot builder), `/summary` flow (range → draft → review → share/keep), snapshot persistence, My Summaries, timeline summary events, `/pack` redirect. Old summary files deleted at phase end. *Objective: the centrepiece ships.*
- **Phase 7 — PDF V2**: `render-pdf.ts` from snapshot only; page-1 contract; store PDF to `summary-pdfs`; "show my screen" full-screen render. *Objective: the shareable artifact matches ARCH §8.*
- **Phase 8 — Closeout**: settings export V2 (entities + PDFs + legacy blob), deletion paths cover Storage, admin dashboard updated, marketing copy pass, i18n prune, analytics event audit, delete anything in §8 not yet gone. *Objective: no V1 residue outside the archive table.*

Merge-conflict minimisation: phases touch disjoint file sets except Phase 3 (which is why it deletes the old store *last*, after all its consumers moved). Within Phase 3, one screen per PR.

---

# 7. Backend Migration

- **Summaries:** no server compute. Snapshot built client-side from the review state, inserted via repository; immutability enforced by absent UPDATE policy. "Generate again with the same choices" = client reads old manifest/range, re-runs the draft builder against live data, new row.
- **PDF:** client-side jsPDF (decision in §2.8); output uploaded to `summary-pdfs` after generation; download uses the local bytes, history uses signed URLs. If upload fails (offline), `pdf_path` stays NULL and a retry runs from the outbox — the snapshot row is the source of truth and can re-render an identical PDF (determinism requirement, ARCH §8).
- **Storage:** two private buckets + path-prefix RLS (§2.11); signed URLs (1 h) via a thin `attachments.ts` helper; EXIF stripped at capture via canvas re-encode; 10 MB cap.
- **Authentication:** unchanged. `deleteOwnAccount` extended: delete Storage prefixes (`attachments/{uid}`, `summary-pdfs/{uid}`), V2 rows (CASCADE from `auth.users` covers tables; verify FKs), blob row — in that order.
- **APIs / server functions:** add `ensureMigrated` (+ `migrateUserBlob` internals) and an admin `remigrateUser`/`migrationStatus` pair surfaced in `admin.tsx`. Existing tester/feedback/admin functions keep; `admin.functions.ts` references to `bumpnotes_state` updated to V2 tables for stats and deletion.
- **Edge functions:** none today, none added.
- **AI integration:** none. Engineering rule restated: `lib/summary/**` imports no network client except the Storage upload helper; enforce with an ESLint `no-restricted-imports` rule on that directory so the ARCH §12.5 fence is lint-checked, not just policy.

---

# 8. Components to Remove

**Group A — dead code (Phase 0):**
`src/components/bumpnotes/BottomNav.tsx` · `src/components/bumpnotes/SilhouetteIllustration.tsx` · `src/lib/api/example.functions.ts` · every `src/components/ui/*` not in the verified import closure (audit found only `popover.tsx`, `calendar.tsx` + their internal deps `button.tsx` used — re-verify with a script at execution time) · `bun.lock` · Lovable OG/meta strings in `__root.tsx`.

**Group B — labour (Phase 1):**
`src/routes/labour.tsx` · Labour nav item in `AppShell.tsx` (`useNavItems`) · `LabourLinkCard` in `routes/index.tsx` · `LabourEpisodeCard`, labour filter, episode grouping in `routes/timeline.tsx` · labour branches in `lib/bumpnotes/summary.ts` and `pregnancy-summary.ts`/`pdf.ts` (until those files die in Phase 6) · `hasLabourData` in `PregnancySummaryPreview.tsx` · all `lab.*` and labour-related `sum.*`/`cap.*` i18n keys · labour copy in `routes/features.tsx` · store labour methods (`getLabourPlan`, `updateLabourPlan`, `setBag`, `startLabourRecording`, `endLabourRecording`, `defaultBag`).

**Group C — blob architecture (end of Phase 3):**
`src/lib/bumpnotes/store.ts` · `src/lib/bumpnotes/sync.ts` · `src/lib/bumpnotes/types.ts` (superseded by `lib/domain/types.ts`) · migration-prompt UI wherever rendered · `SyncBadge` in `settings.tsx` if unused after cutover · localStorage key `bumpnotes:v1` (left in place, no longer read — cleared on sign-out/deletion).

**Group D — V1 summary pipeline (end of Phase 6):**
`src/routes/pack.tsx` (route becomes redirect) · `src/lib/bumpnotes/pregnancy-summary.ts` · `src/lib/bumpnotes/pdf.ts` · `src/components/bumpnotes/PregnancySummaryPreview.tsx` · `src/lib/bumpnotes/demo-summary.ts`, `demo-dashboard.ts` (replaced by V2 fixtures in Phase 3/8).

**Group E — V1 About Me (end of Phase 5):**
`src/routes/details.tsx` (route becomes redirect) · `Profile` phone/care-team fields (die with Group C types).

**Database (deferred, post-verification window):** `bumpnotes_state` drop + its trigger/function — a standalone migration executed only after §11's archive-retirement criteria are met.

---

# 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Backfill bug corrupts/loses user data** | Med | Critical | Transactional per-user migration; count checksums; blob untouched & re-runnable; read-only fallback mode; admin remigrate tool; migrate the team's own accounts first (staging cohort) before enabling for all. |
| **localStorage blob exceeds quota before user migrates** (base64 photos) | Low–Med | High | Phase 3 is the fix; until then no change (risk exists today). Prioritise Phases 2–3 over 4–5 if timeline pressure appears. |
| **Offline capture regression** | Med | High (core promise) | Outbox ships inside Phase 3, with an explicit manual test (airplane-mode capture → reconnect → row lands) in the phase's DoD. |
| **Multi-device race during lazy migration** (two devices, one migrates while other holds old blob in memory) | Low | Med | Blob writes are revoked at Phase 2 (archive lock); an unmigrated old client's sync push fails visibly (`error` status) rather than corrupting; sessions refresh into V2 on next load. Accepted. |
| **Summary snapshot schema churn** (jsonb, no DB validation) | Med | Med | `snapshot` validated by zod (already a dependency) at write *and* read; `layout_version` gates renderers; render of unknown version = graceful "open the PDF" fallback. |
| **Deleting labour data expectations** | Low | Med | Labour data is never deleted until archive retirement; export includes it; release notes state it. |
| **UX regression in frozen surfaces** (panels/timeline are the habit) | Med | High | ARCH freezes them; PR rule for Phases 3: no visual diffs on capture panels beyond the tier control and person picker. |
| **Demo/tester/admin breakage** | High if unplanned | Med | Explicit tasks (3.10, 8.x); tester sandbox and demo both retarget `LocalRepository`. |
| **Deploy risk** | — | — | Every phase leaves `staging` deployable; schema changes are additive until the deferred drop; rollback = redeploy previous build (V2 tables ignore it) — except after Phase 3 cutover, where rollback re-activates blob sync against a stale blob: therefore keep a `V2_DATA` build flag through Phases 3–4 that can re-enable the old store path from the same commit, deleted in Phase 6. |
| **Rollback of the backfill itself** | — | — | Not needed: blob is never mutated (only `migrated_at` stamp); "rollback" = clear stamp + truncate that user's V2 rows (admin tool). |

UX risks called out to the product owner: (1) per-item summary aggregation ("headache ×3") disappears by design — appendix shows dated occurrences; (2) the week-picker disappears in favour of date ranges; (3) the copy-as-text share persists but renders the V2 document. All three follow ARCH; listed so they are announced, not discovered.

---

# 10. Implementation Order (sequential checklist)

Every task independently completable and committable; dependencies noted as `[after n.n]`. Claude Sonnet executes top to bottom.

**Phase 0 — Hygiene**
- [x] 0.1 Script-verify unused `components/ui/*`; delete them, `BottomNav.tsx`, `SilhouetteIllustration.tsx`, `example.functions.ts`, `bun.lock`.
- [x] 0.2 Fix `__root.tsx` meta (title/OG/author → BumpNotes; OG image into `public/`).
- [x] 0.3 Extract shared `EntryEditDialog` + `getEditableText` into `components/bumpnotes/EntryEditDialog.tsx`; use from `timeline.tsx` and `pack.tsx`.

**Phase 1 — Labour removal**
- [x] 1.1 Delete `routes/labour.tsx`; remove nav item (`AppShell.useNavItems`) and `LabourLinkCard` (`index.tsx`). Add labour → home redirect route.
- [x] 1.2 Remove labour rendering from `timeline.tsx` (filter, episode cards, episode grouping) and labour branches from `summary.ts`, `pregnancy-summary.ts`, `pdf.ts`, `PregnancySummaryPreview.tsx`, `pack.tsx` defaults.
- [x] 1.3 Remove labour store methods; keep blob *reading* tolerant of labour data (verify unknown-type fallthrough in `summariseEntry`, timeline, summary builder).
- [ ] 1.4 Prune `lab.*` i18n keys; update `features.tsx`/`welcome.tsx` copy.

**Phase 2 — Schema + Storage** `[after 1.x]`
- [ ] 2.1 Migration: `pregnancies`, `people`, `health_items`, `previous_pregnancy_notes`, `preferences` + RLS + triggers + indexes (§5.3, §5.6).
- [ ] 2.2 Migration: `entries`, `attachments`, `summaries` (no UPDATE policy on `summaries`) + RLS + indexes.
- [ ] 2.3 Migration: `profiles` new columns (incl. `v2_notice_dismissed_at`); `bumpnotes_state` archive lock (revoke client writes; add `migrated_at`, `migration_checksum`).
- [ ] 2.4 Buckets `attachments`, `summary-pdfs` + path-prefix RLS policies.
- [ ] 2.5 Regenerate `integrations/supabase/types.ts`; commit.

**Phase 3 — Data layer + cutover** `[after 2.x]`
- [ ] 3.1 `lib/domain/types.ts` (V2 entities, zod schemas for payloads + snapshot skeleton).
- [ ] 3.2 `lib/data/repository.ts` interface + `supabase-repo.ts` (CRUD, camelCase mapping, soft delete, purge).
- [ ] 3.3 `lib/data/outbox.ts` + IndexedDB attachment staging + connectivity flusher.
- [ ] 3.4 `lib/data/attachments.ts` (canvas re-encode/EXIF strip, upload, signed URL cache).
- [ ] 3.5 `lib/data/local-repo.ts` (sessionStorage/localStorage variants) + V2 demo fixtures (`lib/data/fixtures.ts`, replacing `demo-dashboard.ts` content).
- [ ] 3.6 `lib/data/hooks.ts` (Query hooks per §4.5) + repository mode factory (real/demo/tester).
- [ ] 3.7 Server fn `ensureMigrated` + backfill per §5.8 + read-only fallback banner + `V2_DATA` flag wiring.
- [ ] 3.8 Cut over capture panels (`Panels.tsx`): repository writes, visibility tier control, person picker (people CRUD inline-create), upload via 3.4, `saveAsQuestion` → second entry. No other visual changes.
- [ ] 3.9 Cut over `index.tsx` (home) and `timeline.tsx` (reads, edit, delete, attachment display). `[after 3.8]`
- [ ] 3.10 Cut over `settings.tsx` (recently-deleted, wipe, export interim = V2 JSON + blob) and demo/tester entry points to `LocalRepository`. `[after 3.9]`
- [ ] 3.11 Migrate staging-cohort accounts; verify checksums; then remove old store: delete Group C files, fix all imports. `[after 3.10]`
- [ ] 3.12 Manual test pass: airplane-mode capture; two-browser write/read; fresh account; migrated account; demo; tester. Document results in the PR.

**Phase 4 — Onboarding V2** `[after 3.x]`
- [ ] 4.1 New `Onboarding.tsx`: welcome → pregnancy → EDD/LMP → first pregnancy? → nickname → account (embed existing auth form) → home; local buffer + post-signup flush; deferral copy for non-first pregnancies (no data collection).
- [ ] 4.2 Rewire `welcome.tsx` CTAs and `index.tsx` redirect logic (no sync-status wait — gone with the blob); analytics events (`onboarding_started/completed`, add `account_created_during_onboarding`).

**Phase 5 — About Me V2** `[after 3.x]`
- [ ] 5.1 Route `/about-me` + card scaffold (prompt state ⇄ summary state) + `/details` redirect; nav label change.
- [ ] 5.2 Personal Details card (profiles fields incl. health identifier with editable label; photo upload optional).
- [ ] 5.3 My Health card (health_items chips CRUD).
- [ ] 5.4 My Pregnancy card (EDD/LMP edit, nickname, birth place; care team = people list with roles + contact details).
- [ ] 5.5 Previous Pregnancies card (first-pregnancy gate; counts with §3.4 sensitivity flow; prompt-tagged free-text notes).
- [ ] 5.6 My Preferences card (ordered items + "anything else"; placeholder examples verbatim from ARCH §3.5; copy sign-off before merge).
- [ ] 5.7 Migrated-user "what's new" card on Home (ARCH §11.6): shown only when the user's `bumpnotes_state.migrated_at` is set (exposed via the `ensureMigrated` response) and `profiles.v2_notice_dismissed_at` is NULL; links to `/about-me`; dismissal writes the timestamp and the card never renders again. Copy sign-off before merge. `[after 5.1]`

**Phase 6 — Summary V2** `[after 4.x or 5.x — needs 3.x only, but 5.x content improves it; execute after 5]`
- [ ] 6.1 `lib/summary/document-model.ts` + `build-snapshot.ts`: draft builder (range resolution incl. "since last summary"; standing sections from About Me entities; open questions; non-private entries; manifest).
- [ ] 6.2 `components/summary/SummaryDocument.tsx` (+ section components): renders a snapshot; her-words styling distinct; empty sections collapse.
- [ ] 6.3 `/summary` route: range step → draft → review (eye toggles, entry exclusion via manifest, `personal` badges) → actions (PDF, share text, show my screen, keep). `/pack` redirect.
- [ ] 6.4 Snapshot persistence on share/keep; My Summaries list (`/summary/history`); "generate again with the same choices"; timeline summary events; delete Group D files. `[after 6.3]`
- [ ] 6.5 ESLint `no-restricted-imports` fence on `lib/summary/**`.

**Phase 7 — PDF V2** `[after 6.x]`
- [ ] 7.1 `lib/summary/render-pdf.ts` from snapshot only: page-1 Summary Sheet (fixed slots, one page, overflow → "continued"), appendix, per-page header/footer + provenance sentence, filename per ARCH §8.
- [ ] 7.2 Upload to `summary-pdfs` on generation (outbox retry); history opens signed URL; determinism check (two renders of one snapshot are byte-identical modulo PDF timestamps — pin jsPDF `creationDate`).
- [ ] 7.3 "Show my screen" full-screen snapshot render (private tier structurally absent — assert in code).

**Phase 8 — Closeout** `[after 7.x]`
- [ ] 8.1 Settings export V2 (all entities + PDFs sequentially + legacy blob JSON); deletion paths cover Storage prefixes + blob; verify `deleteOwnAccount`.
- [ ] 8.2 Admin dashboard: swap blob references to V2 stats; add migration status/remigrate tools.
- [ ] 8.3 Marketing copy pass (`features`, `our-story`, `welcome`) against V2; i18n key prune + additions audit.
- [ ] 8.4 Delete `V2_DATA` flag and any remaining §8 items; grep-audit for `bumpnotes_state`, `LabourPlan`, `labour`, `pack`, `details` references outside redirects/archive code.
- [ ] 8.5 Full manual regression per §11; schedule the archive-drop migration for one release cycle later.

---

# 11. Definition of Done

The migration is complete when all of the following are true:

**Functional**
1. A brand-new user completes 7-step onboarding, records one entry of every type (with a photo), fills all five About Me cards, generates/reviews/shares a summary, sees it on the timeline and in My Summaries, re-downloads its identical PDF, exports everything, and deletes their account — with no console errors and no orphaned rows or Storage objects.
2. A pre-V2 account (seeded from a production-shaped blob incl. labour data and base64 photos) logs in, migrates transparently with matching checksums, sees an unchanged timeline (minus labour UI), and its photos render from Storage. The one-time "what's new" card appears on Home, links to About Me, and never reappears after dismissal (including on a second device).
3. Airplane-mode capture lands after reconnect. Demo and tester modes work end-to-end with zero Supabase writes.
4. Feelings never appear in any draft, share, or show-my-screen render; a `personal` note shows its review badge; an excluded entry appears in no PDF; the PDF contains no "excluded" indication.

**Structural**
5. `grep` finds no references to `store.ts`, `sync.ts`, old `types.ts`, `pack.tsx`, `details.tsx`, `labour`, or `LabourPlan` outside redirects, migration/archive code, and this document. `bumpnotes_state` is client-read-only with a scheduled drop.
6. `summaries` rows are un-updatable by clients (verified by attempted UPDATE failing under RLS); snapshots re-render identically; `layout_version` = `summary_layout_v2` everywhere.
7. The `lib/summary/**` import fence lint rule passes; no AI/network clients in the pipeline.
8. `npm run build` and `npm run lint` clean; regenerated Supabase types committed; every §10 checkbox ticked with its manual test noted in the closing PR.

**Product conformance**
9. Screens match ARCH §9's table (verified screen by screen); the core principle sentence ("BumpNotes records information. It does not interpret it.") holds: no ranges, flags, colour-coded values, or judgement copy anywhere in app or PDF.
10. Liz has signed off the My Preferences and Previous Pregnancies copy, and the three announced UX changes (§9 last paragraph) in release notes.

---

*End of implementation plan. Product questions are answered by `docs/BUMPNOTES_V2_ARCHITECTURE.md`; anything genuinely undecidable from these two documents should be raised, not guessed.*
