# BumpNotes for maternity services — implementation plan

## Goal
Add a standalone, mobile-first `/maternity-services` experience that extends the existing BumpNotes website without changing the live patient product. It will demonstrate the future woman → sharing → maternity team → service insight journey using fictional, clearly labelled example data, then collect structured validation feedback.

## 1. Existing functionality discovered
- The public website uses the shared BumpNotes header/footer and already has separate Home, Features, Our Story, clinician/trust, Preview, Privacy and Contact pages.
- The live patient product already provides the journal, timeline, About Me, Pregnancy Summary and settings journeys. Its current capture sections and wording will be treated as the source of truth.
- The existing `/demo` is safely isolated: fictional data runs through the same repository contract but remains in browser session storage and never writes to patient records.
- The current Pregnancy Summary supports week selection, category selection, line-level exclusion, preview, PDF download, copy and device sharing. It does not yet send summaries to a maternity-team inbox.
- The future database already defines users, profiles, pregnancies, people/care-team members, journal entries, attachments, immutable summary snapshots and audit events. There is currently no maternity organisation/service model or team inbox model.
- Authentication currently supports the live account flow while a phased identity migration is in progress. This new public page does not need sign-in.
- The public Contact page currently uses direct email. Structured in-app feedback is already stored through a validated server function and is visible to admins.

## 2. Components and visual language to reuse
- Reuse the public header/footer, circular BumpNotes mark, Fraunces/Instrument Sans typography, coral/blush/mint/butter/lavender tokens, compact cards and pill controls.
- Reuse the live journal’s labels, information hierarchy and visual patterns rather than creating a second patient interface.
- Reuse the existing Pregnancy Summary styling and summary-generation logic where it matches the demo; wrap it with demo-only controls and copy rather than changing the live summary flow.
- Reuse existing date/time formatters so all examples use British English, DD/MM/YYYY and 24-hour time.
- Reuse the existing admin feedback area to surface maternity-service validation responses.

## 3. New page and navigation
- Create `/maternity-services` with unique page metadata and add **For Maternity Services** to desktop navigation, mobile navigation and the public footer.
- Keep the existing homepage and all current public/patient routes unchanged.
- Build the page in clear full-width sections:
  1. Hero with the supplied title, status, supporting copy and CTAs.
  2. Guided interactive product journey.
  3. Privacy and non-interpretation statement.
  4. Validation/test-site invitation.
  5. Structured interest and feedback form.
- **Try BumpNotes** will lead to the existing patient preview. **Explore the maternity-service demo** will focus and start the guided demo on the same page.

## 4. Guided demo architecture
- Implement a six-stage, click-driven demo with persistent progress, Back, Next and Exit controls:
  1. Woman’s BumpNotes
  2. Prepare a summary
  3. Share with the team
  4. Maternity team inbox
  5. Service dashboard
  6. Patient-generated insight
- Map the requested detailed journey into those stages, including care-service context, exact sharing confirmation/history, the woman-to-team transition, inbox detail, team actions, service adoption, sharing activity, aggregate themes and the closing journey recap.
- Use route-local demo state only. No patient authentication, database reads, database writes or production analytics data will power the prototype.
- Use realistic fictional fixtures with persistent **DEMO**, **Example data** and **DEMO DATA** labels. Nottingham will exist only in fixture/display data, never application logic.
- Make the flow interactive rather than automatic: highlighted next action, subdued pulse respecting reduced-motion settings, clickable summary controls, inbox rows, review/archive state and an Insights action.
- Preserve the product boundary throughout: no triage, diagnosis, clinical flags, recommendations, scoring or interpretation.

## 5. Demo screens
- **Woman’s journal:** mirror the current BumpNotes journal, add fictional maternity-service/team context, privacy banner, current record sections, **Prepare for my appointment**, and a prominent guided **Share with my maternity team** action.
- **Summary:** organise only the woman’s selected information under the supplied patient-voice headings. Demonstrate Edit, Preview, Share and Save for later without altering the production summary workflow.
- **Sharing:** show an exact preview of what will be sent, explicit opt-in privacy wording, a fictional success receipt and sharing history.
- **Maternity team:** use the requested conceptual navigation and fictional inbox. Open a patient-generated summary and support local demo actions for reviewed, internal note and archive states.
- **Service dashboard:** show the supplied example metrics, adoption funnel, sharing activity and themes with careful qualifiers such as “Among BumpNotes users” and “Example aggregate insight”.
- **Completion:** recap WOMAN → SHARE → MATERNITY TEAM → MATERNITY SERVICE, then lead into validation.

## 6. Database models required
- **No new patient, pregnancy, journal, organisation or sharing tables for this prototype.** The maternity-service journey is explicitly fictional and isolated.
- Store validation responses in the existing `feedback_submissions` table using its structured `context` field and a dedicated form marker. This avoids a duplicate contact system and avoids prematurely introducing a multi-tenant service model.
- If the maternity-service layer later becomes real, it will require a separate reviewed design for multi-tenant organisations, memberships, patient-controlled share grants, inbox items, immutable sharing receipts and aggregate privacy thresholds. None of that will be implied or partially built now.

## 7. Permissions required
- No new user or staff role is required for the demo.
- Add one narrowly scoped public server action that can only validate and insert maternity-service validation submissions; it will not expose reads or touch patient data.
- Continue using the existing server-verified admin permission for viewing responses. Add a maternity-service filter/detail presentation inside the existing admin feedback area rather than creating a second admin system.
- The conceptual team actions in the demo remain local UI state and confer no real permissions.

## 8. Form/contact architecture
- Build the supplied low-friction form with required first name, role and area/organisation fields.
- Ask whether the visitor wants contact or only wants to provide feedback. Email remains optional for feedback-only submissions and becomes required when they request contact or pilot updates.
- Include the two problem/usefulness prompts, validation-interest choice, optional additional notes and pilot-updates opt-in.
- Validate and length-limit every field on the server; record a form marker, page path and timestamp in the existing feedback pipeline.
- Show an honest success state and retain the existing direct contact email as a fallback. Do not create booking, procurement or CRM behaviour.

## 9. Risks and protections
- **Patient regression:** keep all work additive; do not edit live journal, summary, authentication or data flows except adding the public navigation link.
- **Demo leakage:** keep fixtures in a dedicated demo module and never import them into production patient repositories or service analytics.
- **Deployed-product ambiguity:** repeat explicit development/demo labels at page, guide and data-view level; do not use NHS branding or claim deployment, validation, pilots or partnerships.
- **Privacy misunderstanding:** show only explicit-share data in the team view and state that private journal content is never automatically shared.
- **Architecture drift:** do not add an organisation model until real tenancy, identity, consent and aggregation requirements are agreed.
- **Navigation crowding:** keep the new label readable on mobile and desktop without changing the homepage composition.
- **Current environment issue:** the preview is presently blocked by a package-cache 404 for `h3-v2`; after implementation, verification will include the build, desktop/mobile walkthroughs and all demo interactions once dependency installation is healthy.

## 10. Verification
- Confirm every existing public and patient route still resolves and its visible journey is unchanged.
- Walk the full maternity-service demo on iPhone-sized and desktop viewports, including Back, Next, Exit and every required click.
- Confirm no network request from the guided demo contains fictional patient data.
- Submit both feedback-only and contact-request form variants; verify validation, success state and admin visibility.
- Check all new copy for British English, UK date/time formatting, demo labelling and the “records, does not interpret” boundary.
