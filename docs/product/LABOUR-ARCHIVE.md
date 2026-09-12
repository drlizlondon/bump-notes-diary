# Labour/contraction subsystem — archived, not deleted

**Founder ruling, 12 Sep 2026:** "We won't have labour on the system but
archive it so we can expand to it very easily." This resolves **D1** in
`docs/product/A5-SCREEN-CUTOVER-PLAN.md`: labour is permanently excluded from
the Azure V2 launch schema/app, and its code/model is archived rather than
deleted.

## What "on the system" means, precisely

| Layer | State today | Labour presence |
|---|---|---|
| Interactive UI (contraction timer, hospital-bag checklist, labour-episode recorder) | Removed | **None.** Removed from the app in PLAN §10 Phase 1, 11 Jul 2026 (commits `5f3650f`, `235f476`, `c89e4c7`, `952eeb3`) per ARCH §10. `/labour` is a redirect-to-home stub (`src/routes/labour.tsx`, 6 lines). |
| Azure V2 schema (`azure/migrations/001`, `002`, applied to real Azure PG 8 Sep 2026) | Live | **None — never added.** `entries.type` CHECK constraint lists only `symptom, question, appointment, measurement, upload, note, feeling`. No `labour_plan`/`contractions`/`bag_items` table exists. |
| Azure V2 domain types (`src/lib/domain/types.ts`) | Additive, not yet wired to a screen | **None** — mirrors the schema above faithfully. |
| Old V1 data model (`src/lib/bumpnotes/types.ts` → `src/lib/bumpnotes/archive/labour.ts`, as of this change) | Legacy back-compat only | `LabourEntry` / `LabourEventEntry` / `ContractionEntry` (entry types), `LabourPlan` (bag items, birth preferences, episodes), `Profile.triagePhone` / `Profile.labourWardPhone`. No screen creates any of this any more; it exists only so the app can load an old local/Supabase blob without crashing or silently dropping data (WORK.md §3.6, "never break an unmigrated user"). |
| The eventual Azure cutover of an old user's blob | Not yet run (A5/A-later, founder-gated) | Any labour data in a user's old blob flows, byte-for-byte and unmapped, into `bumpnotes_state_archive` (`azure/migrations/002`) — a jsonb column keyed by `supabase_user_id`, built for exactly this purpose. It is **not** interpreted into any active V2 table. |

Net effect: labour has no home in the new system, and never did — there is
nothing to remove from the Azure side. The archiving work this ruling
required was on the **old V1 code**: consolidating the legacy types into one
clearly-labelled module (`src/lib/bumpnotes/archive/labour.ts`) instead of
leaving them scattered across `types.ts`, `pack.tsx`, and `timeline.tsx`.

## What was NOT touched, and why

- **`src/routes/details.tsx`** still renders `triagePhone` / `labourWardPhone`
  as editable Profile fields on the live V1 app. This is a *frozen surface*
  (WORK.md §3.5) — removing a visible field from it is a UX change, not a
  code-archiving one, and is out of this task's bounded scope. It is also
  moot for the Azure launch regardless: the V2 `Profile` type
  (`src/lib/domain/types.ts`) already has no equivalent fields, so these two
  values simply do not carry forward once A5 cuts the Profile screen over —
  no further removal work will be needed there.
- **`src/routes/settings.tsx`** still describes exported data as "entries,
  profile, labour plan" in one line of UI copy. Same reasoning: a frozen
  surface, and accurate today (a user's V1 export legitimately still
  contains their old labour plan if they have one).
- **`src/components/bumpnotes/EntryEditDialog.tsx`** still has switch cases
  for `labour`/`labour_event`/`contraction` so that opening an old entry of
  that type doesn't throw. Structural, defensive, no behaviour to change.
- **`src/lib/bumpnotes/i18n.ts`**'s `det.labourWardPhone` key — still used by
  `details.tsx` above; WORK.md §4 already records this as "deliberately kept
  ... until Phase 5."

None of the above are part of the Azure V2 launch surface, so none of them
block "labour is not on the system." They are V1-app UX decisions reserved
for the founder-supervised A5 pass (or a later phase), not this task.

## How to re-enable labour on the Azure system later

A small, scoped task, in this order:

1. **Schema**: author a new migration (never edit `001`/`002` — WORK.md
   §3.12) adding whatever tables the product decision calls for, e.g.
   `labour_events`, `contractions`, `labour_plans` — mirroring the shape
   already typed in `src/lib/bumpnotes/archive/labour.ts` as the starting
   point for column design, adjusted to V2 conventions (see how `entries`/
   `attachments` were shaped in migration 002).
2. **Domain types**: add the corresponding types to
   `src/lib/domain/types.ts`, following its existing per-table pattern.
3. **Server functions + repository + hooks**: extend
   `src/lib/azure/*.functions.ts`, `api-repo.ts`, and the query-hooks layer
   for the new entity, exactly as A1/A2/A4 did for every other entity type.
4. **Backfill**: extend the per-user blob→V2 backfill (PLAN §5.8) to read
   the labour shape back out of `bumpnotes_state_archive.state` for users
   who have it, now that a destination table exists — this is the payoff of
   archiving the raw blob instead of discarding it.
5. **UI**: design and build new screens against ARCH's product intent at the
   time (the old `pack.tsx`/`labour.tsx` UI was already judged unsafe enough
   to remove per ARCH §10 in July — a new UI is a fresh design decision, not
   a restoration of the old one).
6. **Delete this archive** once nothing needs the legacy V1 types any more
   (i.e., after the old store is retired per PLAN §10 Phase 3.12) — at that
   point `src/lib/bumpnotes/archive/labour.ts` can go, and the new V2 types
   from step 2 are the only labour model left.

## Do not

- Do not add a labour table to migration `001` or `002` — they are applied
  and immutable (WORK.md §3.12).
- Do not delete `src/lib/bumpnotes/archive/labour.ts` or the archived
  `EntryType` members while any user's old blob may still contain this
  shape — that would be exactly the kind of "fix production data by hand"
  WORK.md §8.2 reserves for escalation, not a unilateral code change.
- Do not resurrect the old `pack.tsx`/`labour.tsx` UI verbatim — ARCH §10's
  reasoning for removing it (crossing the triage boundary) still applies;
  any future labour UI is a fresh clinical-safety decision, not a restore.
