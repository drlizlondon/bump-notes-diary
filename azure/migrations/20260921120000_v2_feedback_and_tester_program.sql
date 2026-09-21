-- Supabase retirement Phase 1 (BumpNotes-Supabase-retirement-plan-2026-09-21,
-- Part 1): re-home the in-app feedback button and the tester access-code
-- program onto Azure Postgres. Founder ruling: BIN the old Supabase-held
-- rows for feedback_submissions / tester_access_codes / tester_sessions /
-- feedback_responses (discard, do not migrate) -- this migration creates
-- fresh, empty Azure tables for these features to keep running on; it does
-- not import any historical Supabase data.
--
-- feedback_submissions is user-linked when the submitter is signed in
-- (requireApiAuth resolves users.id server-side; never trusted from the
-- client) and null for an anonymous tester submission. tester_access_codes /
-- tester_sessions / feedback_responses stay deliberately anonymous (no user
-- FK), mirroring the Supabase shape and the unified-erasure design note in
-- src/lib/azure/account-erasure.ts (tester-mode rows have no reliable key to
-- attribute to an account).

CREATE TABLE feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('improvement', 'problem', 'love', 'question', 'other')),
  message text NOT NULL,
  reply_email text,
  tester_session_id uuid,
  is_tester boolean NOT NULL DEFAULT false,
  page_path text,
  app_version text,
  user_agent text,
  viewport text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_submissions_user ON feedback_submissions (user_id);
CREATE INDEX feedback_submissions_created ON feedback_submissions (created_at DESC);

CREATE TABLE tester_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  use_count int NOT NULL DEFAULT 0,
  first_used_at timestamptz,
  last_used_at timestamptz,
  feedback_submitted_at timestamptz,
  created_by uuid, -- an admin's identifier; admin auth is still Supabase-side (Phase 2), so deliberately not FK'd here
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tester_access_codes_code_key ON tester_access_codes (upper(code));

CREATE TABLE tester_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid NOT NULL REFERENCES tester_access_codes (id) ON DELETE CASCADE,
  device_type text,
  browser text,
  pages_viewed_count int NOT NULL DEFAULT 1,
  feedback_started_at timestamptz,
  feedback_completed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tester_sessions_access_code ON tester_sessions (access_code_id);

CREATE TABLE feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid REFERENCES tester_access_codes (id) ON DELETE CASCADE,
  tester_session_id uuid REFERENCES tester_sessions (id) ON DELETE CASCADE,
  pregnancy_identity_answer text NOT NULL CHECK (pregnancy_identity_answer IN ('yes', 'no')),
  professional_identity_answer text NOT NULL CHECK (professional_identity_answer IN ('yes', 'no')),
  feedback_route text NOT NULL CHECK (feedback_route IN ('yes_to_both', 'yes_to_either', 'no_to_both')),
  q1_answer text,
  q2_answer text,
  q3_answer text,
  improvement_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_responses_access_code ON feedback_responses (access_code_id);
