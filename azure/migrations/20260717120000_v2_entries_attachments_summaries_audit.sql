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
