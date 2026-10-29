-- BN-INVITE (2026-10-29): real accounts are invite-only during the beta.
-- Founder: "if you have the code, so i'm aware, they can load up and use", and
-- "No code? Request access" for visitors without one (spec NightMode
-- specs/BN-INVITE-2026-10-29.md).
--
-- ADDITIVE ONLY, run AFTER 2026-10-11-bn-v2-schema.sql and bn-exec-rpc.sql,
-- once, as the project owner. Like the rest of bn: server-only, deny-all to
-- the browser roles. Re-running fails fast on CREATE TABLE, changing nothing.

BEGIN;
SET LOCAL search_path TO bn;

-- Which invite code an account used. One row per invited account.
CREATE TABLE account_invites (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  access_code_id uuid REFERENCES tester_access_codes (id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

-- "No code? Request access": email only (no health details), deleted after 90
-- days if no code is sent (the app purges on read; see invite.functions.ts).
CREATE TABLE access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  heard_from text,
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  access_code_id uuid REFERENCES tester_access_codes (id) ON DELETE SET NULL,
  handled_at timestamptz
);
CREATE UNIQUE INDEX access_requests_email_key ON access_requests (lower(email));

ALTER TABLE bn.account_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bn.access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bn.account_invites, bn.access_requests FROM anon, authenticated;

COMMIT;

-- Verify (read only):
-- select count(*) from information_schema.tables where table_schema = 'bn'
--   and table_name in ('account_invites','access_requests');                          -- 2
