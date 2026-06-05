import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ClipboardList, FileText, Baby, Settings as SettingsIcon } from "lucide-react";
import { BottomNav } from "./BottomNav";

const navItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/timeline", label: "Timeline", Icon: ClipboardList },
  { to: "/pack", label: "Summary", Icon: FileText },
  { to: "/details", label: "Baby", Icon: Baby },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function AppShell({ children, hideNav = false, right }: { children: ReactNode; hideNav?: boolean; right?: ReactNode }) {
  return (
    <>
      {/* Mobile / tablet */}
      <div className="app-shell flex flex-col lg:hidden">
        <div className="flex-1 flex flex-col">{children}</div>
        {!hideNav && <BottomNav />}
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:gap-8 lg:max-w-[1200px] lg:mx-auto lg:px-6 lg:py-8 lg:min-h-[100dvh]">
        <DesktopSidebar />
        <main className="min-w-0">{children}</main>
        <aside className="min-w-0">{right ?? <DefaultAside />}</aside>
      </div>
    </>
  );
}

function DesktopSidebar() {
  const location = useLocation();
  return (
    <aside className="sticky top-8 self-start surface-card p-3">
      <div className="px-3 py-3">
        <p className="font-serif text-xl font-semibold">BumpNotes</p>
        <p className="text-[11px] text-ink-soft uppercase tracking-widest mt-0.5">Your pregnancy record</p>
      </div>
      <ul className="space-y-1 mt-2">
        {navItems.map(({ to, label, Icon }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <li key={to}>
              <Link to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-ink hover:bg-blush-soft"
                }`}>
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function DefaultAside() {
  return (
    <div className="sticky top-8 space-y-4">
      <div className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold">Your pregnancy summary</h3>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Everything you add is organised in your timeline. When you're ready, create a clear summary to share with your care team.
        </p>
        <Link to="/pack" className="mt-4 inline-flex w-full justify-center py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          Create summary
        </Link>
      </div>
      <div className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold">Private by default</h3>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Your data stays on this device unless you choose to share.
        </p>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="px-5 lg:px-1 pt-6 lg:pt-2 pb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
