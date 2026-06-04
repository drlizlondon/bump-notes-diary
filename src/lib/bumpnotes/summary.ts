import type { Entry } from "./types";

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
      return { headline: "Question for my team", detail: `"${e.text}"` };
    case "appointment": {
      const parts = [
        e.whoSeen && `Saw: ${e.whoSeen}`,
        e.discussed && `Discussed: ${e.discussed}`,
        e.advice && `Advice: ${e.advice}`,
        e.questionsAnswered && `Q answered: ${e.questionsAnswered}`,
        e.followUp && `Follow-up: ${e.followUp}`,
      ].filter(Boolean);
      return { headline: `Appointment: ${e.kind}`, detail: parts.join(" · ") || undefined };
    }
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
  }
}

export function weekDayKey(e: Entry) {
  return `${e.weekDay.weeks}+${e.weekDay.days}`;
}
