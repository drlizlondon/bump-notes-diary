-- BP-DL-02: BumpNotes V2 data schema on the beta Supabase project (Lovable
-- Cloud project "MVP", ref zsmusjlipihurchkmbwk). Founder ruling 2026-10-11:
-- Supabase is the beta data store; start from an empty schema.
--
-- ADDITIVE ONLY: creates schema bn, the 16 V2 tables (the three files in
-- azure/migrations, unchanged, run inside bn), deny-all RLS for the browser
-- roles, and four private Storage buckets. It drops, truncates and deletes
-- nothing. The legacy public.* tables are untouched (five share V2 names,
-- which is why V2 lives in its own schema).
--
-- The app reaches these tables only from the server (getDb with DB_SCHEMA=bn),
-- never through the browser key, so RLS here is defence in depth: anon and
-- authenticated get no access at all. Do NOT add bn to the exposed API schemas.
--
-- Apply once, as the project owner (Lovable Cloud SQL / Supabase SQL editor).
-- Re-running fails fast on CREATE TABLE, inside the transaction, changing nothing.

BEGIN;
CREATE SCHEMA bn;
SET LOCAL search_path TO bn;

-- ===== azure/migrations/20260712120000_v2_core_identity_and_about_me.sql (verbatim) =====
-- AZURE 2.3 — Migration 001: identity, person-level (About Me), and pregnancy tables.
-- Shapes per PLAN §5.2/§5.3 with user_id → internal users.id (AZURE §1.3);
-- authorization is API-level (AZURE §2) — deliberately no RLS here.

-- The Azure database starts empty: create the touch-trigger function first.
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Identity. Entra authenticates the person; this table owns identity (AZURE §1.3).
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_identity_id text UNIQUE,          -- Entra object id; linked in Phase I
  supabase_user_id uuid UNIQUE,              -- bridge window only (AZURE 2.6); kept as historical record (I.4)
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
-- Phase I links accounts by verified email; uniqueness must be case-insensitive.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Person-level profile: existing Supabase profiles columns + PLAN §5.2 V2 additions.
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name text,
  is_tester boolean NOT NULL DEFAULT false,
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  preferred_name text,
  date_of_birth date,
  health_identifier text,
  health_identifier_label text NOT NULL DEFAULT 'NHS number',  -- per-user label, never a hardcoded concept (ARCH §12.1)
  photo_path text,                                             -- profile-images container blob path
  v2_notice_dismissed_at timestamptz,                          -- one-time migrated-user card (ARCH §11.6)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pregnancy is a first-class episode entity (ARCH §5.2).
CREATE TABLE pregnancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  edd date NOT NULL,
  lmp date,
  nickname text,
  birth_place text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pregnancies_one_active_per_user
  ON pregnancies (user_id) WHERE status = 'active';
CREATE TRIGGER pregnancies_updated_at BEFORE UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One home for people (ARCH §3.3); person-level, not pregnancy-scoped.
CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (
    role IN ('midwife', 'gp', 'consultant', 'sonographer', 'birth_partner', 'hospital', 'other')
  ),
  contact_details text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX people_user_active ON people (user_id) WHERE archived_at IS NULL;
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Current-state health facts (ARCH §3.2 card 2): free-text chips, not coded fields.
CREATE TABLE health_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('condition', 'allergy', 'medication', 'operation')),
  text text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX health_items_user ON health_items (user_id);
CREATE TRIGGER health_items_updated_at BEFORE UPDATE ON health_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Previous pregnancies (ARCH §3.4). Counts live on one header row per user
-- (PLAN §5.3 DECISION); prompt-tagged rows hold her words.
CREATE TABLE previous_pregnancy_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  is_header boolean NOT NULL DEFAULT false,
  pregnancy_count int,
  birth_count int,
  prompt_tag text,
  text text,
  sort int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_header OR (prompt_tag IS NULL AND text IS NULL)),
  CHECK (is_header OR (pregnancy_count IS NULL AND birth_count IS NULL))
);
CREATE UNIQUE INDEX previous_pregnancy_notes_one_header
  ON previous_pregnancy_notes (user_id) WHERE is_header;
CREATE INDEX previous_pregnancy_notes_user ON previous_pregnancy_notes (user_id);
CREATE TRIGGER previous_pregnancy_notes_updated_at BEFORE UPDATE ON previous_pregnancy_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- My Preferences (ARCH §3.5): singleton per user; ordered free-text items.
CREATE TABLE preferences (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  anything_else text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER preferences_updated_at BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== azure/migrations/20260717120000_v2_entries_attachments_summaries_audit.sql (verbatim) =====
-- AZURE 2.4 — Migration 002: entries, attachments, summaries (+ immutability
-- trigger), audit_events, bumpnotes_state_archive. Shapes per PLAN §5.3/§5.6
-- with AZURE §2 authoring notes; authorization stays API-level (no RLS here).

-- Append-only entries with soft delete (PLAN §5.3). Denormalized user_id
-- (AZURE 2.4 note c) so API authorization scopes without joins.
CREATE TABLE entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pregnancy_id uuid NOT NULL REFERENCES pregnancies (id) ON DELETE CASCADE,
  person_id uuid REFERENCES people (id) ON DELETE SET NULL,
  type text NOT NULL CHECK (
    type IN ('symptom', 'question', 'appointment', 'measurement', 'upload', 'note', 'feeling')
  ),
  type_version int NOT NULL DEFAULT 2,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  gestation_weeks int,
  gestation_days int,
  visibility text NOT NULL CHECK (visibility IN ('private', 'personal', 'shareable')),
  payload jsonb NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_pregnancy_occurred ON entries (pregnancy_id, occurred_at DESC);
CREATE INDEX entries_pregnancy_type_active ON entries (pregnancy_id, type) WHERE deleted_at IS NULL;
CREATE TRIGGER entries_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Binary lives in Blob Storage only; this row is metadata (AZURE §2 containers).
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
  container text NOT NULL CHECK (container = 'user-uploads'),
  blob_path text NOT NULL,
  mime text,
  size_bytes int,
  checksum text,
  caption text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attachments_entry ON attachments (entry_id);
CREATE TRIGGER attachments_updated_at BEFORE UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Frozen document snapshots (ARCH §5.4). Immutable except pdf_path/shared —
-- Phase 7's outbox retry sets pdf_path after generation; sharing flips shared.
CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pregnancy_id uuid NOT NULL REFERENCES pregnancies (id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'standard',
  layout_version text NOT NULL DEFAULT 'summary_layout_v2',
  range_start date,
  range_end date,
  snapshot jsonb NOT NULL,
  manifest jsonb NOT NULL,
  pdf_path text,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX summaries_pregnancy_created ON summaries (pregnancy_id, created_at DESC);

CREATE FUNCTION summaries_enforce_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.manifest IS DISTINCT FROM OLD.manifest
     OR NEW.range_start IS DISTINCT FROM OLD.range_start
     OR NEW.range_end IS DISTINCT FROM OLD.range_end
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.layout_version IS DISTINCT FROM OLD.layout_version
     OR NEW.pregnancy_id IS DISTINCT FROM OLD.pregnancy_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'summaries: frozen fields cannot be modified (ARCH §5.4); only pdf_path and shared may change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER summaries_immutability BEFORE UPDATE ON summaries
  FOR EACH ROW EXECUTE FUNCTION summaries_enforce_immutability();

-- Append-only audit trail (AZURE §2 last DECISION): actor, action, target,
-- timestamp — no entry content. No updated_at; UPDATE/DELETE are rejected.
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_actor ON audit_events (actor_user_id, created_at DESC);

CREATE FUNCTION audit_events_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP;
END;
$$;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_reject_mutation();
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_reject_mutation();

-- Legacy blob archive (PLAN §5.2/§5.8 semantics), moved to Azure at cutover.
-- No FK to users: the 3.8 bulk copy includes users who may never authenticate
-- on Azure (AZURE 2.4 note b) — keyed by the Supabase user id instead.
CREATE TABLE bumpnotes_state_archive (
  supabase_user_id uuid PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  migrated_at timestamptz,
  migration_checksum jsonb
);

-- ===== azure/migrations/20260921120000_v2_feedback_and_tester_program.sql (verbatim) =====
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

-- ===== Hardening =====
-- Erasure fix (found 2026-10-11 running the app's own erasure against this
-- schema): deleting a user nulls audit_events.actor_user_id via the foreign
-- key's ON DELETE SET NULL, which is an UPDATE, and the append-only trigger
-- rejected every UPDATE, so self-service account deletion could never
-- succeed. Allow exactly that de-identifying change; reject everything else.
CREATE OR REPLACE FUNCTION bn.audit_events_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.actor_user_id IS NOT NULL
     AND NEW.actor_user_id IS NULL
     AND (to_jsonb(NEW) - 'actor_user_id') = (to_jsonb(OLD) - 'actor_user_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP;
END;
$$;
ALTER FUNCTION bn.set_updated_at() SET search_path = bn;
ALTER FUNCTION bn.summaries_enforce_immutability() SET search_path = bn;
ALTER FUNCTION bn.audit_events_reject_mutation() SET search_path = bn;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','profiles','pregnancies','people','health_items',
    'previous_pregnancy_notes','preferences','feedback_submissions','tester_access_codes',
    'tester_sessions','feedback_responses','entries','attachments','summaries',
    'audit_events','bumpnotes_state_archive']
  LOOP
    EXECUTE format('ALTER TABLE bn.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

REVOKE ALL ON SCHEMA bn FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA bn FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA bn REVOKE ALL ON TABLES FROM anon, authenticated;

-- ===== Private upload buckets (service role only; no storage policies) =====
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('user-uploads', 'user-uploads', false, 10485760),
  ('profile-images', 'profile-images', false, 10485760),
  ('generated-summaries', 'generated-summaries', false, 10485760),
  ('exports', 'exports', false, 10485760)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ===== Verify after applying (read only) =====
-- select count(*) from information_schema.tables where table_schema = 'bn';            -- 16
-- select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'bn' and c.relkind = 'r' and c.relrowsecurity;                  -- 16
-- select id, public from storage.buckets where id in
--   ('user-uploads','profile-images','generated-summaries','exports');                  -- 4 rows, all false
