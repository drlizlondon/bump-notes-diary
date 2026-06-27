## BumpNotes Public Beta Polish — Plan

A focused refinement pass. No redesign — preserve the existing layouts, palette, typography, and components. Each change strengthens what's already there.

### 1. Branding
- Save both uploaded logos as project assets (`bumpnotes-wordmark.png`, `bumpnotes-icon.png`).
- Replace every circular gradient "b" badge with:
  - **Wordmark** on `/welcome`, `/auth`, `/demo`, `/contact`, `/privacy`, `/terms`, onboarding header, and PDF cover.
  - **Icon-only** in `AppShell` sidebar/header, `BottomNav` brand mark, favicon, PWA manifest, splash.
- Remove the tagline everywhere (welcome hero, footer, meta strap line). Do not introduce a new one.
- Normalise sizing (header icon 28px, hero wordmark max-width 240px) and spacing.

### 2. Public landing
- Refresh `/welcome` with a calm hero: wordmark, short "What BumpNotes is / what you can do", primary CTA **Start your pregnancy record**, secondary **Already have an account? Sign in**, tester checkbox, footer links to Privacy & Terms.
- Move screenshots/example content off Home → `/demo` (dashboard shot, Pregnancy Summary excerpt, finished PDF preview).
- Root route (`/`) already redirects authenticated users to dashboard — verify.
- Trim `PublicShell` nav: Home / Demo / Contact / Sign in.

### 3. Auth flow
- Onboarding → Create account (default tab) → Dashboard. Sign-in is a secondary tab for returning users.
- Remove "Continue without an account".
- Auth page copy: "Create your account to securely save your pregnancy record and access it again later."
- Open Privacy/Terms in a new tab so onboarding state isn't lost; preserve `pendingOnboarding` in localStorage and resume on return.
- Hide Apple sign-in and magic links (not configured). Keep Email + Google.

### 4. Tester mode (password)
- Add `TESTER_PASSWORD` env var + server function `verifyTesterPassword` (timing-safe).
- On landing, ticking the tester checkbox opens a modal → password field → on success store `bumpnotes:tester=1` and show welcome message ("Fake data only, please don't enter real pregnancy info, explore freely, report anything broken, thank you 💛") then enter app.
- Tester data stays local-only; no cloud writes. Existing `TesterBanner` retained.

### 5. Feedback
- Keep persistent `FeedbackButton`. Categories: Suggestion / Problem / Question / Positive.
- Auto-capture: path, app version, timestamp, UA, user id or tester session id. Stored in existing `feedback_submissions` table.
- Contact page remains separate (public form → `contact_messages`).

### 6. UI polish
- Replace native date input in Onboarding with a shadcn Popover + Calendar that auto-closes on select and shows the chosen date as DD/MM/YYYY.
- Fix overlap/clipping on small screens using the responsive grid pattern (`grid-cols-[minmax(0,1fr)_auto]`, `min-w-0`, `shrink-0`, `truncate`).
- Audit modals (Feedback, tester) for safe-area & centred positioning.
- Tighten typography scale and spacing on Pregnancy Summary and Settings.

### 7. English only
- Hide the language selector on welcome and in settings. Keep i18n plumbing but force `en`.

### 8. Pregnancy Summary
- Rename all UI strings: "Summary" → "Pregnancy Summary", action → **Generate Pregnancy Summary**.
- Confirm PDF path uses `jsPDF` structured data (already in `pdf.ts`); remove any leftover screenshot fallback.
- Add a short intro panel clarifying Pregnancy Record vs Pregnancy Summary.

### 9. Privacy & GDPR
- Settings → **Privacy & Data** section:
  - View my data (modal with JSON preview)
  - Download my data (JSON)
  - Delete pregnancy record (clears entries, keeps account)
  - Delete account (signs out + removes `bumpnotes_state` and `profiles` row)
  - Links to Privacy Policy and Terms.
- Verify RLS policies on `bumpnotes_state`, `profiles`, `feedback_submissions`, `contact_messages` (already user-scoped).

### 10. Effortless recording UX
Core change to `Panels.tsx`:
- **Tap-to-record**: tapping a symptom/feeling/photo-tag immediately creates the entry and shows an inline `✓ <label> recorded · Undo` strip that fades after 5s.
- **Progressive disclosure**: after recording, smoothly expand only the qualifiers relevant to that entry (no "Optional details" heading). Editing any field patches the existing entry via new `store.updateEntry(id, patch)`.
- **Auto-save** on blur / change / collapse / navigation; remove explicit Save buttons from Symptoms, Feelings, Photos, Note, Measurements, People & Care. Multi-field flows (People & Care, Measurements) keep a single "Done" affordance only when the entry can't be inferred from one tap.
- **Tailored qualifiers** per category (Nausea: severity, vomiting, trigger, notes; Pain: location, severity, constant/intermittent, notes; Movement: more/normal/less + notes; etc.).
- **Save feedback**: silent by default; toast only on first record, offline, error, syncing.
- **Dashboard copy**: "What would you like to capture?" → **What happened?**
- **Dashboard cards**: replace static Privacy card with **This week** (entries this week, last entry, summary status).

### Technical notes
- New: `src/lib/bumpnotes/tester-auth.functions.ts` (verify password), `src/components/bumpnotes/TesterPasswordModal.tsx`, `src/components/bumpnotes/UndoStrip.tsx`, `src/assets/bumpnotes-wordmark.png.asset.json`, `src/assets/bumpnotes-icon.png.asset.json`.
- Edited: `Onboarding.tsx`, `welcome.tsx`, `auth.tsx`, `demo.tsx`, `PublicShell.tsx`, `AppShell.tsx`, `BottomNav.tsx`, `HomeHeader.tsx`, `index.tsx` (home), `Panels.tsx`, `pack.tsx`, `settings.tsx`, `store.ts` (add `updateEntry`), `pdf.ts` (header logo + title rename), `i18n.ts` (force en, new copy), `__root.tsx` (favicon + manifest), `feedback.ts`.
- Secret: `TESTER_PASSWORD` added via add_secret.
- No schema migration needed (existing tables cover feedback, profiles, state). Only verify GRANTs + RLS.

### Out of scope
Visual redesign, Turkish localisation, new colour tokens, push notifications, native mobile build.
