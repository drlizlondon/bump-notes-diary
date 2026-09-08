# BumpNotes — Education section ("When to get further help") — decision + execution spec

**Founder ruling, Dr Liz London, 2026-09-08.** BumpNotes will add an **Education section** that explains pregnancy **red-flag symptoms** — what they are and when to get further help — as **generic, non-personalised safety information**. This is deliberately built to stay **outside "software as a medical device"** (it is not triage and not decision-support). It raises safety awareness the way an NHS/NICE leaflet does, without the app ever interpreting the woman's own recorded data.

**Status:** execution-grade spec. Non-device positioning must be **confirmed by the CSO / regulatory advisor** for this specific execution before launch (now an Assuric ask). Extends — does not weaken — the ARCH §2.1 constitution.

## 1. Constitutional placement (why this is allowed)
ARCH §2.1: *"It records information. It does not interpret it."* This section does not interpret **her** information. It presents **general, published clinical education** to everyone, identically, regardless of what she has recorded. The constitutional clarification:

> **General health education is permitted; personalised interpretation of the user's own data is not.** The Education section is a reference surface, structurally isolated from the journal. It never reads, reacts to, filters by, orders by, or is triggered by `entries` or any user-recorded data.

That isolation is the load-bearing property. It is what separates "here are the red flags of pregnancy" (a leaflet — not a device) from "*your* recorded headache is a red flag" (interpretation — a device).

## 2. The non-device guardrails — MECHANICAL acceptance criteria
A future session must be able to satisfy these by construction; violating any one is a device-boundary breach (block the release, log an ADR):

- [ ] **AC-1 No read of user data.** The Education feature's code path imports/uses **nothing** from the entries/journal/measurements data layer. Enforce with a lint/dependency rule (same spirit as the `lib/summary/**` AI fence): the education module may not import the repository/entries modules. A test asserts the rendered content is **identical** for a user with journal data and one with none.
- [ ] **AC-2 Not triggered by input.** No capture screen, entry type, or symptom keyword surfaces, links to, or highlights any red-flag item. There is no "you typed X → see Y" path anywhere.
- [ ] **AC-3 Generic + attributed.** Every item is general information with visible provenance ("General information based on NICE / NHS guidance — reviewed <date>"). No content is authored as BumpNotes' own clinical opinion.
- [ ] **AC-4 Signpost, never verdict.** Every red flag ends in "contact your maternity unit / triage / NHS 111; call 999 if severe" — it directs to a human, never states a diagnosis, severity, or "you are fine / not fine."
- [ ] **AC-5 Standing, not reactive placement.** The section lives as its own standing area (e.g. a "Help & safety" / "Learn" tab), not injected into the timeline or capture flow in response to activity.
- [ ] **AC-6 Content is data, not code.** Red-flag lists are seed/config data (see §4), never hardcoded strings in components.

## 3. Content — default list (NICE/NHS/RCOG red flags)
Default content, shown to all users unless a tenant overrides (§4). Each item: plain-language name · a one-line "what it can be a sign of" · the "get help" action. (Clinician-owned wording; the CSO reviews.)

- **Reduced or changed baby movements** — get checked the same day.
- **Vaginal bleeding** — contact maternity triage.
- **Waters breaking / fluid leaking**, especially before 37 weeks.
- **Severe or persistent headache**, or **visual disturbance** (flashing, blurring) — can signal **pre-eclampsia**.
- **Sudden swelling** of face, hands or feet — pre-eclampsia.
- **Severe pain in the upper tummy / under the ribs** — pre-eclampsia / HELLP.
- **Fever or feeling very unwell** — possible **infection / sepsis**.
- **Intense itching**, especially palms and soles — possible **obstetric cholestasis**.
- **Calf pain/swelling, chest pain, or breathlessness** — possible **clot (VTE)** — urgent.
- **Regular tightening or pain before 37 weeks** — possible **preterm labour**.
- **"Something just doesn't feel right"** — always okay to call and ask.

Framing header: *"This is general information about pregnancy warning signs, not personal medical advice. If you're worried about anything, contact your maternity unit or NHS 111 — call 999 in an emergency."*

## 4. Content model — generic default + per-tenant override (data, not code)
- The default list is **seed data** sourced from NICE/NHS/RCOG, versioned with a review date.
- **A hospital/tenant that signs on can supply their own list** (their triage numbers, their wording). When they do, **they are the clinical authority for their content** — BumpNotes is the vessel, not the author (a cleaner liability position). This must be **real**, not decorative: the tenant owns/edits/versions their list; it is not BumpNotes editing on their behalf. Avoid "tenancy theatre" (ARCH failure-mode discipline).
- Shape: a `red_flag_guidance` config keyed by tenant (default tenant = NICE), each entry `{ title, sign_of, action, source, reviewed_at }`. No per-user variation — the same list for every patient of a tenant.

## 5. Clinical-safety notes for the CSO (Hazard Log candidates)
This section is net safety-positive (raises red-flag awareness), but introduces hazards to log and control:
- **H-10 — false reassurance / mistaken for personal triage:** a user reads generic content as a personalised "all clear." Controls: AC-4 (signpost-not-verdict), AC-1/AC-2 (never personalised, so it cannot appear to be about her), the general-information framing header.
- **H-11 — stale or locally-wrong content:** default or tenant list out of date / not matching local pathways. Controls: `reviewed_at` provenance, tenant clinical ownership of overrides, a review cadence the CSO sets.
- The CSO confirms the **classification** of this specific execution (non-device) and the wording of the default list before launch.

## 6. Explicitly out of scope (the fence)
Personalised triage — "you've recorded a severe headache → call triage," or any surfacing of a red flag *because* of what she logged — is **NOT** this feature. That is Software as a Medical Device and a separate, funded, regulated decision (see the DCB0129 / MHRA scoping with Assuric). This spec must never be extended toward it without that programme.
