// ApiRepository (AZURE Phase 3, task 3.2) — the Repository over the Azure API.
//
// Calls the TanStack Start server functions; the browser attaches the auth
// bearer token to every RPC via the global auth middleware (Supabase bridge or
// Entra native), and `requireApiAuth` (2.6) resolves the internal user id
// server-side — never a client id. Every entity is now wired to its Azure
// server functions (Phase 3A).

import {
  getProfile as getProfileFn,
  upsertProfile as upsertProfileFn,
} from "../azure/profile.functions";
import {
  createPregnancy as createPregnancyFn,
  getActivePregnancy as getActivePregnancyFn,
  listPregnancies as listPregnanciesFn,
  updatePregnancy as updatePregnancyFn,
} from "../azure/pregnancy.functions";
import {
  createEntry as createEntryFn,
  listEntries as listEntriesFn,
  softDeleteEntry as softDeleteEntryFn,
} from "../azure/entry.functions";
import {
  listPeople as listPeopleFn,
  upsertPerson as upsertPersonFn,
} from "../azure/people.functions";
import {
  listHealthItems as listHealthItemsFn,
  upsertHealthItem as upsertHealthItemFn,
} from "../azure/health-items.functions";
import {
  getPreferences as getPreferencesFn,
  upsertPreferences as upsertPreferencesFn,
} from "../azure/preferences.functions";
import {
  deleteAttachment as deleteAttachmentFn,
  getAttachmentUrl as getAttachmentUrlFn,
  listAttachments as listAttachmentsFn,
  uploadAttachment as uploadAttachmentFn,
} from "../azure/attachment.functions";
import type {
  Attachment,
  Entry,
  HealthItem,
  Person,
  Preferences,
  Pregnancy,
  Profile,
} from "../domain/types";
import type {
  CreateEntryInput,
  ListEntriesParams,
  Repository,
  UploadAttachmentInput,
} from "./repository";

export class ApiRepository implements Repository {
  // --- Profile ---
  async getProfile(): Promise<Profile | null> {
    return getProfileFn();
  }
  async upsertProfile(
    patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>,
  ): Promise<Profile> {
    return upsertProfileFn({
      data: {
        displayName: patch.displayName,
        preferredName: patch.preferredName,
        dateOfBirth: patch.dateOfBirth,
        healthIdentifier: patch.healthIdentifier,
        healthIdentifierLabel: patch.healthIdentifierLabel,
        photoPath: patch.photoPath,
      },
    });
  }

  // --- Pregnancies ---
  async listPregnancies(): Promise<Pregnancy[]> {
    return listPregnanciesFn();
  }
  async getActivePregnancy(): Promise<Pregnancy | null> {
    return getActivePregnancyFn();
  }
  async createPregnancy(
    input: Pick<Pregnancy, "edd"> & Partial<Pick<Pregnancy, "lmp" | "nickname" | "birthPlace">>,
  ): Promise<Pregnancy> {
    return createPregnancyFn({
      data: {
        edd: input.edd,
        lmp: input.lmp,
        nickname: input.nickname,
        birthPlace: input.birthPlace,
      },
    });
  }
  async updatePregnancy(
    id: string,
    patch: Partial<Pick<Pregnancy, "edd" | "lmp" | "nickname" | "birthPlace">>,
  ): Promise<Pregnancy> {
    return updatePregnancyFn({ data: { id, ...patch } });
  }

  // --- Entries ---
  async listEntries(params: ListEntriesParams): Promise<Entry[]> {
    return listEntriesFn({ data: params });
  }
  async createEntry(input: CreateEntryInput): Promise<Entry> {
    return createEntryFn({ data: input });
  }
  async softDeleteEntry(id: string): Promise<void> {
    await softDeleteEntryFn({ data: { id } });
  }

  // --- People ---
  async listPeople(): Promise<Person[]> {
    return listPeopleFn();
  }
  async upsertPerson(input: Partial<Person> & Pick<Person, "name" | "role">): Promise<Person> {
    return upsertPersonFn({
      data: {
        id: input.id,
        name: input.name,
        role: input.role,
        contactDetails: input.contactDetails,
        archivedAt: input.archivedAt,
      },
    });
  }

  // --- Health items ---
  async listHealthItems(): Promise<HealthItem[]> {
    return listHealthItemsFn();
  }
  async upsertHealthItem(
    input: Partial<HealthItem> & Pick<HealthItem, "kind" | "text">,
  ): Promise<HealthItem> {
    return upsertHealthItemFn({
      data: { id: input.id, kind: input.kind, text: input.text, active: input.active },
    });
  }

  // --- Preferences ---
  async getPreferences(): Promise<Preferences | null> {
    return getPreferencesFn();
  }
  async upsertPreferences(
    patch: Partial<Pick<Preferences, "items" | "anythingElse">>,
  ): Promise<Preferences> {
    return upsertPreferencesFn({
      data: { items: patch.items, anythingElse: patch.anythingElse },
    });
  }

  // --- Attachments ---
  async listAttachments(entryId: string): Promise<Attachment[]> {
    return listAttachmentsFn({ data: { entryId } });
  }
  async uploadAttachment(input: UploadAttachmentInput): Promise<Attachment> {
    return uploadAttachmentFn({ data: input });
  }
  async getAttachmentUrl(attachmentId: string): Promise<{ url: string; expiresAt: string }> {
    return getAttachmentUrlFn({ data: { attachmentId } });
  }
  async deleteAttachment(attachmentId: string): Promise<void> {
    await deleteAttachmentFn({ data: { attachmentId } });
  }
}

/** Singleton used by the query hooks (task 3.6's mode factory selects this when authed). */
export const apiRepository = new ApiRepository();
