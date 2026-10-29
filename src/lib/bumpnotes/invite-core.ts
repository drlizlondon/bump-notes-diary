// BN-INVITE core: plain functions over a `query` client, so they can be tested
// without a database. Server functions in invite.functions.ts wrap them.

type Query = {
  query: <R = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: R[]; rowCount?: number | null }>;
};

/** "bn-ab12 cd" -> "BNAB12CD". Codes are case- and space-insensitive. */
export function normalizeCode(code: unknown): string {
  return String(code ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

// No 0/O or 1/I/L, so a code read out loud or copied by hand still works.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A new invite code like "BN7KQ4XM". `random` is injectable for tests. */
export function generateInviteCode(random: () => number = Math.random): string {
  let out = "BN";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export type AccessRequestInput = { email: string; heardFrom?: string; consent: boolean };

/** Returns a clean request, or an error message to show. Email only; no health details. */
export function validateAccessRequest(
  input: AccessRequestInput,
): { ok: true; email: string; heardFrom: string | null } | { ok: false; error: string } {
  const email = String(input?.email ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email) || email.length > 254)
    return { ok: false, error: "Please enter a valid email address." };
  if (input?.consent !== true)
    return { ok: false, error: "Please tick the box so we can email you your code." };
  const heard = String(input?.heardFrom ?? "")
    .trim()
    .slice(0, 200);
  return { ok: true, email, heardFrom: heard || null };
}

/** Is this an active code? Doesn't use it up (that happens at first sign-in). */
export async function codeIsActive(db: Query, rawCode: unknown): Promise<boolean> {
  const code = normalizeCode(rawCode);
  if (!code) return false;
  const { rows } = await db.query<{ status: string }>(
    "SELECT status FROM tester_access_codes WHERE upper(code) = $1",
    [code],
  );
  return rows[0]?.status === "active";
}

export async function isInvited(db: Query, userId: string): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM account_invites WHERE user_id = $1", [userId]);
  return rows.length > 0;
}

export type RedeemResult =
  { ok: true; already: boolean } | { ok: false; reason: "empty" | "unknown" | "inactive" };

/** Ties an active code to this account. Using it again on the same account changes nothing. */
export async function redeemCode(
  db: Query,
  userId: string,
  rawCode: unknown,
): Promise<RedeemResult> {
  if (await isInvited(db, userId)) return { ok: true, already: true };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "empty" };
  const { rows } = await db.query<{ id: string; status: string }>(
    "SELECT id, status FROM tester_access_codes WHERE upper(code) = $1",
    [code],
  );
  const found = rows[0];
  if (!found) return { ok: false, reason: "unknown" };
  if (found.status !== "active") return { ok: false, reason: "inactive" };
  const ins = await db.query(
    "INSERT INTO account_invites (user_id, access_code_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING RETURNING user_id",
    [userId, found.id],
  );
  if (ins.rows.length > 0) {
    await db.query(
      `UPDATE tester_access_codes
         SET use_count = use_count + 1, first_used_at = COALESCE(first_used_at, now()), last_used_at = now()
       WHERE id = $1`,
      [found.id],
    );
  }
  return { ok: true, already: ins.rows.length === 0 };
}

/** Saves a request. Always looks the same to the visitor, so it never reveals who has already asked. */
export async function addAccessRequest(db: Query, input: AccessRequestInput) {
  const v = validateAccessRequest(input);
  if (!v.ok) return v;
  await db.query(
    `INSERT INTO access_requests (email, heard_from, consent_at) VALUES ($1, $2, now())
     ON CONFLICT ((lower(email))) DO NOTHING`,
    [v.email, v.heardFrom],
  );
  return { ok: true as const };
}

/** Requests that never got a code are deleted after 90 days. */
export async function purgeStaleRequests(db: Query): Promise<void> {
  await db.query(
    "DELETE FROM access_requests WHERE access_code_id IS NULL AND created_at < now() - interval '90 days'",
  );
}

export async function listAccessRequests(db: Query) {
  await purgeStaleRequests(db);
  const { rows } = await db.query(
    `SELECT r.id, r.email, r.heard_from, r.created_at, r.handled_at, c.code, c.use_count
       FROM access_requests r LEFT JOIN tester_access_codes c ON c.id = r.access_code_id
      ORDER BY r.handled_at IS NOT NULL, r.created_at DESC`,
  );
  return rows;
}

/** Makes a code labelled with the requester's email and marks the request handled. Lizzie sends it. */
export async function createCodeForRequest(
  db: Query,
  requestId: string,
  createdBy: string | null,
  random?: () => number,
) {
  const { rows } = await db.query<{ id: string; email: string; access_code_id: string | null }>(
    "SELECT id, email, access_code_id FROM access_requests WHERE id = $1",
    [requestId],
  );
  const req = rows[0];
  if (!req) throw new Error("Request not found");
  if (req.access_code_id) {
    const { rows: c } = await db.query<{ code: string }>(
      "SELECT code FROM tester_access_codes WHERE id = $1",
      [req.access_code_id],
    );
    if (c[0]) return { code: c[0].code, email: req.email };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode(random);
    const ins = await db.query<{ id: string }>(
      `INSERT INTO tester_access_codes (code, label, notes, created_by) VALUES ($1, $2, 'access request', $3)
       ON CONFLICT ((upper(code))) DO NOTHING RETURNING id`,
      [code, req.email, createdBy],
    );
    if (ins.rows[0]) {
      await db.query(
        "UPDATE access_requests SET access_code_id = $1, handled_at = now() WHERE id = $2",
        [ins.rows[0].id, req.id],
      );
      return { code, email: req.email };
    }
  }
  throw new Error("Could not create a unique code; try again");
}

/** Who is in: each invited account's email, the code it used, and when. */
export async function listInvitedAccounts(db: Query) {
  const { rows } = await db.query(
    `SELECT u.email, c.code, c.label, i.redeemed_at
       FROM account_invites i JOIN users u ON u.id = i.user_id
       LEFT JOIN tester_access_codes c ON c.id = i.access_code_id
      ORDER BY i.redeemed_at DESC`,
  );
  return rows;
}
