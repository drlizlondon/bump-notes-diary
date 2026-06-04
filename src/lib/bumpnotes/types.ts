export type EntryType =
  | "symptom"
  | "question"
  | "appointment"
  | "photo"
  | "labour"
  | "feeling"
  | "note"
  | "concern";

export interface BaseEntry {
  id: string;
  type: EntryType;
  createdAt: string; // ISO
  weekDay: { weeks: number; days: number };
  deletedAt?: string; // ISO if soft-deleted
  saveAsQuestion?: boolean;
}

export interface SymptomEntry extends BaseEntry {
  type: "symptom";
  symptom: string;
  severity?: number;
  clarification?: string;
  location?: string;
  note?: string;
}

export interface QuestionEntry extends BaseEntry {
  type: "question";
  text: string;
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
  | PhotoEntry
  | LabourEntry
  | FeelingEntry
  | NoteEntry
  | ConcernEntry;

export interface Profile {
  userName: string;
  babyNickname: string;
  dueDateISO: string; // YYYY-MM-DD
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
