import { Link, useLocation } from "@tanstack/react-router";
import { Home, ClipboardList, FileText, Heart, Baby, Settings as SettingsIcon } from "lucide-react";
import { useT } from "@/lib/bumpnotes/i18n";
import { useDemoMode } from "@/lib/bumpnotes/store";

export function BottomNav() {
  const location = useLocation();
  const demo = useDemoMode();
  const t = useT();
  const homeTo = demo ? "/demo" : "/";
  const items = [
    { to: homeTo, label: t("nav.home"), Icon: Home, matchExact: true },
    { to: "/timeline" as const, label: t("nav.timeline"), Icon: ClipboardList, matchExact: false },
    { to: "/pack" as const, label: t("nav.summary"), Icon: FileText, matchExact: false },
    { to: "/labour" as const, label: t("nav.labour"), Icon: Heart, matchExact: false },
    { to: "/details" as const, label: t("nav.baby"), Icon: Baby, matchExact: false },
    { to: "/settings" as const, label: t("nav.settings"), Icon: SettingsIcon, matchExact: false },
  ];
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 left-0 right-0 z-30 mt-auto border-t border-border bg-white/90 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-between px-1 pt-2 pb-3">
        {items.map(({ to, label, Icon, matchExact }) => {
          const active = matchExact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
                  active ? "text-primary" : "text-ink-soft hover:text-ink"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.4]" : "stroke-[1.8]"}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
