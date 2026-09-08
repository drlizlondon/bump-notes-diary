# BumpNotes — "Security & NHS-readiness" page (DRAFT — publish tick-by-tick as earned)

> **NOT FOR PUBLICATION AS-IS.** This is the accurate content for a public trust page. **Honesty first (founder standard 2026-09-08).** Every ✅ must be true of the **LIVE product** before it goes public; ⏳ items stay clearly in-progress. **Never** state "DTAC compliant" or "approved / ready for NHS use" until the certification actually exists. NHS procurement rewards this transparency and punishes overclaiming.
>
> **Maintainer note — how ticks flip:** several ✅-worthy controls (UK data residency, managed identity, Entra sign-in, append-only audit) are built but **live only after the Azure cutover** — they stay ⏳ until production runs on the Azure stack. The clinical-safety / DPIA / Cyber Essentials / WCAG / pen-test ticks flip only on the CSO's/assessor's sign-off.

---

## Page: "Built for trust. Working toward NHS standards."

BumpNotes holds pregnancy information — some of the most personal data there is. We build to NHS-grade standards and we tell you plainly where we are: what's covered today, and what we're still working toward. We will never claim a certification we haven't earned.

### ✅ Covered today (true of the live product now)
- **Your data is minimised by design.** We ask for as little as possible; almost everything is optional.
- **Private by default.** A private tier never appears in any shared summary or notification, and never in "show my screen."
- **You're in control.** Full export of your data and one-tap account deletion, any time.
- **Analytics never see your health data.** Analytics are opt-in, and names, notes, symptoms, and pregnancy details are never sent to them.
- **It records; it never diagnoses.** BumpNotes organises your own words — it does not interpret, rank, flag, or advise. Clinicians interpret; that's their job, not ours.
- **Consent, clearly.** You choose what's shared, and you see the actual document before you share it.

### ⏳ In progress — the Azure UK move (shipping with our migration)
*(These are built and verified on our new infrastructure; they go live for everyone at cutover, and this list turns green then.)*
- **UK data residency** — your record, files, and secrets held in the United Kingdom.
- **Modern identity** — sign-in via Microsoft Entra, with a separate, MFA-protected world for staff/admin.
- **No stored keys** — every system talks to the next using managed identities, not shared passwords.
- **Encryption everywhere** — at rest and in transit.
- **An append-only audit trail** of security-relevant events (never your record content).

### ⏳ In progress — formal NHS assessment (DTAC)
*(Each turns green only on independent sign-off. We won't tick these ourselves.)*
- **Clinical safety (DCB0129)** — clinical risk management led by a qualified Clinical Safety Officer.
- **Data protection** — a completed DPIA and information-governance assessment.
- **Cyber security** — Cyber Essentials, then Plus.
- **Accessibility** — a WCAG 2.2 AA audit and published accessibility statement.
- **Independent security test** — a penetration test.

### Our promise
When each of these is genuinely done, it moves to "covered" — with the evidence to back it. Until then, it stays here, honestly. If you're an NHS team considering BumpNotes, [talk to us](#contact) — we'll show you exactly where we are.

---

## Implementation notes (for whoever builds the real page)
- Render this as a real route/component only when publishing; keep the ✅/⏳ split data-driven so a control moves groups by changing one flag (no re-authoring).
- Do not add a control to ✅ until it is true of production. The migration cutover flips the Azure-stack group; the CSO/assessors flip the DTAC group.
- Link "talk to us" to the real contact route.
- Keep the copy plain and non-defensive — transparency is the selling point.
