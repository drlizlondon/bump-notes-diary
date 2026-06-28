import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, ClipboardList, FileText, Heart, Baby, Settings as SettingsIcon } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { FeedbackButton } from "./FeedbackButton";
import { TesterBanner } from "./TesterBanner";
import { useTester } from "@/lib/bumpnotes/tester";
import { LogoIcon } from "./Logo";
import { useT } from "@/lib/bumpnotes/i18n";

export function AppShell({ children, hideNav = false, right }: { children: ReactNode; hideNav?: boolean; right?: ReactNode }) {
  const tester = useTester();
  return (
    <>
      <TesterBanner />
      <div className="app-shell flex flex-col lg:hidden">
        <div className="flex-1 flex flex-col">{children}</div>
        {!hideNav && <BottomNav />}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:gap-8 lg:max-w-[1200px] lg:mx-auto lg:px-6 lg:py-8 lg:min-h-[100dvh]">
        <DesktopSidebar />
        <main className="min-w-0">{children}</main>
        <aside className="min-w-0">{right ?? <DefaultAside />}</aside>
      </div>

      {tester ? <TesterFeedbackButton variant="floating" /> : <FeedbackButton />}
    </>
  );
}

function DesktopSidebar() {
  const location = useLocation();
  const t = useT();
  const navItems = [
    { to: "/", label: t("nav.home"), Icon: Home },
    { to: "/timeline", label: t("nav.timeline"), Icon: ClipboardList },
    { to: "/pack", label: t("nav.summary"), Icon: FileText },
    { to: "/labour", label: t("nav.labour"), Icon: Heart },
    { to: "/details", label: t("nav.baby"), Icon: Baby },
    { to: "/settings", label: t("nav.settings"), Icon: SettingsIcon },
  ] as const;
  return (
    <aside className="sticky top-8 self-start surface-card p-3">
      <div className="px-3 py-3 flex items-center gap-2.5">
        <LogoIcon className="size-9" />
        <p className="font-serif text-lg font-semibold leading-none">BumpNotes</p>
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
  const t = useT();
  return (
    <div className="sticky top-8 space-y-4">
      <div className="surface-card p-5">
        <h3 className="font-serif text-base font-semibold">{t("sum.title")}</h3>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">{t("sum.intro")}</p>
        <Link to="/pack" className="mt-4 inline-flex w-full justify-center py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {t("sum.stepCreate")}
        </Link>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="px-5 lg:px-1 pt-6 lg:pt-2 pb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl lg:text-3xl font-semibold leading-tight break-words">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1 break-words">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
