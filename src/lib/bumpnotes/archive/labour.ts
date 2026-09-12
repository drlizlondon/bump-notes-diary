// ARCHIVED — labour/contraction subsystem (founder ruling, 12 Sep 2026):
// "We won't have labour on the system but archive it so we can expand to it
// very easily."
//
// What this means concretely:
//   - The Azure V2 launch schema (azure/migrations/001, 002) has NO labour
//     table and NO labour value in the `entries.type` CHECK constraint — it
//     was never added, so there is nothing to remove from the new system.
//   - The Azure V2 domain types (src/lib/domain/types.ts) mirror that schema
//     faithfully and likewise carry no labour concept.
//   - Any user's old blob that contains labour data (entries of type
//     `labour` / `labour_event` / `contraction`, or a `labourPlan`) is
//     preserved byte-for-byte, unmapped, in the `bumpnotes_state_archive`
//     table (azure/migrations/002) at cutover — it is not interpreted into
//     any active V2 row. That table IS the archive location for this data
//     on the Azure side.
//   - On the current (pre-cutover) V1 side, this file is the archive
//     location for the *code*: the legacy types below are kept only so the
//     app keeps loading old local/Supabase blobs without crashing or
//     dropping data (WORK.md §3.6 "never break an unmigrated user"). No
//     screen creates this data any more — the interactive labour subsystem
//     (contraction timer, hospital-bag checklist, labour-episode review)
//     was already removed from the app in PLAN §10 Phase 1 (commits
//     5f3650f–952eeb3, per ARCH §10 and docs/DTAC_READINESS.md §1).
//
// Re-enabling this later is a small, scoped task — see
// docs/product/LABOUR-ARCHIVE.md for the exact recipe. Do not delete this
// file or the data it types without a founder decision: old users' blobs
// still contain this shape.

/** Legacy entry types that make up the archived labour/contraction subsystem. */
export const ARCHIVED_LABOUR_ENTRY_TYPES = ["labour", "labour_event", "contraction"] as const;

export type ArchivedLabourEntryType = (typeof ARCHIVED_LABOUR_ENTRY_TYPES)[number];

/** True if an entry's `type` belongs to the archived labour subsystem. */
export function isArchivedLabourEntryType(type: string): type is ArchivedLabourEntryType {
  return (ARCHIVED_LABOUR_ENTRY_TYPES as readonly string[]).includes(type);
}

export interface ArchivedBaseEntry {
  id: string;
  type: ArchivedLabourEntryType;
  createdAt: string;
  weekDay: { weeks: number; days: number };
  deletedAt?: string;
  saveAsQuestion?: boolean;
}

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface LabourEntry extends ArchivedBaseEntry {
  type: "labour";
  event: string;
  note?: string;
}

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface LabourEventEntry extends ArchivedBaseEntry {
  type: "labour_event";
  event: string;
  note?: string;
}

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface ContractionEntry extends ArchivedBaseEntry {
  type: "contraction";
  startISO: string;
  endISO: string;
  durationSec: number;
  note?: string;
}

export type ArchivedLabourEntry = LabourEntry | LabourEventEntry | ContractionEntry;

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface BagItem {
  id: string;
  label: string;
  packed: boolean;
}

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface LabourEpisode {
  id: string;
  startISO: string;
  endISO?: string;
  outcome?: "baby" | "settled" | "other";
  outcomeNote?: string;
}

/** @deprecated legacy (kept for back-compat with old blobs); no longer created. */
export interface LabourPlan {
  preferences?: string;
  painRelief?: string;
  partnerNotes?: string;
  notes?: string;
  bag: BagItem[];
  infoHospital?: string;
  infoContacts?: string;
  infoParking?: string;
  infoChildcare?: string;
  infoNotes?: string;
  recordingStartISO?: string; // present when actively recording labour
  episodes?: LabourEpisode[]; // completed and in-progress labour episodes
}
