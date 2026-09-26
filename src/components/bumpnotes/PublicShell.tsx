import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { LogoBadge } from "./Logo";
import { TesterPasswordModal } from "./TesterPasswordModal";
import { BetaBanner } from "./BetaBanner";

export function PublicShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTesterModal, setShowTesterModal] = useState(false);
  const location = useLocation();
  const isWelcome = location.pathname === "/welcome";
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  // fix/mobile-demo-polish-2026-09-26: Escape closes the open mobile nav and
  // returns focus to the toggle button (accessibility parity with the
  // tap-outside backdrop below).
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <BetaBanner />
      <header className="lg:sticky lg:top-0 z-20 bg-white/85 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            to="/welcome"
            aria-label="BumpNotes home"
            className="flex items-center gap-2 min-w-0"
          >
            <LogoBadge className="size-8 sm:size-9" />
            <span className="font-serif text-[17px] sm:text-lg font-semibold tracking-tight text-ink">
              BumpNotes
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm shrink-0">
            <Link to="/features" className="px-3 py-1.5 text-ink-soft hover:text-ink">
              Features
            </Link>
            <Link to="/our-story" className="px-3 py-1.5 text-ink-soft hover:text-ink">
              Our Story
            </Link>
            <Link to="/trust" className="px-3 py-1.5 text-ink-soft hover:text-ink">
              For clinicians
            </Link>
            <Link to="/demo" className="px-3 py-1.5 text-ink-soft hover:text-ink">
              Preview
            </Link>
            <Link to="/privacy" className="px-3 py-1.5 text-ink-soft hover:text-ink">
              Privacy
            </Link>
            <Link
              to="/signin"
              className="ml-1 px-3.5 py-1.5 rounded-full bg-white border border-border font-medium hover:bg-blush-soft"
            >
              Sign in
            </Link>
          </nav>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <Link
              to="/signin"
              className="px-3 py-1.5 rounded-full bg-white border border-border text-sm font-medium"
            >
              Sign in
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="size-9 grid place-items-center rounded-full border border-border bg-white"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden relative z-20 border-t border-border bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-2 flex flex-col">
              <Link to="/features" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                Features
              </Link>
              <Link to="/our-story" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                Our Story
              </Link>
              <Link to="/trust" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                For clinicians
              </Link>
              <Link to="/demo" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                Preview
              </Link>
              <Link to="/privacy" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                Privacy
              </Link>
              <Link to="/contact" onClick={closeMenu} className="py-2.5 text-sm text-ink">
                Get in contact
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Tap-outside backdrop closes the menu (fix/mobile-demo-polish-2026-09-26).
          Rendered OUTSIDE <header> deliberately: <header> has `backdrop-blur`
          (backdrop-filter), which creates a new containing block for
          `position: fixed` descendants in every real browser — a fixed
          backdrop nested inside it only covers the header's own box (it
          measured ~300px tall in testing, not the viewport), so tapping the
          rest of the screen never reached it and the menu wouldn't close. */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
          className="lg:hidden fixed inset-0 top-14 z-10 bg-ink/20"
        />
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border print:hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink-soft">
          <span>© BumpNotes</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/education" className="hover:text-ink">
              Education
            </Link>
            <Link to="/trust" className="hover:text-ink">
              For clinicians
            </Link>
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link to="/contact" className="hover:text-ink">
              Get in contact
            </Link>
            {isWelcome && (
              <button
                type="button"
                onClick={() => setShowTesterModal(true)}
                className="hover:text-primary hover:underline transition-colors"
              >
                Testing BumpNotes? Enter tester access code
              </button>
            )}
          </div>
        </div>
      </footer>
      {showTesterModal && <TesterPasswordModal onClose={() => setShowTesterModal(false)} />}
    </div>
  );
}
