import type { Entry, MeasurementEntry } from "./types";

export function summariseEntry(e: Entry): { headline: string; detail?: string } {
  switch (e.type) {
    case "symptom": {
      const parts = [
        e.severity ? `severity ${e.severity}/10` : null,
        e.clarification,
        e.location ? `location: ${e.location}` : null,
        e.note ? `note: "${e.note}"` : null,
      ].filter(Boolean);
      return { headline: `Symptom: ${e.symptom}`, detail: parts.join(" · ") || undefined };
    }
    case "question":
      return { headline: "Saved question", detail: `"${e.text}"${e.context ? ` · ${e.context}` : ""}` };
    case "appointment": {
      const parts = [
        e.whoSeen && `Who: ${e.whoSeen}`,
        e.discussed && `Discussed: ${e.discussed}`,
        e.advice && `Advice: ${e.advice}`,
        e.followUp && `Follow-up: ${e.followUp}`,
      ].filter(Boolean);
      return { headline: `People & Care: ${e.kind}`, detail: parts.join(" · ") || undefined };
    }
    case "person": {
      const who = [e.name, e.role].filter(Boolean).join(", ");
      const parts = [
        who && `Who: ${who}`,
        e.discussed && `Discussed: ${e.discussed}`,
        e.advised && `Advised: ${e.advised}`,
        e.note && `Note: ${e.note}`,
      ].filter(Boolean);
      return { headline: "People & Care", detail: parts.join(" · ") || undefined };
    }
    case "measurement":
      return { headline: `Measurement: ${measurementLabel(e)}`, detail: measurementValue(e) };
    case "photo":
      return { headline: `Photo: ${e.tag}`, detail: e.note ? `"${e.note}"` : undefined };
    case "labour":
      return { headline: `Labour: ${e.event}`, detail: e.note };
    case "feeling":
      return { headline: `Feeling: ${e.feeling}`, detail: e.note };
    case "note":
      return { headline: "Note", detail: e.text };
    case "concern":
      return { headline: `Concern: ${e.concern}`, detail: e.note };
    default:
      return { headline: "Entry" };
  }
}

export function measurementLabel(e: MeasurementEntry): string {
  switch (e.kind) {
    case "blood_pressure": return "Blood pressure";
    case "weight": return "Weight";
    case "blood_sugar": return "Blood sugar";
    case "movements": return "Baby movements";
    case "temperature": return "Temperature";
    case "custom": return e.customLabel || "Custom";
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
    case "weight": return "kg";
    case "blood_sugar": return "mmol/L";
    case "temperature": return "°C";
    case "movements": return "movements";
    default: return "";
  }
}

export function weekDayKey(e: Entry) {
  return `${e.weekDay.weeks}+${e.weekDay.days}`;
}
