import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { LogoBadge } from "./Logo";


export function PublicShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="lg:sticky lg:top-0 z-20 bg-white/85 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/welcome" aria-label="BumpNotes home" className="flex items-center gap-2 min-w-0">
            <LogoBadge className="size-8 sm:size-9" />
            <span className="font-serif text-[17px] sm:text-lg font-semibold tracking-tight text-ink">BumpNotes</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm shrink-0">
            <Link to="/welcome" hash="features" className="px-3 py-1.5 text-ink-soft hover:text-ink">Features</Link>
            <Link to="/privacy" className="px-3 py-1.5 text-ink-soft hover:text-ink">Privacy</Link>
            <Link to="/auth" className="ml-1 px-3.5 py-1.5 rounded-full bg-white border border-border font-medium hover:bg-blush-soft">Sign in</Link>
          </nav>


          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <Link to="/auth" className="px-3 py-1.5 rounded-full bg-white border border-border text-sm font-medium">Sign in</Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="size-9 grid place-items-center rounded-full border border-border bg-white"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-2 flex flex-col">
              <Link to="/welcome" hash="features" onClick={() => setMenuOpen(false)} className="py-2.5 text-sm text-ink">Features</Link>
              <Link to="/privacy" onClick={() => setMenuOpen(false)} className="py-2.5 text-sm text-ink">Privacy</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="py-2.5 text-sm text-ink">Get in contact</Link>

            </div>
          </div>
        )}
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
