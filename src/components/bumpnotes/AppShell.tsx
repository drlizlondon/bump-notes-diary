import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="app-shell flex flex-col bg-cream">
      <div className="flex-1 flex flex-col">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
