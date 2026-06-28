
-- ============ ROLES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ TESTER ACCESS CODES ============
CREATE TABLE IF NOT EXISTS public.tester_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_used_at timestamptz,
  last_used_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  feedback_submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tester_access_codes_code_lower_idx ON public.tester_access_codes (lower(code));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tester_access_codes TO authenticated;
GRANT ALL ON public.tester_access_codes TO service_role;
ALTER TABLE public.tester_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage codes" ON public.tester_access_codes;
CREATE POLICY "Admins manage codes" ON public.tester_access_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TESTER SESSIONS ============
CREATE TABLE IF NOT EXISTS public.tester_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid NOT NULL REFERENCES public.tester_access_codes(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  device_type text,
  browser text,
  pages_viewed_count integer NOT NULL DEFAULT 1,
  feedback_started_at timestamptz,
  feedback_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tester_sessions_code_idx ON public.tester_sessions (access_code_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tester_sessions TO authenticated;
GRANT ALL ON public.tester_sessions TO service_role;
ALTER TABLE public.tester_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read sessions" ON public.tester_sessions;
CREATE POLICY "Admins read sessions" ON public.tester_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ FEEDBACK RESPONSES ============
CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id uuid REFERENCES public.tester_access_codes(id) ON DELETE SET NULL,
  tester_session_id uuid REFERENCES public.tester_sessions(id) ON DELETE SET NULL,
  pregnancy_identity_answer text NOT NULL CHECK (pregnancy_identity_answer IN ('yes','no')),
  professional_identity_answer text NOT NULL CHECK (professional_identity_answer IN ('yes','no')),
  feedback_route text NOT NULL CHECK (feedback_route IN ('yes_to_both','yes_to_either','no_to_both')),
  q1_answer text,
  q2_answer text,
  q3_answer text,
  improvement_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_responses_code_idx ON public.feedback_responses (access_code_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_responses TO authenticated;
GRANT ALL ON public.feedback_responses TO service_role;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read feedback" ON public.feedback_responses;
CREATE POLICY "Admins read feedback" ON public.feedback_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ UPDATED_AT TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS tester_access_codes_touch ON public.tester_access_codes;
CREATE TRIGGER tester_access_codes_touch BEFORE UPDATE ON public.tester_access_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
