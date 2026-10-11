-- BP-DL-03 parity fix (not yet applied to any Azure server; Azure is disabled).
-- Deleting a user nulls audit_events.actor_user_id via ON DELETE SET NULL,
-- which is an UPDATE; the append-only trigger rejected every UPDATE, so
-- self-service account erasure could never succeed. Found 2026-10-11 by
-- running the app's own erasure against this schema on a local Postgres.
-- Allow exactly that de-identifying change; reject everything else.
CREATE OR REPLACE FUNCTION audit_events_reject_mutation() RETURNS trigger
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
