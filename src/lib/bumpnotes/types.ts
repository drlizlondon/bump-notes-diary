export type EntryType =
  | "symptom"
  | "question"
  | "appointment" // legacy
  | "person"
  | "measurement"
  | "photo"
  | "labour" // legacy (kept for back-compat)
  | "labour_event"
  | "contraction"
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

export interface LabourEntry extends BaseEntry {
  type: "labour";
  event: string;
  note?: string;
}

export interface LabourEventEntry extends BaseEntry {
  type: "labour_event";
  event: string;
  note?: string;
}

export interface ContractionEntry extends BaseEntry {
  type: "contraction";
  startISO: string;
  endISO: string;
  durationSec: number;
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
  | LabourEntry
  | LabourEventEntry
  | ContractionEntry
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
  triagePhone?: string;
  labourWardPhone?: string;
  onboarded: boolean;
}

export interface BagItem { id: string; label: string; packed: boolean; }

export interface LabourEpisode {
  id: string;
  startISO: string;
  endISO?: string;
  outcome?: "baby" | "settled" | "other";
  outcomeNote?: string;
}

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


export interface AppState {
  profile: Profile | null;
  entries: Entry[];
  labourPlan?: LabourPlan;
}
