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
  /** Optional "read a little more" detail, shown when the item is opened. */
  detail?: string;
  /** Per-item provenance shown with the item, e.g. "NICE", "RCOG", "NHS" (AC-3). */
  source?: string;
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
      detail:
        "There is no set number of normal movements — what matters is any change from your baby's usual pattern. Don't wait until the next day, and please don't rely on a home doppler to reassure yourself.",
      source: "NHS · RCOG",
    },
    {
      title: "Vaginal bleeding",
      signOf: "Bleeding in pregnancy can have many causes and should always be checked.",
      action: "Contact your maternity unit or triage. Call 999 if the bleeding is heavy.",
      detail:
        "Bleeding can be light or heavy and can happen at any stage. It is often not serious, but it always needs checking so the cause can be found.",
      source: "NHS · NICE",
    },
    {
      title: "Waters breaking or fluid leaking",
      signOf: "A gush or trickle of fluid, especially before 37 weeks, needs checking.",
      action: "Contact your maternity unit or triage.",
      detail:
        "This can be a sudden gush or a slow trickle. Before 37 weeks it is especially important to be checked promptly.",
      source: "NICE",
    },
    {
      title: "Severe or persistent headache, or changes to your vision",
      signOf: "A bad headache, or flashing or blurred vision, can be a sign of pre-eclampsia.",
      action: "Contact your maternity unit or triage, or NHS 111, straight away.",
      detail:
        "A headache that won't go away, or seeing flashing lights or blurring, can be a sign of raised blood pressure (pre-eclampsia), usually after 20 weeks.",
      source: "NICE · RCOG",
    },
    {
      title: "Sudden swelling of your face, hands or feet",
      signOf: "Swelling that comes on suddenly can be a sign of pre-eclampsia.",
      action: "Contact your maternity unit or triage.",
      detail:
        "Some swelling is normal in pregnancy. Swelling that comes on suddenly in your face, hands or feet is the kind to get checked.",
      source: "NICE",
    },
    {
      title: "Severe pain in the upper tummy or under your ribs",
      signOf: "This can be a sign of pre-eclampsia or a related condition (HELLP).",
      action: "Contact your maternity unit or triage straight away.",
      detail:
        "Pain high in your tummy, often under the ribs on the right, can be linked to pre-eclampsia or a related condition called HELLP.",
      source: "NICE · RCOG",
    },
    {
      title: "A high temperature or feeling very unwell",
      signOf: "A fever or feeling very unwell can be a sign of infection.",
      action: "Contact your maternity unit or NHS 111 urgently. Call 999 if severe.",
      detail:
        "A high temperature, shivering, or simply feeling very unwell can be a sign of infection, which can develop quickly in pregnancy.",
      source: "NHS · RCOG",
    },
    {
      title: "Intense itching, especially on your palms and soles",
      signOf: "Severe itching can be a sign of a liver condition (obstetric cholestasis).",
      action: "Contact your maternity unit — ask for a blood test.",
      detail:
        "Itching without a rash, especially on your palms and soles and often worse at night, can be a sign of a liver condition (obstetric cholestasis). A simple blood test can check.",
      source: "RCOG",
    },
    {
      title: "Pain or swelling in your calf, chest pain, or breathlessness",
      signOf: "These can be signs of a blood clot, which needs urgent attention.",
      action: "Seek help now — contact your maternity unit or NHS 111. Call 999 if severe.",
      detail:
        "Pain, swelling or redness in one calf, or chest pain and breathlessness, can be signs of a blood clot. This is uncommon, but it needs urgent attention.",
      source: "RCOG",
    },
    {
      title: "Regular tightenings or pain before 37 weeks",
      signOf: "Regular tightening or pain before 37 weeks can be a sign of early labour.",
      action: "Contact your maternity unit or triage.",
      detail:
        "Regular tightenings, cramping or low back pain before 37 weeks can be a sign of labour starting early, and should be checked.",
      source: "NICE",
    },
    {
      title: "Something just doesn't feel right",
      signOf: "You know your body and your pregnancy best.",
      action:
        "It is always okay to call your maternity unit and ask. That is what they are there for.",
      detail: "Trust your instincts. You will never be wasting anyone's time by calling to check.",
      source: "NHS",
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
