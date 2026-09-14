// Previous Pregnancies — the charity-reviewed copy + shared shape (ARCH §3.4).
//
// This is the single home for the wording on the most emotionally loaded surface
// in the product, so a future baby-loss-charity edit is a one-file change. The
// copy here was assembled for an external bereavement review (2026-09-13) and
// carries the founder's edits from that pass (DECISIONS-LOG 2026-09-13):
//   • counts are asked as "Have you had any previous pregnancies?" (yes/no) then
//     "How many times have you given birth?" — never a dropdown for loss;
//   • the memory-prompt label pairs the clinical and plain terms for bleeding;
//   • the summary shows ONLY her own words (no "(noted by her)" fallback).
//
// Framework-free by design: imported by the data layer (server + local repos,
// for prompt-tag validation) AND by React surfaces, so it must not import React.

/**
 * The tags stored in previous_pregnancy_notes.prompt_tag. Seven are the memory
 * prompts shown as chips; `loss` is the free-text under the loss line (§3.4
 * rule 3) — a stored note, but never shown as a memory-prompt chip.
 */
export type PreviousPregnancyPromptTag =
  | "caesarean"
  | "pph"
  | "gestational_diabetes"
  | "pre_eclampsia"
  | "premature_birth"
  | "assisted_birth"
  | "other"
  | "loss";

/** The loss-line free-text tag — stored like a note, but not a memory prompt. */
export const LOSS_NOTE_TAG: PreviousPregnancyPromptTag = "loss";

/** Prompts in display order. `label` is the reviewed, user-facing wording. */
export const PREVIOUS_PREGNANCY_PROMPTS: {
  tag: PreviousPregnancyPromptTag;
  label: string;
}[] = [
  { tag: "caesarean", label: "Previous caesarean" },
  { tag: "pph", label: "Postpartum haemorrhage / Heavy bleeding after birth" },
  { tag: "gestational_diabetes", label: "Gestational diabetes" },
  { tag: "pre_eclampsia", label: "Pre-eclampsia" },
  { tag: "premature_birth", label: "Premature birth" },
  { tag: "assisted_birth", label: "Assisted birth (forceps or ventouse)" },
  { tag: "other", label: "Something else" },
];

/** Valid prompt tags for server-side validation (the 7 chips + the loss note). */
export const PREVIOUS_PREGNANCY_PROMPT_TAGS: PreviousPregnancyPromptTag[] = [
  ...PREVIOUS_PREGNANCY_PROMPTS.map((p) => p.tag),
  LOSS_NOTE_TAG,
];

/** The plain label for a tag (falls back to the tag itself if unknown). */
export function promptLabel(tag: string): string {
  return PREVIOUS_PREGNANCY_PROMPTS.find((p) => p.tag === tag)?.label ?? tag;
}

// --- The reviewed copy (verbatim / founder-edited) -------------------------

export const PREV_PREG_COPY = {
  // Onboarding step (ARCH §4.1 step 4). One optional tap; on No/Skip the flow
  // simply continues — no message (founder edit: the deferral screen was cut).
  onboardingQuestion: "Is this your first pregnancy?",
  onboardingYes: "Yes",
  onboardingNo: "No",
  onboardingSkip: "Skip for now",

  // About Me card (ARCH §3.4). Optional; says so.
  cardTitle: "Previous pregnancies",
  cardInvitation: "You can note things from your previous pregnancies here.",
  cardAdd: "Add",

  // Counts (founder edit: yes/no gate, then births).
  hasPreviousQuestion: "Have you had any previous pregnancies?",
  hasPreviousYes: "Yes",
  hasPreviousNo: "No",
  pregnancyCountLabel: "If yes — how many?",
  birthCountQuestion: "How many times have you given birth?",

  // The loss line — VERBATIM, shown only when the two numbers differ. Never a
  // dropdown; never required. The "leave this blank" reassurance is load-bearing.
  lossLine:
    "If you'd like to say anything about pregnancies that didn't end in a birth, you can do that here. You can also leave this blank.",

  // Memory prompts.
  promptsIntro: "Some things you might want to note from before.",
  promptsHelp: "Tap any that apply and tell it in your own words — or leave them all.",
  freeTextPlaceholder: "In your own words…",
} as const;
