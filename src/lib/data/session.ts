// App session abstraction (AZURE identity flip, B1).
//
// One "who is signed in?" signal for every gate, so the app can move from
// Supabase to Entra-native sign-in behind a single flag:
//   • VITE_ENTRA_NATIVE = "true"  → the native Entra account (getNativeAccount)
//   • otherwise (default)          → the Supabase session (useSyncSnapshot)
//
// Default off = the live app is unchanged. The flag-on path is only fully
// verifiable by a live sign-in against the Entra tenant (see
// docs/product/IDENTITY-FLIP-PLAN-2026-09-12.md).
//
// Native has no event bus, so this keeps a tiny module store: it resolves
// getNativeAccount() once, and `refreshNativeSession()` re-queries after a
// native sign-in / sign-out so the gates react.

import { useSyncExternalStore } from "react";
import { useSyncSnapshot } from "../bumpnotes/sync";
import { ENTRA_NATIVE_ENABLED, getNativeAccount, type NativeAccount } from "../azure/entra-native";

export interface AppSession {
  userId: string | null;
  email: string | null;
  /** True while the session source is still resolving (don't redirect yet). */
  loading: boolean;
}

// --- native session store ---------------------------------------------------
type NativeSnap = { account: NativeAccount | null; checked: boolean };
const EMPTY: NativeSnap = { account: null, checked: false };
const CHECKED_NONE: NativeSnap = { account: null, checked: true };
let snap: NativeSnap = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function setSnap(next: NativeSnap) {
  snap = next;
  emit();
}

async function loadNative(): Promise<void> {
  try {
    const account = await getNativeAccount();
    setSnap({ account, checked: true });
  } catch {
    setSnap(CHECKED_NONE);
  }
}

/** Re-query the native account after a native sign-in / sign-out. */
export function refreshNativeSession(): void {
  snap = EMPTY;
  emit();
  void loadNative();
}

function subscribeNative(cb: () => void): () => void {
  listeners.add(cb);
  if (!snap.checked) {
    if (ENTRA_NATIVE_ENABLED) void loadNative();
    else setSnap(CHECKED_NONE);
  }
  return () => listeners.delete(cb);
}
function getNativeSnapshot(): NativeSnap {
  return snap;
}
function getNativeServerSnapshot(): NativeSnap {
  return EMPTY;
}

/**
 * The active app session. Reads the native Entra account when the flag is on,
 * else the Supabase session — both hooks are always called (rules of hooks); the
 * flag only decides which result is returned.
 */
export function useAppSession(): AppSession {
  const native = useSyncExternalStore(subscribeNative, getNativeSnapshot, getNativeServerSnapshot);
  const sync = useSyncSnapshot();

  if (ENTRA_NATIVE_ENABLED) {
    const username = native.account?.username ?? null;
    return { userId: username, email: username, loading: !native.checked };
  }
  return { userId: sync.userId, email: sync.email, loading: sync.status === "syncing" };
}
