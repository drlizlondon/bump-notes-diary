import { parseISO, format } from "date-fns";

import { measurementLabel, measurementValue } from "./summary";
import type { AppointmentEntry, Entry, MeasurementEntry, PersonEntry, SymptomEntry } from "./types";
import { t as tFn } from "./i18n";

export type PregnancySummarySection =
  | { type: "symptoms"; title: "Symptoms & Signs"; items: SymptomSummaryItem[] }
  | { type: "feelings"; title: "Feelings"; items: FeelingSummaryItem[] }
  | { type: "questions"; title: "Questions"; items: TextSummaryItem[] }
  | { type: "people"; title: "People & Care"; groups: PeopleCareSummaryGroup[] }
  | { type: "measurements"; title: "Measurements"; items: MeasurementSummaryItem[] }
  | { type: "notes"; title: "Notes"; items: TextSummaryItem[] };

export interface PregnancySummaryWeek {
  week: number;
  sections: PregnancySummarySection[];
}

export interface SymptomSummaryItem {
  key: string;
  entryIds: string[];
  symptom: string;
  count: number;
  qualifiers: string[];
}

export interface FeelingSummaryItem {
  key: string;
  entryIds: string[];
  feeling: string;
  days: number;
}

export interface TextSummaryItem {
  key: string;
  entryIds: string[];
  text: string;
}

export interface PeopleCareSummaryGroup {
  key: string;
  entryIds: string[];
  professional: string;
  items: string[];
}

export interface MeasurementSummaryItem {
  key: string;
  entryIds: string[];
  label: string;
  value: string;
}

export type PregnancySummaryOptions = {
  hiddenItemKeys?: Set<string>;
};

export function buildPregnancySummaryWeeks(
  entries: Entry[],
  options: PregnancySummaryOptions = {},
): PregnancySummaryWeek[] {
  const weeks = new Map<number, Entry[]>();
  for (const entry of entries) {
    const week = entry.weekDay.weeks;
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(entry);
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, weekEntries]) => {
      const sortedEntries = weekEntries.slice().sort(compareEntries);
      return {
        week,
        sections: buildWeekSections(sortedEntries, options.hiddenItemKeys ?? new Set()),
      };
    })
    .filter((week) => week.sections.length > 0);
}

function buildWeekSections(
  entries: Entry[],
  hiddenItemKeys: Set<string>,
): PregnancySummarySection[] {
  const sections: PregnancySummarySection[] = [];

  const symptoms = symptomItems(entries).filter((item) => !hiddenItemKeys.has(item.key));
  if (symptoms.length)
    sections.push({ type: "symptoms", title: "Symptoms & Signs", items: symptoms });

  const feelings = feelingItems(entries).filter((item) => !hiddenItemKeys.has(item.key));
  if (feelings.length) sections.push({ type: "feelings", title: "Feelings", items: feelings });

  const questions = entries
    .filter((entry) => entry.type === "question")
    .map((entry) => ({ key: `question:${entry.id}`, entryIds: [entry.id], text: entry.text }))
    .filter((item) => !hiddenItemKeys.has(item.key));
  if (questions.length) sections.push({ type: "questions", title: "Questions", items: questions });

  const people = peopleCareGroups(entries).filter((group) => !hiddenItemKeys.has(group.key));
  if (people.length) sections.push({ type: "people", title: "People & Care", groups: people });

  const measurements = measurementItems(entries).filter((item) => !hiddenItemKeys.has(item.key));
  if (measurements.length)
    sections.push({ type: "measurements", title: "Measurements", items: measurements });

  const notes = entries
    .filter((entry) => entry.type === "note")
    .map((entry) => ({ key: `note:${entry.id}`, entryIds: [entry.id], text: entry.text }))
    .filter((item) => !hiddenItemKeys.has(item.key));
  if (notes.length) sections.push({ type: "notes", title: "Notes", items: notes });

  return sections;
}

function symptomItems(entries: Entry[]): SymptomSummaryItem[] {
  const bySymptom = new Map<
    string,
    {
      count: number;
      qualifiers: string[];
      qualifierSet: Set<string>;
      firstOrder: string;
      entryIds: string[];
      week: number;
    }
  >();
  for (const entry of entries) {
    if (entry.type !== "symptom") continue;
    const existing = bySymptom.get(entry.symptom) ?? {
      count: 0,
      qualifiers: [],
      qualifierSet: new Set<string>(),
      firstOrder: entry.createdAt,
      entryIds: [],
      week: entry.weekDay.weeks,
    };
    existing.count += 1;
    existing.entryIds.push(entry.id);
    for (const qualifier of symptomQualifiers(entry)) {
      if (existing.qualifierSet.has(qualifier)) continue;
      existing.qualifierSet.add(qualifier);
      existing.qualifiers.push(qualifier);
    }
    bySymptom.set(entry.symptom, existing);
  }
  return Array.from(bySymptom.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([symptom, item]) => ({
      key: `symptom:${item.week}:${symptom}`,
      entryIds: item.entryIds,
      symptom,
      count: item.count,
      qualifiers: item.qualifiers,
    }));
}

function symptomQualifiers(entry: SymptomEntry): string[] {
  return [entry.quantifier, entry.clarification, entry.location, entry.note]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function feelingItems(entries: Entry[]): FeelingSummaryItem[] {
  const byFeeling = new Map<
    string,
    { days: Set<string>; firstOrder: string; entryIds: string[]; week: number }
  >();
  for (const entry of entries) {
    if (entry.type !== "feeling") continue;
    const existing = byFeeling.get(entry.feeling) ?? {
      days: new Set<string>(),
      firstOrder: entry.createdAt,
      entryIds: [],
      week: entry.weekDay.weeks,
    };
    existing.days.add(calendarDay(entry.createdAt));
    existing.entryIds.push(entry.id);
    byFeeling.set(entry.feeling, existing);
  }
  return Array.from(byFeeling.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([feeling, item]) => ({
      key: `feeling:${item.week}:${feeling}`,
      entryIds: item.entryIds,
      feeling,
      days: item.days.size,
    }));
}

function peopleCareGroups(entries: Entry[]): PeopleCareSummaryGroup[] {
  const groups = new Map<
    string,
    { items: string[]; firstOrder: string; entryIds: string[]; week: number }
  >();
  for (const entry of entries) {
    if (entry.type !== "person" && entry.type !== "appointment") continue;
    const professional = professionalLabel(entry);
    const group = groups.get(professional) ?? {
      items: [],
      firstOrder: entry.createdAt,
      entryIds: [],
      week: entry.weekDay.weeks,
    };
    group.items.push(...peopleCareItems(entry));
    group.entryIds.push(entry.id);
    groups.set(professional, group);
  }
  return Array.from(groups.entries())
    .map(([professional, group]) => ({
      professional,
      key: `people:${group.week}:${professional}`,
      entryIds: group.entryIds,
      items: group.items.filter((item) => item.trim().length > 0),
      firstOrder: group.firstOrder,
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.firstOrder.localeCompare(b.firstOrder))
    .map(({ key, entryIds, professional, items }) => ({ key, entryIds, professional, items }));
}

function professionalLabel(entry: PersonEntry | AppointmentEntry): string {
  if (entry.type === "person") return entry.role?.trim() || entry.name?.trim() || "Care team";
  return entry.whoSeen?.trim() || entry.kind?.trim() || "Care team";
}

function peopleCareItems(entry: PersonEntry | AppointmentEntry): string[] {
  if (entry.type === "person") {
    return [entry.discussed, entry.advised, entry.note]
      .map((item) => item?.trim() ?? "")
      .filter(Boolean);
  }
  return [entry.discussed, entry.advice, entry.questionsAnswered, entry.followUp]
    .map((item) => item?.trim() ?? "")
    .filter(Boolean);
}

function measurementItems(entries: Entry[]): MeasurementSummaryItem[] {
  const groups = new Map<string, { items: MeasurementEntry[]; firstOrder: string }>();
  for (const entry of entries) {
    if (entry.type !== "measurement") continue;
    const label =
      entry.kind === "custom"
        ? entry.customLabel?.trim() || tFn("m.custom")
        : measurementLabel(entry);
    const group = groups.get(label) ?? { items: [], firstOrder: entry.createdAt };
    group.items.push(entry);
    groups.set(label, group);
  }
  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a.firstOrder.localeCompare(b.firstOrder))
    .map(([label, group]) => ({
      key: `measurement:${group.items[0]?.weekDay.weeks ?? "unknown"}:${label}`,
      entryIds: group.items.map((item) => item.id),
      label,
      value: measurementRange(group.items),
    }))
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
function compareEntries(a: Entry, b: Entry) {
  return a.createdAt.localeCompare(b.createdAt);
}

function calendarDay(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

function defaultUnit(kind: MeasurementEntry["kind"]): string {
  switch (kind) {
    case "weight":
      return "kg";
    case "blood_sugar":
      return "mmol/L";
    case "temperature":
      return "°C";
    case "movements":
      return "movements";
    default:
      return "";
  }
}

function joinParts(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" · ");
}
