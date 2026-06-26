-- bumpnotes_state
DROP POLICY IF EXISTS "Users can read their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can update their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can delete their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can insert their own state" ON public.bumpnotes_state;

CREATE POLICY "Users can read their own state" ON public.bumpnotes_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own state" ON public.bumpnotes_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own state" ON public.bumpnotes_state
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own state" ON public.bumpnotes_state
  FOR DELETE TO authenticated USING (auth.uid() = user_id);