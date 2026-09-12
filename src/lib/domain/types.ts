// V2 domain types (AZURE Phase 3, task 3.1).
//
// The typed contract for the Azure data layer, derived faithfully from the
// APPLIED migrations `azure/migrations/001` + `002` (the authoritative schema).
// Rows are mapped to camelCase; the API/repository owns row<->camelCase mapping
// and zod validation (AZURE §2 DECISION — no ORM). These types are additive and
// not yet wired into any surface — the surface cutover is later Phase 3 WPs.
//
// NOTE: `EntryPayload` (the shape inside `entries.payload jsonb`) is the one
// design area to confirm before wiring writes — see docs/product/
// PHASE-3-VERTICAL-SLICE.md §Payload. The row types below are stable (schema).

export type UserStatus = "active" | "deleted";

/** users (001) — internal identity; Entra/Supabase ids are the bridge. */
export interface User {
  id: string; // internal BumpNotes UUID
  externalIdentityId: string | null; // Entra object id (Phase I)
  supabaseUserId: string | null; // bridge window only
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** profiles (001) — person-level identity; absorbs the old "user profile". */
export interface Profile {
  userId: string;
  displayName: string | null;
  isTester: boolean;
  acceptedTermsAt: string | null;
  acceptedPrivacyAt: string | null;
  preferredName: string | null;
  dateOfBirth: string | null; // date
  healthIdentifier: string | null;
  healthIdentifierLabel: string; // per-region label, never hardcoded "NHS number"
  photoPath: string | null; // profile-images blob path
  v2NoticeDismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PregnancyStatus = "active" | "ended";

/** pregnancies (001) — first-class episode entity. */
export interface Pregnancy {
  id: string;
  userId: string;
  edd: string; // date
  lmp: string | null;
  nickname: string | null;
  birthPlace: string | null;
  status: PregnancyStatus;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PersonRole =
  | "midwife"
  | "gp"
  | "consultant"
  | "sonographer"
  | "birth_partner"
  | "hospital"
  | "other";

/** people (001) — person-level care team, not pregnancy-scoped. */
export interface Person {
  id: string;
  userId: string;
  name: string;
  role: PersonRole;
  contactDetails: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HealthItemKind = "condition" | "allergy" | "medication" | "operation";

/** health_items (001) — current-state facts as free-text chips, never coded. */
export interface HealthItem {
  id: string;
  userId: string;
  kind: HealthItemKind;
  text: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** preferences (001) — singleton per user; ordered free-text items. */
export interface Preferences {
  userId: string;
  items: string[];
  anythingElse: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EntryType =
  | "symptom"
  | "question"
  | "appointment"
  | "measurement"
  | "upload"
  | "note"
  | "feeling";

export type EntryVisibility = "private" | "personal" | "shareable";

/**
 * entries (002). `payload` is per-type JSON — see docs/product/
 * PHASE-3-VERTICAL-SLICE.md §Payload for the union to confirm before wiring
 * writes. Typed as `EntryPayload` (a to-confirm union) rather than `unknown`
 * so consumers get help without the API trusting it blindly (zod-validate).
 */
export interface Entry {
  id: string;
  userId: string;
  pregnancyId: string;
  personId: string | null;
  type: EntryType;
  typeVersion: number;
  occurredAt: string;
  recordedAt: string;
  gestationWeeks: number | null;
  gestationDays: number | null;
  visibility: EntryVisibility;
  payload: EntryPayload;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The shape inside entries.payload, keyed by Entry.type. CONFIRM before wiring
 * writes (§Payload). Fields mirror the current V1 capture shapes so the 5.8
 * backfill maps cleanly; the API zod-validates per type on write.
 */
export type EntryPayload =
  | {
      symptom: string;
      severity?: number;
      quantifier?: string;
      clarification?: string;
      location?: string;
      note?: string;
    }
  | { text: string; context?: string; answered?: boolean } // question
  | { kind: string; whoSeen?: string; discussed?: string; advice?: string; followUp?: string } // appointment
  | {
      kind: string;
      customLabel?: string;
      systolic?: number;
      diastolic?: number;
      pulse?: number;
      value?: number;
      unit?: string;
      note?: string;
    } // measurement
  | { tag: string; note?: string } // upload (binary lives in attachments)
  | { text: string } // note
  | { feeling: string; note?: string }; // feeling (visibility always 'private')

export type AttachmentContainer =
  | "user-uploads"
  | "profile-images"
  | "generated-summaries"
  | "exports";

/** attachments (002) — blob metadata; binary lives in Blob Storage. */
export interface Attachment {
  id: string;
  userId: string;
  entryId: string;
  container: AttachmentContainer;
  blobPath: string;
  mime: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  caption: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** summaries (002) — frozen document snapshots; immutable except pdfPath/shared. */
export interface Summary {
  id: string;
  userId: string;
  pregnancyId: string;
  type: string;
  layoutVersion: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  snapshot: unknown; // frozen; opaque to the domain layer
  manifest: unknown;
  pdfPath: string | null;
  shared: boolean;
  createdAt: string;
}
