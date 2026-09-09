// Repository interface (AZURE Phase 3, task 3.2).
//
// The single data-access contract for the app. `ApiRepository` (api-repo.ts)
// implements it over the Azure API server functions; `LocalRepository`
// implements the SAME interface over sessionStorage(demo)/localStorage(tester)
// with V2 shapes and no network (PLAN §4.6). Surfaces depend only on this
// interface via the mode factory (task 3.6) — never on Supabase directly.
//
// All methods are implicitly scoped to the authenticated user; the API derives
// the internal user id from requireApiAuth (2.6) and never trusts a client id.
// Additive + unwired — no surface consumes this yet (cutover is 3.9+).

import type {
  Attachment,
  Entry,
  EntryPayload,
  EntryType,
  EntryVisibility,
  HealthItem,
  Person,
  Preferences,
  Pregnancy,
  Profile,
} from "../domain/types";

export interface CreateEntryInput {
  pregnancyId: string;
  personId?: string | null;
  type: EntryType;
  occurredAt: string;
  gestationWeeks?: number | null;
  gestationDays?: number | null;
  visibility: EntryVisibility;
  payload: EntryPayload;
}

export interface ListEntriesParams {
  pregnancyId: string;
  type?: EntryType;
  includeDeleted?: boolean;
}

export interface UploadAttachmentInput {
  entryId: string;
  filename: string;
  mime: string;
  /** EXIF-stripped image bytes, base64-encoded (see lib/data/attachments.ts). */
  dataBase64: string;
  caption?: string | null;
}

export interface Repository {
  // --- Profile (person-level identity) ---
  getProfile(): Promise<Profile | null>;
  upsertProfile(
    patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>,
  ): Promise<Profile>;

  // --- Pregnancies ---
  listPregnancies(): Promise<Pregnancy[]>;
  getActivePregnancy(): Promise<Pregnancy | null>;
  createPregnancy(
    input: Pick<Pregnancy, "edd"> & Partial<Pick<Pregnancy, "lmp" | "nickname" | "birthPlace">>,
  ): Promise<Pregnancy>;

  // --- Entries (the core journal) ---
  listEntries(params: ListEntriesParams): Promise<Entry[]>;
  createEntry(input: CreateEntryInput): Promise<Entry>;
  softDeleteEntry(id: string): Promise<void>;

  // --- People (care team) ---
  listPeople(): Promise<Person[]>;
  upsertPerson(input: Partial<Person> & Pick<Person, "name" | "role">): Promise<Person>;

  // --- Health items ---
  listHealthItems(): Promise<HealthItem[]>;
  upsertHealthItem(
    input: Partial<HealthItem> & Pick<HealthItem, "kind" | "text">,
  ): Promise<HealthItem>;

  // --- Preferences (singleton) ---
  getPreferences(): Promise<Preferences | null>;
  upsertPreferences(
    patch: Partial<Pick<Preferences, "items" | "anythingElse">>,
  ): Promise<Preferences>;

  // --- Attachments (blob metadata; binary in Blob Storage) ---
  listAttachments(entryId: string): Promise<Attachment[]>;
  uploadAttachment(input: UploadAttachmentInput): Promise<Attachment>;
  getAttachmentUrl(attachmentId: string): Promise<{ url: string; expiresAt: string }>;
  deleteAttachment(attachmentId: string): Promise<void>;
}
