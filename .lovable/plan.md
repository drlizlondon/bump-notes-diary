## Phase A — Foundations

Three workstreams. End state: a public marketing surface, a cleaner sign-up flow, and a working tester mode. No changes to the dashboard itself, summary PDF, feedback system, or GDPR settings — those land in Phase B/C.

### 1. Public landing experience

New public routes (all SSR, no auth gate, sharing the existing blush/white design language):

```text
/                  → Home (replaces current onboarding-on-root)
/demo              → Demo / Preview with real app screenshots
/contact           → Contact form (writes to contact_messages table)
/privacy           → Privacy Policy
/terms             → Terms of Use
/auth              → existing sign-in/up (kept)
/app               → authenticated dashboard (current "/" content moves here)
```

Home page sections (compact, calm, not a marketing wall):
- Hero: "A gentle, structured record of your pregnancy" + primary CTA **Start your pregnancy record** → `/onboarding`, secondary **Already have an account? Sign in** → `/auth`.
- Three short value points: structured timeline, weekly summary, downloadable record for clinicians.
- Tester invite checkbox: "I've been invited to test BumpNotes" → opens tester modal with the copy you provided, then routes into tester mode.
- Privacy commitment paragraph (no compliance claims).
- Footer with links to Demo, Contact, Privacy, Terms, and a small discreet "Admin" link (code-gated `/admin-access`).

Routing behavior:
- Root route checks for an active Supabase session; signed-in users redirect straight to `/app`.
- Public pages all link to `/auth` and `/onboarding` consistently.

Demo page: real screenshots captured via Playwright against the dev preview (dashboard, timeline, summary view) + a sample PDF preview image. No interactive demo in Phase A.

### 2. Onboarding → Account flow

New flow:
```text
Landing → /onboarding (collects name, baby nickname, due date, language)
        → /auth?mode=signup&pending=1 (account creation, prefilled context preserved)
        → /app (dashboard)
```

- Onboarding data is staged in `localStorage` under `bumpnotes:pending-profile` until account creation succeeds, then promoted into the user's synced state.
- `/auth` reads `?pending=1` and shows "Finish setting up your record" framing.
- `_authenticated` layout already gates `/app`; we add a redirect on `/` for signed-in users.
- Acceptance of Privacy Policy + Terms recorded as a boolean + timestamp during sign-up, stored on the user's state blob (full GDPR table comes in Phase C).

### 3. Tester mode (cloud, flagged)

Tester accounts live in the database with a flag, fully isolated from real users:

- New column `is_tester boolean` on a new `profiles` table (id references auth.users, is_tester, accepted_terms_at, created_at, updated_at). Standard RLS: users see only their own row; service role full access.
- Existing `bumpnotes_state` continues to hold the JSONB blob — tester rows are just rows where the linked profile has `is_tester = true`.
- Tester sign-up flow: anonymous Supabase auth (`signInAnonymously`) → creates auth user → profile row inserted with `is_tester=true` → fresh empty state. No email required.
- Tester banner persists across the app: "Tester mode — fake data only" with a **Reset demo data** button that wipes their `bumpnotes_state` row.
- Settings shows tester status; "Convert to real account" is **out of scope** for Phase A (testers stay testers).
- Future feedback submissions (Phase B) will join on `profiles.is_tester` so admin can filter.

### Technical notes

- Migration: create `profiles` table with grants + RLS; enable Supabase **anonymous sign-ins** via `configure_auth`.
- New files: `src/routes/index.tsx` (rewritten as landing), `src/routes/demo.tsx`, `src/routes/contact.tsx`, `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/onboarding.tsx`, `src/routes/_authenticated/app.tsx` (move current dashboard here), `src/routes/admin-access.tsx` (code-gated stub linking to future admin).
- The current `/` content (dashboard) moves to `/app` under `_authenticated/`; bottom nav and sidebar paths update accordingly.
- `src/lib/bumpnotes/tester.ts` — helpers for `startTesterSession()`, `resetTesterData()`, `isTester()`.
- Existing visual language preserved: same `bg-cream`, `peach`, `rose`, `butter` tokens; same serif headings; same card styling. No new fonts, no new palette.
- Screenshots for `/demo`: captured into `src/assets/demo/*.png` via a Playwright script after the new dashboard route stabilises.

### What does NOT change in Phase A

- Dashboard, timeline, labour, settings UI internals.
- Existing summary export (PDF generation lands in Phase B).
- Feedback button (Phase B).
- Privacy & Data settings panel (Phase C).
- Date picker / responsive polish / overlapping text (Phase C).

### Deliverable

After Phase A you can: visit the published URL, see a calm landing page, click through to Demo/Privacy/Terms/Contact, start onboarding without an account, finish onboarding into account creation with data preserved, or enter tester mode and get a fully isolated sandbox.

Approve to proceed, or tell me what to adjust.