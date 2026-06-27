import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogoWordmark } from "./Logo";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/welcome" aria-label="BumpNotes home" className="flex items-center">
            <LogoWordmark className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link to="/demo" className="hidden sm:inline px-2 py-1 text-ink-soft hover:text-ink">Preview</Link>
            <Link to="/contact" className="hidden sm:inline px-2 py-1 text-ink-soft hover:text-ink">Contact</Link>
            <Link to="/auth" className="px-3 py-1.5 rounded-full bg-white border border-border text-sm font-medium">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
          <span>© BumpNotes</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/demo" className="hover:text-ink">Preview</Link>
            <Link to="/contact" className="hover:text-ink">Contact</Link>
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
