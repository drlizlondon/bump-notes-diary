// Capture abstraction (AZURE Phase 3, task A5).
//
// The capture panels (components/bumpnotes/Panels.tsx) are shared between the
// live home (still on the local store + Supabase sync) and the routes being cut
// to the Azure repository (demo now; home/timeline/settings later). To cut a
// route WITHOUT changing the live home, a panel asks `useCapture()` for the
// active source and branches:
//   • source "store"      → the panel runs its existing store.* code verbatim
//                           (default; the live home is byte-identical).
//   • source "repository" → the panel calls these methods, which write V2 entries
//                           through the repository hooks (create-only, per the
//                           append-only ruling — DECISIONS-LOG 2026-09-12).
//
// The default context is the store source with repository methods that throw if
// mis-called, so no route that hasn't opted in can accidentally hit the API.
// `RepositoryCaptureProvider` (mounted under a <RepositoryProvider>) supplies the
// repository-backed implementation.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Entry as V2Entry, PersonRole } from "../domain/types";
import { gestationFromDueDate } from "../bumpnotes/gestation";
import { prepareImageForUpload } from "./attachments";
import { createInputFromCapture, type CaptureDraft } from "./entry-adapter";
import { RepositoryProvider, resolveDefaultMode } from "./repository-context";
import {
  useActivePregnancy,
  useCreateEntry,
  useSoftDeleteEntry,
  useUpsertPerson,
  useUploadAttachment,
} from "./hooks";

export type CaptureSource = "store" | "repository";

export interface PhotoCapture {
  tag: string;
  note?: string;
  /** Original file — re-encoded (EXIF/GPS stripped) before upload. Images only. */
  file: File;
}

export interface PersonVisitCapture {
  name?: string;
  /** Old i18n role key (e.g. "role.midwife"); mapped to a V2 PersonRole. */
  roleKey?: string;
  discussed?: string;
  advised?: string;
  note?: string;
  whenISO: string;
  file?: File | null;
}

export interface CaptureApi {
  source: CaptureSource;
  /** True when the repository target is ready (active pregnancy loaded). */
  ready: boolean;
  /** Create one entry from an old-shape draft. Returns the new id (for undo). */
  addEntry(draft: CaptureDraft): Promise<{ id: string }>;
  /** Undo a just-created entry (repository: soft-delete — append-only). */
  removeEntry(id: string): Promise<void>;
  /**
   * Amend an entry's free-text (append-a-correction, per the append-only ruling):
   * writes a corrected copy preserving all metadata, then soft-deletes the
   * original — nothing is mutated in place, the original is retained for the
   * record. Returns the new entry id.
   */
  amendEntry(original: V2Entry, editableText: string): Promise<{ id: string }>;
  /** Photo capture: upload entry + EXIF-stripped blob attachment (A3). */
  addPhoto(input: PhotoCapture): Promise<{ id: string }>;
  /** "Who I saw": a People row (D2) + an appointment entry referencing it. */
  addPersonVisit(input: PersonVisitCapture): Promise<{ id: string }>;
}

/** Old i18n role key -> V2 PersonRole enum (D2). Unknowns fall to "other". */
const ROLE_KEY_TO_V2: Record<string, PersonRole> = {
  "role.midwife": "midwife",
  "role.obstetrician": "consultant",
  "role.sonographer": "sonographer",
  "role.gp": "gp",
  "role.nurse": "other",
  "role.healthVisitor": "other",
  "role.doula": "birth_partner",
  "role.triage": "other",
  "role.other": "other",
};

function mapRole(roleKey: string | undefined): PersonRole {
  return (roleKey && ROLE_KEY_TO_V2[roleKey]) || "other";
}

const notInRepositoryMode = (): never => {
  throw new Error("capture: repository method called while source is 'store'");
};

/** The free-text field amended per entry type (mirrors EntryEditDialog). */
function applyEditableText(
  type: V2Entry["type"],
  payload: Record<string, unknown>,
  text: string,
): Record<string, unknown> {
  const next = { ...payload };
  switch (type) {
    case "note":
    case "question":
      next.text = text;
      break;
    case "appointment":
      next.discussed = text || undefined;
      break;
    default: // symptom, measurement, upload, feeling
      next.note = text || undefined;
      break;
  }
  return next;
}

const storeCaptureApi: CaptureApi = {
  source: "store",
  ready: true,
  addEntry: notInRepositoryMode,
  removeEntry: notInRepositoryMode,
  amendEntry: notInRepositoryMode,
  addPhoto: notInRepositoryMode,
  addPersonVisit: notInRepositoryMode,
};

const CaptureContext = createContext<CaptureApi>(storeCaptureApi);

/**
 * Repository-backed capture. Mount UNDER a <RepositoryProvider mode=…>. Reads the
 * active pregnancy to scope writes and compute gestation, then writes V2 entries
 * create-only (append-only ruling): symptom/question/measurement/note/feeling via
 * createEntry; photo via upload entry + attachment; person via People + an
 * appointment entry.
 */
export function RepositoryCaptureProvider({ children }: { children: ReactNode }) {
  const { data: pregnancy } = useActivePregnancy();
  const createEntry = useCreateEntry();
  const softDelete = useSoftDeleteEntry();
  const upsertPerson = useUpsertPerson();
  const uploadAttachment = useUploadAttachment();

  const api = useMemo<CaptureApi>(() => {
    const gestationAt = (occurredAt: string) => {
      if (!pregnancy?.edd) return { gestationWeeks: null, gestationDays: null };
      const g = gestationFromDueDate(pregnancy.edd, new Date(occurredAt));
      return { gestationWeeks: g.weeks, gestationDays: g.days };
    };
    const requirePregnancy = (): string => {
      if (!pregnancy?.id) throw new Error("No active pregnancy to record against.");
      return pregnancy.id;
    };

    return {
      source: "repository",
      ready: !!pregnancy?.id,

      async addEntry(draft) {
        const pregnancyId = requirePregnancy();
        const occurredAt = draft.occurredAt ?? new Date().toISOString();
        const input = createInputFromCapture(draft, {
          pregnancyId,
          ...gestationAt(occurredAt),
        });
        const entry = await createEntry.mutateAsync({ ...input, occurredAt });
        return { id: entry.id };
      },

      async removeEntry(id) {
        await softDelete.mutateAsync(id);
      },

      async amendEntry(original, editableText) {
        const payload = applyEditableText(
          original.type,
          original.payload as Record<string, unknown>,
          editableText,
        );
        const created = await createEntry.mutateAsync({
          pregnancyId: original.pregnancyId,
          personId: original.personId,
          type: original.type,
          occurredAt: original.occurredAt,
          gestationWeeks: original.gestationWeeks,
          gestationDays: original.gestationDays,
          visibility: original.visibility,
          payload: payload as never,
        });
        await softDelete.mutateAsync(original.id);
        return { id: created.id };
      },

      async addPhoto({ tag, note, file }) {
        const pregnancyId = requirePregnancy();
        const occurredAt = new Date().toISOString();
        const prepared = await prepareImageForUpload(file); // EXIF/GPS stripped
        const entry = await createEntry.mutateAsync({
          pregnancyId,
          personId: null,
          type: "upload",
          occurredAt,
          ...gestationAt(occurredAt),
          visibility: "personal",
          payload: { tag, note },
        });
        await uploadAttachment.mutateAsync({
          entryId: entry.id,
          filename: prepared.filename,
          mime: prepared.mime,
          dataBase64: prepared.dataBase64,
          caption: note ?? null,
        });
        return { id: entry.id };
      },

      async addPersonVisit({ name, roleKey, discussed, advised, note, whenISO, file }) {
        const pregnancyId = requirePregnancy();
        let personId: string | null = null;
        if (name?.trim()) {
          const person = await upsertPerson.mutateAsync({
            name: name.trim(),
            role: mapRole(roleKey),
          });
          personId = person.id;
        }
        const entry = await createEntry.mutateAsync({
          pregnancyId,
          personId,
          type: "appointment",
          occurredAt: whenISO,
          ...gestationAt(whenISO),
          visibility: "personal",
          payload: {
            kind: "appointment",
            whoSeen: name?.trim() || undefined,
            discussed: discussed || undefined,
            advice: advised || undefined,
            followUp: note || undefined,
          },
        });
        if (file) {
          const prepared = await prepareImageForUpload(file);
          await uploadAttachment.mutateAsync({
            entryId: entry.id,
            filename: prepared.filename,
            mime: prepared.mime,
            dataBase64: prepared.dataBase64,
            caption: note ?? null,
          });
        }
        return { id: entry.id };
      },
    };
  }, [pregnancy, createEntry, softDelete, upsertPerson, uploadAttachment]);

  return <CaptureContext.Provider value={api}>{children}</CaptureContext.Provider>;
}

/** The active capture API. Defaults to the store source outside a provider. */
export function useCapture(): CaptureApi {
  return useContext(CaptureContext);
}

/**
 * Wraps an authenticated app surface so it reads/writes the V2 Azure repository:
 * mode from `resolveDefaultMode()` (tester → on-device LocalRepository; else the
 * authed ApiRepository), with repository-backed capture. Mount only inside an
 * authorized subtree (tester or signed-in) so anon visitors never trigger an API
 * read — the route's gate decides that before rendering this.
 */
export function AppRepository({ children }: { children: ReactNode }) {
  const mode = resolveDefaultMode();
  return (
    <RepositoryProvider mode={mode}>
      <RepositoryCaptureProvider>{children}</RepositoryCaptureProvider>
    </RepositoryProvider>
  );
}
