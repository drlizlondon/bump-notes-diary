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
