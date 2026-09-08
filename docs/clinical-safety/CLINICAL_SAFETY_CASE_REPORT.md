# BumpNotes — Clinical Safety Case Report (CSCR)

> **DCB0129 deliverable — DRAFT SKELETON, NOT YET VALID.**
> A Clinical Safety Case Report is the argument, with evidence, that a release's residual clinical risk is acceptable. **It has no standing until authored/endorsed and signed by a named, qualified Clinical Safety Officer.** This skeleton is prepared so the CSO refines a real draft rather than starting from blank. Nothing here is a clinical conclusion.

| Field | Value |
|---|---|
| Document | Clinical Safety Case Report (per DCB0129 §6) |
| System / release | BumpNotes V2 — release TBD (safety case completed once feature set stabilises, ≈ Phase 6) |
| CSO | **TO BE APPOINTED** — this report cannot be issued without a signed CSO declaration (§9) |
| Version | 0.1 (skeleton) · 2026-09-08 |
| Status | DRAFT — pending CSO |
| References | [CRMP](./CLINICAL_RISK_MANAGEMENT_PLAN.md) · [Hazard Log](./HAZARD_LOG.md) · ARCH · `docs/DTAC_READINESS.md` |

## 1. System description & intended use
BumpNotes is a patient-held pregnancy record and communication tool. A pregnant woman captures her own information (symptoms, measurements, questions, appointments, uploads, feelings) and, on demand, renders a fixed-layout PDF summary she chooses to share with clinicians. **Intended use:** to help her keep and communicate *her own* information. **Not intended:** to interpret, rank, flag, advise, triage, or make any clinical determination (ARCH §2.1, §6.4, §10, §12.5). *[CSO to confirm the intended-use statement and the non-medical-device classification against MHRA guidance.]*

## 2. Scope of this safety case
The BumpNotes V2 application and its summary output. Excludes organisational IG, general cyber security, and accessibility (DTAC pillars tracked separately) except where a control reduces a clinical hazard. *[CSO to confirm scope boundaries.]*

## 3. Clinical risk management methodology
Per the [CRMP](./CLINICAL_RISK_MANAGEMENT_PLAN.md): hazard identification → analysis → evaluation against ratified acceptability criteria → control → residual scoring → this report. Hazards seeded from the architecture's own risk analysis and safeguarding requirements. *[CSO ratifies the risk matrix and every score.]*

## 4. Safety argument (the spine)
The claim to be substantiated: **residual clinical risk is acceptable because BumpNotes is architecturally prevented from interpreting, and communicates only the user's own attributed words.**

Sub-arguments and their evidence:
- **The app cannot interpret** — no reference ranges/flags/colour/trend indicators (§6.4); the snapshot→PDF pipeline contains **zero model calls, structurally** (§12.5), enforced by a lint fence on `lib/summary/**`; any future AI assists input only, never output (§12.5 four-test fence). *[Evidence: code + lint rule; CSO review of a rendered PDF.]*
- **The fastest path across the clinical boundary was removed** — the contraction/labour timer is deleted by design (§10). *[Evidence: PLAN Phase 1 commits.]*
- **Her words are hers** — verbatim, attributed, typographically distinct from app furniture (§6.3); provenance footer; no app-chosen judgement words (§6.5). *[Evidence: rendered PDF.]*
- **Safeguarding by design** — visibility tiers, private tier absent from all renders, no summary content in notifications; **pending** the pre-launch DA-charity design pass (H-05). *[Evidence: design pass report — OUTSTANDING.]*
- **Record integrity** — immutable, checksummed summaries (verified on live Azure PG); migration with checksum verification and read-only source retention. *[Evidence: AZURE 2.4 verification; migration verification plan — to complete at 3.8.]*
- **Confidentiality** — API-level authorisation, managed identity/no account keys, encryption at rest, anon-access disabled; **pending** penetration test (H-09). *[Evidence: AZURE plan; pen-test report — OUTSTANDING.]*

## 5. Hazard summary
See the [Hazard Log](./HAZARD_LOG.md) (H-01…H-09). *[CSO to confirm completeness, add any hazards from clinical review, and set final residual ratings.]*

## 6. Residual risk summary
*[To be completed by the CSO once scores are ratified. No residual risk may be presented as accepted here without the CSO's endorsement. Known items that must be closed or explicitly accepted first: H-05 DA-charity design pass, H-09 penetration test.]*

## 7. Deployment & post-deployment
Clinical-safety incident route (incl. path to CSO and ICO breach path) is a pre-launch outstanding item (DTAC §7). Hazard Log is reviewed on material change; CSO re-approves affected hazards and this report (CRMP §6).

## 8. Outstanding before this report can be issued
1. **CSO appointed** and this report authored/endorsed by them.
2. Risk matrix & all scores ratified.
3. H-05 safeguarding design pass with DA charities completed and evidenced.
4. H-09 penetration test completed and evidenced.
5. MHRA non-medical-device positioning confirmed.
6. DPIA available (Data Protection; DTAC §3) — cross-dependency.

## 9. Clinical Safety Officer declaration
> *To be completed and signed by the appointed CSO. Until signed, this document is a manufacturer scaffold only and carries no clinical-safety assurance.*

- CSO name / registration / DCB0129 training: __________
- Statement of residual-risk acceptability for the named release: __________
- Signature / date: __________
