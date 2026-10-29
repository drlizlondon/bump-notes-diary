// BN-INVITE server functions (founder 2026-10-29). Real accounts are invite-only
// during the beta; visitors without a code can request access. Logic lives in
// invite-core.ts; this file only wires auth and the database.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireApiAuthNoInvite } from "@/lib/azure/api-auth-middleware";
import { getDb } from "@/lib/data-store/db";
import { INVITE_ONLY } from "@/lib/invite-config";
import {
  addAccessRequest,
  codeIsActive,
  createCodeForRequest,
  isInvited,
  listAccessRequests,
  listInvitedAccounts,
  redeemCode,
} from "./invite-core";

type DbLike = Parameters<typeof isInvited>[0];
const db = () => getDb() as unknown as DbLike;

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Permission check failed");
  if (!data) throw new Error("Forbidden");
}

/** Does this signed-in account have an invite yet? */
export const myInviteStatus = createServerFn({ method: "POST" })
  .middleware([requireApiAuthNoInvite])
  .handler(async ({ context }) => ({
    inviteOnly: INVITE_ONLY,
    invited: !INVITE_ONLY || (await isInvited(db(), context.userId)),
  }));

/** Ties an invite code to this account. */
export const redeemInviteCode = createServerFn({ method: "POST" })
  .middleware([requireApiAuthNoInvite])
  .inputValidator((d: { code: string }) => ({ code: String(d?.code ?? "").slice(0, 64) }))
  .handler(async ({ data, context }) => redeemCode(db(), context.userId, data.code));

/** Before sign-up: is this code good? Public; doesn't use the code up. */
export const checkInviteCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => ({ code: String(d?.code ?? "").slice(0, 64) }))
  .handler(async ({ data }) => ({ ok: await codeIsActive(db(), data.code) }));

/** "No code? Request access". Public; email only. */
export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; heardFrom?: string; consent: boolean }) => ({
    email: String(d?.email ?? "").slice(0, 254),
    heardFrom: String(d?.heardFrom ?? "").slice(0, 200),
    consent: d?.consent === true,
  }))
  .handler(async ({ data }) => addAccessRequest(db(), data));

/** Admin: requests (oldest unanswered first after the 90-day purge). */
export const adminListAccessRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return { requests: await listAccessRequests(db()) };
  });

/** Admin: make a code for a request. Lizzie emails it herself. */
export const adminCreateCodeForRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return createCodeForRequest(db(), data.id, context.userId);
  });

/** Admin: who is in. */
export const adminListInvitedAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return { accounts: await listInvitedAccounts(db()) };
  });
