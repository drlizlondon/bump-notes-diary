# A5 — Screen cutover plan + model-mapping decisions (9 Sep 2026)

The data-access layer (A1–A4) is built. A5 cuts the app's screens from the old
local store (`useAppState`/`store`, Supabase-synced) to the new Repository hooks.
Investigation shows A5 is **not** a mechanical wire-up: the old data model is
richer and differently-shaped than the new Azure V2 schema, so the cutover
encodes product decisions. This doc records the mapping, the decisions needed
from Liz, and the safe execution order. **No live screen is changed until the
decisions below are made.**

## The model gap (old app → new V2 schema)

| Old (store `types.ts`) | New V2 (Azure schema) | Mapping |
|---|---|---|
| `symptom` entry | `entry` type `symptom` (payload) | clean 1:1 |
| `question` | `question` | clean |
| `appointment` | `appointment` | clean (old `whenISO` → `occurredAt`) |
| `measurement` | `measurement` | clean |
| `feeling` | `feeling` (forced private) | clean |
| `note` | `note` | clean |
| `photo` entry (inline `dataUrl`) | `upload` entry + **attachment** (blob) | needs the attachment upload flow (A3, built) |
| **`person` entry** | **People entity** (separate table) | ⚠️ decision D2 |
| Profile care contacts (`midwife`, `gp`, `consultant`, `hospital`, `birthPartner`) | **People entity** | ⚠️ decision D2 |
| Profile `dueDateISO` | **Pregnancy.edd** (separate entity) | maps to a Pregnancy row (decision D3) |
| Profile `userName` / `babyNickname` | `Profile.displayName`/`preferredName` + `Pregnancy.nickname` | mostly clean (D3) |
| Profile `triagePhone` / `labourWardPhone` | *(no field)* | ⚠️ part of D1 (labour) |
| **`labour` / `labour_event` / `contraction` entries** | *(no type)* | ⚠️ **decision D1** |
| **`labourPlan`** (bag items, episodes, preferences, parking/childcare notes) | *(no table)* | ⚠️ **decision D1** |
| `concern` (legacy) | *(dropped)* | drop / fold into `question` (D4) |
| `labour` (legacy) | *(dropped)* | drop (D4) |

## Decisions needed from Liz (blocking the affected screens only)

**D1 — The labour subsystem. RESOLVED (founder ruling, 12 Sep 2026):**
"We won't have labour on the system but archive it so we can expand to it
very easily." This is stronger than option (a) below — labour is not just
deferred, it is permanently excluded from the Azure V2 launch and its V1
code is archived. Full detail, including exactly what "on the system" means
layer by layer and the re-enable recipe: `docs/product/LABOUR-ARCHIVE.md`.
In short: the Azure schema (migrations 001/002) already has zero labour
presence (never added), the V1 legacy types/model now live in
`src/lib/bumpnotes/archive/labour.ts` (a clearly-labelled, documented
boundary), and any labour data in an old user's blob will flow untouched
into `bumpnotes_state_archive` at cutover rather than being interpreted
into any V2 table. **This unblocks A5 — D1 is no longer an open question.**

<details>
<summary>Original options considered (12 Sep 2026, superseded by the ruling above)</summary>

The app's labour tools (contraction timer, hospital-bag checklist, labour
episodes, birth-preferences `labourPlan`, triage/labour-ward phone numbers)
have **no table in the V2 Azure schema**. Options considered:
  - **(a) Out of scope for the Azure V2 launch** — keep labour features local-only
    for now (they stay on-device, not synced), cut everything else to Azure, and
    add labour tables later. Fastest path to "core record on Azure".
  - **(b) Extend the schema now** — add `labour_plan` / `contractions` / `bag_items`
    tables (a new migration 003) before cutting the labour/pack screens.
  - **(c) Drop the labour features** for V2 entirely.
  The founder ruling above is closest to (a), made explicit and permanent,
  with the archive location for the code/model now built and documented
  rather than left implicit.

</details>

**D2 — People.** Old "person" entries AND the profile's inline care contacts
(midwife/GP/consultant/hospital/birth partner) both become **People** rows.
Confirm: care contacts migrate into People (role-typed), and the capture "person"
panel writes a People row (+ optionally an `appointment` entry referencing that
person). Recommendation: yes.

**D3 — Profile ↔ Pregnancy split.** Old profile carried the due date; V2 puts it
on a Pregnancy. On first cutover we create one active Pregnancy from the due
date; `userName`→`displayName`, `babyNickname`→`Pregnancy.nickname`. Confirm.

**D4 — Legacy types** (`concern`, `labour`): drop, or fold `concern` into
`question`? Recommendation: fold `concern`→`question`, drop `labour`.

## Execution order (once D1–D4 are settled)

Adapter-first, to preserve the proven UI: a small `entry-adapter.ts` maps new V2
`Entry` ↔ the shape the existing panels render, so we swap the *data plumbing*
under the panels rather than rewriting them. Then, surface by surface, behind the
`VITE_ENTRA_NATIVE`/a data flag, running on the current Supabase session via the
2.6 bridge (no dependency on the identity cutover):

1. **Adapter + `<RepositoryProvider>` at the app root** (mode from auth/tester/demo).
2. **Demo route → LocalRepository** — safest first cut (no real-data risk), proves
   the read+render path end to end. *(plan 3.11, done first here on purpose)*
3. **Home + timeline (read/render)** → `useEntries`/`useActivePregnancy`.
4. **Capture panels (writes)** → `useCreateEntry`/`useUpsertPerson`/attachments —
   the clean types first; `person`/`photo` per D2.
5. **Settings + profile** → `useProfile`/`usePreferences`/`useHealthItems` + People.
6. **Labour/pack screens** → per D1 (resolved): no cutover work needed —
   labour never gets a V2 home. `pack.tsx`'s existing `isLabourEntry` filter
   (now `isArchivedLabourEntryType` from `archive/labour.ts`) already keeps
   archived entries out of the Pregnancy Summary; nothing else to build.
7. Delete the old `store`/`sync`/`useAppState` + `@supabase/*` reads once every
   surface is off them (plan 3.12).

## Safe first step (decision-free)
I can build the **entry adapter + RepositoryProvider wiring + cut the demo route**
now — it touches no real user data (LocalRepository only) and proves the whole
pattern. Everything past that waits on D1–D4.
