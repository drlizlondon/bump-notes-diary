import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { store } from "./store";
import type { AppState } from "./types";

export type SyncStatus = "local" | "syncing" | "synced" | "error";

let status: SyncStatus = "local";
let currentUserId: string | null = null;
let currentEmail: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = "";
let storeUnsub: (() => void) | null = null;
let migrationPromptOpen = false;
let initialised = false;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function setStatus(s: SyncStatus) {
  if (status !== s) {
    status = s;
    emit();
  }
}
function setUser(u: { id: string | null; email: string | null }) {
  currentUserId = u.id;
  currentEmail = u.email;
  emit();
}
function setMigrationPrompt(b: boolean) {
  migrationPromptOpen = b;
  emit();
}

export function getSyncStatus(): SyncStatus {
  return status;
}
export function getUserId(): string | null {
  return currentUserId;
}
export function getUserEmail(): string | null {
  return currentEmail;
}
export function isMigrationPromptOpen(): boolean {
  return migrationPromptOpen;
}
export function closeMigrationPrompt() {
  setMigrationPrompt(false);
}

export function useSyncSnapshot() {
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnap = () =>
    `${status}|${currentUserId ?? ""}|${currentEmail ?? ""}|${migrationPromptOpen ? "1" : "0"}`;
  useSyncExternalStore(subscribe, getSnap, () => "local||");
  return { status, userId: currentUserId, email: currentEmail, migrationPromptOpen };
}

function hasData(s: AppState | null | undefined): boolean {
  if (!s) return false;
  if (s.profile) return true;
  if ((s.entries?.length ?? 0) > 0) return true;
  if (s.labourPlan) return true;
  return false;
}

async function pullFromCloud(userId: string): Promise<AppState | null> {
  const { data, error } = await supabase
    .from("bumpnotes_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("pullFromCloud", error);
    setStatus("error");
    return null;
  }
  return (data?.state as AppState | undefined) ?? null;
}

async function pushToCloud(state: AppState) {
  if (!currentUserId) return;
  setStatus("syncing");
  const { error } = await supabase
    .from("bumpnotes_state")
    .upsert({ user_id: currentUserId, state: JSON.parse(JSON.stringify(state)) });
  if (error) {
    console.error("pushToCloud", error);
    setStatus("error");
    return;
  }
  lastSerialized = JSON.stringify(state);
  setStatus("synced");
}

export async function syncNow() {
  if (!currentUserId) return;
  await pushToCloud(store.getState());
}

function schedulePush() {
  if (!currentUserId) return;
  const serialized = JSON.stringify(store.getState());
  if (serialized === lastSerialized) return;
  setStatus("syncing");
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushToCloud(store.getState());
  }, 1200);
}

function startWatching() {
  if (storeUnsub) return;
  storeUnsub = store.subscribe(schedulePush);
}
function stopWatching() {
  if (storeUnsub) {
    storeUnsub();
    storeUnsub = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

async function handleSession(user: { id: string; email?: string | null } | null) {
  if (!user) {
    stopWatching();
    lastSerialized = "";
    setUser({ id: null, email: null });
    setStatus("local");
    return;
  }
  setUser({ id: user.id, email: user.email ?? null });
  setStatus("syncing");
  const local = store.getState();
  const remote = await pullFromCloud(user.id);
  const localHas = hasData(local);
  const remoteHas = hasData(remote);

  if (remoteHas && localHas && JSON.stringify(local) !== JSON.stringify(remote)) {
    // Conflict — keep remote (authoritative), but let user know via prompt
    store.replaceState(remote!);
    lastSerialized = JSON.stringify(remote);
    setMigrationPrompt(true);
    setStatus("synced");
  } else if (remoteHas) {
    store.replaceState(remote!);
    lastSerialized = JSON.stringify(remote);
    setStatus("synced");
  } else if (localHas) {
    // Push local up
    await pushToCloud(local);
  } else {
    lastSerialized = JSON.stringify(local);
    setStatus("synced");
  }
  startWatching();
}

export async function initSync() {
  if (initialised) return;
  initialised = true;
  try {
    const { data } = await supabase.auth.getSession();
    await handleSession(
      data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null,
    );
  } catch (e) {
    console.error("initSync getSession", e);
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (
      event === "SIGNED_IN" ||
      event === "SIGNED_OUT" ||
      event === "USER_UPDATED" ||
      event === "INITIAL_SESSION"
    ) {
      void handleSession(session?.user ? { id: session.user.id, email: session.user.email } : null);
    }
  });
}

export async function signOut() {
  stopWatching();
  await supabase.auth.signOut();
  setUser({ id: null, email: null });
  setStatus("local");
}
