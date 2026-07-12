import type { Entry, MeasurementEntry } from "./types";
import { t } from "./i18n";

export function summariseEntry(e: Entry): { headline: string; detail?: string } {
  switch (e.type) {
    case "symptom": {
      const head = e.quantifier ? `${e.symptom} (${e.quantifier})` : e.symptom;
      const parts = [
        e.severity ? `severity ${e.severity}/10` : null,
        e.clarification,
        e.location ? `location: ${e.location}` : null,
        e.note ? `note: "${e.note}"` : null,
      ].filter(Boolean);
      return { headline: `${t("type.symptom")}: ${head}`, detail: parts.join(" · ") || undefined };
    }
    case "question":
      return {
        headline: t("type.question"),
        detail: `"${e.text}"${e.context ? ` · ${e.context}` : ""}`,
      };
    case "appointment": {
      const parts = [
        e.whoSeen && `Who: ${e.whoSeen}`,
        e.discussed && `Discussed: ${e.discussed}`,
        e.advice && `Advice: ${e.advice}`,
        e.followUp && `Follow-up: ${e.followUp}`,
      ].filter(Boolean);
      return { headline: `${t("type.person")}: ${e.kind}`, detail: parts.join(" · ") || undefined };
    }
    case "person": {
      const who = [e.name, e.role].filter(Boolean).join(", ");
      const parts = [
        who && `Who: ${who}`,
        e.discussed && `Discussed: ${e.discussed}`,
        e.advised && `Advised: ${e.advised}`,
        e.note && `Note: ${e.note}`,
      ].filter(Boolean);
      return { headline: t("type.person"), detail: parts.join(" · ") || undefined };
    }
    case "measurement":
      return {
        headline: `${t("type.measurement")}: ${measurementLabel(e)}`,
        detail: measurementValue(e),
      };
    case "photo":
      return {
        headline: `${t("type.photo")}: ${e.tag}`,
        detail: e.note ? `"${e.note}"` : undefined,
      };
    case "feeling":
      return { headline: `${t("type.feeling")}: ${e.feeling}`, detail: e.note };
    case "note":
      return { headline: t("type.note"), detail: e.text };
    case "concern":
      return { headline: `Concern: ${e.concern}`, detail: e.note };
    default:
      return { headline: "Entry" };
  }
}

export function measurementLabel(e: MeasurementEntry): string {
  switch (e.kind) {
    case "blood_pressure":
      return t("m.bp");
    case "weight":
      return t("m.weight");
    case "blood_sugar":
      return t("m.bloodSugar");
    case "movements":
      return t("m.movements");
    case "temperature":
      return t("m.temp");
    case "custom":
      return e.customLabel || t("m.custom");
  }
}

export function measurementValue(e: MeasurementEntry): string {
  if (e.kind === "blood_pressure") {
    const bp = `${e.systolic ?? "?"}/${e.diastolic ?? "?"}`;
    return e.pulse ? `${bp} mmHg · pulse ${e.pulse}` : `${bp} mmHg`;
  }
  if (e.value !== undefined) {
    const unit = e.unit ?? defaultUnit(e.kind);
    return unit ? `${e.value} ${unit}` : `${e.value}`;
  }
  return "";
}

function defaultUnit(k: MeasurementEntry["kind"]): string {
  switch (k) {
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

export function weekDayKey(e: Entry) {
  return `${e.weekDay.weeks}+${e.weekDay.days}`;
}
