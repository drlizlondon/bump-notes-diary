# BumpNotes — Clinical Hazard Log

> **DCB0129 deliverable — DRAFT SCAFFOLD, NOT YET VALID.**
> This is a living register seeded by the manufacturer from the architecture's own risk analysis. **All severity/likelihood/residual ratings are provisional engineering estimates for Clinical Safety Officer validation — not clinical determinations.** No hazard here is "accepted" until a named, qualified CSO signs it off. See [Clinical Risk Management Plan](./CLINICAL_RISK_MANAGEMENT_PLAN.md).

| Field | Value |
|---|---|
| System | BumpNotes V2 | 
| Version | 0.1 (scaffold) · 2026-09-08 |
| Status | DRAFT — pending CSO appointment & sign-off |
| Scoring | Provisional 5×5 (severity × likelihood) per CRMP §4 — CSO to ratify matrix & every score |

**Rating key (provisional):** Sev 1–5 (Minor→Catastrophic) · Lik 1–5 (Very low→Very high) · Residual band A=Acceptable / U=Undesirable (needs justified CSO acceptance) / X=Unacceptable.

## Summary

| ID | Hazard (potential clinical harm) | Init Sev×Lik | Key existing controls | Resid (prov.) | Status |
|---|---|---|---|---|---|
| H-01 | App perceived/used as giving clinical interpretation or advice → delayed/inappropriate care | 4×2 | §2.1 constitution; no ranges/flags/colour (§6.4); zero model calls in pipeline (§12.5); not-a-device disclaimer; provenance footer | A/U | Open |
| H-02 | User expects urgent triage the app doesn't provide → delays seeking care | 4×2 | Contraction timer deliberately removed (§10); care-team numbers printed for her to call triage; disclaimer; no engagement prompts | U | Open |
| H-03 | Summary misleads clinician (her words misattributed, or app scaffolding read as clinical assertion) | 3×2 | Verbatim quoting + attribution; typographic app-furniture vs her-words distinction (§6.3); stable layout; provenance footer | A | Open |
| H-04 | Transcription-arithmetic error (LMP→EDD, G/P notation) → wrong gestation/parity shown | 2×2 | Arithmetic only, no interpretation; render notation **and** plain words; EDD editable; dating-scan = an EDD edit (§10) | A | Open |
| H-05 | Safeguarding: abuser inspects device / notification leak → harm to user | 5×2 | Visibility tiers; private tier excluded from every render incl. Show-My-Screen; no summary content in notifications; unremarkable app-switcher card; **DA-charity design pass (pre-launch)** | U | Open (pre-launch control outstanding) |
| H-06 | Data-migration corruption/loss (blob→tables) → record integrity loss → clinician sees wrong/incomplete history | 3×2 | Dual-write; per-user checksum verification vs source blob; blob retained read-only one release cycle; summaries immutable (DB trigger, verified on Azure) | A/U | Open |
| H-07 | Oversharing via default-include drafts → private content reaches clinician | 2×3 | Tiers keep feelings out structurally; review screen shows the actual document; personal-tier badges interrupt likely mistakes | U | Open |
| H-08 | Stale/incorrect identity or care-team data on summary → misidentification | 3×2 | Internal-UUID identity model; editable About Me; per-region health-identifier label (never hardcoded NHS number) | A | Open |
| H-09 | Unauthorised access to health data → confidentiality breach → harm | 4×2 | API-level authorisation; managed identity, no account keys; Key Vault; short-lived SAS; encryption at rest; blob anon-access disabled | A/U | Open (pen-test outstanding, DTAC §4) |

## Detail

### H-01 — Device-boundary crossing (interpretation/advice)
**Harm:** a user treats the app as clinical advice and defers to it over a professional, delaying or misdirecting care. **Causes:** feature creep toward "is this BP normal?" (ARCH §13.6); UI that implies judgement. **Controls:** the no-interpretation constitution (§2.1) as cultural defence; the structural fence (§12.5 — the snapshot→PDF renderer takes only the frozen snapshot, zero model calls); no reference ranges/flags/colour/trend arrows anywhere (§6.4); "not a medical device" disclaimer at account creation; provenance footer on every PDF page. **CSO actions:** validate non-device positioning vs MHRA guidance; confirm disclaimer wording; add device-boundary review to the change-control gate.

### H-02 — Absence of triage mistaken for safety
**Harm:** user in an urgent situation expects the app to tell her "when to go in" and delays. **Causes:** pregnancy apps commonly bundle triage; users may assume it. **Controls:** the contraction/labour timer was **deliberately removed** as the fastest path across the triage boundary (§10); the product never implies it triages; care-team phone numbers print in the page-1 care block so she can call a human; no prompts that simulate urgency. **CSO actions:** confirm the disclaimer explicitly states the app does not provide urgent advice and directs to NHS 111/triage/999; review onboarding copy.

### H-03 — Misleading summary content
**Harm:** clinician acts on information wrongly attributed or misread as a clinical assertion. **Controls:** her words are always quoted and attributed, never paraphrased/summarised/grammar-corrected; template scaffolding is typographically distinct from her content (§6.3); stable learned layout; provenance footer; past summaries never appear inside new ones; no app-chosen judgement words ("concerning"/"normal") (§6.5). **CSO actions:** review a rendered PDF against these rules.

### H-04 — Transcription arithmetic
**Harm:** wrong gestation or parity displayed. **Controls:** only transcription arithmetic is permitted (LMP→EDD, G/P) (§2.1, §10); both notation and plain words rendered ("3 pregnancies, 2 births"); EDD user-editable; the app holds no opinion on dating. **CSO actions:** verify arithmetic correctness tests exist; confirm edge cases (unknown LMP, dating-scan change).

### H-05 — Safeguarding (domestic abuse)
**Harm:** the record can contain evidence of abuse and the phone may be inspected by an abuser (ARCH §13.4). **Controls:** visibility tiers; private tier structurally absent from all renders including Show-My-Screen; no summary content in notifications; unremarkable app-switcher card. **Outstanding pre-launch control:** a safeguarding design pass with domestic-abuse charities (required, not polish). **CSO actions:** treat as a priority hazard; confirm the pre-launch design pass is scheduled and evidenced before any launch.

### H-06 — Migration integrity
**Harm:** loss/corruption of history during the blob→tables + base64→object-storage migration (ARCH §13.5) → clinician sees wrong/incomplete record. **Controls:** dual-write window; per-user migration with checksum verification against the source blob; blob retained read-only for a full release cycle; summaries immutable (DB trigger + API), verified green on the live Azure PG (AZURE 2.4). **CSO actions:** require a documented backfill verification + rollback plan before cutover (AZURE 3.8).

### H-07 — Oversharing
**Harm:** private-tier or draft content surfaced to a clinician against the user's intent (ARCH §13.2). **Controls:** tiers keep feelings out structurally; the review screen shows the actual document before sharing; personal-tier badges. **CSO actions:** confirm the review screen is unavoidable in the share flow.

### H-08 — Identity / care-team accuracy
**Harm:** misidentification or wrong care-team on the summary. **Controls:** internal-UUID identity model (identity separated from provider); editable About Me; per-region health-identifier label. **CSO actions:** confirm identifier display cannot be mistaken across regions.

### H-09 — Confidentiality breach (technical)
**Harm:** unauthorised access to pregnancy-health data → distress/safeguarding harm. **Controls (cross-ref DTAC §4 / AZURE):** frontend never touches DB/storage credentials; API-level authorisation scoped to the internal user id; managed identity, no account keys; Key Vault; short-lived SAS URLs; encryption at rest; storage anonymous access disabled; EXIF stripped at capture. **Outstanding:** penetration test after Phase I (DTAC §9); PG RLS hardening (8A.3). **CSO actions:** include in pen-test scope; accept residual only with pen-test evidence.

---

*Update discipline: this log is living. Any change touching a clinical-safety control updates the affected hazard in the same commit (CRMP §6). Never lower a residual rating without recording the control that justifies it. No hazard is closed/accepted without CSO sign-off.*
