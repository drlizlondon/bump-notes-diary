import { differenceInCalendarDays, format, parseISO } from "date-fns";

const PREGNANCY_DAYS = 280;

export function gestationFromDueDate(dueDateISO: string, on: Date = new Date()) {
  const due = parseISO(dueDateISO);
  const daysUntilDue = differenceInCalendarDays(due, on);
  const totalDays = PREGNANCY_DAYS - daysUntilDue;
  const weeks = Math.max(0, Math.floor(totalDays / 7));
  const days = Math.max(0, totalDays % 7);
  return { weeks, days };
}

export function formatGestation(g: { weeks: number; days: number }) {
  return `${g.weeks} weeks + ${g.days} day${g.days === 1 ? "" : "s"}`;
}

export function formatGestationShort(g: { weeks: number; days: number }) {
  return `Week ${g.weeks} + ${g.days}`;
}

export function formatUKDate(iso: string | Date) {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "dd/MM/yyyy");
}

export function formatUKDateLong(iso: string | Date) {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "dd MMMM yyyy");
}

export function formatUKTime(iso: string | Date) {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "HH:mm");
}

export function formatUKDateTime(iso: string | Date) {
  return `${formatUKDate(iso)}, ${formatUKTime(iso)}`;
}
