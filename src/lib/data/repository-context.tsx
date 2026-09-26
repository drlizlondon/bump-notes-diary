// Repository mode factory + React context (AZURE Phase 3, task 3.6).
//
// One Repository interface, three implementations selected by mode:
//   • api    → ApiRepository  (authenticated; real data on Azure)
//   • demo   → LocalRepository (sessionStorage; seeded sample data)
//   • tester → LocalRepository (localStorage; persists, starts empty)
//
// Surfaces wrap themselves in <RepositoryProvider mode=…> and the query hooks
// read `useRepository()`. With no provider present the default is the authed
// ApiRepository, so pre-cutover surfaces (e.g. /entra) keep working unchanged.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { isTester } from "../bumpnotes/tester";
import { isDemoSession } from "../bumpnotes/demo-session";
import { apiRepository } from "./api-repo";
import { LocalRepository } from "./local-repo";
import type { Repository } from "./repository";

export type RepositoryMode = "api" | "demo" | "tester";

export function createRepository(mode: RepositoryMode): Repository {
  switch (mode) {
    case "demo":
      return new LocalRepository("demo");
    case "tester":
      return new LocalRepository("tester");
    default:
      return apiRepository;
  }
}

/**
 * The app's default mode outside an explicit provider: tester flag wins,
 * then an active demo session (fix/demo-summary-2026-09-26 — set by /demo on
 * mount so Timeline/Pregnancy Summary/Baby details/Settings, reached via the
 * nav while previewing, read the same seeded on-device demo data instead of
 * falling through to the authed API), else authed API.
 */
export function resolveDefaultMode(): RepositoryMode {
  if (isTester()) return "tester";
  if (isDemoSession()) return "demo";
  return "api";
}

interface RepositoryContextValue {
  repository: Repository;
  mode: RepositoryMode;
}

const RepositoryContext = createContext<RepositoryContextValue>({
  repository: apiRepository,
  mode: "api",
});

export function RepositoryProvider({
  mode,
  children,
}: {
  mode: RepositoryMode;
  children: ReactNode;
}) {
  const value = useMemo<RepositoryContextValue>(
    () => ({ repository: createRepository(mode), mode }),
    [mode],
  );
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

/** The active repository + mode. Defaults to the authed ApiRepository when no provider is mounted. */
export function useRepository(): RepositoryContextValue {
  return useContext(RepositoryContext);
}
