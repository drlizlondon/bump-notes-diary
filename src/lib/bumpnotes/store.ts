import { useSyncExternalStore } from "react";
import type { AppState, Entry, Profile } from "./types";
import { gestationFromDueDate } from "./gestation";

const KEY = "bumpnotes:v1";

const initial: AppState = { profile: null, entries: [] };

let state: AppState = initial;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as AppState;
    return { profile: parsed.profile ?? null, entries: parsed.entries ?? [] };
  } catch {
    return initial;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: AppState) {
  state = next;
  persist();
  emit();
}

// Hydrate on first import (client only)
if (typeof window !== "undefined") {
  state = load();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}

export const store = {
  getState: () => state,
  setProfile(p: Profile) {
    setState({ ...state, profile: p });
  },
  updateProfile(patch: Partial<Profile>) {
    if (!state.profile) return;
    setState({ ...state, profile: { ...state.profile, ...patch } });
  },
  addEntry(entry: Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt?: string }) {
    const createdAt = entry.createdAt ?? new Date().toISOString();
    const weekDay = state.profile
      ? gestationFromDueDate(state.profile.dueDateISO, new Date(createdAt))
      : { weeks: 0, days: 0 };
    const full = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt,
      weekDay,
    } as Entry;
    setState({ ...state, entries: [full, ...state.entries] });
    return full;
  },
  updateEntry(id: string, patch: Partial<Entry>) {
    setState({
      ...state,
      entries: state.entries.map((e) => (e.id === id ? ({ ...e, ...patch } as Entry) : e)),
    });
  },
  softDelete(id: string) {
    setState({
      ...state,
      entries: state.entries.map((e) =>
        e.id === id ? ({ ...e, deletedAt: new Date().toISOString() } as Entry) : e,
      ),
    });
  },
  restore(id: string) {
    setState({
      ...state,
      entries: state.entries.map((e) =>
        e.id === id ? ({ ...e, deletedAt: undefined } as Entry) : e,
      ),
    });
  },
  hardDelete(id: string) {
    setState({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  },
  purgeOldDeleted() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setState({
      ...state,
      entries: state.entries.filter(
        (e) => !e.deletedAt || new Date(e.deletedAt).getTime() > cutoff,
      ),
    });
  },
  clearAll() {
    setState(initial);
  },
  exportAll() {
    return JSON.stringify(state, null, 2);
  },
};
