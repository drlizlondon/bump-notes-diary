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

let loadingNative = false;
async function loadNative(): Promise<void> {
  if (loadingNative) return; // dedupe concurrent re-verifies
  loadingNative = true;
  try {
    const account = await getNativeAccount();
    setSnap({ account, checked: true });
  } catch {
    setSnap(CHECKED_NONE);
  } finally {
    loadingNative = false;
  }
}

/** Re-query the native account after a native sign-in / sign-out. */
export function refreshNativeSession(): void {
  snap = EMPTY;
  emit();
  void loadNative();
}

/**
 * Set the session directly from a just-completed native sign-in result, rather
 * than re-querying getNativeAccount() (which can briefly return null right after
 * sign-up). The gates react immediately; a later reload rehydrates via loadNative.
 * Pass null on sign-out.
 */
export function setNativeSession(account: NativeAccount | null): void {
  setSnap({ account, checked: true });
}

function subscribeNative(cb: () => void): () => void {
  listeners.add(cb);
  // Resolve once per app boot, then cache. Auth transitions refresh it
  // explicitly: sign-in does a full page load (fresh boot), sign-out calls
  // refreshNativeSession. Re-verifying on every mount caused a per-navigation
  // loading flash that made gates bounce to /welcome and back.
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
