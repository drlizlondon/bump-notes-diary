// ARCHIVED (founder ruling, 12 Sep 2026): labour/contraction is not part of
// the Azure V2 launch — see src/lib/bumpnotes/archive/labour.ts for why these
// three EntryType members and the labour-shaped fields below still exist
// (back-compat with old blobs only; no screen creates them any more).
import type { ArchivedLabourEntry, LabourPlan as ArchivedLabourPlan } from "./archive/labour";
export type {
  ArchivedLabourEntry,
  ArchivedLabourEntryType,
  LabourEntry,
  LabourEventEntry,
  ContractionEntry,
  BagItem,
  LabourEpisode,
  LabourPlan,
} from "./archive/labour";
export { ARCHIVED_LABOUR_ENTRY_TYPES, isArchivedLabourEntryType } from "./archive/labour";

export type EntryType =
  | "symptom"
  | "question"
  | "appointment" // legacy
  | "person"
  | "measurement"
  | "photo"
  | "labour" // ARCHIVED, legacy (kept for back-compat) — see archive/labour.ts
  | "labour_event" // ARCHIVED, legacy — see archive/labour.ts
  | "contraction" // ARCHIVED, legacy — see archive/labour.ts
  | "feeling"
  | "note"
  | "concern"; // legacy

export interface BaseEntry {
  id: string;
  type: EntryType;
  createdAt: string;
  weekDay: { weeks: number; days: number };
  deletedAt?: string;
  saveAsQuestion?: boolean;
}

export interface SymptomEntry extends BaseEntry {
  type: "symptom";
  symptom: string;
  severity?: number;
  quantifier?: string;
  clarification?: string;
  location?: string;
  note?: string;
  dataUrl?: string;
}

export interface QuestionEntry extends BaseEntry {
  type: "question";
  text: string;
  context?: string;
  answered?: boolean;
}

export interface AppointmentEntry extends BaseEntry {
  type: "appointment";
  kind: string;
  whenISO: string;
  whoSeen?: string;
  discussed?: string;
  advice?: string;
  questionsAnswered?: string;
  followUp?: string;
}

export interface PersonEntry extends BaseEntry {
  type: "person";
  whenISO: string;
  name?: string;
  role?: string;
  discussed?: string;
  advised?: string;
  note?: string;
  dataUrl?: string;
}

export type MeasurementKind =
  | "blood_pressure"
  | "weight"
  | "blood_sugar"
  | "movements"
  | "temperature"
  | "custom";

export interface MeasurementEntry extends BaseEntry {
  type: "measurement";
  kind: MeasurementKind;
  customLabel?: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  value?: number;
  unit?: string;
  note?: string;
}

export interface PhotoEntry extends BaseEntry {
  type: "photo";
  tag: string;
  dataUrl: string;
  note?: string;
}

export interface FeelingEntry extends BaseEntry {
  type: "feeling";
  feeling: string;
  note?: string;
  privateOnly: true;
}

export interface NoteEntry extends BaseEntry {
  type: "note";
  text: string;
}

export interface ConcernEntry extends BaseEntry {
  type: "concern";
  concern: string;
  note?: string;
}

export type Entry =
  | SymptomEntry
  | QuestionEntry
  | AppointmentEntry
  | PersonEntry
  | MeasurementEntry
  | PhotoEntry
  | ArchivedLabourEntry
  | FeelingEntry
  | NoteEntry
  | ConcernEntry;

export interface Profile {
  userName: string;
  babyNickname: string;
  dueDateISO: string;
  hospital?: string;
  midwife?: string;
  consultant?: string;
  gp?: string;
  birthPartner?: string;
  // ARCHIVED (founder ruling, 12 Sep 2026): not part of the Azure V2 Profile
  // (src/lib/domain/types.ts) — kept here only so the current app keeps
  // reading/showing pre-existing values; see archive/labour.ts.
  triagePhone?: string;
  labourWardPhone?: string;
  onboarded: boolean;
}

export interface AppState {
  profile: Profile | null;
  entries: Entry[];
  // ARCHIVED (founder ruling, 12 Sep 2026): see archive/labour.ts.
  labourPlan?: ArchivedLabourPlan;
}
