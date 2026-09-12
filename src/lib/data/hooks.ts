// Query hooks (AZURE Phase 3, task 3.6) — the read/write surface the UI consumes
// over the Repository. Reads via TanStack Query; writes via cache-updating
// mutations. The repository (and cache namespace) come from `useRepository()`,
// so the SAME hooks serve authed (ApiRepository), demo and tester (LocalRepository)
// modes — keys are prefixed with the mode so their caches never collide. With no
// provider mounted the default authed ApiRepository is used (pre-cutover surfaces
// keep working). Optimistic/outbox layering can wrap these later (task 3.3).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HealthItem, Person, Preferences, Pregnancy, Profile } from "../domain/types";
import { useRepository, type RepositoryMode } from "./repository-context";
import type { CreateEntryInput, ListEntriesParams, UploadAttachmentInput } from "./repository";
import { deleteOwnAccount, exportMyData } from "../azure/account.functions";
import { nativeSignOut } from "../azure/entra-native";

const STALE = 60_000; // single-writer data (PLAN §4.6)

// Keys are namespaced by mode so demo/tester/api caches stay separate.
const keys = {
  profile: (m: RepositoryMode) => [m, "profile"] as const,
  pregnancies: (m: RepositoryMode) => [m, "pregnancies"] as const,
  activePregnancy: (m: RepositoryMode) => [m, "pregnancies", "active"] as const,
  entries: (m: RepositoryMode, params: ListEntriesParams) => [m, "entries", params] as const,
  entriesAll: (m: RepositoryMode) => [m, "entries"] as const,
  people: (m: RepositoryMode) => [m, "people"] as const,
  healthItems: (m: RepositoryMode) => [m, "healthItems"] as const,
  preferences: (m: RepositoryMode) => [m, "preferences"] as const,
  attachments: (m: RepositoryMode, entryId: string) => [m, "attachments", entryId] as const,
};

// --- Profile ---------------------------------------------------------------
export function useProfile() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.profile(mode),
    queryFn: () => repository.getProfile(),
    staleTime: STALE,
  });
}

export function useUpsertProfile() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>) =>
      repository.upsertProfile(patch),
    onSuccess: (profile) => qc.setQueryData(keys.profile(mode), profile),
  });
}

// --- Pregnancies -----------------------------------------------------------
export function usePregnancies() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.pregnancies(mode),
    queryFn: () => repository.listPregnancies(),
    staleTime: STALE,
  });
}

export function useActivePregnancy() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.activePregnancy(mode),
    queryFn: () => repository.getActivePregnancy(),
    staleTime: STALE,
  });
}

export function useCreatePregnancy() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Pick<Pregnancy, "edd"> & Partial<Pick<Pregnancy, "lmp" | "nickname" | "birthPlace">>,
    ) => repository.createPregnancy(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.pregnancies(mode) });
    },
  });
}

export function useUpdatePregnancy() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      args: {
        id: string;
      } & Partial<Pick<Pregnancy, "edd" | "lmp" | "nickname" | "birthPlace">>,
    ) => {
      const { id, ...patch } = args;
      return repository.updatePregnancy(id, patch);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.pregnancies(mode) });
    },
  });
}

// --- Entries ---------------------------------------------------------------
export function useEntries(params: ListEntriesParams, opts?: { enabled?: boolean }) {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.entries(mode, params),
    queryFn: () => repository.listEntries(params),
    staleTime: STALE,
    enabled: opts?.enabled ?? true,
  });
}

export function useCreateEntry() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntryInput) => repository.createEntry(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.entriesAll(mode) }),
  });
}

export function useSoftDeleteEntry() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.softDeleteEntry(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.entriesAll(mode) }),
  });
}

// --- People ----------------------------------------------------------------
export function usePeople() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.people(mode),
    queryFn: () => repository.listPeople(),
    staleTime: STALE,
  });
}

export function useUpsertPerson() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Person> & Pick<Person, "name" | "role">) =>
      repository.upsertPerson(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.people(mode) }),
  });
}

// --- Health items ----------------------------------------------------------
export function useHealthItems() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.healthItems(mode),
    queryFn: () => repository.listHealthItems(),
    staleTime: STALE,
  });
}

export function useUpsertHealthItem() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<HealthItem> & Pick<HealthItem, "kind" | "text">) =>
      repository.upsertHealthItem(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.healthItems(mode) }),
  });
}

// --- Preferences -----------------------------------------------------------
export function usePreferences() {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.preferences(mode),
    queryFn: () => repository.getPreferences(),
    staleTime: STALE,
  });
}

export function useUpsertPreferences() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Preferences, "items" | "anythingElse">>) =>
      repository.upsertPreferences(patch),
    onSuccess: (prefs) => qc.setQueryData(keys.preferences(mode), prefs),
  });
}

// --- Attachments -----------------------------------------------------------
export function useAttachments(entryId: string, enabled = true) {
  const { repository, mode } = useRepository();
  return useQuery({
    queryKey: keys.attachments(mode, entryId),
    queryFn: () => repository.listAttachments(entryId),
    enabled: enabled && !!entryId,
    staleTime: STALE,
  });
}

export function useUploadAttachment() {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadAttachmentInput) => repository.uploadAttachment(input),
    onSuccess: (att) =>
      void qc.invalidateQueries({ queryKey: keys.attachments(mode, att.entryId) }),
  });
}

export function useDeleteAttachment(entryId: string) {
  const { repository, mode } = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => repository.deleteAttachment(attachmentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.attachments(mode, entryId) }),
  });
}

/** Fetch a short-lived download URL on demand (not cached; SAS URLs expire). */
export function useAttachmentUrl() {
  const { repository } = useRepository();
  return useMutation({
    mutationFn: (attachmentId: string) => repository.getAttachmentUrl(attachmentId),
  });
}

// --- Account / GDPR (api-only; these act on real data, not demo/tester) -----

/** GDPR-1 export: resolves to the full data copy; the UI turns it into a download. */
export function useExportMyData() {
  return useMutation({ mutationFn: () => exportMyData() });
}

/** Download a JS value as a pretty-printed JSON file (call from the UI on export success). */
export function downloadJson(filename: string, data: unknown): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * GDPR-2 erasure: deletes the account's data, then signs out and clears the
 * query cache. Irreversible — gate behind an explicit confirmation in the UI.
 */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteOwnAccount(),
    onSuccess: async () => {
      try {
        await nativeSignOut();
      } catch {
        /* session may already be gone */
      }
      qc.clear();
    },
  });
}
