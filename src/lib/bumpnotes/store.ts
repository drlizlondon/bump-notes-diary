import { useSyncExternalStore } from "react";
import type { AppState, Entry, Profile, LabourPlan, BagItem } from "./types";
import { gestationFromDueDate } from "./gestation";
import { t } from "./i18n";

const KEY = "bumpnotes:v1";

function defaultBag(): BagItem[] {
  const labels = [
    t("lab.bag.defaults.notes"),
    t("lab.bag.defaults.phone"),
    t("lab.bag.defaults.clothes"),
    t("lab.bag.defaults.nappies"),
    t("lab.bag.defaults.toilet"),
    t("lab.bag.defaults.snacks"),
  ];
  return labels.map((label) => ({ id: crypto.randomUUID(), label, packed: false }));
}

const initial: AppState = { profile: null, entries: [] };

let state: AppState = initial;
const listeners = new Set<() => void>();

// Demo mode: when active, persistence to localStorage is suspended so demo
// edits stay in memory only and reset on refresh / leaving the demo.
let demoMode = false;
let demoBackup: AppState | null = null;

function load(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as AppState;
    return {
      profile: parsed.profile ?? null,
      entries: parsed.entries ?? [],
      labourPlan: parsed.labourPlan,
    };
  } catch {
    return initial;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  if (demoMode) return; // never write demo data to localStorage
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function emit() { listeners.forEach((l) => l()); }
function setState(next: AppState) { state = next; persist(); emit(); }

if (typeof window !== "undefined") state = load();

function subscribeStore(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export function subscribe(cb: () => void) { return subscribeStore(cb); }

export function useAppState(): AppState {
  return useSyncExternalStore(subscribeStore, () => state, () => initial);
}

export const store = {
  getState: () => state,
  subscribe: subscribeStore,
  replaceState(next: AppState) { setState(next); },
  setProfile(p: Profile) { setState({ ...state, profile: p }); },

  updateProfile(patch: Partial<Profile>) {
    if (!state.profile) return;
    setState({ ...state, profile: { ...state.profile, ...patch } });
  },
  addEntry(entry: Omit<Entry, "id" | "createdAt" | "weekDay"> & { createdAt?: string }) {
    const createdAt = entry.createdAt ?? new Date().toISOString();
    const weekDay = state.profile
      ? gestationFromDueDate(state.profile.dueDateISO, new Date(createdAt))
      : { weeks: 0, days: 0 };
    const full = { ...entry, id: crypto.randomUUID(), createdAt, weekDay } as Entry;
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
      entries: state.entries.map((e) => (e.id === id ? ({ ...e, deletedAt: undefined } as Entry) : e)),
    });
  },
  hardDelete(id: string) {
    setState({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  },
  purgeOldDeleted() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setState({
      ...state,
      entries: state.entries.filter((e) => !e.deletedAt || new Date(e.deletedAt).getTime() > cutoff),
    });
  },
  clearAll() { setState(initial); },
  exportAll() { return JSON.stringify(state, null, 2); },

  // Labour
  getLabourPlan(): LabourPlan {
    if (state.labourPlan) return state.labourPlan;
    return { bag: defaultBag() };
  },
  updateLabourPlan(patch: Partial<LabourPlan>) {
    const current = state.labourPlan ?? { bag: defaultBag() };
    setState({ ...state, labourPlan: { ...current, ...patch } });
  },
  setBag(bag: BagItem[]) {
    const current = state.labourPlan ?? { bag };
    setState({ ...state, labourPlan: { ...current, bag } });
  },
  startLabourRecording() {
    const current = state.labourPlan ?? { bag: defaultBag() };
    setState({ ...state, labourPlan: { ...current, recordingStartISO: new Date().toISOString() } });
  },
  endLabourRecording() {
    if (!state.labourPlan) return;
    setState({ ...state, labourPlan: { ...state.labourPlan, recordingStartISO: undefined } });
  },
};
