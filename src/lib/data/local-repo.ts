// LocalRepository (AZURE Phase 3, task 3.5) — the same Repository contract as
// ApiRepository, but entirely on-device with no network:
//   • demo   → sessionStorage (ephemeral; seeded with sample fixtures)
//   • tester → localStorage   (persists across reloads; starts empty)
// V2 shapes throughout, so surfaces consume ONE interface regardless of mode
// (the mode factory in repository-context.tsx selects the implementation).
// Browser only; every collection is JSON under a mode-namespaced key.

import type {
  Attachment,
  Entry,
  HealthItem,
  Person,
  Preferences,
  Pregnancy,
  Profile,
} from "../domain/types";
import type {
  CreateEntryInput,
  ListEntriesParams,
  Repository,
  UploadAttachmentInput,
} from "./repository";
import { buildLocalSeed } from "./local-seed";

export type LocalMode = "demo" | "tester";
const LOCAL_USER_ID = "local-user";

function now(): string {
  return new Date().toISOString();
}
function uuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export class LocalRepository implements Repository {
  private readonly storage: Storage | null;
  private readonly prefix: string;

  constructor(mode: LocalMode) {
    const s =
      typeof window === "undefined"
        ? null
        : mode === "tester"
          ? window.localStorage
          : window.sessionStorage;
    this.storage = s;
    this.prefix = `bumpnotes:v2:${mode}:`;
    if (mode === "demo") this.seedIfEmpty();
  }

  // --- storage helpers ---
  private read<T>(name: string, fallback: T): T {
    if (!this.storage) return fallback;
    try {
      const raw = this.storage.getItem(this.prefix + name);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  private write<T>(name: string, value: T): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.prefix + name, JSON.stringify(value));
    } catch {
      /* quota / private mode — best-effort */
    }
  }

  private seedIfEmpty(): void {
    if (!this.storage || this.storage.getItem(`${this.prefix}seeded`) === "1") return;
    const seed = buildLocalSeed(LOCAL_USER_ID);
    this.write("profile", seed.profile);
    this.write("pregnancies", seed.pregnancies);
    this.write("entries", seed.entries);
    this.write("people", seed.people);
    this.write("healthItems", seed.healthItems);
    this.write("preferences", seed.preferences);
    if (this.storage) this.storage.setItem(`${this.prefix}seeded`, "1");
  }

  // --- Profile ---
  async getProfile(): Promise<Profile | null> {
    return this.read<Profile | null>("profile", null);
  }
  async upsertProfile(
    patch: Partial<Omit<Profile, "userId" | "createdAt" | "updatedAt">>,
  ): Promise<Profile> {
    const existing = this.read<Profile | null>("profile", null);
    const merged: Profile = {
      userId: LOCAL_USER_ID,
      displayName: null,
      isTester: false,
      acceptedTermsAt: null,
      acceptedPrivacyAt: null,
      preferredName: null,
      dateOfBirth: null,
      healthIdentifier: null,
      healthIdentifierLabel: "NHS number",
      photoPath: null,
      v2NoticeDismissedAt: null,
      createdAt: existing?.createdAt ?? now(),
      ...existing,
      ...stripUndefined(patch),
      updatedAt: now(),
    };
    this.write("profile", merged);
    return merged;
  }

  // --- Pregnancies ---
  async listPregnancies(): Promise<Pregnancy[]> {
    return this.read<Pregnancy[]>("pregnancies", []);
  }
  async getActivePregnancy(): Promise<Pregnancy | null> {
    return this.read<Pregnancy[]>("pregnancies", []).find((p) => p.status === "active") ?? null;
  }
  async createPregnancy(
    input: Pick<Pregnancy, "edd"> & Partial<Pick<Pregnancy, "lmp" | "nickname" | "birthPlace">>,
  ): Promise<Pregnancy> {
    const list = this.read<Pregnancy[]>("pregnancies", []);
    const p: Pregnancy = {
      id: uuid(),
      userId: LOCAL_USER_ID,
      edd: input.edd,
      lmp: input.lmp ?? null,
      nickname: input.nickname ?? null,
      birthPlace: input.birthPlace ?? null,
      status: "active",
      endedAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    // Mirror the one-active-per-user rule: end any current active pregnancy.
    for (const existing of list) {
      if (existing.status === "active") {
        existing.status = "ended";
        existing.endedAt = now();
      }
    }
    list.unshift(p);
    this.write("pregnancies", list);
    return p;
  }
  async updatePregnancy(
    id: string,
    patch: Partial<Pick<Pregnancy, "edd" | "lmp" | "nickname" | "birthPlace">>,
  ): Promise<Pregnancy> {
    const list = this.read<Pregnancy[]>("pregnancies", []);
    const p = list.find((x) => x.id === id);
    if (!p) throw new Error("pregnancy not found");
    if (patch.edd !== undefined) p.edd = patch.edd;
    if (patch.lmp !== undefined) p.lmp = patch.lmp;
    if (patch.nickname !== undefined) p.nickname = patch.nickname;
    if (patch.birthPlace !== undefined) p.birthPlace = patch.birthPlace;
    p.updatedAt = now();
    this.write("pregnancies", list);
    return p;
  }

  // --- Entries ---
  async listEntries(params: ListEntriesParams): Promise<Entry[]> {
    return this.read<Entry[]>("entries", [])
      .filter((e) => e.pregnancyId === params.pregnancyId)
      .filter((e) => (params.type ? e.type === params.type : true))
      .filter((e) => (params.includeDeleted ? true : e.deletedAt === null))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }
  async createEntry(input: CreateEntryInput): Promise<Entry> {
    const list = this.read<Entry[]>("entries", []);
    const entry: Entry = {
      id: uuid(),
      userId: LOCAL_USER_ID,
      pregnancyId: input.pregnancyId,
      personId: input.personId ?? null,
      type: input.type,
      typeVersion: 2,
      occurredAt: input.occurredAt,
      recordedAt: now(),
      gestationWeeks: input.gestationWeeks ?? null,
      gestationDays: input.gestationDays ?? null,
      visibility: input.visibility,
      payload: input.payload,
      deletedAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    list.unshift(entry);
    this.write("entries", list);
    return entry;
  }
  async softDeleteEntry(id: string): Promise<void> {
    const list = this.read<Entry[]>("entries", []);
    const e = list.find((x) => x.id === id);
    if (e) {
      e.deletedAt = now();
      e.updatedAt = now();
      this.write("entries", list);
    }
  }

  // --- People ---
  async listPeople(): Promise<Person[]> {
    return this.read<Person[]>("people", []);
  }
  async upsertPerson(input: Partial<Person> & Pick<Person, "name" | "role">): Promise<Person> {
    const list = this.read<Person[]>("people", []);
    if (input.id) {
      const p = list.find((x) => x.id === input.id);
      if (p) {
        p.name = input.name;
        p.role = input.role;
        if (input.contactDetails !== undefined) p.contactDetails = input.contactDetails;
        if (input.archivedAt !== undefined) p.archivedAt = input.archivedAt;
        p.updatedAt = now();
        this.write("people", list);
        return p;
      }
    }
    const person: Person = {
      id: uuid(),
      userId: LOCAL_USER_ID,
      name: input.name,
      role: input.role,
      contactDetails: input.contactDetails ?? null,
      archivedAt: input.archivedAt ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    list.unshift(person);
    this.write("people", list);
    return person;
  }

  // --- Health items ---
  async listHealthItems(): Promise<HealthItem[]> {
    return this.read<HealthItem[]>("healthItems", []);
  }
  async upsertHealthItem(
    input: Partial<HealthItem> & Pick<HealthItem, "kind" | "text">,
  ): Promise<HealthItem> {
    const list = this.read<HealthItem[]>("healthItems", []);
    if (input.id) {
      const h = list.find((x) => x.id === input.id);
      if (h) {
        h.kind = input.kind;
        h.text = input.text;
        if (input.active !== undefined) h.active = input.active;
        h.updatedAt = now();
        this.write("healthItems", list);
        return h;
      }
    }
    const item: HealthItem = {
      id: uuid(),
      userId: LOCAL_USER_ID,
      kind: input.kind,
      text: input.text,
      active: input.active ?? true,
      createdAt: now(),
      updatedAt: now(),
    };
    list.unshift(item);
    this.write("healthItems", list);
    return item;
  }

  // --- Preferences ---
  async getPreferences(): Promise<Preferences | null> {
    return this.read<Preferences | null>("preferences", null);
  }
  async upsertPreferences(
    patch: Partial<Pick<Preferences, "items" | "anythingElse">>,
  ): Promise<Preferences> {
    const existing = this.read<Preferences | null>("preferences", null);
    const merged: Preferences = {
      userId: LOCAL_USER_ID,
      items: patch.items ?? existing?.items ?? [],
      anythingElse:
        patch.anythingElse !== undefined ? patch.anythingElse : (existing?.anythingElse ?? null),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    this.write("preferences", merged);
    return merged;
  }

  // --- Attachments (local: store the bytes as a data URL alongside metadata) ---
  async listAttachments(entryId: string): Promise<Attachment[]> {
    return this.read<Attachment[]>("attachments", []).filter((a) => a.entryId === entryId);
  }
  async uploadAttachment(input: UploadAttachmentInput): Promise<Attachment> {
    const list = this.read<Attachment[]>("attachments", []);
    const id = uuid();
    const att: Attachment = {
      id,
      userId: LOCAL_USER_ID,
      entryId: input.entryId,
      container: "user-uploads",
      blobPath: `local/${id}`,
      mime: input.mime,
      sizeBytes: Math.round((input.dataBase64.length * 3) / 4),
      checksum: null,
      caption: input.caption ?? null,
      uploadedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    list.unshift(att);
    this.write("attachments", list);
    // Keep the bytes separately so listAttachments stays lightweight.
    const data = this.read<Record<string, string>>("attachmentData", {});
    data[id] = `data:${input.mime};base64,${input.dataBase64}`;
    this.write("attachmentData", data);
    return att;
  }
  async getAttachmentUrl(attachmentId: string): Promise<{ url: string; expiresAt: string }> {
    const data = this.read<Record<string, string>>("attachmentData", {});
    const url = data[attachmentId];
    if (!url) throw new Error("attachment not found");
    return { url, expiresAt: new Date(Date.now() + 3600_000).toISOString() };
  }
  async deleteAttachment(attachmentId: string): Promise<void> {
    this.write(
      "attachments",
      this.read<Attachment[]>("attachments", []).filter((a) => a.id !== attachmentId),
    );
    const data = this.read<Record<string, string>>("attachmentData", {});
    delete data[attachmentId];
    this.write("attachmentData", data);
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
