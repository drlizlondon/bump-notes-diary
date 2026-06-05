import { Link, useLocation } from "@tanstack/react-router";
import { Home, ClipboardList, FileText, Baby, Settings as SettingsIcon } from "lucide-react";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/timeline", label: "Timeline", Icon: ClipboardList },
  { to: "/pack", label: "Summary", Icon: FileText },
  { to: "/details", label: "Baby", Icon: Baby },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const location = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 left-0 right-0 z-30 mt-auto border-t border-border bg-white/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-between px-2 pt-2 pb-3">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link to={to}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
                  active ? "text-primary" : "text-ink-soft hover:text-ink"
                }`}>
                <Icon className={`size-5 ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
