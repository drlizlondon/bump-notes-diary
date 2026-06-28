import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogoIcon, LogoWordmark } from "./Logo";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="lg:sticky lg:top-0 z-20 bg-white/90 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/welcome" aria-label="BumpNotes home" className="flex items-center gap-2 min-w-0">
            <LogoIcon className="size-7 shrink-0 rounded-full ring-1 ring-border bg-white" />
            <LogoWordmark className="h-6 sm:h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 text-sm shrink-0">
            <Link to="/auth" className="px-3.5 py-1.5 rounded-full bg-white border border-border text-sm font-medium hover:bg-blush-soft">Sign in</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink-soft">
          <span>© BumpNotes</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <Link to="/contact" className="hover:text-ink">Get in contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
