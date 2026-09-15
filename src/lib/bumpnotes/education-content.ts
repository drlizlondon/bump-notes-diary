// BumpNotes Education — pregnancy red-flag guidance (founder ruling 2026-09-08;
// spec docs/product/EDUCATION-RED-FLAGS-SPEC.md).
//
// THIS IS THE NON-DEVICE BOUNDARY. This is GENERIC, published safety education
// shown identically to everyone — a leaflet, not triage. Its safety case rests
// on total isolation from the woman's own record:
//   • It imports NOTHING from the entries/journal/repository layer (AC-1).
//   • It is never triggered by, ordered by, or filtered by her data (AC-2).
//   • Every item signposts to a human — never a verdict (AC-4).
//   • Content is DATA, not code (AC-6) — this file, versioned with provenance.
// An ESLint fence (eslint.config.js) forbids the education files from importing
// the data layer, so the boundary cannot drift into Software-as-a-Medical-Device.
//
// Framework-free by design: no imports at all.

export interface RedFlagItem {
  /** Plain-language name of the warning sign. */
  title: string;
  /** "What it can be a sign of" — general, never a claim about HER. */
  signOf: string;
  /** The get-help action. Always a signpost to a human, never a verdict (AC-4). */
  action: string;
}

export interface RedFlagGuidance {
  /** "default" (NICE/NHS/RCOG) or a tenant id — per-tenant override (§4). */
  tenant: string;
  /** Provenance, shown to the user (AC-3 generic + attributed). */
  source: string;
  /** Clinical review date (ISO). null = NOT yet clinically signed off (CSO gate). */
  reviewedAt: string | null;
  /** The general-information framing shown above the list. */
  framingHeader: string;
  /** The emergency signpost shown once, prominently. */
  emergencyNote: string;
  items: RedFlagItem[];
}

// Default content — general information based on NICE / NHS / RCOG guidance
// (spec §3). Clinician-owned wording; the CSO reviews and sets reviewedAt before
// this is published. reviewedAt stays null until that sign-off (the ship gate).
export const DEFAULT_RED_FLAG_GUIDANCE: RedFlagGuidance = {
  tenant: "default",
  source: "NICE / NHS / RCOG guidance",
  reviewedAt: null,
  framingHeader:
    "This is general information about pregnancy warning signs, not personal medical advice. It is the same for everyone and is not based on anything you have recorded in BumpNotes. If you're worried about anything, contact your maternity unit or NHS 111.",
  emergencyNote: "In an emergency, or if you feel very unwell, call 999.",
  items: [
    {
      title: "Reduced or changed baby movements",
      signOf: "A change in your baby's usual pattern of movements can matter at any stage.",
      action: "Contact your maternity unit the same day — do not wait. They would rather check.",
    },
    {
      title: "Vaginal bleeding",
      signOf: "Bleeding in pregnancy can have many causes and should always be checked.",
      action: "Contact your maternity unit or triage. Call 999 if the bleeding is heavy.",
    },
    {
      title: "Waters breaking or fluid leaking",
      signOf: "A gush or trickle of fluid, especially before 37 weeks, needs checking.",
      action: "Contact your maternity unit or triage.",
    },
    {
      title: "Severe or persistent headache, or changes to your vision",
      signOf: "A bad headache, or flashing or blurred vision, can be a sign of pre-eclampsia.",
      action: "Contact your maternity unit or triage, or NHS 111, straight away.",
    },
    {
      title: "Sudden swelling of your face, hands or feet",
      signOf: "Swelling that comes on suddenly can be a sign of pre-eclampsia.",
      action: "Contact your maternity unit or triage.",
    },
    {
      title: "Severe pain in the upper tummy or under your ribs",
      signOf: "This can be a sign of pre-eclampsia or a related condition (HELLP).",
      action: "Contact your maternity unit or triage straight away.",
    },
    {
      title: "A high temperature or feeling very unwell",
      signOf: "A fever or feeling very unwell can be a sign of infection.",
      action: "Contact your maternity unit or NHS 111 urgently. Call 999 if severe.",
    },
    {
      title: "Intense itching, especially on your palms and soles",
      signOf: "Severe itching can be a sign of a liver condition (obstetric cholestasis).",
      action: "Contact your maternity unit — ask for a blood test.",
    },
    {
      title: "Pain or swelling in your calf, chest pain, or breathlessness",
      signOf: "These can be signs of a blood clot, which needs urgent attention.",
      action: "Seek help now — contact your maternity unit or NHS 111. Call 999 if severe.",
    },
    {
      title: "Regular tightenings or pain before 37 weeks",
      signOf: "Regular tightening or pain before 37 weeks can be a sign of early labour.",
      action: "Contact your maternity unit or triage.",
    },
    {
      title: "Something just doesn't feel right",
      signOf: "You know your body and your pregnancy best.",
      action:
        "It is always okay to call your maternity unit and ask. That is what they are there for.",
    },
  ],
};

// Per-tenant override (§4) — data, not code. A hospital/tenant that signs on
// supplies its own list and owns it clinically; BumpNotes is the vessel. Only
// the NICE/NHS default exists today; overrides load here when tenancy is wired.
const GUIDANCE_BY_TENANT: Record<string, RedFlagGuidance> = {
  default: DEFAULT_RED_FLAG_GUIDANCE,
};

/** The red-flag guidance for a tenant (default = NICE/NHS). Same for every user. */
export function getRedFlagGuidance(tenant = "default"): RedFlagGuidance {
  return GUIDANCE_BY_TENANT[tenant] ?? DEFAULT_RED_FLAG_GUIDANCE;
}
