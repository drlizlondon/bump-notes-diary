// ApiRepository (AZURE Phase 3, task 3.2) — the Repository over the Azure API.
//
// Calls the TanStack Start server functions; the browser attaches the Supabase
// bearer token to every RPC via the global `attachSupabaseAuth` middleware, and
// `requireApiAuth` (2.6) resolves the internal user id server-side. This slice
// implements Profile; the remaining methods throw until their slices land
// (keeps the interface honest rather than silently returning empty data).

import { getProfile as getProfileFn, upsertProfile as upsertProfileFn } from "../azure/profile.functions";
import type { Entry, HealthItem, Person, Preferences, Pregnancy, Profile } from "../domain/types";
import type { CreateEntryInput, ListEntriesParams, Repository } from "./repository";

function notYet(method: string): never {
  throw new Error(`ApiRepository.${method} is not implemented yet (Phase 3 — later slice).`);
}

export class ApiRepository implements Repository {
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

  // --- Not yet implemented (later Phase 3 slices) ---
  async listPregnancies(): Promise<Pregnancy[]> {
    return notYet("listPregnancies");
  }
  async getActivePregnancy(): Promise<Pregnancy | null> {
    return notYet("getActivePregnancy");
  }
  async createPregnancy(): Promise<Pregnancy> {
    return notYet("createPregnancy");
  }
  async listEntries(_params: ListEntriesParams): Promise<Entry[]> {
    return notYet("listEntries");
  }
  async createEntry(_input: CreateEntryInput): Promise<Entry> {
    return notYet("createEntry");
  }
  async softDeleteEntry(_id: string): Promise<void> {
    return notYet("softDeleteEntry");
  }
  async listPeople(): Promise<Person[]> {
    return notYet("listPeople");
  }
  async upsertPerson(): Promise<Person> {
    return notYet("upsertPerson");
  }
  async listHealthItems(): Promise<HealthItem[]> {
    return notYet("listHealthItems");
  }
  async upsertHealthItem(): Promise<HealthItem> {
    return notYet("upsertHealthItem");
  }
  async getPreferences(): Promise<Preferences | null> {
    return notYet("getPreferences");
  }
  async upsertPreferences(): Promise<Preferences> {
    return notYet("upsertPreferences");
  }
}

/** Singleton used by the query hooks (task 3.6's mode factory selects this when authed). */
export const apiRepository = new ApiRepository();
