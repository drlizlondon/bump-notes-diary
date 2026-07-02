import { parseISO, format } from "date-fns";

import { formatDuration, measurementLabel, measurementValue } from "./summary";
import type {
  AppointmentEntry,
  ContractionEntry,
  Entry,
  LabourEventEntry,
  LabourPlan,
  MeasurementEntry,
  PersonEntry,
  Profile,
  SymptomEntry,
} from "./types";
import { gestationFromDueDate } from "./gestation";
import { t as tFn } from "./i18n";

export type PregnancySummarySection =
  | { type: "symptoms"; title: "Symptoms & Signs"; items: SymptomSummaryItem[] }
  | { type: "feelings"; title: "Feelings"; items: FeelingSummaryItem[] }
  | { type: "questions"; title: "Questions"; items: string[] }
  | { type: "people"; title: "People & Care"; groups: PeopleCareSummaryGroup[] }
  | { type: "measurements"; title: "Measurements"; items: MeasurementSummaryItem[] }
  | { type: "notes"; title: "Notes"; items: string[] }
  | { type: "labour"; title: "Labour Journey"; items: string[] };

export interface PregnancySummaryWeek {
  week: number;
  sections: PregnancySummarySection[];
}

export interface SymptomSummaryItem {
  symptom: string;
  count: number;
  qualifiers: string[];
}

export interface FeelingSummaryItem {
  feeling: string;
  days: number;
}

export interface PeopleCareSummaryGroup {
  professional: string;
  items: string[];
}

export interface MeasurementSummaryItem {
  label: string;
  value: string;
}

type LabourItem = {
  week: number;
  order: string;
  text: string;
};

export function buildPregnancySummaryWeeks(profile: Profile, entries: Entry[], labourPlan?: LabourPlan): PregnancySummaryWeek[] {
  const weeks = new Map<number, Entry[]>();
  for (const entry of entries) {
    const week = entry.weekDay.weeks;
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(entry);
  }

  const labourItems = buildLabourItems(profile, entries, labourPlan);
  for (const item of labourItems) {
    if (!weeks.has(item.week)) weeks.set(item.week, []);
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, weekEntries]) => {
      const sortedEntries = weekEntries.slice().sort(compareEntries);
      return {
        week,
        sections: buildWeekSections(sortedEntries, labourItems.filter((item) => item.week === week)),
      };
    })
    .filter((week) => week.sections.length > 0);
}

function buildWeekSections(entries: Entry[], labourItems: LabourItem[]): PregnancySummarySection[] {
  const sections: PregnancySummarySection[] = [];

  const symptoms = symptomItems(entries);
  if (symptoms.length) sections.push({ type: "symptoms", title: "Symptoms & Signs", items: symptoms });

  const feelings = feelingItems(entries);
  if (feelings.length) sections.push({ type: "feelings", title: "Feelings", items: feelings });

  const questions = entries.filter((entry) => entry.type === "question").map((entry) => entry.text);
  if (questions.length) sections.push({ type: "questions", title: "Questions", items: questions });

  const people = peopleCareGroups(entries);
  if (people.length) sections.push({ type: "people", title: "People & Care", groups: people });

  const measurements = measurementItems(entries);
  if (measurements.length) sections.push({ type: "measurements", title: "Measurements", items: measurements });

  const notes = entries.filter((entry) => entry.type === "note").map((entry) => entry.text);
  if (notes.length) sections.push({ type: "notes", title: "Notes", items: notes });

  const labour = labourItems.sort((a, b) => a.order.localeCompare(b.order)).map((item) => item.text);
  if (labour.length) sections.push({ type: "labour", title: "Labour Journey", items: labour });

  return sections;
}

function symptomItems(entries: Entry[]): SymptomSummaryItem[] {
  const bySymptom = new Map<string, { count: number; qualifiers: string[]; qualifierSet: Set<string>; firstOrder: string }>();
  for (const entry of entries) {
    if (entry.type !== "symptom") continue;
    const existing = bySymptom.get(entry.symptom) ?? {
      count: 0,
      qualifiers: [],
      qualifierSet: new Set<string>(),
      firstOrder: entry.createdAt,
    };
    existing.count += 1;
    for (const qualifier of symptomQualifiers(entry)) {
      if (existing.qualifierSet.has(qualifier)) continue;
      existing.qualifierSet.add(qualifier);
      existing.qualifiers.push(qualifier);
    }
    bySymptom.set(entry.symptom, existing);
  }
  return Array.from(bySymptom.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([symptom, item]) => ({ symptom, count: item.count, qualifiers: item.qualifiers }));
}

function symptomQualifiers(entry: SymptomEntry): string[] {
  return [entry.quantifier, entry.clarification, entry.location, entry.note]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function feelingItems(entries: Entry[]): FeelingSummaryItem[] {
  const byFeeling = new Map<string, { days: Set<string>; firstOrder: string }>();
  for (const entry of entries) {
    if (entry.type !== "feeling") continue;
    const existing = byFeeling.get(entry.feeling) ?? { days: new Set<string>(), firstOrder: entry.createdAt };
    existing.days.add(calendarDay(entry.createdAt));
    byFeeling.set(entry.feeling, existing);
  }
  return Array.from(byFeeling.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([feeling, item]) => ({ feeling, days: item.days.size }));
}

function peopleCareGroups(entries: Entry[]): PeopleCareSummaryGroup[] {
  const groups = new Map<string, { items: string[]; firstOrder: string }>();
  for (const entry of entries) {
    if (entry.type !== "person" && entry.type !== "appointment") continue;
    const professional = professionalLabel(entry);
    const group = groups.get(professional) ?? { items: [], firstOrder: entry.createdAt };
    group.items.push(...peopleCareItems(entry));
    groups.set(professional, group);
  }
  return Array.from(groups.entries())
    .map(([professional, group]) => ({
      professional,
      items: group.items.filter((item) => item.trim().length > 0),
      firstOrder: group.firstOrder,
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.firstOrder.localeCompare(b.firstOrder))
    .map(({ professional, items }) => ({ professional, items }));
}

function professionalLabel(entry: PersonEntry | AppointmentEntry): string {
  if (entry.type === "person") return entry.role?.trim() || entry.name?.trim() || "Care team";
  return entry.whoSeen?.trim() || entry.kind?.trim() || "Care team";
}

function peopleCareItems(entry: PersonEntry | AppointmentEntry): string[] {
  if (entry.type === "person") {
    return [entry.discussed, entry.advised, entry.note].map((item) => item?.trim() ?? "").filter(Boolean);
  }
  return [entry.discussed, entry.advice, entry.questionsAnswered, entry.followUp]
    .map((item) => item?.trim() ?? "")
    .filter(Boolean);
}

function measurementItems(entries: Entry[]): MeasurementSummaryItem[] {
  const groups = new Map<string, { items: MeasurementEntry[]; firstOrder: string }>();
  for (const entry of entries) {
    if (entry.type !== "measurement") continue;
    const label = entry.kind === "custom" ? entry.customLabel?.trim() || tFn("m.custom") : measurementLabel(entry);
    const group = groups.get(label) ?? { items: [], firstOrder: entry.createdAt };
    group.items.push(entry);
    groups.set(label, group);
  }
  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([label, group]) => ({ label, value: measurementRange(group.items) }))
    .filter((item) => item.value.length > 0);
}

function measurementRange(items: MeasurementEntry[]): string {
  if (items.length === 0) return "";
  const first = items[0];
  if (first.kind === "blood_pressure") {
    const pairs = items
      .filter((item) => typeof item.systolic === "number" && typeof item.diastolic === "number")
      .map((item) => ({ systolic: item.systolic!, diastolic: item.diastolic! }))
      .sort((a, b) => a.systolic - b.systolic || a.diastolic - b.diastolic);
    if (!pairs.length) return "";
    const min = pairs[0];
    const max = pairs[pairs.length - 1];
    const minText = `${min.systolic}/${min.diastolic}`;
    const maxText = `${max.systolic}/${max.diastolic}`;
    return minText === maxText ? minText : `${minText} to ${maxText}`;
  }
  const values = items
    .filter((item) => typeof item.value === "number")
    .map((item) => item.value!)
    .sort((a, b) => a - b);
  if (!values.length) return measurementValue(first);
  const unit = first.unit ?? defaultUnit(first.kind);
  const min = values[0];
  const max = values[values.length - 1];
  const suffix = unit ? ` ${unit}` : "";
  return min === max ? `${min}${suffix}` : `${min}${suffix} to ${max}${suffix}`;
}

function buildLabourItems(profile: Profile, entries: Entry[], labourPlan?: LabourPlan): LabourItem[] {
  const items: LabourItem[] = [];
  for (const entry of entries) {
    if (entry.type === "labour") {
      items.push({ week: entry.weekDay.weeks, order: entry.createdAt, text: joinParts([entry.event, entry.note]) });
    }
    if (entry.type === "labour_event") {
      items.push({ week: entry.weekDay.weeks, order: entry.createdAt, text: joinParts([entry.event, entry.note]) });
    }
    if (entry.type === "contraction") {
      items.push({ week: entry.weekDay.weeks, order: entry.createdAt, text: joinParts(["Contraction", formatDuration(entry.durationSec), entry.note]) });
    }
  }

  if (!labourPlan) return items;
  if (labourPlan.recordingStartISO) {
    items.push({
      week: gestationFromDueDate(profile.dueDateISO, parseISO(labourPlan.recordingStartISO)).weeks,
      order: labourPlan.recordingStartISO,
      text: "Labour recording started",
    });
  }
  for (const episode of labourPlan.episodes ?? []) {
    items.push({
      week: gestationFromDueDate(profile.dueDateISO, parseISO(episode.startISO)).weeks,
      order: episode.startISO,
      text: "Labour recording started",
    });
    if (episode.endISO) {
      items.push({
        week: gestationFromDueDate(profile.dueDateISO, parseISO(episode.endISO)).weeks,
        order: episode.endISO,
        text: "Labour recording ended",
      });
    }
    const outcome = labourOutcomeLabel(episode.outcome);
    if (outcome) {
      items.push({
        week: gestationFromDueDate(profile.dueDateISO, parseISO(episode.endISO ?? episode.startISO)).weeks,
        order: episode.endISO ?? episode.startISO,
        text: joinParts([outcome, episode.outcome === "other" ? episode.outcomeNote : undefined]),
      });
    }
  }
  return items;
}

function labourOutcomeLabel(outcome?: "baby" | "settled" | "other"): string | undefined {
  if (outcome === "baby") return tFn("lab.outcome.baby");
  if (outcome === "settled") return tFn("lab.outcome.settled");
  if (outcome === "other") return tFn("lab.outcome.other");
  return undefined;
}

function compareEntries(a: Entry, b: Entry) {
  return a.createdAt.localeCompare(b.createdAt);
}

function calendarDay(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

function defaultUnit(kind: MeasurementEntry["kind"]): string {
  switch (kind) {
    case "weight": return "kg";
    case "blood_sugar": return "mmol/L";
    case "temperature": return "°C";
    case "movements": return "movements";
    default: return "";
  }
}

function joinParts(parts: Array<string | undefined>): string {
  return parts.map((part) => part?.trim() ?? "").filter(Boolean).join(" · ");
}
