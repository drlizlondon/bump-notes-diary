// A5 screen-cutover adapter (AZURE Phase 3, task A5).
//
// Maps the V2 Azure `Entry` (src/lib/domain/types.ts, shaped by the applied
// migrations) <-> the old store `Entry` (src/lib/bumpnotes/types.ts) that the
// existing capture panels + timeline already render. The point (A5 plan,
// docs/product/A5-SCREEN-CUTOVER-PLAN.md) is to swap the *data plumbing* under
// the proven UI rather than rewrite the panels: surfaces read V2 entries, run
// them through `storeEntryFromV2`, and render the familiar shape; captures build
// a `CreateEntryInput` via `createInputFromCapture`.
//
// Founder model-mapping rulings encoded here (DECISIONS-LOG 2026-09-12):
//   D4  — legacy `concern` folds into `question`; legacy `labour` is dropped
//         (the real labour subsystem is archived, see archive/labour.ts).
//   D1  — labour/contraction entry types have no V2 home; they never reach this
//         adapter (archived), and are defensively ignored if an old blob has one.
//
// PURE + additive: this module has no React, no I/O, and no screen yet depends
// on it — wiring the surfaces onto it is the subsequent A5 commits. Kept pure so
// the mapping can be reasoned about (and, if a test runner is ever added per
// WORK.md §6, unit-tested) in isolation from the UI.
//
// Two mappings are deliberately NOT here because they are cross-entity and belong
// at the surface layer, not in a per-entry pure function:
//   • D2 (People): old `person` entries + profile care contacts become People
//     rows; a "who I saw" capture writes a People row + an `appointment` entry
//     referencing it. The appointment<->person join is done where `listPeople()`
//     is in scope (timeline/capture), not here.
//   • Attachments: old `photo`/`person` inline `dataUrl` becomes an `upload`
//     entry + a blob attachment (A3). `storeEntryFromV2` maps the upload entry's
//     metadata; the panel resolves the binary via `getAttachmentUrl` separately.

import type { CreateEntryInput } from "./repository";
import type {
  Entry as V2Entry,
  EntryType as V2EntryType,
  EntryVisibility,
  Profile as V2Profile,
  Pregnancy,
} from "../domain/types";

// The V2 `EntryPayload` union members are bare shapes with overlapping fields
// (several carry `text`, `note`, `kind`), so `Extract<EntryPayload, …>` can match
// more than one member. We already narrow on the real discriminant (`Entry.type`)
// in the switch below, so each branch reads the payload through a permissive
// per-type view instead — the API zod-validates the payload on write, so a
// tolerant read here is correct and avoids spurious union widening.
type ReadPayload = {
  symptom?: string;
  severity?: number;
  quantifier?: string;
  clarification?: string;
  location?: string;
  note?: string;
  text?: string;
  context?: string;
  answered?: boolean;
  kind?: string;
  customLabel?: string;
  whoSeen?: string;
  discussed?: string;
  advice?: string;
  followUp?: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  value?: number;
  unit?: string;
  tag?: string;
  feeling?: string;
};
import type {
  Entry as StoreEntry,
  Profile as StoreProfile,
  MeasurementKind,
  SymptomEntry,
  QuestionEntry,
  AppointmentEntry,
  MeasurementEntry,
  PhotoEntry,
  FeelingEntry,
  NoteEntry,
} from "../bumpnotes/types";

/** Old store measurement kinds, for narrowing an untyped V2 payload string. */
const MEASUREMENT_KINDS: readonly MeasurementKind[] = [
  "blood_pressure",
  "weight",
  "blood_sugar",
  "movements",
  "temperature",
  "custom",
];

function asMeasurementKind(kind: string | undefined): MeasurementKind {
  return MEASUREMENT_KINDS.includes(kind as MeasurementKind) ? (kind as MeasurementKind) : "custom";
}

/** V2 gestation fields -> the old store's `weekDay` shape (nulls -> 0). */
function weekDay(e: Pick<V2Entry, "gestationWeeks" | "gestationDays">): {
  weeks: number;
  days: number;
} {
  return { weeks: e.gestationWeeks ?? 0, days: e.gestationDays ?? 0 };
}

/**
 * V2 `Entry` -> old store `Entry` for rendering in the proven panels/timeline.
 * Returns `null` for entries with no old-shape equivalent (defensive; the V2
 * schema has no `person`/`labour` types, so in practice every stored entry maps).
 * The old base fields: `id`, `createdAt` (<- V2 `recordedAt`, the capture time
 * the "this week" views filter on), `weekDay`, and `deletedAt` (null -> absent).
 */
export function storeEntryFromV2(e: V2Entry): StoreEntry | null {
  const base = {
    id: e.id,
    createdAt: e.recordedAt,
    weekDay: weekDay(e),
    ...(e.deletedAt ? { deletedAt: e.deletedAt } : {}),
  };
  const p = e.payload as ReadPayload;

  switch (e.type) {
    case "symptom":
      return {
        ...base,
        type: "symptom",
        symptom: p.symptom ?? "",
        severity: p.severity,
        quantifier: p.quantifier,
        clarification: p.clarification,
        location: p.location,
        note: p.note,
      } satisfies SymptomEntry;
    case "question":
      return {
        ...base,
        type: "question",
        text: p.text ?? "",
        context: p.context,
        answered: p.answered,
      } satisfies QuestionEntry;
    case "appointment":
      return {
        ...base,
        type: "appointment",
        kind: p.kind ?? "appointment",
        whenISO: e.occurredAt,
        whoSeen: p.whoSeen,
        discussed: p.discussed,
        advice: p.advice,
        followUp: p.followUp,
      } satisfies AppointmentEntry;
    case "measurement":
      return {
        ...base,
        type: "measurement",
        kind: asMeasurementKind(p.kind),
        customLabel: p.customLabel,
        systolic: p.systolic,
        diastolic: p.diastolic,
        pulse: p.pulse,
        value: p.value,
        unit: p.unit,
        note: p.note,
      } satisfies MeasurementEntry;
    case "upload":
      // The binary lives in a blob attachment; the panel resolves a short-lived
      // URL via getAttachmentUrl and fills `dataUrl`. Empty here by design.
      return {
        ...base,
        type: "photo",
        tag: p.tag ?? "",
        dataUrl: "",
        note: p.note,
      } satisfies PhotoEntry;
    case "note":
      return { ...base, type: "note", text: p.text ?? "" } satisfies NoteEntry;
    case "feeling":
      return {
        ...base,
        type: "feeling",
        feeling: p.feeling ?? "",
        note: p.note,
        privateOnly: true,
      } satisfies FeelingEntry;
    default:
      return null;
  }
}

/** Default visibility per type (feeling is always private — ARCH/V2 rule). */
export function defaultVisibilityFor(type: V2EntryType): EntryVisibility {
  return type === "feeling" ? "private" : "personal";
}

/**
 * V2 `Profile` + active `Pregnancy` -> the old store `Profile` shape the
 * HomeHeader / onboarding gate render. Encodes D3: the due date lives on the
 * Pregnancy in V2, name/nickname split across Profile and Pregnancy. `onboarded`
 * is true when an active pregnancy exists (the V1 flag has no V2 column — presence
 * of the pregnancy is the source of truth). Care contacts (midwife/GP/…) come
 * from People (D2) and are filled by the surface where listPeople() is in scope,
 * not here — this returns the identity/due-date fields the header needs.
 */
export function storeProfileFromV2(
  profile: V2Profile | null,
  pregnancy: Pregnancy | null,
): StoreProfile | null {
  if (!profile && !pregnancy) return null;
  return {
    userName: profile?.displayName ?? profile?.preferredName ?? "",
    babyNickname: pregnancy?.nickname ?? "",
    dueDateISO: pregnancy?.edd ?? "",
    onboarded: !!pregnancy,
  };
}

/**
 * The subset of an old-store capture the panels produce, before it becomes a
 * V2 `CreateEntryInput`. `type` is the OLD type (so `concern` can be folded).
 */
export interface CaptureDraft {
  type: StoreEntry["type"];
  occurredAt?: string; // event time; defaults to now
  // per-type fields (only the ones relevant to `type` are read)
  symptom?: string;
  severity?: number;
  quantifier?: string;
  clarification?: string;
  location?: string;
  note?: string;
  text?: string;
  context?: string;
  answered?: boolean;
  concern?: string; // legacy; folded into question (D4)
  kind?: string;
  customLabel?: string;
  whoSeen?: string;
  discussed?: string;
  advice?: string;
  followUp?: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  value?: number;
  unit?: string;
  tag?: string;
  feeling?: string;
}

/**
 * Build a V2 `CreateEntryInput` from an old-shape capture draft. Encodes D4:
 * `concern` folds into a `question` entry. Throws on types with no direct entry
 * mapping (`person`, `photo`, archived labour) — those go through their own
 * surface flows (People upsert / attachment upload), never this function.
 */
export function createInputFromCapture(
  draft: CaptureDraft,
  ctx: {
    pregnancyId: string;
    gestationWeeks?: number | null;
    gestationDays?: number | null;
    personId?: string | null;
  },
): CreateEntryInput {
  const occurredAt = draft.occurredAt ?? new Date().toISOString();
  const common = {
    pregnancyId: ctx.pregnancyId,
    personId: ctx.personId ?? null,
    occurredAt,
    gestationWeeks: ctx.gestationWeeks ?? null,
    gestationDays: ctx.gestationDays ?? null,
  };

  switch (draft.type) {
    case "symptom":
      return {
        ...common,
        type: "symptom",
        visibility: "personal",
        payload: {
          symptom: draft.symptom ?? "",
          severity: draft.severity,
          quantifier: draft.quantifier,
          clarification: draft.clarification,
          location: draft.location,
          note: draft.note,
        },
      };
    case "question":
      return {
        ...common,
        type: "question",
        visibility: "personal",
        payload: { text: draft.text ?? "", context: draft.context, answered: draft.answered },
      };
    case "concern": {
      // D4: fold concern -> question. Preserve the original wording.
      const text = draft.concern ?? draft.text ?? "";
      return {
        ...common,
        type: "question",
        visibility: "personal",
        payload: { text, context: draft.note },
      };
    }
    case "appointment":
      return {
        ...common,
        type: "appointment",
        visibility: "personal",
        payload: {
          kind: draft.kind ?? "appointment",
          whoSeen: draft.whoSeen,
          discussed: draft.discussed,
          advice: draft.advice,
          followUp: draft.followUp,
        },
      };
    case "measurement":
      return {
        ...common,
        type: "measurement",
        visibility: "personal",
        payload: {
          kind: draft.kind ?? "custom",
          customLabel: draft.customLabel,
          systolic: draft.systolic,
          diastolic: draft.diastolic,
          pulse: draft.pulse,
          value: draft.value,
          unit: draft.unit,
          note: draft.note,
        },
      };
    case "note":
      return {
        ...common,
        type: "note",
        visibility: "personal",
        payload: { text: draft.text ?? "" },
      };
    case "feeling":
      return {
        ...common,
        type: "feeling",
        visibility: "private", // always private (V2 rule)
        payload: { feeling: draft.feeling ?? "", note: draft.note },
      };
    default:
      throw new Error(
        `createInputFromCapture: type "${draft.type}" has no direct entry mapping ` +
          `(person -> People upsert; photo -> upload + attachment; labour archived)`,
      );
  }
}
