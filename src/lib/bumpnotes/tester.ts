import { useSyncExternalStore } from "react";

const KEY = "bumpnotes:tester";
const SESSION_KEY = "bumpnotes:tester_session";

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function read(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function isTester(): boolean { return read(); }

export function getTesterSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function enterTesterMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
    if (!window.localStorage.getItem(SESSION_KEY)) {
      window.localStorage.setItem(SESSION_KEY, `tester-${crypto.randomUUID()}`);
    }
  } catch { /* ignore */ }
  emit();
}

export function exitTesterMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
  emit();
}

export function useTester(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    read,
    () => false,
  );
}
