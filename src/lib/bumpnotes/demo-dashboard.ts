import type { AppState, Entry, Profile } from "./types";
import { gestationFromDueDate } from "./gestation";

/**
 * Builds a complete demo AppState for the interactive Home / Dashboard demo.
 * Profile is intentionally fictional ("Demo User" / "Baby") and the entries
 * cover every category so visitors can expand, edit and add naturally.
 */
export function buildDemoDashboardState(now: Date = new Date()): AppState {
  // Target ~24 weeks today: due in 280 - (24 * 7) = 112 days.
  const due = new Date(now);
  due.setDate(due.getDate() + 112);
  const dueDateISO = due.toISOString();

  const profile: Profile = {
    userName: "Demo User",
    babyNickname: "Baby",
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
  function wd(iso: string) {
    return gestationFromDueDate(dueDateISO, new Date(iso));
  }
  function mk(e: Record<string, unknown> & { createdAt: string }): Entry {
    return { ...e, weekDay: wd(e.createdAt) } as unknown as Entry;
  }

  const entries: Entry[] = [
    // Symptoms
    mk({
      id: "demo-s1",
      type: "symptom",
      createdAt: at(0, 8, 5),
      symptom: "Nausea",
      quantifier: "Mild",
      severity: 2,
      note: "Settled after breakfast.",
    }),
    mk({
      id: "demo-s2",
      type: "symptom",
      createdAt: at(2, 22, 10),
      symptom: "Back pain",
      quantifier: "Moderate",
      severity: 5,
      location: "Lower back",
    }),
    mk({
      id: "demo-s3",
      type: "symptom",
      createdAt: at(6, 9, 40),
      symptom: "Heartburn",
      quantifier: "Mild",
      severity: 3,
    }),

    // Questions
    mk({
      id: "demo-q1",
      type: "question",
      createdAt: at(1, 19, 30),
      text: "When should I start thinking about the hospital bag?",
    }),
    mk({
      id: "demo-q2",
      type: "question",
      createdAt: at(4, 21, 0),
      text: "Is it normal to feel dizzy after standing up quickly?",
    }),

    // People & care
    mk({
      id: "demo-p1",
      type: "person",
      createdAt: at(3, 11, 30),
      whenISO: at(3, 11, 30),
      name: "Rachel",
      role: "Midwife",
      discussed: "Routine check, bump measuring well.",
      advised: "Keep iron supplement going.",
    }),
    mk({
      id: "demo-p2",
      type: "person",
      createdAt: at(10, 14, 0),
      whenISO: at(10, 14, 0),
      name: "Dr Patel",
      role: "GP",
      discussed: "Back pain review.",
      advised: "Gentle stretching, paracetamol if needed.",
    }),

    // Measurements
    mk({
      id: "demo-m1",
      type: "measurement",
      createdAt: at(0, 8, 0),
      kind: "blood_pressure",
      systolic: 120,
      diastolic: 76,
      pulse: 70,
    }),
    mk({
      id: "demo-m2",
      type: "measurement",
      createdAt: at(5, 8, 10),
      kind: "weight",
      value: 68.4,
      unit: "kg",
    }),
    mk({
      id: "demo-m3",
      type: "measurement",
      createdAt: at(1, 13, 20),
      kind: "movements",
      value: 12,
      unit: "movements",
      note: "Counted over 1 hour after lunch.",
    }),

    // Note
    mk({
      id: "demo-n1",
      type: "note",
      createdAt: at(2, 22, 15),
      text: "Felt baby move strongly during the evening — first really clear kicks.",
    }),

    // Feeling
    mk({
      id: "demo-f1",
      type: "feeling",
      createdAt: at(4, 21, 5),
      feeling: "A bit anxious about the next scan",
      privateOnly: true,
    }),
  ] as Entry[];

  return { profile, entries };
}
