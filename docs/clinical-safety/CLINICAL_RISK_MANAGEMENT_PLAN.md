# BumpNotes — Clinical Risk Management Plan (CRMP)

> **DCB0129 deliverable — DRAFT SCAFFOLD, NOT YET VALID.**
> This plan is a manufacturer-side scaffold prepared to accelerate the DCB0129 process. It is **not compliant clinical-safety documentation until a qualified, named Clinical Safety Officer (CSO) — a registered clinician trained in clinical risk management — reviews, owns, and signs it.** No section here constitutes clinical sign-off. See the header table for status.

| Field | Value |
|---|---|
| Document | Clinical Risk Management Plan (per DCB0129 §5) |
| System | BumpNotes — patient-held pregnancy record & summary tool (V2) |
| Manufacturer | Dr Liz London (sole founder; current top management / accountable person) |
| Clinical Safety Officer | **TO BE APPOINTED** (blocking — see §3). Candidate route: fractional CSO via Assuric |
| Version | 0.1 (scaffold) |
| Date | 2026-09-08 |
| Status | DRAFT — pending CSO appointment & sign-off |
| Related | ARCH `BUMPNOTES_V2_ARCHITECTURE.md` · `docs/DTAC_READINESS.md` §1 · Hazard Log · Clinical Safety Case Report |

## 1. Purpose & scope

This CRMP defines how clinical risk is managed for BumpNotes across design, build, release and post-deployment, per **DCB0129** (Clinical Risk Management: its Application in the Manufacture of Health IT Systems). It covers the BumpNotes V2 web/PWA application: capture of a woman's own pregnancy information, its organisation, and its rendering into a fixed-layout PDF summary she chooses to share with clinicians.

**Product clinical-safety posture (the spine of the safety case).** BumpNotes is a **patient-held record-keeping and communication tool, not a medical device and not clinical decision-support**. Its constitutional constraint (ARCH §2.1) is: *"BumpNotes records information. It does not interpret it."* The app never decides what is clinically important, never ranks, flags, advises, or computes anything clinical beyond transcription arithmetic (LMP→EDD, G/P notation). Interpretation is the clinician's, always. This positioning bounds the clinical hazards and must be validated against MHRA "software as a medical device" guidance by the CSO (DTAC §8 row 15).

**Out of scope:** organisational information governance (DSPT), general cyber security (Cyber Essentials), and accessibility (WCAG) are DTAC pillars tracked in `docs/DTAC_READINESS.md`; this plan addresses clinical safety only, cross-referencing them where a control is shared.

## 2. Clinical risk management process

The manufacturer will operate a Clinical Risk Management System applying, for each release:

1. **Hazard identification** — structured review of intended use, foreseeable misuse, and the design decisions in ARCH (esp. §2.1, §6.4, §10, §12.5, §13). Recorded in the **Hazard Log**.
2. **Risk analysis** — for each hazard: clinical harm, cause(s), and initial risk = f(severity, likelihood) per §4.
3. **Risk evaluation** — against the acceptability criteria in §4.
4. **Risk control** — design/technical/process controls; re-score to residual risk; controls that are load-bearing are traced to code or process.
5. **Safety case & closure** — the **Clinical Safety Case Report** argues, with evidence, that residual risk is acceptable for the release.
6. **Post-deployment** — incident capture, hazard-log review on change, and CSO re-approval on material change (see §6).

## 3. Roles & responsibilities

| Role | Holder | Responsibility |
|---|---|---|
| **Clinical Safety Officer (CSO)** | **TO BE APPOINTED** | Owns clinical risk management; must be a registered, practising/registered clinician trained in DCB0129; reviews and **signs** the CRMP, Hazard Log and CSCR; has authority to hold a release. **This appointment is the single blocking dependency for valid DCB0129 evidence.** |
| Top management / accountable person | Dr Liz London | Resources the CRMS; accountable for the manufacturer's clinical-safety obligations |
| Engineering | Dr Liz London + AI pair | Implements and evidences controls; keeps the Hazard Log current with design changes |

Until a CSO is appointed, all clinical-risk scoring, hazard acceptance and safety-case conclusions in the Hazard Log and CSCR are **provisional engineering drafts for CSO validation**, not clinical determinations.

## 4. Risk acceptability criteria (to be ratified by the CSO)

Provisional 5×5 model (DCB0129-typical; the CSO confirms or replaces the definitions and matrix):

**Severity of clinical harm:** 1 Minor · 2 Significant · 3 Considerable · 4 Major · 5 Catastrophic.
**Likelihood:** 1 Very low · 2 Low · 3 Medium · 4 High · 5 Very high.

**Risk rating** = severity × likelihood band → **Acceptable** (low), **Undesirable** (requires controls + CSO acceptance with justification), **Unacceptable** (must not ship until reduced). The CSO ratifies the matrix thresholds before any residual risk is accepted.

## 5. Hazard identification inputs (seed)

The initial Hazard Log is seeded from: ARCH §2.1 (no-interpretation constitution), §6.4 (measurements without interpretation), §6.5 (what never appears), §10 (the triage boundary; contraction-timer removal), §12.5 (the AI fence — zero model calls in the snapshot→PDF pipeline), §13 (risks & trade-offs), and the safeguarding requirements (ARCH §13.4). Technical-security controls that reduce confidentiality-harm hazards are cross-referenced to `docs/DTAC_READINESS.md` §4 and the AZURE plan.

## 6. Configuration, change & incident management

- **Change control:** one task per commit, immutable checksummed migrations, green build/lint gate, staging-deployable discipline (WORK.md §3). Any change touching a clinical-safety control updates the Hazard Log **in the same commit** and triggers CSO review before release.
- **Material change** (new clinical-adjacent feature, change to a load-bearing control, or anything approaching the device boundary) requires CSO re-approval of the affected hazards and the CSCR.
- **Incident management:** a clinical-safety incident route is a pre-launch outstanding item (DTAC §7); it must include the path to the CSO and, where personal data is involved, the ICO 72-hour breach path.

## 7. Deliverables & closure

For each release the CRMS produces: this **CRMP**, a current **Hazard Log**, and a **Clinical Safety Case Report** signed by the CSO. A release is clinically approved only when the CSO has signed the CSCR and no hazard is left at Unacceptable residual risk. Per the existing programme plan, the full safety case is completed once the feature set stabilises (≈ AZURE/PLAN Phase 6); the CRMP and Hazard Log are **living from now**, so evidence is accumulated, not reconstructed.
