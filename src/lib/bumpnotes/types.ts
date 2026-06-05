export type EntryType =
  | "symptom"
  | "question"
  | "appointment" // legacy — displayed as People & Care
  | "person"
  | "measurement"
  | "photo"
  | "labour" // legacy
  | "feeling"
  | "note"
  | "concern"; // legacy

export interface BaseEntry {
  id: string;
  type: EntryType;
  createdAt: string; // ISO
  weekDay: { weeks: number; days: number };
  deletedAt?: string;
  saveAsQuestion?: boolean;
}

export interface SymptomEntry extends BaseEntry {
  type: "symptom";
  symptom: string;
  severity?: number;
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

export interface AppState {
  profile: Profile | null;
  entries: Entry[];
}
