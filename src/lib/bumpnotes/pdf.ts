import jsPDF from "jspdf";
import type { ContractionEntry, Entry, LabourEventEntry, LabourPlan, MeasurementEntry, Profile } from "./types";
import {
  formatGestation, formatUKDate, formatUKDateLong, formatUKDateTime, formatUKTime, gestationFromDueDate,
} from "./gestation";
import { formatDuration, measurementLabel, summariseEntry, weekDayKey } from "./summary";
import { t as tFn } from "./i18n";

type PdfOptions = {
  profile: Profile;
  entries: Entry[];
  groupMeasurements: boolean;
  labourPlan?: LabourPlan;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;

export function downloadSummaryPdf(opts: PdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_TOP;

  const writable = PAGE_W - MARGIN_X * 2;

  function need(space: number) {
    if (y + space > PAGE_H - MARGIN_BOTTOM) {
      footer(doc);
      doc.addPage();
      y = MARGIN_TOP;
      header(doc, opts.profile, true);
      y += 4;
    }
  }

  function text(s: string, opts2?: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number }) {
    const size = opts2?.size ?? 10;
    doc.setFontSize(size);
    doc.setFont("helvetica", opts2?.bold ? "bold" : "normal");
    if (opts2?.color) doc.setTextColor(...opts2.color); else doc.setTextColor(20, 20, 30);
    const lines = doc.splitTextToSize(s, writable);
    need(lines.length * (size * 0.42) + (opts2?.gap ?? 1));
    doc.text(lines, MARGIN_X, y);
    y += lines.length * (size * 0.42) + (opts2?.gap ?? 1);
  }

  function rule() {
    need(4);
    doc.setDrawColor(220, 215, 220);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 3;
  }

  // Title block
  header(doc, opts.profile, false);
  y = MARGIN_TOP + 18;

  // Metadata table
  const g = gestationFromDueDate(opts.profile.dueDateISO);
  const meta: Array<[string, string]> = [
    ["Name", opts.profile.userName],
    ["Baby", opts.profile.babyNickname?.trim() || tFn("baby.fallback")],
    ["Estimated due date", formatUKDateLong(opts.profile.dueDateISO)],
    ["Gestation today", formatGestation(g)],
    ["Generated", formatUKDateTime(new Date())],
  ];
  doc.setFontSize(10);
  meta.forEach(([k, v]) => {
    need(5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(110, 110, 120);
    doc.text(k, MARGIN_X, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 40);
    doc.text(v, MARGIN_X + 50, y);
    y += 5;
  });
  y += 2;
  rule();

  // Group by week+day
  const map = new Map<string, Entry[]>();
  for (const e of opts.entries) {
    const k = weekDayKey(e);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  const groups = Array.from(map.entries()).sort(([a], [b]) => {
    const [aw, ad] = a.split("+").map(Number);
    const [bw, bd] = b.split("+").map(Number);
    return aw - bw || ad - bd;
  });

  const measurementsByWeek = new Map<number, MeasurementEntry[]>();
  if (opts.groupMeasurements) {
    for (const e of opts.entries) {
      if (e.type === "measurement") {
        if (!measurementsByWeek.has(e.weekDay.weeks)) measurementsByWeek.set(e.weekDay.weeks, []);
        measurementsByWeek.get(e.weekDay.weeks)!.push(e);
      }
    }
  }
  const printedWeeks = new Set<number>();

  groups.forEach(([k, list]) => {
    const [w, d] = k.split("+");
    const wn = Number(w);
    const filtered = opts.groupMeasurements ? list.filter((e) => e.type !== "measurement") : list;
    const showM = opts.groupMeasurements && !printedWeeks.has(wn) && measurementsByWeek.has(wn);
    if (showM) printedWeeks.add(wn);
    if (filtered.length === 0 && !showM) return;

    text(`Week ${w} + ${d}`, { size: 11, bold: true, color: [180, 80, 100], gap: 2 });

    filtered.forEach((e) => {
      const s = summariseEntry(e);
      const head = `${formatUKDate(e.createdAt)} ${formatUKTime(e.createdAt)}  ·  ${s.headline}`;
      text(head, { size: 10, bold: true, gap: 0.5 });
      if (s.detail) text(s.detail, { size: 9, color: [90, 90, 100], gap: 1.5 });
    });

    if (showM) {
      const ms = measurementsByWeek.get(wn)!;
      text("Measurements this week", { size: 10, bold: true, color: [110, 110, 120], gap: 1 });
      const byKind = new Map<string, MeasurementEntry[]>();
      for (const m of ms) {
        const key = m.kind === "custom" ? (m.customLabel || tFn("m.custom")) : measurementLabel(m);
        if (!byKind.has(key)) byKind.set(key, []);
        byKind.get(key)!.push(m);
      }
      byKind.forEach((items, label) => {
        const r = rangeText(items);
        const line = `• ${label} — ${items.length} reading${items.length === 1 ? "" : "s"}${r ? ` (range ${r})` : ""}`;
        text(line, { size: 9, gap: 0.8 });
      });
    }
    y += 2;
  });

  // Labour
  if (opts.labourPlan) {
    const contractions = opts.entries.filter((e): e is ContractionEntry => e.type === "contraction");
    const events = opts.entries.filter((e): e is LabourEventEntry => e.type === "labour_event");
    if (opts.labourPlan.recordingStartISO || contractions.length || events.length) {
      rule();
      text("Labour", { size: 12, bold: true, color: [180, 80, 100], gap: 2 });
      if (opts.labourPlan.recordingStartISO) {
        text(`Recording started: ${formatUKDateTime(opts.labourPlan.recordingStartISO)}`, { size: 10, gap: 1 });
      }
      if (contractions.length) {
        text(`Contractions (${contractions.length})`, { size: 10, bold: true, gap: 1 });
        contractions.forEach((c) => {
          text(`• ${formatUKDate(c.createdAt)} ${formatUKTime(c.createdAt)} — ${formatDuration(c.durationSec)}${c.note ? ` · ${c.note}` : ""}`, { size: 9, gap: 0.6 });
        });
      }
      if (events.length) {
        text(`Events (${events.length})`, { size: 10, bold: true, gap: 1 });
        events.forEach((e) => {
          text(`• ${formatUKDate(e.createdAt)} ${formatUKTime(e.createdAt)} — ${e.event}${e.note ? ` · ${e.note}` : ""}`, { size: 9, gap: 0.6 });
        });
      }
    }
  }

  // Footer disclaimer
  y += 4;
  rule();
  text(tFn("sum.foot").replace("{name}", opts.profile.userName), { size: 8, color: [120, 120, 130] });

  footer(doc);

  const safeName = (opts.profile.userName || "BumpNotes").replace(/[^a-z0-9\-_]+/gi, "_");
  doc.save(`BumpNotes_Pregnancy_Summary_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function header(doc: jsPDF, profile: Profile, continued: boolean) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(180, 80, 100);
  doc.text("BumpNotes", MARGIN_X, MARGIN_TOP);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text("Pregnancy Summary", MARGIN_X, MARGIN_TOP + 5);

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 150);
  const right = profile.userName + (continued ? " (cont.)" : "");
  const w = doc.getTextWidth(right);
  doc.text(right, PAGE_W - MARGIN_X - w, MARGIN_TOP);
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 8, { align: "right" });
    doc.text("Generated by BumpNotes — a personal pregnancy record. Not a medical record.", MARGIN_X, PAGE_H - 8);
  }
}

function rangeText(list: MeasurementEntry[]): string | null {
  if (list.length === 0) return null;
  const first = list[0];
  if (first.kind === "blood_pressure") {
    const sys = list.map((m) => m.systolic ?? 0).filter(Boolean);
    const dia = list.map((m) => m.diastolic ?? 0).filter(Boolean);
    if (!sys.length || !dia.length) return null;
    return `${Math.min(...sys)}/${Math.min(...dia)} to ${Math.max(...sys)}/${Math.max(...dia)} mmHg`;
  }
  const vals = list.map((m) => m.value).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  const unit = first.unit || "";
  if (Math.min(...vals) === Math.max(...vals)) return `${vals[0]} ${unit}`.trim();
  return `${Math.min(...vals)} to ${Math.max(...vals)} ${unit}`.trim();
}
