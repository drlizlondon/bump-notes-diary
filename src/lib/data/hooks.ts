// Query hooks (AZURE Phase 3, task 3.6 partial) — the read/write surface the UI
// consumes, over the Repository. Reads via TanStack Query keyed per PLAN §4.6;
// writes via mutations that update/invalidate the cache. Covers every entity.
// The outbox/optimistic + mode-factory wiring (ApiRepository vs LocalRepository)
// arrives with tasks 3.3/3.6 — for now the authed ApiRepository is used
// directly. Additive + unwired (no surface uses it yet — the cutover is 3.9+).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HealthItem, Person, Preferences, Pregnancy, Profile } from "../domain/types";
import { apiRepository } from "./api-repo";
import type { CreateEntryInput, ListEntriesParams, UploadAttachmentInput } from "./repository";

const STALE = 60_000; // single-writer data (PLAN §4.6)

export const queryKeys = {
  profile: ["profile"] as const,
  pregnancies: ["pregnancies"] as const,
  activePregnancy: ["pregnancies", "active"] as const,
  entries: (params: ListEntriesParams) => ["entries", params] as const,
  people: ["people"] as const,
  healthItems: ["healthItems"] as const,
  preferences: ["preferences"] as const,
  attachments: (entryId: string) => ["attachments", entryId] as const,
};

// --- Profile ---------------------------------------------------------------
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiRepository.getProfile(),
    staleTime: STALE,
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>) =>
      apiRepository.upsertProfile(patch),
    onSuccess: (profile) => qc.setQueryData(queryKeys.profile, profile),
  });
}

// --- Pregnancies -----------------------------------------------------------
export function usePregnancies() {
  return useQuery({
    queryKey: queryKeys.pregnancies,
    queryFn: () => apiRepository.listPregnancies(),
    staleTime: STALE,
  });
}

export function useActivePregnancy() {
  return useQuery({
    queryKey: queryKeys.activePregnancy,
    queryFn: () => apiRepository.getActivePregnancy(),
    staleTime: STALE,
  });
}

export function useCreatePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Pick<Pregnancy, "edd"> & Partial<Pick<Pregnancy, "lmp" | "nickname" | "birthPlace">>,
    ) => apiRepository.createPregnancy(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.pregnancies });
      void qc.invalidateQueries({ queryKey: queryKeys.activePregnancy });
    },
  });
}

// --- Entries ---------------------------------------------------------------
export function useEntries(params: ListEntriesParams) {
  return useQuery({
    queryKey: queryKeys.entries(params),
    queryFn: () => apiRepository.listEntries(params),
    staleTime: STALE,
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => apiRepository.createEntry(input),
    onSuccess: (entry) => {
      void qc.invalidateQueries({ queryKey: ["entries", { pregnancyId: entry.pregnancyId }] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useSoftDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRepository.softDeleteEntry(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

// --- People ----------------------------------------------------------------
export function usePeople() {
  return useQuery({
    queryKey: queryKeys.people,
    queryFn: () => apiRepository.listPeople(),
    staleTime: STALE,
  });
}

export function useUpsertPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Person> & Pick<Person, "name" | "role">) =>
      apiRepository.upsertPerson(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.people }),
  });
}

// --- Health items ----------------------------------------------------------
export function useHealthItems() {
  return useQuery({
    queryKey: queryKeys.healthItems,
    queryFn: () => apiRepository.listHealthItems(),
    staleTime: STALE,
  });
}

export function useUpsertHealthItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<HealthItem> & Pick<HealthItem, "kind" | "text">) =>
      apiRepository.upsertHealthItem(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.healthItems }),
  });
}

// --- Preferences -----------------------------------------------------------
export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => apiRepository.getPreferences(),
    staleTime: STALE,
  });
}

export function useUpsertPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Preferences, "items" | "anythingElse">>) =>
      apiRepository.upsertPreferences(patch),
    onSuccess: (prefs) => qc.setQueryData(queryKeys.preferences, prefs),
  });
}

// --- Attachments -----------------------------------------------------------
export function useAttachments(entryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.attachments(entryId),
    queryFn: () => apiRepository.listAttachments(entryId),
    enabled: enabled && !!entryId,
    staleTime: STALE,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadAttachmentInput) => apiRepository.uploadAttachment(input),
    onSuccess: (att) => void qc.invalidateQueries({ queryKey: queryKeys.attachments(att.entryId) }),
  });
}

export function useDeleteAttachment(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => apiRepository.deleteAttachment(attachmentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.attachments(entryId) }),
  });
}

/** Fetch a short-lived download URL on demand (not cached; SAS URLs expire). */
export function useAttachmentUrl() {
  return useMutation({
    mutationFn: (attachmentId: string) => apiRepository.getAttachmentUrl(attachmentId),
  });
}
