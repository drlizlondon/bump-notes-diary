# BumpNotes — DTAC Readiness Tracker

**Status:** Living evidence tracker for a future NHS Digital Technology Assessment Criteria (DTAC) submission. Started 12 July 2026 at Liz's direction, alongside AZURE Phase 2.
**Rule (WORK.md §3.14):** any task whose decisions materially affect DTAC compliance updates this document in the same commit. This tracker records *positions, evidence pointers, assumptions and gaps* — it does not duplicate content that lives in ARCH / PLAN / AZURE.
**Objective:** every completed phase leaves behind the evidence a submission needs, so compliance is accumulated, not reconstructed.

Cross-referenced documents: `BUMPNOTES_V2_ARCHITECTURE.md` (ARCH), `BUMPNOTES_V2_IMPLEMENTATION_PLAN.md` (PLAN), `BUMPNOTES_AZURE_MIGRATION_PLAN.md` (AZURE), `WORK.md`.

---

## 1. Clinical Safety (DTAC C1 — DCB0129)

**Position:** BumpNotes is a personal record-keeping tool, not a medical device and not clinical software. It records, organises and communicates the woman's own information; it never interprets, ranks, flags, advises or computes anything clinical beyond transcription arithmetic (G/P notation, LMP→EDD). This is the product's constitutional constraint (ARCH §2.1), enforced structurally (ARCH §12.5: zero model calls in the snapshot→PDF pipeline; PLAN §7: lint-fenced `lib/summary/**`).

Existing risk-reduction evidence:
- Labour/contraction-timer removal (PLAN §10 Phase 1, commits `5f3650f`–`952eeb3`) — deliberately removed the fastest path across the device boundary ("when should I go in?" is triage; ARCH §10).
- No reference ranges, colour coding, high/low flags or trend indicators anywhere (ARCH §6.4); no engagement/prompt layer that could pressure health decisions (ARCH §2.2).
- "Not a medical device" disclaimer shown at account creation (onboarding, live today) and the provenance footer on every PDF page (ARCH §6.5).
- Safeguarding design: visibility tiers, private tier structurally absent from all renders, no summary content in notifications (ARCH §13.4).

**Assumptions (to validate before submission):** the non-medical-device positioning holds under MHRA guidance for the final feature set; the DTAC route is as a non-clinical personal health record tool, which still requires DCB0129 compliance evidence proportionate to risk.

**Outstanding:** named Clinical Safety Officer; DCB0129 clinical safety case report; hazard log (seed it from ARCH §13's risk table — items 4, 6 are hazards in DCB0129 terms); safeguarding design pass with domestic-abuse charities (ARCH §13.4, pre-launch requirement).

## 2. Security (organisational)

**Position:** solo-founder-stage controls, being formalised as the Azure workstream lands. Code on GitHub (`drlizlondon/bump-notes-diary`), single-maintainer review, `staging`→`main` PR flow, deployable-at-every-commit discipline (WORK.md §3.3).

**Outstanding:** Cyber Essentials (baseline; Plus before meaningful NHS engagement); documented secure-development policy (WORK.md §3 is the seed); dependency/vulnerability scanning in CI; incident response plan (see §7); staff/access policy (currently: Liz + AI pair with no production-credential access — WORK.md §3.13, AZURE §7).

## 3. Data Protection (DTAC C2)

**Position:** privacy is a product feature, not a compliance layer (ARCH §2.3, §5.3). Data minimisation is structural: optional-everything About Me, no completion pressure, EDD the only required datum (ARCH §4.1).

Existing evidence:
- **Residency:** all Azure resources UK South (AZURE §1, §6). Supabase (current, interim) is EU-hosted; residency improves at cutover.
- **User rights, self-serve:** full JSON export, account deletion, 30-day recently-deleted restore — live today in Settings; V2 extends export to all entities + PDFs + legacy blob (PLAN §2.13, AZURE §4 Phase 8).
- **Consent:** analytics are opt-in with a no-PII guarantee in the consent copy (live; `CookieNotice`, GA4 consent-gated); ToS/privacy acceptance timestamped on `profiles`.
- **Erasure:** `deleteOwnAccount` will cover PG rows + all blob containers + Entra identity + audit event (AZURE §4 Phase 8 amendment).
- **Retention:** legacy blob archive kept one release cycle post-migration then dropped on schedule (PLAN §5.8, §8); lifecycle rules on blob containers (AZURE §1.2).

**Assumptions:** lawful basis is consent/contract for the consumer product (no NHS data-processing relationship exists yet — if a Trust ever becomes the controller, a DPA and new DPIA are required); Liz is currently controller and de-facto DPO.

**Outstanding:** DPIA (write during AZURE Phase 3 while data flows are being built — cheapest moment); ICO registration; privacy notice review against final V2 flows; formal retention schedule; DPO/accountable-person designation; international-transfer assessment for any sub-processor outside the UK (App Insights telemetry residency — verify at 2.5).

## 4. Technical Security (DTAC C3)

**Position:** the Azure-first architecture is the technical-security submission story (AZURE §1–§2): frontend never touches PostgreSQL or storage credentials; every sensitive operation passes the BumpNotes API; Entra External ID authenticates consumers (workforce tenant + separate audience for admin — a valid customer token can never reach admin surface); managed identities everywhere, no account keys; Key Vault for secrets; short-lived SAS URLs only; encryption at rest platform-wide; 10 MB upload caps; EXIF stripped at capture (PLAN §7).

Decision log (DTAC-material):
- API-level authorisation first, PG RLS as scheduled hardening (AZURE §2, task 8A.3) — *risk accepted until 8A.3; record in pen-test scope.*
- `audit_events` table from AZURE 2.4: auth, export, share, delete, link and migration events; no entry content in audit rows.
- Migrations are immutable, checksummed and runner-verified (AZURE 2.2) — change-control evidence, see §7.
- Migration 001 (AZURE 2.3, `azure/migrations/20260712120000_v2_core_identity_and_about_me.sql`): identity separated from the identity provider (`users` internal UUID + nullable `external_identity_id`/`supabase_user_id`), case-insensitive unique email (Phase I linking precondition), per-region `health_identifier` + label (never a hardcoded NHS-number concept), CASCADE deletion from `users` (erasure path), no RLS by design (API-level authorization per AZURE §2 — record in pen-test scope alongside the 8A.3 note). **Authored and locally verified only (12 Jul 2026, throwaway PG 16); no Azure environment exists yet — not applied, not provisioned.**
- Telemetry hygiene: App Insights must never receive entry content; explicit PII spot-check is in the Phase 3 DoD (AZURE 3.13).
- Summary immutability enforced at DB level (trigger) + API surface (AZURE §2).

**Outstanding:** penetration test (after Phase I, before any NHS-facing use); MFA offering for users (Entra supports it; introduce per Liz's brief "carefully, particularly for exports or sharing"); private networking + HA gate (AZURE 8A.3); secure headers/CSP audit on App Service; rate limiting on the API; backup restore test (evidence, not just backups).

## 5. Accessibility (DTAC C5 — WCAG 2.1 AA)

**Position:** target WCAG 2.1 AA. Not yet audited. Favourable ground: semantic components (Radix primitives with ARIA — e.g. the calendar exposes full date labels), high-contrast monochrome-safe PDF spec with ≥10.5pt body (ARCH §8), no colour-encoded meaning anywhere (constitutional), My Preferences card is itself an accessibility feature ("I lip-read", "I prefer written information" — ARCH §3.5).

**Outstanding:** WCAG 2.1 AA audit of app + PDF output (schedule after Phase 6 when the V2 surfaces exist; auditing V1 surfaces now would be wasted); published accessibility statement; keyboard-only and screen-reader test pass as part of each phase's manual DoD from Phase 4 onward (frozen surfaces inherit their current behaviour until then).

## 6. Interoperability (DTAC C4)

**Position (deliberate):** V2's interoperability artifact is the PDF — a fixed-layout, human-readable document designed for clinician muscle memory (ARCH §6.1, §12.4). No FHIR, no API integrations, no NHS Login in V2 (explicitly parked, ARCH §11). This is a scope position, not a gap: BumpNotes is patient-held documentation, not a connected clinical system.

Schema-level readiness (cheap now, expensive later — ARCH §12.1):
- `health_identifier` + per-user label (NHS number in England), never hardcoded as a concept — captured in the V2 schema (AZURE 2.3, PLAN §5.2).
- Measurements in canonical units; extensible people roles; `layout_version` on summaries.

**Assumptions:** if NHS integration ever becomes real, NHS Login and a FHIR representation of the summary become new workstreams; nothing in V2 forecloses them (internal-UUID identity model, AZURE §1.3, keeps identity-provider migration possible).

**Outstanding:** nothing for V2 scope. Record the scope position in any submission.

## 7. Operational Processes

**Position:** discipline exists in WORK.md; formal artefacts mostly don't yet.

Existing evidence:
- Change control: one task per commit, task-numbered, immutable applied migrations with checksum verification at apply time (WORK.md §3, AZURE 2.2), green build+lint gate every commit, staging deployable always.
- Data-migration safety: transactional per-user backfill, per-type count checksums, read-only fallback mode, never-mutated source blob, admin remigrate tooling (PLAN §5.8, §9).
- Backups: PG Flexible Server automated backups ≥14 days (AZURE §6); blob soft delete + versioning.
- Monitoring: App Insights from AZURE 2.5.

**Outstanding:** incident response plan (including ICO 72-hour breach reporting path); documented backup **restore** test; availability/DR statement (HA is deliberately deferred — AZURE §1.5 — record the risk acceptance); support route for users (currently tester feedback + contact form); status/communication plan for cutovers (first exercised at AZURE 3.8).

## 8. Evidence still outstanding (consolidated)

| # | Evidence | DTAC area | Earliest sensible moment | Owner |
|---|---|---|---|---|
| 1 | Named Clinical Safety Officer | Clinical Safety | Before submission prep | Liz |
| 2 | DCB0129 safety case + hazard log (seed from ARCH §13) | Clinical Safety | Draft after Phase 6 (feature set stable) | Liz + CSO |
| 3 | Safeguarding design pass with DA charities | Clinical Safety | Pre-launch (ARCH §13.4) | Liz |
| 4 | DPIA | Data Protection | During AZURE Phase 3 (data flows being built) | Liz, drafted by model |
| 5 | ICO registration | Data Protection | Before production launch | Liz |
| 6 | Retention schedule + privacy notice review | Data Protection | Phase 8 closeout | Liz |
| 7 | App Insights telemetry residency check | Data Protection | AZURE 2.5 | model |
| 8 | Cyber Essentials (then Plus) | Security | After Phase I (Azure estate final) | Liz |
| 9 | Penetration test | Technical Security | After Phase I, before NHS-facing use | Liz (procure) |
| 10 | PG RLS hardening + private networking + HA gate | Technical Security | AZURE 8A.3 | model |
| 11 | MFA rollout decision (exports/sharing first) | Technical Security | Phase I design | Liz |
| 12 | Backup restore test (documented) | Operational | After AZURE 2.5 | Liz/ops |
| 13 | Incident response plan incl. breach reporting | Operational | Before production cutover (3.8) | Liz, drafted by model |
| 14 | WCAG 2.1 AA audit + accessibility statement | Accessibility | After Phase 6 | Liz (procure or model-assisted) |
| 15 | MHRA non-device positioning check | Clinical Safety | Before submission prep | Liz |

---

*Update discipline: add rows and evidence pointers as tasks land; move items out of §8 when evidence exists and link it. Never tick a human-owned row on the owner's behalf.*
