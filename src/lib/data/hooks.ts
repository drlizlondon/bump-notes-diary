// Query hooks (AZURE Phase 3, task 3.6 partial) — the read/write surface the UI
// consumes, over the Repository. Reads via TanStack Query keyed per PLAN §4.6;
// writes via mutations that update the cache. This slice covers Profile; more
// hooks land with their slices. The outbox/optimistic + mode-factory wiring
// (ApiRepository vs LocalRepository) arrives with tasks 3.3/3.6 — for now the
// authed ApiRepository is used directly. Additive + unwired (no surface uses it
// yet — the cutover is 3.9+).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "../domain/types";
import { apiRepository } from "./api-repo";

const PROFILE_KEY = ["profile"] as const;

/** The signed-in user's profile (null until created). */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => apiRepository.getProfile(),
    staleTime: 60_000, // single-writer data (PLAN §4.6)
  });
}

/** Create/update the profile; writes straight to the Profile cache on success. */
export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>) =>
      apiRepository.upsertProfile(patch),
    onSuccess: (profile) => {
      qc.setQueryData(PROFILE_KEY, profile);
    },
  });
}
