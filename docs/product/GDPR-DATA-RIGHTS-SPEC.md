# BumpNotes — GDPR "not-built" spec (data-subject rights + gaps), 9 Sep 2026

Execution-grade specs for the GDPR items that are **designed but not built**, plus
the **governance items that are not engineering** (owner = Liz + DPO/legal). Feeds
the AZURE migration plan **Phase 8 (closeout)** — this is that content at build
grain, not a parallel track. Special-category (health) data raises the bar
(Art 9); nothing here constitutes legal advice — it needs a DPO/legal sign-off.

Grounding facts (current build): all user data is owner-scoped in Postgres
(profiles, pregnancies, people, health_items, preferences, entries, attachments,
summaries — every table FK → `users(id)` **ON DELETE CASCADE**, except
`audit_events.actor_user_id` **ON DELETE SET NULL**), blobs live in four
containers (`user-uploads`, `profile-images`, `generated-summaries`, `exports`)
keyed under a `{userId}/…` path prefix, and identity is Entra External ID
(deletable via Microsoft Graph). An append-only `audit_events` table already
exists.

---

## Part 1 — Engineering work packages (buildable, with acceptance criteria)

### GDPR-1 — Right of access / data portability (Art 15 & 20)
A "Download my data" that returns a **complete, structured, machine-readable**
copy of everything the signed-in user owns.
- **Server fn `exportMyData`** (`requireApiAuth`, owner-scoped): gather all rows
  from every table for `context.userId` into one JSON document (camelCase, the
  domain shapes), plus a `manifest` of attachments/summaries with **short-lived
  SAS download URLs** (reuse `issueDownloadSas`). Include a top-level
  `exportedAt`, `schemaVersion`, and the user's Entra account id/email.
- **Format:** JSON (portability, Art 20) + the original files via the SAS URLs.
  Optional v2: assemble a ZIP (JSON + files) server-side.
- **UI:** Settings → "Download my data" → progress → download.
- **Audit:** write an `audit_events` row (`action='data_export'`, actor, ts).
- **Acceptance:** a signed-in user receives a JSON containing **every** entity they
  own and working links to **every** attachment/summary file; contains **no** other
  user's data (verified by a second-account test → 403/empty); an audit row is
  written; large accounts (100s of entries + photos) complete without timeout.

### GDPR-2 — Right to erasure / delete my account (Art 17)
Irreversible deletion of the user's personal data across Postgres, Blob, and Entra.
- **Server fn `deleteOwnAccount`** (`requireApiAuth`), in order:
  1. Write an **erasure audit record first** (`action='account_erasure_requested'`)
     — because the actor id is about to be nulled; retain a minimal,
     non-personal record that an erasure occurred (lawful — Art 17(3)/accountability).
  2. Delete all blobs under `{userId}/` prefix in **all four containers**.
  3. `DELETE FROM users WHERE id = $userId` → **cascades** profiles/pregnancies/
     people/health_items/preferences/entries/attachments/summaries; `audit_events`
     actor is set null (records survive, de-identified).
  4. Delete the **Entra account** via **Microsoft Graph** `DELETE /users/{oid}`
     using the admin app registration (needs `User.ReadWrite.All` app permission on
     the external tenant + client credential — **dependency, see GDPR-5**).
  5. Sign the user out.
- **UX:** explicit, typed confirmation ("delete" + re-auth); state clearly it's
  permanent and lists what's removed. Consider a **short grace window** (e.g. 7 or
  30 days soft-lock before hard delete) — **product/legal decision** (Art 17 is
  "without undue delay"; a short recovery window is generally acceptable).
- **Acceptance:** after completion — zero PG rows for that user (queried directly),
  zero blobs under `{userId}/`, the Entra account is gone (Graph 404), the user
  cannot sign in; a **de-identified** erasure audit record persists; re-running is
  idempotent/safe.

### GDPR-3 — Explicit consent capture + withdrawal (Art 7 & Art 9)
Health data almost certainly relies on **explicit consent**; it must be recorded
with **what**, **when**, and **which policy version**, and be **withdrawable**.
- **Schema (migration 003):** `consents(id, user_id FK, kind, policy_version,
  granted_at, withdrawn_at, source)` — `kind` e.g. `health_data_processing`,
  `privacy_policy`, `terms`. (Today only `profiles.accepted_terms_at/
  accepted_privacy_at` timestamps exist — insufficient for versioned, per-purpose,
  withdrawable consent.)
- **Server fns:** `recordConsent(kind, policyVersion)`, `withdrawConsent(kind)`,
  `getConsents()`. Sign-up/onboarding records the explicit health-data consent.
- **Acceptance:** consent is stored with purpose + policy version + timestamp at
  sign-up; withdrawable from Settings (writes `withdrawn_at` + audit); the current
  consent state is queryable; withdrawal is surfaced to the app (e.g. gates further
  processing per the product/legal rule).

### GDPR-4 — Data retention mechanism (Art 5(1)(e))
Personal data kept no longer than necessary.
- **Policy = product/legal decision** (how long after inactivity / pregnancy end /
  account closure). Once set, build a **retention job** (scheduled) that flags then
  deletes per policy, reusing the GDPR-2 deletion primitives; every action audited.
- **Acceptance:** a documented retention policy exists (owner: Liz/DPO) **and** a
  job enforces it with audit — *blocked on the policy decision.*

### GDPR-5 — Enablers / dependencies
- **Graph delete permission:** the admin app registration needs `User.ReadWrite.All`
  (application) consented on the external tenant + a client-credential path for
  `deleteOwnAccount` (GDPR-2 step 4). Server-side only.
- **Access logging completeness:** confirm `audit_events` covers read/export/delete
  of health data (for accountability + breach forensics); App Insights alerts on
  anomalies. Mostly config; the audit table exists.
- **Breach detection/response:** technical enablers are audit + monitoring/alerts;
  the **response process** (72-hour notification, etc.) is governance (Part 2).

---

## Part 2 — Governance items (NOT engineering — owner: Liz + DPO/legal)

These are required for GDPR but are documents/decisions, not code. Do not let a
green build imply these are done.
- **DPIA (Data Protection Impact Assessment)** — **required** for health data;
  complete with the DPO/CSO before public launch.
- **Lawful basis decision** — confirm **explicit consent (Art 9(2)(a))** (or another
  Art 9 condition) and document it; drives GDPR-3.
- **Privacy notice / policy** — user-facing, legally reviewed; versioned (ties to
  GDPR-3 `policy_version`).
- **ROPA** (Records of Processing Activities, Art 30).
- **Data Processing Agreements** — record Microsoft (Azure + Entra) as processors
  under their DPA; confirm no other processors after Supabase retires.
- **Breach-response procedure** (Art 33/34) — who, how, 72-hour clock.
- **Data-subject request handling** — a route/inbox + SLA for access/erasure
  requests that arrive outside the in-app buttons.

---

## Suggested order
1. **GDPR-1 (export)** and **GDPR-2 (erasure)** — the two rights users most expect
   and regulators check first; both are self-contained server fns + a Settings UI,
   buildable now (GDPR-2 needs the GDPR-5 Graph permission).
2. **GDPR-3 (consent)** alongside the privacy-notice/lawful-basis governance work.
3. **GDPR-4 (retention)** once the policy is decided.
Governance (Part 2) runs in parallel on the DPO/legal track and gates public launch.
