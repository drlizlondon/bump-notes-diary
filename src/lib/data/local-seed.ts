// Demo fixtures in V2 shapes (AZURE Phase 3, task 3.5) — the sample data the
// LocalRepository seeds into demo mode. Deliberately fictional ("Demo User")
// and clearly illustrative; mirrors the spirit of the old demo-dashboard but in
// the V2 domain shapes so the demo runs through the same Repository interface.

import type { Entry, HealthItem, Person, Preferences, Pregnancy, Profile } from "../domain/types";

export interface LocalSeed {
  profile: Profile;
  pregnancies: Pregnancy[];
  entries: Entry[];
  people: Person[];
  healthItems: HealthItem[];
  preferences: Preferences;
}

const daysAgo = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();
const dateDaysFromNow = (n: number): string =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function buildLocalSeed(userId: string): LocalSeed {
  const iso = new Date().toISOString();
  const pregnancyId = "demo-pregnancy";

  const profile: Profile = {
    userId,
    displayName: "Demo User",
    isTester: false,
    acceptedTermsAt: iso,
    acceptedPrivacyAt: iso,
    preferredName: "Demo",
    dateOfBirth: null,
    healthIdentifier: null,
    healthIdentifierLabel: "NHS number",
    photoPath: null,
    v2NoticeDismissedAt: null,
    createdAt: iso,
    updatedAt: iso,
  };

  const pregnancies: Pregnancy[] = [
    {
      id: pregnancyId,
      userId,
      edd: dateDaysFromNow(120),
      lmp: null,
      nickname: "Baby",
      birthPlace: null,
      status: "active",
      endedAt: null,
      createdAt: daysAgo(60),
      updatedAt: iso,
    },
  ];

  const person: Person = {
    id: "demo-midwife",
    userId,
    name: "Sam (midwife)",
    role: "midwife",
    contactDetails: null,
    archivedAt: null,
    createdAt: daysAgo(50),
    updatedAt: daysAgo(50),
  };

  const entry = (
    id: string,
    type: Entry["type"],
    occurredDaysAgo: number,
    visibility: Entry["visibility"],
    payload: Entry["payload"],
  ): Entry => ({
    id,
    userId,
    pregnancyId,
    personId: null,
    type,
    typeVersion: 2,
    occurredAt: daysAgo(occurredDaysAgo),
    recordedAt: daysAgo(occurredDaysAgo),
    gestationWeeks: null,
    gestationDays: null,
    visibility,
    payload,
    deletedAt: null,
    createdAt: daysAgo(occurredDaysAgo),
    updatedAt: daysAgo(occurredDaysAgo),
  });

  const entries: Entry[] = [
    entry("demo-e1", "symptom", 5, "personal", {
      symptom: "Nausea",
      severity: 4,
      note: "Settled after breakfast.",
    }),
    entry("demo-e2", "symptom", 3, "personal", { symptom: "Back pain", severity: 3 }),
    entry("demo-e3", "question", 2, "shareable", {
      text: "Is it normal to feel movements this early?",
    }),
    entry("demo-e4", "measurement", 2, "shareable", {
      kind: "blood_pressure",
      systolic: 118,
      diastolic: 76,
    }),
    entry("demo-e5", "note", 1, "personal", { text: "Felt the baby kick for the first time!" }),
    entry("demo-e6", "feeling", 1, "private", {
      feeling: "A bit anxious about the next scan",
    }),
  ];

  const healthItems: HealthItem[] = [
    {
      id: "demo-h1",
      userId,
      kind: "allergy",
      text: "Penicillin",
      active: true,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(55),
    },
  ];

  const preferences: Preferences = {
    userId,
    items: ["Delayed cord clamping", "Skin-to-skin straight after birth"],
    anythingElse: null,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(40),
  };

  return { profile, pregnancies, entries, people: [person], healthItems, preferences };
}
