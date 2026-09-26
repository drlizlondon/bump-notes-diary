// Demo session flag (fix/demo-summary-2026-09-26).
//
// A5 wired /demo onto the V2 repository (RepositoryProvider mode="demo",
// LocalRepository backed by sessionStorage, seeded fixtures — see
// src/lib/data/local-repo.ts + local-seed.ts), but nothing recorded "this
// browser tab is currently walking the demo" for the OTHER routes a demo
// visitor reaches via the sidebar/nav (Timeline, Pregnancy Summary, Baby
// details, Settings). Those routes:
//   • guard on `!!userId || isTester()` (src/lib/data/session.ts +
//     src/lib/bumpnotes/tester.ts) — no demo case, so a demo visitor bounces
//     to /welcome.
//   • wrap themselves in <AppRepository> (src/lib/data/capture.tsx), which
//     picks its Repository from resolveDefaultMode() — also "tester" | "api"
//     only, so even if the guard let a demo visitor through, they'd hit the
//     real ApiRepository (401 for a visitor with no account).
//
// This module is that missing signal: a sessionStorage flag set when /demo
// mounts and read by resolveDefaultMode() and by each route's auth guard.
// sessionStorage (not localStorage) so it disappears when the tab closes,
// matching the demo's "have a look around, nothing is saved" promise — same
// storage class the old store.ts demoMode used pre-cutover.

import { useSyncExternalStore } from "react";

const KEY = "bumpnotes:demo_session";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** True when this tab is currently walking the demo (set by /demo on mount). */
export function isDemoSession(): boolean {
  return read();
}

export function enterDemoSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
}

export function exitDemoSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function useDemoSession(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false,
  );
}
