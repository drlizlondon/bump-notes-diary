// BN-INVITE: invite codes and access requests, against a fake database.
import { describe, expect, it } from "vitest";
import {
  addAccessRequest,
  codeIsActive,
  createCodeForRequest,
  generateInviteCode,
  isInvited,
  normalizeCode,
  purgeStaleRequests,
  redeemCode,
  validateAccessRequest,
} from "./invite-core";
import { assertInvited, INVITE_REQUIRED } from "@/lib/azure/api-auth-middleware";

type Row = Record<string, unknown>;
type FakeDb = Parameters<typeof isInvited>[0] & { calls: { text: string; values: unknown[] }[] };
function fakeDb(state: { codes: Row[]; invites: Row[]; requests: Row[] }): FakeDb {
  const calls: { text: string; values: unknown[] }[] = [];
  const db = {
    calls,
    async query(text: string, values: unknown[] = []) {
      calls.push({ text, values });
      const t = text.replace(/\s+/g, " ").trim();
      if (t.startsWith("SELECT 1 FROM account_invites"))
        return { rows: state.invites.filter((i) => i.user_id === values[0]) };
      if (
        t.startsWith("SELECT id, status FROM tester_access_codes") ||
        t.startsWith("SELECT status FROM tester_access_codes")
      )
        return { rows: state.codes.filter((c) => String(c.code).toUpperCase() === values[0]) };
      if (t.startsWith("INSERT INTO account_invites")) {
        if (state.invites.some((i) => i.user_id === values[0])) return { rows: [] };
        state.invites.push({ user_id: values[0], access_code_id: values[1] });
        return { rows: [{ user_id: values[0] }] };
      }
      if (t.startsWith("UPDATE tester_access_codes")) {
        const c = state.codes.find((x) => x.id === values[0]);
        if (c) c.use_count = Number(c.use_count ?? 0) + 1;
        return { rows: [] };
      }
      if (t.startsWith("INSERT INTO access_requests")) {
        if (!state.requests.some((r) => r.email === values[0]))
          state.requests.push({
            id: `r${state.requests.length + 1}`,
            email: values[0],
            heard_from: values[1],
            access_code_id: null,
          });
        return { rows: [] };
      }
      if (t.startsWith("SELECT code FROM tester_access_codes WHERE id"))
        return { rows: state.codes.filter((c) => c.id === values[0]) };
      if (t.startsWith("SELECT id, email, access_code_id FROM access_requests"))
        return { rows: state.requests.filter((r) => r.id === values[0]) };
      if (t.startsWith("INSERT INTO tester_access_codes")) {
        if (
          state.codes.some((c) => String(c.code).toUpperCase() === String(values[0]).toUpperCase())
        )
          return { rows: [] };
        const id = `c${state.codes.length + 1}`;
        state.codes.push({ id, code: values[0], label: values[1], status: "active", use_count: 0 });
        return { rows: [{ id }] };
      }
      if (t.startsWith("UPDATE access_requests")) {
        const r = state.requests.find((x) => x.id === values[1]);
        if (r) r.access_code_id = values[0];
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
  return db as unknown as FakeDb;
}

const base = () => ({
  codes: [
    { id: "c1", code: "BNAB12CD", status: "active", use_count: 0 },
    { id: "c2", code: "OFF1", status: "inactive", use_count: 0 },
  ] as Row[],
  invites: [] as Row[],
  requests: [] as Row[],
});

describe("codes", () => {
  it("normalises case and spaces", () => expect(normalizeCode(" bn-ab12 cd ")).toBe("BNAB12CD"));
  it("generates BN + 6 unambiguous characters", () => {
    const c = generateInviteCode(() => 0.5);
    expect(c).toMatch(/^BN[A-Z2-9]{6}$/);
    expect(c).not.toMatch(/[01OIL]/);
  });
  it("checks a code without using it up", async () => {
    const s = base();
    const db = fakeDb(s);
    expect(await codeIsActive(db, "bnab12cd")).toBe(true);
    expect(await codeIsActive(db, "OFF1")).toBe(false);
    expect(await codeIsActive(db, "NOPE")).toBe(false);
    expect(s.codes[0].use_count).toBe(0);
  });
});

describe("redeemCode", () => {
  it("ties an active code to the account and counts it once", async () => {
    const s = base();
    const db = fakeDb(s);
    expect(await redeemCode(db, "u1", "bnab12cd")).toEqual({ ok: true, already: false });
    expect(await isInvited(db, "u1")).toBe(true);
    expect(await redeemCode(db, "u1", "bnab12cd")).toEqual({ ok: true, already: true });
    expect(s.codes[0].use_count).toBe(1);
  });
  it("refuses unknown, inactive and empty codes", async () => {
    const db = fakeDb(base());
    expect(await redeemCode(db, "u1", "NOPE")).toEqual({ ok: false, reason: "unknown" });
    expect(await redeemCode(db, "u1", "off1")).toEqual({ ok: false, reason: "inactive" });
    expect(await redeemCode(db, "u1", "  ")).toEqual({ ok: false, reason: "empty" });
    expect(await isInvited(db, "u1")).toBe(false);
  });
});

describe("the server refuses data for uninvited accounts", () => {
  it("throws Invite required when invite-only and not invited", async () => {
    const db = fakeDb(base());
    await expect(assertInvited(db as never, "u1", true)).rejects.toThrow(INVITE_REQUIRED);
  });
  it("lets an invited account through", async () => {
    const s = base();
    const db = fakeDb(s);
    await redeemCode(db, "u1", "BNAB12CD");
    await expect(assertInvited(db as never, "u1", true)).resolves.toBeUndefined();
  });
  it("lets everyone through when invite-only is off", async () => {
    await expect(assertInvited(fakeDb(base()) as never, "u1", false)).resolves.toBeUndefined();
  });
});

describe("access requests", () => {
  it("needs a valid email and the consent tick; keeps only the email and an optional note", () => {
    expect(validateAccessRequest({ email: "not-an-email", consent: true }).ok).toBe(false);
    expect(validateAccessRequest({ email: "a@b.co", consent: false }).ok).toBe(false);
    expect(validateAccessRequest({ email: " A@B.co ", heardFrom: "  ", consent: true })).toEqual({
      ok: true,
      email: "a@b.co",
      heardFrom: null,
    });
  });
  it("stores one request per email and never says whether it already existed", async () => {
    const s = base();
    const db = fakeDb(s);
    expect(await addAccessRequest(db, { email: "a@b.co", consent: true })).toEqual({ ok: true });
    expect(await addAccessRequest(db, { email: "a@b.co", consent: true })).toEqual({ ok: true });
    expect(s.requests).toHaveLength(1);
  });
  it("makes a labelled code for a request, and returns the same code if asked again", async () => {
    const s = base();
    const db = fakeDb(s);
    await addAccessRequest(db, { email: "mum@example.com", consent: true });
    const first = await createCodeForRequest(db, "r1", "admin", () => 0.1);
    expect(first.code).toMatch(/^BN/);
    expect(s.codes.find((c) => c.code === first.code)?.label).toBe("mum@example.com");
    // asking again returns the same code and creates no other
    const before = s.codes.length;
    const again = await createCodeForRequest(db, "r1", "admin", () => 0.1);
    expect(again.code).toBe(first.code);
    expect(s.codes.length).toBe(before);
  });
  it("deletes requests with no code after 90 days", async () => {
    const db = fakeDb(base());
    await purgeStaleRequests(db);
    expect(db.calls[0].text).toMatch(
      /DELETE FROM access_requests WHERE access_code_id IS NULL AND created_at < now\(\) - interval '90 days'/,
    );
  });
});
