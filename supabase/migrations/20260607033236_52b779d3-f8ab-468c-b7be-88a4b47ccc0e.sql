CREATE TABLE public.bumpnotes_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bumpnotes_state TO authenticated;
GRANT ALL ON public.bumpnotes_state TO service_role;

ALTER TABLE public.bumpnotes_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own state"
  ON public.bumpnotes_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own state"
  ON public.bumpnotes_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own state"
  ON public.bumpnotes_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own state"
  ON public.bumpnotes_state FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bumpnotes_state_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER bumpnotes_state_updated_at
  BEFORE UPDATE ON public.bumpnotes_state
  FOR EACH ROW EXECUTE FUNCTION public.bumpnotes_state_touch_updated_at();