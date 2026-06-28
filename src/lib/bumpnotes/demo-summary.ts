import type { Entry, Profile } from "@/lib/bumpnotes/types";
import { gestationFromDueDate } from "@/lib/bumpnotes/gestation";

/**
 * Builds a realistic demo Profile + Entry[] for the public homepage Pregnancy
 * Summary preview. Deterministic relative to `now` so each visitor sees a
 * fresh-feeling timeline anchored to today.
 */
export function buildDemoSummary(now: Date = new Date()): { profile: Profile; entries: Entry[] } {
  // Target ~24 weeks today: due in 280 - (24 * 7) = 112 days.
  const due = new Date(now);
  due.setDate(due.getDate() + 112);
  const dueDateISO = due.toISOString();

  const profile: Profile = {
    userName: "Amelia Carter",
    babyNickname: "Pip",
    dueDateISO,
    hospital: "St Mary's",
    midwife: "Rachel",
    onboarded: true,
  };

  function at(daysAgo: number, h: number, m: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }
  function wd(iso: string) { return gestationFromDueDate(dueDateISO, new Date(iso)); }
  function mk(e: Omit<Entry, "weekDay">): Entry {
    return { ...e, weekDay: wd(e.createdAt) } as Entry;
  }

  const entries: Entry[] = [
    // ~ Week 22
    mk({
      id: "d1", type: "symptom", createdAt: at(15, 9, 12),
      symptom: "Heartburn", quantifier: "Mild", severity: 3,
      note: "After breakfast.",
    }),
    mk({
      id: "d2", type: "measurement", createdAt: at(15, 8, 30),
      kind: "blood_pressure", systolic: 118, diastolic: 74, pulse: 72,
    }),
    mk({
      id: "d3", type: "question", createdAt: at(14, 20, 5),
      text: "Is it normal to feel dizzy after standing up quickly?",
    }),
    mk({
      id: "d4", type: "person", createdAt: at(13, 14, 0),
      whenISO: at(13, 14, 0), name: "Rachel", role: "Midwife",
      discussed: "Routine check, bump measuring well.",
      advised: "Keep iron supplement going.",
    }),

    // ~ Week 23
    mk({
      id: "d5", type: "symptom", createdAt: at(9, 22, 40),
      symptom: "Lower back ache", quantifier: "Moderate", severity: 5,
      location: "Lower back, both sides",
    }),
    mk({
      id: "d6", type: "measurement", createdAt: at(8, 8, 10),
      kind: "weight", value: 68.4, unit: "kg",
    }),
    mk({
      id: "d7", type: "feeling", createdAt: at(8, 21, 0),
      feeling: "Anxious about the next scan", privateOnly: true,
    }),
    mk({
      id: "d8", type: "question", createdAt: at(7, 19, 30),
      text: "Which pain relief is safe for back pain?",
    }),
    mk({
      id: "d9", type: "measurement", createdAt: at(7, 8, 15),
      kind: "blood_pressure", systolic: 122, diastolic: 78,
    }),

    // ~ Week 24
    mk({
      id: "d10", type: "symptom", createdAt: at(3, 7, 50),
      symptom: "Nausea", quantifier: "Mild", severity: 2,
      note: "Improving overall.",
    }),
    mk({
      id: "d11", type: "measurement", createdAt: at(2, 8, 5),
      kind: "movements", value: 12, unit: "movements",
      note: "Counted over 1 hour after lunch.",
    }),
    mk({
      id: "d12", type: "note", createdAt: at(2, 22, 15),
      text: "Felt baby move strongly during the evening — first really clear kicks.",
    }),
    mk({
      id: "d13", type: "person", createdAt: at(1, 11, 30),
      whenISO: at(1, 11, 30), name: "Dr Patel", role: "GP",
      discussed: "Quick check on back pain.",
      advised: "Gentle stretching, warm compress, paracetamol if needed.",
    }),
    mk({
      id: "d14", type: "question", createdAt: at(0, 9, 0),
      text: "When should I start thinking about the hospital bag?",
    }),
    mk({
      id: "d15", type: "measurement", createdAt: at(0, 8, 0),
      kind: "blood_pressure", systolic: 120, diastolic: 76, pulse: 70,
    }),
  ] as Entry[];

  return { profile, entries };
}
