# BumpNotes V2 — Definitive Product Architecture

**Status:** v2 of this document — incorporates the refined direction (journal-first, simplified onboarding, My Preferences, single summary flow)
**Author role:** CPO / UX Director / maternal health product strategy
**Date:** 10 July 2026
**Intended reader:** The team, and an implementing model (Claude Sonnet / Codex) that must build this without further product decisions.

---

## 1. Executive verdict

The refined direction is better than the previous draft of this document in three specific ways, and this version adopts all three without reservation:

1. **Journal-first is the correct centre of gravity.** The previous draft made the appointment date the product's "heartbeat" — countdown hero, pre-appointment prompts, a "get ready" reframe of the summary button. That machinery is deleted. Women generate summaries for GP visits, triage calls, second opinions, physio referrals, their own records — tying the product's pulse to booked appointments was designing for one use case and calling it the mission.
2. **The single summary flow (date range → generate → review → share) is right for V2.** No audiences, no appointment-prep questions, no branching. The architecture keeps room for summary types internally (§5.4, §12.3) but the UI shows exactly one path.
3. **The core principle is now stated in its final form** and is quoted verbatim throughout: *BumpNotes records information. It does not interpret it.* This is sharper than any phrasing in the previous draft and it becomes the product's constitutional sentence (§2.1).

**My Preferences is the best new idea in the refinement.** Enduring preferences about how she wants to receive care — "I lip-read," "please avoid eye contact," "my partner usually speaks for me" — is information no clinical system captures well, it is unambiguously hers, it requires zero interpretation, and it is useful in *every* encounter including ones BumpNotes will never know about. Default-included in every summary is correct. This card can carry the product's reputation the way the original proposal hoped "What I'd like my healthcare team to know" would.

**One flag before anything else.** The refined five-card list *silently drops* the free-text card the original proposal called "possibly one of the product's defining features" ("What I'd like my healthcare team to know"). If that was deliberate, remove §3.4's last bullet. This document assumes it was collateral, and folds it into **My Preferences** as that card's closing prompt — "Anything else you'd like your care team to know?" — because the two are the same species of information (enduring, self-authored, for-every-encounter) and giving it its own card would recreate a second home. One card, one home, feature preserved. Reverse this in one line if you disagree.

Everything else in this document is the previous architecture updated to the refined direction, with the appointment-centric elements removed and the reasoning re-checked against "deliberately simple, no future use cases before we need them."

---

## 2. Product philosophy

### 2.1 The constitutional sentence

> **BumpNotes records information. It does not interpret it.**

Every design dispute in the product's future should be settled by this sentence before anyone opens a spec. The app never decides what is clinically important, never ranks, never flags, never advises. It organises the woman's information clearly; healthcare professionals remain responsible for interpretation. This is simultaneously:

- the mission (her story, her words, her control),
- the regulatory boundary (record/organise/communicate, never interpret/prioritise/diagnose),
- and the trust contract with clinicians (a document they can believe is unfiltered by software).

Neutrality is the feature. An app with no opinions and a perfect memory.

### 2.2 Journal first, summary on demand

BumpNotes is a **pregnancy journal** that can, at any moment the woman chooses, produce an excellent summary of itself. The precise formulation:

> **The journal is the daily life of the product. The summary is its voice.**

Design consequences:

- Capture must stay effortless and unceremonious. A woman logging "felt the baby hiccup, cried a bit, so happy" at 11pm is journalling, not preparing a document, and the UI must never imply otherwise. If recording becomes homework, the summary starves.
- **No appointment machinery.** No countdowns as hero elements, no "get ready for Thursday" prompts, no pre-summary "what do you want to discuss today?" step. Appointments are simply things that can be recorded, like anything else. If a next-appointment date has been recorded it may appear on the home snapshot as information — never as pressure.
- The summary is generated for whatever reason she has, whenever she has it. The flow (§4.3) therefore asks only one question — *what period should this cover?* — because that is the only question that is always meaningful regardless of why she's generating.

### 2.3 The trust asymmetry

Two audiences must trust the summary simultaneously:

- **The woman** must trust that nothing leaves the app without her seeing and approving it, that private things stay private, and that the document sounds like her.
- **The clinician** must trust that the document is unfiltered by software — organised, but not curated by an algorithm.

Where the two conflict (she excludes something a clinician might want), **the woman wins, silently**. The PDF never indicates that anything was excluded. Her control must be invisible in the output, or it isn't control.

---

## 3. Information architecture

### 3.1 The four-part model

Every screen, field, and PDF section maps to exactly one of four concepts:

| Concept | Nature | Changes | Examples |
|---|---|---|---|
| **About Me** | State — slowly changing facts | Rarely; edited in place | Name, allergies, EDD, previous pregnancies, preferences, care team |
| **Record** | Events — an append-only stream | Constantly; entries are dated | Symptoms, measurements, feelings, questions, uploads, appointments |
| **Summary** | Snapshot — a frozen, shareable render | Never; each generation is immutable | The PDF and its in-app preview |
| **Timeline** | A view — composes the other three | — | The chronological display of entries *and* past summaries |

Timeline is listed as a concept only to state what it is *not*: it is not a data store. It renders entries and summary-creation events from their single homes. (This is how "previous summaries become part of the pregnancy record" is honoured without duplicating anything — §3.6.)

Note what is gone from the previous draft: **Agenda** as a named concept. Journal-first simplifies it away. Questions are ordinary record entries with an open/answered state; they need no separate machinery, and they surface prominently in every summary (§6.2) without a composition step.

### 3.2 About Me: five optional cards

Per the refined direction. Each card starts as a prompt ("Add personal details", "Add health information") and becomes a summary card once it holds content. Every card is optional and says so.

1. **Personal Details** — name, preferred name, date of birth, photo, *regional health identifier* (labelled "NHS number" in England — see §12.1; never hardcoded as a concept).
2. **My Health** — conditions, allergies, current medications, previous operations. This is *current state* — "what I take now," not a change history. Short free-text chips, not coded fields.
3. **My Pregnancy** — EDD (editable; LMP accepted as an alternative, from which EDD is computed — arithmetic, not interpretation), baby nickname, and, *completed later, never in onboarding*: hospital/planned birth place, midwife, consultant, GP, birth partner. These people are the standing view of the single People model (§3.3).
4. **Previous Pregnancies** — see §3.4.
5. **My Preferences** — see §3.5.

### 3.3 One home for people

There is a single **People** model:

- A person has: name, role (midwife / GP / consultant / sonographer / birth partner / other — extensible), optional contact details.
- **About Me → My Pregnancy** shows the standing people — the *state* view.
- **Record entries reference people** ("Saw Sarah (midwife), discussed scan results") — the *event* view.
- Contact numbers live on the person. This is also where the care-contact information the original proposal wanted to delete survives (§10): not as a "phone numbers screen," but as a property of people she has already chosen to record.

One model, two views, no duplication.

### 3.4 Previous Pregnancies: keep the prompts, protect the voice

First question: "Is this your first pregnancy?" Yes → done. No → number of pregnancies, number of births, then the memory prompts (previous caesarean, postpartum haemorrhage, gestational diabetes, pre-eclampsia, preterm birth, assisted birth, other). Three hard rules keep the prompts from drifting into a clinical dataset:

1. **Each prompt, when tapped, opens a free-text box.** The stored artefact is her words, tagged with the prompt. The tag lets the summary group; the words are the content.
2. **The PDF never renders bare flags.** Not "✓ Previous PPH" — always her words. If she ticked a prompt but wrote nothing, render the neutral attributed phrase: "Previous postpartum haemorrhage (noted by her)."
3. **The gravidity/parity question is a bereavement question in disguise.** Ask pregnancies, then births; only if the numbers differ, show one gentle optional line: "If you'd like to say anything about pregnancies that didn't end in a birth, you can do that here. You can also leave this blank." Never a dropdown for loss.

G/P notation on the PDF header is computed from the two numbers — transcription arithmetic, permitted under §2.1. Render notation *and* plain words ("3 pregnancies, 2 births"); notation conventions vary internationally.

### 3.5 My Preferences

Enduring personal preferences about how she would like to receive care. Not "communication preferences" — the scope is broader and the name should stay plain.

- **Content:** short free-text items, one per line/chip. Examples shown as placeholder text, never pre-filled: *"I can't hear well in my left ear." "Please avoid eye contact." "I prefer written information." "My partner usually speaks for me." "I lip-read."*
- **Closing prompt** (the folded-in feature — see §1 flag): "Anything else you'd like your care team to know?" — one larger free-text box, same card. This carries standing context ("I had a traumatic first birth; please don't rush me") that isn't strictly a preference but belongs in the same for-every-encounter bucket.
- **Summary behaviour:** included in **every** generated summary by default, on page 1, removable during review like any other section. Rendered verbatim, in her voice, under the heading "How I'd like to receive care" with her "anything else" text following as "In her own words."
- **Why this card matters:** it is the information most likely to be *useful in encounters BumpNotes never sees* — a printed summary in her hospital notes tells the on-call team she lip-reads before anyone speaks to her. No interpretation, pure record, maximum dignity per word. Treat this card's copywriting as flagship work.

### 3.6 Record and Timeline

Unchanged from V1 in experience, per both the original proposal and the refined direction. The habit works; don't touch the habit. Structural changes only:

1. **People & Care** entries reference the People model (§3.3).
2. **Every entry type carries a visibility tier** (§5.3). Feelings are `private` by default — generalising the `privateOnly: true` instinct already in the V1 codebase.
3. **Questions** keep their open/answered state. When she records an appointment-type entry, the capture flow may offer "did any of your questions get answered?" as a tap-to-mark list — capture assistance, not engagement machinery.
4. **Past summaries appear on the Timeline** as compact events ("Summary created — 12 Mar, 28+3 · covering 14 Feb–12 Mar"), rendered from the summaries table (§5.4), tappable through to the preserved PDF. They are part of the pregnancy record, as directed — but they are *never* included inside new summaries (a summary of summaries is noise, and recursion is nobody's friend).

---

## 4. User journey

### 4.1 Onboarding

Exactly the refined sequence, with copy intent noted:

1. **Welcome** — one screen, what BumpNotes is (her journal, her summary, her control). No feature tour.
2. **Create pregnancy** — the moment the pregnancy entity is born (§5.2). Copy frames it warmly ("Let's start your pregnancy journal"), not clinically.
3. **Estimated due date** — required. "Not sure?" accepts LMP and shows the computed EDD as editable.
4. **First pregnancy?** — optional, one tap, skippable. If "No": *do not* collect previous-pregnancy details here. One line — "You can tell the story of your previous pregnancies in About Me, whenever you're ready" — and move on. The heaviest, most emotionally loaded questions in the product do not belong in its first sixty seconds.
5. **Baby nickname** — optional, skippable.
6. **Create account** — after the pregnancy exists, so she is signing up to keep something she has already started, not filling a form to be allowed in.
7. **Home dashboard.**

Nothing else. No hospital, no health questions, no people. About Me completion happens later via the card prompts (§3.2), surfaced passively on the About Me screen — never as modal interruptions, never with completion percentages.

### 4.2 The core loop

```
capture (seconds, any time, journalling)
   → accumulate (timeline grows; questions collect; cards fill in over time)
   → whenever she chooses: generate a summary (minutes)
   → review → share (or keep — a summary generated for herself is a valid outcome)
   → the summary joins the record (timeline event, immutable PDF)
   → journalling continues
```

There is no prompt-driven engagement layer around appointments. The loop is powered by the journalling habit and by the summary being genuinely worth generating. If retention needs more than that, the answer is making capture more delightful — not making the app more demanding (risk logged in §13.1).

### 4.3 Summary flow

One flow, four steps, one question:

1. **Generate Summary** (home and summary tab; the button keeps its plain name — she is generating a summary, and the label should say so).
2. **Choose date range.** Options: **Since my last summary** (default whenever a previous summary exists) · **Last 4 weeks** · **Whole pregnancy** · **Custom range**. This is the only decision before the draft, because it is the only pre-draft question that is meaningful for every reason she might be generating. Date-based selection is curation without interpretation — the app applies zero judgement about *what* matters, only *when*.
3. **Generate → Review.** The app renders the full draft immediately: all standing sections (About Me cards that have content, My Preferences always) plus all non-private entries in range. Review per §7.
4. **Share** (or save without sharing).

What is deliberately absent: audience selection, appointment-prep questions, inclusion checklists, templates. Internally the summaries table carries a `type` field (`standard` for all V2 summaries) and the renderer is parameterised by layout version, so future summary types are a data value, not a rebuild (§12.3). None of that surfaces in the UI.

### 4.4 Home screen

Per the original proposal, largely unchanged: greeting, gestation ("34+2"), next appointment *if one has been recorded* (information, not countdown), **Generate Summary**, recent activity, quick record. The Quick Record affordance is the most important pixel on the screen — it feeds everything else.

---

## 5. Data architecture

### 5.1 The blunt part

V1 stores each user's world as a single JSON blob (`bumpnotes_state.state`) with photos as base64 data-URLs inside it. Right MVP call; wrong architecture for immutable summaries, attachments of real size, or the pregnancy entity the refined onboarding itself creates ("Create pregnancy" is step 2 — the schema should agree). V2 migrates to real tables.

### 5.2 Entities

```
users                      (auth identity)
profiles                   (person-level: name, preferred name, DOB, health
                            identifier, photo)
pregnancies                (episode: EDD/LMP, nickname, birth place,
                            status: active|ended, ended_at)
health_items               (person-level: kind: condition|allergy|medication|
                            operation; text; active flag)
people                     (person-level: name, role, contact details)
previous_pregnancy_notes   (person-level: counts; prompt_tag nullable; free text)
preferences                (person-level: ordered free-text items +
                            "anything else" text; versioned on edit)
entries                    (pregnancy-scoped, append-only: id, pregnancy_id,
                            type, type_version, occurred_at, recorded_at,
                            gestation weeks/days, visibility tier,
                            payload jsonb, deleted_at soft delete)
attachments                (object storage; entries reference by id —
                            never inline data)
summaries                  (immutable snapshots; §5.4)
```

Key decisions:

- **Pregnancy is a first-class entity.** Not speculative future-proofing: the refined onboarding creates one explicitly at step 2. Event-like data is pregnancy-scoped; About Me data is person-level. The table split *is* the state/event split of §3.1, enforced by schema. (That it also makes a second pregnancy representable without migration is a free consequence, not the justification.)
- **Entries are append-only, soft-deleted, with `type_version`.** The V1 union type already carries three legacy variants (`concern`, `labour`, legacy `appointment`) — schema evolution is a certainty; versioning makes it boring.
- **`occurred_at` ≠ `recorded_at`.** "I had this pain Tuesday, logging it Thursday" must be representable. Summaries sort by `occurred_at`; honesty rules (§6.5) may display both.
- **Attachments leave the row.** Object storage, referenced by id. Non-negotiable.
- **Questions are entries** (`type: question`, payload includes `answered` state) — no separate agenda table. Deliberate simplicity.

### 5.3 Visibility tiers

Every entry carries one of three tiers, changeable at any time including during review:

| Tier | Meaning | Default for |
|---|---|---|
| `private` | Never appears in any summary; excluded from drafts entirely, including "show my screen" | Feelings |
| `personal` | Drafts in, softly badged in review ("personal note — keep it in?") | Notes |
| `shareable` | Drafts in normally | Symptoms, measurements, questions, appointments, uploads |

This generalises V1's `privateOnly: true` on feelings into a system. It is also a **safeguarding mechanism**: a woman in a coercive relationship may need a summary her partner can read over her shoulder and a record he can't (§13.4).

### 5.4 Summaries: immutable snapshots, part of the record

A generated summary stores: the frozen rendered content (a copy, not references), the date range, the manifest of included/excluded sections and entries, the produced PDF (object storage), `type` (`standard` in V2), `layout_version`, and `created_at`.

- **Immutable.** Re-opened later, it is byte-for-byte the document she shared. "What exactly did I hand my consultant on 3 June?" always has an exact answer. Snapshots can be re-shared or deleted, never edited.
- **Part of the pregnancy record.** Summaries render on the Timeline as events (§3.6) and in a "My summaries" list on the summary tab. The PDF is preserved and re-downloadable.
- **"Regenerate"** creates a *new* summary using the same date range and section choices against today's data — a fresh snapshot alongside the old one, never a replacement. The verb in the UI is "Generate again with the same choices," because "regenerate" implies overwriting and nothing here ever overwrites.
- The `type` field and `layout_version` are the entire internal provision for future summary types: new types are new values plus new render templates. No UI, no schema change, no speculation beyond two columns.

---

## 6. Consultation summary architecture

### 6.1 Readers and the 30-second rule

The document must serve, without variants: a community midwife (30–60s), an obstetrician reading a referral (1–2 min), an emergency clinician who has never met her (15–30s), and the woman herself. The striking fact remains: **the emergency reader's needs are a strict subset of a well-designed page 1** — so one fixed document serves everyone, and no audience selector is needed. This is why the refined direction's "no audiences yet" costs nothing: page discipline already covers the spectrum.

### 6.2 The two-part document

**Page 1 — the Summary Sheet.** Fixed, predictable slots (clinician muscle memory is a feature — layout is stable across versions and locales, §12.4). Empty sections collapse; page 1 never pads:

1. **Header band:** preferred name, age, gestation ("34+2"), EDD, G/P + plain words, date generated, date range covered.
2. **Alert strip** (only ever these three, only if present): allergies · current medications · health conditions. Her entered text, verbatim. Not prioritisation — a fixed template slot the *reader* expects; the app exercises zero judgement about contents.
3. **How I'd like to receive care** — My Preferences, verbatim, followed by her "anything else" text as *In her own words*. Present by default on every summary (§3.5).
4. **My questions** — open questions from the record, verbatim, oldest first (chronology, not ranking). The standing agenda, with no composition step.
5. **Previous pregnancies** — her words per §3.4. Omitted for first pregnancies.
6. **My care team** — names, roles, contact details.

**Pages 2+ — the Record appendix**, scoped to the chosen date range. Order: Symptoms · Measurements · Appointments & people seen · Answered questions (with what she recorded about the answers) · Uploads (index of thumbnail/tag/date — originals never embedded full-size unless she explicitly includes a specific image, half-page max, her caption) · Timeline digest. Grouped by type, dated within type, every item timestamped with date and gestation week.

### 6.3 The voice rule

Her words are **always quoted and attributed, never paraphrased, summarised, or grammar-corrected**. Template scaffolding is typographically distinct from her content — a clinician must see at a glance which words are hers. This is §2.1 made visible: the app's words are furniture; hers are the content.

### 6.4 Measurements without interpretation

Values with date/time and her optional note. **No reference ranges, no colour coding, no high/low flags, no trend arrows, no shaded "normal" bands on charts.** A BP of 152/98 prints exactly as neutrally as 118/72. Timestamped home readings are clinical gold on their own; the app's opinion of them would make it a device and stop the document being hers.

### 6.5 What never appears, and honesty rules

Never: private-tier content (unless she promotes specific entries); any statement that content was excluded; AI-generated prose of any kind (§12.5); judgement words the app chose ("concerning," "normal"); completeness indicators — the document never shames its author. Past summaries never appear inside new summaries.

Honesty: entries backdated >48h may show "recorded [date]" beside "occurred [date]" in the appendix. Footer on every page: *"This document was written and compiled by [name] using BumpNotes. It is her personal record, in her own words. It is not a clinical record and contains no clinical assessment."* The regulatory position, stated in plain English, managing the clinician's expectations in one sentence.

---

## 7. Review before sharing

The review screen **is the document**: a scrollable live render of the actual summary.

- **Section toggles in situ** — tap a section's eye icon; it collapses to a ghost bar (visible to her, absent from the PDF). My Preferences arrives toggled on, removable like anything else.
- **Entry-level exclusion** — swipe/tap any single line out. Sharing her symptoms but not the one about haemorrhoids is the difference between control and theatre.
- **Tier badges** — `personal` content shows a soft "personal note — keep it in?" chip.
- **One review, one share action.** No stacked confirmation modals; the review is the confirmation.
- On share (or save): snapshot freezes (§5.4), PDF is produced, share sheet opens — or she keeps it unshared; a summary for herself is a valid outcome.

Two share modes: **PDF** (send, print, email) and **Show my screen** (clean full-screen render of the same frozen snapshot for handing the phone across a desk — same manifest, no new decisions, private tier excluded here too).

---

## 8. PDF specification

- **Format:** A4 portrait (US Letter per locale), generated from the frozen snapshot, deterministic (same snapshot → identical bytes, timestamps aside).
- **Length:** page 1 is always exactly one page — overflow (e.g. long preferences text) continues into an appendix section marked "continued," never displaces the header or alert strip. Appendix uncapped; date-scoping keeps it typically ≤ 3–4 pages.
- **Typography:** ≥10.5pt body; her words ≥11pt; header scannable at arm's length; high-contrast, monochrome-safe (clinics print B&W); no colour that encodes meaning.
- **Layout stability:** section order and page-1 slots are product constants, versioned (`layout_version`), changed rarely and deliberately.
- **Every page self-sufficient:** her name, DOB, gestation, page X of Y, generation date, provenance footer (§6.5) — clinics photocopy single pages.
- **Filename:** `BumpNotes-Summary-{PreferredName}-{YYYY-MM-DD}.pdf`.
- **Inert:** EXIF stripped from images; no beacons; no metadata beyond the visible.
- **Localisation:** template strings via i18n; dates and units per locale; her content never machine-translated by default (§12.2).

---

## 9. Screen-by-screen recommendations

| Screen | Verdict | Notes |
|---|---|---|
| **Home** | Keep, minimal change | Greeting, gestation, next appointment if recorded (information, not countdown), Generate Summary, recent activity, Quick Record. No appointment-driven state changes. |
| **Onboarding** | Rebuild to the seven steps of §4.1 | EDD is the only required datum. Account after pregnancy. No hospital, no health data, no previous-pregnancy details. |
| **About Me** | Rebuild as five prompt-to-summary cards | §3.2. "Add …" prompts until filled. Every card marked Optional. No completion percentages, ever. |
| **Record** | Keep | People model behind People & Care; visibility tier per entry; question answered-marking offered inside appointment capture. Otherwise untouched — it's the habit. |
| **Timeline** | Keep, one addition | Past summaries render as compact events (§3.6). |
| **Summary flow** | Rebuild | Date range → generate → review → share (§4.3, §7). No Step-1 inclusion checklist, no appointment questions, no audiences. |
| **My summaries** | New, small | List of snapshots: date, range covered, shared/kept; open PDF; "generate again with the same choices." |
| **Labour section** (labour.tsx, contraction timer, bag, plan) | Remove | §10. |
| **Settings** | Keep | Add full data export (JSON + all PDFs) and account deletion, front and centre. Trust products earn trust in settings. |

---

## 10. Things to remove

| Removal | Verdict | Reasoning |
|---|---|---|
| **Labour Journey / labour entry types / episodes** | ✅ Remove | Labour is when women stop using apps. It's a different product with a different (real-time, high-stakes, regulated) risk profile, and V1's schema shows it accreting — four entry types and a plan object. Cut. |
| **Contraction timer** | ✅ Remove | Real-time labour tooling is the fastest path across the device boundary ("when should I go in?" is triage). |
| **Hospital bag / labour plan / parking info** | ✅ Remove | Product-inside-product. |
| **Midwife / GP / hospital phone numbers** | ❌ Keep the data, remove the feature | "Doesn't feed the summary" is the wrong test — the mission includes "should I call triage about this bleeding?" at 2am. Numbers live on the People model (§3.3) and print in the care-team block on page 1. No dedicated phone-numbers screen survives. |
| **Appointment-centric machinery** (from the previous draft of this document) | ✅ Remove | Countdown heroes, "get ready" CTAs, pre-summary appointment questions, post-appointment "how did it go?" prompts. Journal-first. The only survivor is the passive answered-question marking inside appointment capture, which is capture assistance, not engagement pressure. |

## 11. Things to add

Short, and shorter than the previous draft — the refined direction's restraint is adopted:

1. **My Preferences** (§3.5) — the flagship card, in every summary by default.
2. **Visibility tiers** (§5.3) — privacy as a system.
3. **Summaries as part of the record** (§5.4, §3.6) — immutable snapshots, timeline events, "generate again."
4. **Full data export** (§9, Settings).
5. **The pregnancy entity** (§5.2) — created by onboarding step 2; the schema simply agrees with the UI.

Explicitly parked, not built in V2: summary types in the UI, audiences, birth preferences as a section, partner access, clinician-side viewing, postpartum module, any engagement/reminder layer.

## 12. Future-proofing decisions

Held to the refined bar: *no designing for future use cases before we need them.* Everything below is either a schema-level cheapness (two columns now versus a migration later) or a rule that prevents future work from breaking present promises.

### 12.1 Internationalisation is a schema problem before a translation problem
`healthIdentifier` with per-region labels, never `nhsNumber`. People roles are extensible enums with regional display names (midwife-led care is a UK/NL assumption). Measurements stored in canonical units, displayed per locale. Gestation computed from EDD or LMP; a dating-scan change is just an EDD edit — the app holds no opinion about dating.

### 12.2 Language
Template strings fully localised. **Her words are never machine-translated by default** — a translated summary is no longer in her own words. Translation, if ever offered, is an explicit act; the PDF labels it ("originally written in Polish; translation requested by her") and attaches the original.

### 12.3 Future summary types
Entirely contained in `summaries.type` + `layout_version` + render templates (§5.4). When a real need arrives (e.g. a handover summary at booking), it is a new template and a new type value. Nothing in the V2 UI anticipates it.

### 12.4 Layout as contract
Page-1 slot positions are versioned product constants. If BumpNotes becomes the standard it intends to be, thousands of clinicians will learn where to look. That learned glance is the moat; changes to it are product decisions, not design refreshes.

### 12.5 AI, with a fence around it
Any future AI feature must pass all four tests or not ship: (1) assists **input**, never output — it may help her capture, never write, rewrite, summarise or select what a clinician sees; (2) her words survive verbatim; (3) anything AI-derived becomes real only when she confirms it in-app, stored as her entry; (4) **the snapshot→PDF pipeline contains zero model calls — structurally**, the renderer's only input is the frozen snapshot. This keeps every useful capture aid available while making §2.1 architectural rather than aspirational.

## 13. Risks and trade-offs

1. **Journal-first removes the product's natural deadline.** The appointment countdown was manipulative, but it was also the strongest engagement lever available, and it's now gone on principle. Retention rests entirely on the journalling habit and the summary's genuine worth. Accepted knowingly. Watch capture frequency; if it sags, the remedy is more delightful capture — never prompts that make the journal feel like homework.
2. **Default-include drafts risk oversharing.** Mitigations: tiers keep feelings out structurally; the review screen shows the actual document so oversharing is at least *seen*; personal-tier badges interrupt the likeliest mistakes. Residual risk accepted — blank-slate inclusion checklists demonstrably produce worse documents and a second redundant decision.
3. **Clinician scepticism.** Some clinicians will discount a patient-authored document regardless. Mitigations: the provenance footer, the stable layout, timestamped home measurements (the payload that earns the read), and page 1 costing them thirty seconds. Not fully mitigable; the bet is that usefulness compounds.
4. **Safeguarding.** The record can contain evidence of abuse; the phone can be inspected by an abuser. Tiers are necessary, not sufficient. Required pre-launch (not polish): no summary content in notifications, an unremarkable app-switcher card, private tier excluded from every render including Show My Screen, and a design pass with domestic-abuse charities.
5. **The migration.** Blob → tables, base64 photos → object storage, is V2's riskiest engineering. Dual-write window; per-user migration with checksum verification against the blob; blob retained read-only for a full release cycle.
6. **Scope temptation at the boundary.** The most-requested features will be the forbidden ones ("is this BP normal?"). §2.1 is the cultural defence; §12.5's structural fence is the technical one. Write the refusal into the product principles so every future PM inherits it.
7. **My Preferences scope creep.** The card's breadth ("enduring preferences about receiving care") will attract content that belongs elsewhere — symptoms, worries, birth plans. Mitigation is copywriting, not validation: the placeholder examples define the genre, and the review screen makes misplaced content visible. Do not add rules or categories to police it; the card's looseness is its value.

## 14. Final product vision

A woman opens BumpNotes in a waiting room, seven weeks pregnant. It asks when the baby is due, and lets her go. Over the months it becomes her pregnancy journal — the place where a 2am worry, a blood-pressure reading, a scan photo, and a question she'd forget by morning all take ten seconds to keep. Some entries are for sharing, some are just for her, and the app never confuses the two. It never once tells her what anything means — and because it never tells her, everything in it is still hers.

Whenever she wants — before a midwife visit, after a worrying weekend, for a second opinion, or just to see her own story so far — one button turns the journal into a single sheet a stranger in scrubs can absorb in half a minute: who she is, what she takes, how she'd like to be spoken to, what she wants to ask — in sentences she wrote, sounding like her, with nothing hidden from her and nothing shared she didn't choose. Every summary she has ever made sits in her record, exactly as it was the day she shared it.

Five years on, the layout of that sheet is something clinicians have learned by glance, and the promise on its footer hasn't changed by a word. The app behind it still has no opinions, a perfect memory, and one job:

**She tells the story. BumpNotes records it. Clinicians interpret it. In that order, forever.**
