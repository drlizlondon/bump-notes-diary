# WORK.md — BumpNotes V2 Migration Execution Manual

Read this at the start of every session, together with:

- `docs/BUMPNOTES_V2_ARCHITECTURE.md` — **ARCH** — what the product is and why
- `docs/BUMPNOTES_V2_IMPLEMENTATION_PLAN.md` — **PLAN** — what to build and in what order
- `docs/BUMPNOTES_AZURE_MIGRATION_PLAN.md` — **AZURE** — supersedes PLAN §10 Phases 2–3, amends 4–8; where AZURE and PLAN disagree, AZURE wins

This document defines **how to work**. It contains no product or architecture decisions.

---

## 1. Mission

Migrate the existing Lovable-generated codebase to the V2 architecture by executing the PLAN §10 checklist top to bottom — one task at a time, keeping `staging` deployable at every commit, and losing no user data at any point. The migration is finished when PLAN §11 (Definition of Done) is fully satisfied.

You are executing decisions, not making them. The thinking has been done; your job is faithful, verifiable implementation.

## 2. Source of Truth

Precedence when anything disagrees:

1. **ARCH** — product behaviour, principles, scope
2. **AZURE** — infrastructure target, Supabase→Azure phasing (overrides PLAN where they conflict)
3. **PLAN** — schema, phasing, task order, engineering decisions (marked DECISION)
4. **WORK.md** — process
5. **Existing code** — evidence of current behaviour only; never a justification for target behaviour

Existing code never overrides the documents. If the code does something the documents forbid, the code is wrong. If the documents are silent and the choice is not obvious from them, escalate (§8) — do not infer product intent from V1 code.

The one sentence that settles product disputes without escalation: **"BumpNotes records information. It does not interpret it."** If a change would make the app rank, flag, judge, or advise, it is wrong regardless of anything else.

## 3. Working Rules

1. **One PLAN task per commit.** Task number in the commit message (e.g. `3.8: cut capture panels over to repository writes`). No drive-by changes outside the task's scope.
2. **Tasks in order.** Never start a task whose `[after n.n]` dependencies are unticked. Never skip ahead because a later task looks easier.
3. **Staging stays deployable.** `npm run build` and `npm run lint` must pass before every commit. If a task cannot land green in one commit, split it at a green boundary — never commit red.
4. **Never guess requirements.** If ARCH and PLAN don't answer it and §8 applies, stop and ask. A blocked task is recoverable; a wrong assumption compounds.
5. **No UX changes unless ARCH requires them.** Capture panels, timeline, home, and settings are frozen surfaces: their diffs may change plumbing, tiers, the person picker, and attachment display — nothing else visible. When in doubt, screenshot before/after and compare.
6. **Backwards compatibility until cutover completes.** The blob remains readable (and, pre-Phase 2, writable) until PLAN Phase 3 removes the old store. Never break an unmigrated user.
7. **User data is sacred.** No migration, deletion, or transformation of user data outside the exact mechanisms PLAN §5.8 defines. Never write a destructive SQL migration; the only sanctioned drop (`bumpnotes_state`) is explicitly deferred and out of scope until scheduled.
8. **Delete, don't deprecate.** When the PLAN says a file dies, delete it and fix the imports. No `_old` suffixes, no commented-out blocks, no re-exports for safety.
9. **Verify by using the app,** not by reading the diff. Every task's verification (§7) includes exercising the changed flow in the dev server.
10. **Update the ledger.** After finishing a task: tick its checkbox in PLAN §10 and refresh WORK.md §4. These edits belong in the same commit as the task.
11. **Generated files are generated.** Never hand-edit `src/routeTree.gen.ts` or `src/integrations/supabase/types.ts`; regenerate them.
12. **Applied migrations are immutable** — Supabase (`supabase/migrations/`) and Azure (`azure/migrations/`) alike. New timestamped files only; never edit an existing one.
13. **Secrets and config:** never commit credentials, connection strings, tenant/client secrets, or SAS tokens; never modify `.env`, Supabase project settings, or Azure resources as part of a code task (see AZURE §7).
14. **DTAC readiness is a parallel workstream** (Liz, 12 Jul 2026). Every architectural or implementation decision is made with eventual NHS DTAC submission in mind. A task whose decisions materially affect compliance (auth, storage, audit, retention, deletion, telemetry, accessibility, clinical-boundary) updates `docs/DTAC_READINESS.md` in the same commit — minimum documentation alongside the code, never reconstructed later. Record assumptions, risks and future evidence needs as they arise; cross-reference rather than duplicate. This is evidence accumulation, not a mandate to implement DTAC requirements early.

## 4. Current State

> Keep this block accurate. Update it in the same commit as each completed task.

| Field | Value |
|---|---|
| Working branch | `staging` (PRs target `main`) |
| Current phase | **AZURE Phase 2 — Azure foundation** (2.2–2.3 done; 2.1 provisioning still outstanding) |
| Next task | AZURE 2.4 (migration 002 — authorable locally like 2.3; **applying to Azure still blocked on 2.1 provisioning**). AZURE 2.1 remains **[LIZ/OPS]**. Work currently lands on `integration/azure-ga4-logo` (worktree), pending Liz's merge review into `staging`. |
| Last completed task | AZURE 2.3 — migration 001 **authored and locally verified only** (throwaway local PG 16 via the 2.2 runner: apply, status, idempotent re-run, schema/FK/index/trigger inspection, case-insensitive email uniqueness, header-row and one-active-pregnancy constraints). **Not applied to Azure; no Azure environment exists yet.** Plain SQL + `pg` confirmed by Liz (Prisma veto window closed). |
| Migration strategy | **Azure-first (Liz, 12 Jul 2026):** V2 persistence built directly on Azure PG + Blob behind the BumpNotes API; Supabase V2 schema never built (PLAN §10 Phases 2–3 superseded by AZURE §3). Lazy per-user blob→V2 backfill (PLAN §5.8 mapping unchanged) runs inside Azure after a one-time archive copy at cutover; identity moves to Entra External ID in AZURE Phase I (after data, before onboarding V2). |
| Notes / open escalations | **Azure escalation resolved 12 Jul 2026:** Liz supplied the target architecture (PG Flexible Server / Blob Storage / Entra External ID / App Service / Key Vault / App Insights) and chose Azure-first sequencing. Written up as `docs/BUMPNOTES_AZURE_MIGRATION_PLAN.md`; PLAN §10 Phases 2–3 marked superseded. **Open items awaiting Liz (AZURE §5):** (1) provisioning per AZURE §6 — blocks AZURE 2.3+; (2) Prisma-vs-plain-SQL veto window before AZURE 2.3; (3) identity-cutover comms/copy sign-off before I.3; (4) cutover window approval before 3.8; (5) consent/audit scope if compliance review needs more than `audit_events`. — Also: no production domain exists in the repo, so 0.2's `og:image`/`twitter:image` use a root-relative path (`/bumpnotes-wordmark.png`); some scrapers require absolute URLs — swap to the canonical domain when one is decided. — Earlier: `npm run lint` had never passed on `staging` (1412 pre-existing prettier/lint problems); resolved via mechanical `eslint --fix` commit (fbb52c1) ahead of 0.1, user-confirmed. |

Phase progress: `0 ☑ · 1 ☑ · A2 ☐ · A3 ☐ · I ☐ · 4 ☐ · 5 ☐ · 6 ☐ · 7 ☐ · 8 ☐` (A2/A3/I execute from AZURE §3; 4–8 from PLAN §10 with AZURE §4 amendments)

Small follow-ups (not blocking): home "This week" stats card counts hidden labour-type entries from legacy blobs (index.tsx ThisWeekCard doesn't filter HIDDEN types) — fold into the 3.9 home cutover. `det.labourWardPhone` i18n key deliberately kept (used by details.tsx until Phase 5). 1.4 found `features.tsx`/`welcome.tsx` already free of labour copy (cleaned by pre-migration commits after the PLAN audit).

## 5. Development Workflow

Every session, in this order — no skipping:

1. **Read** ARCH, PLAN, WORK.md. Skim is acceptable only for sections unrelated to the current phase; §2, §3, and the current phase's PLAN section are mandatory reading.
2. **Orient.** Confirm §4 matches reality: `git log --oneline -5`, `git status`, and the PLAN §10 checkboxes. If they disagree, reconcile (trust git history) and fix §4 before coding.
3. **Select** the first unticked task whose dependencies are ticked. That task only.
4. **Plan the diff.** List the files you expect to touch. If the list crosses phase boundaries or frozen surfaces, re-read the task — you have probably over-scoped it.
5. **Implement.** Smallest change that completes the task per PLAN.
6. **Verify** per §7 (build, lint, and the task's manual check in `npm run dev`).
7. **Commit** with the task number; include the PLAN checkbox tick and §4 update.
8. **Push.**
9. **Stop.** One task per session unless explicitly told to continue; if continuing, loop from step 3.

If verification fails twice on the same task, stop and record the failure in §4 Notes rather than forcing it (§8.6).

## 6. Coding Standards

Grounded in this repository's existing conventions — match them, don't import outside habits:

- **File placement:** follow PLAN §4.3. Domain logic in `src/lib/`, components in `src/components/bumpnotes/` (or `summary/`, `about-me/` per plan), routes thin. New shared UI goes next to its consumers, not into `components/ui/` (that folder is a pruned shadcn vendor set).
- **Component style:** function components, route-local subcomponents are fine while small; extract only at reuse or ~200 lines. Do not create new god files — `pack.tsx` (537 lines) is the cautionary tale, `admin.tsx` the grandfathered exception.
- **Styling:** Tailwind with the existing design tokens (`surface-card`, `text-ink`, `text-ink-soft`, tone classes like `bg-blush-soft`, rounded-full pill buttons, Fraunces `font-serif` headings). No new colour values, no CSS files, no styled-components.
- **Types:** strict end-to-end. V2 entity types come from `lib/domain/types.ts` exclusively; DB rows are mapped to camelCase in the repository layer only; zod validates every jsonb payload at read and write. No `any`, no `as` casts to silence the compiler (the V1 store's `as Entry` pattern is not a precedent to follow).
- **Copy and i18n:** all user-facing strings through the `t()` dictionary (`lib/bumpnotes/i18n.ts`). ARCH-specified copy (My Preferences examples, provenance footer, bereavement-sensitive lines) must be verbatim from ARCH.
- **Imports:** use the `@/` alias; no deep relative chains.
- **Duplication:** if you are about to copy a function between routes, extract it instead (the duplicated `getEditableText` is being fixed in task 0.3 — don't create the next one).
- **Dead code:** if a task orphans a symbol, delete it in the same commit.
- **Dependencies:** add none without escalation. The plan is deliberately achievable with the existing `package.json`.
- **Comments:** only for constraints the code can't express (e.g. why summaries have no UPDATE policy). No narration, no changelog comments.

## 7. Definition of Done

**A task is done when:**
- The PLAN task description is fully implemented — no partial credit, no "TODO later".
- `npm run build` and `npm run lint` pass.
- The affected flow has been exercised in `npm run dev` and behaves per ARCH (for data-layer tasks: including the specific checks PLAN names, e.g. airplane-mode capture for 3.3, checksum verification for 3.7/3.11).
- No user-visible change exists beyond what the task specifies.
- PLAN checkbox ticked, WORK.md §4 updated, committed with the task number, pushed.

**A phase is done when:**
- Every task in it is done, including its listed manual test pass (e.g. 3.12).
- The app is deployed to staging and the phase's core journey walked once end-to-end there.
- WORK.md §4 phase tracker updated; any residual risk or deviation recorded in §4 Notes.

**The migration is done when:** PLAN §11 is satisfied in full — functional journeys 1–4, structural checks 5–8, and product conformance 9–10 (which includes Liz's copy sign-off; that is a human gate, not a checkbox you may tick yourself).

There is no test runner in this repository. Do not add one as a side quest (§6 dependencies rule); verification is build + lint + the mandated manual checks, documented in the commit or PR description.

## 8. Escalation Rules

Stop, write the question and context into §4 Notes, and ask — rather than assume — when:

1. **The documents conflict or are silent** on something with product-visible consequences, and §2's precedence doesn't resolve it.
2. **Anything touches user data destructively** beyond the sanctioned backfill: unexpected schema states, RLS behaviour that doesn't match PLAN §5, or any temptation to "fix" production data by hand.
3. **A DECISION in the PLAN proves wrong in practice** (e.g. jsPDF cannot meet the layout contract, the outbox design fails a real constraint). Do not silently substitute your own design.
4. **New user-facing copy is needed** that ARCH doesn't provide, anywhere near the sensitive areas: Previous Pregnancies, My Preferences, feelings/privacy, deletion, the PDF. Placeholder-and-flag is not acceptable for these; wording is the feature.
5. **A change would cross the interpretation boundary** in any way — even a "helpful" tooltip, ordering heuristic, or coloured value. This is never a judgement call you make alone.
6. **Verification fails twice** on the same task, or a previously green area regresses and the cause isn't obvious within one focused investigation.
7. **Scope creep pressure:** you notice something broken/ugly outside the current task. Record it in §4 Notes as a proposed follow-up; do not fix it now unless it blocks the task.
8. **Auth, RLS, or Storage policy changes** not literally specified in PLAN §5/§7.

Everything else — naming, file splitting, mechanical refactors inside the task's scope, test data — you decide and proceed.

## 9. Repository Principles

The standing philosophy for every change, during this migration and after it:

1. **Record, never interpret.** The constitutional sentence (ARCH §2.1) is an engineering constraint: no ranking, flagging, reference ranges, judgement copy, or "smart" defaults that embed clinical opinion. The lint fence on `lib/summary/**` is its mechanical form — keep it passing.
2. **Her words are load-bearing.** Anything a woman wrote is stored verbatim, rendered verbatim, and visually distinct from template text. Code that "cleans up" user text is a bug.
3. **The woman wins, silently.** Privacy controls must be real (private tier structurally absent from every render path) and invisible in output (no "content excluded" traces).
4. **Snapshots are immutable.** Nothing in this codebase ever edits a generated summary. New information means a new snapshot.
5. **One home per fact.** Before adding a field, screen, or table, identify the single ARCH §3.1 concept it belongs to. Duplication of information is an architecture bug, not a convenience.
6. **Simplicity over flexibility.** Build for the documented product, not imagined futures; the only sanctioned future-proofing is what ARCH §12 names. Prefer deleting to abstracting.
7. **Deployable always.** Green build, additive migrations, reversible steps. Any change that can't be shipped alone is scoped wrong.
8. **Data outlives code.** Schema and migration changes get more scrutiny, more verification, and less cleverness than anything else in the repository.
