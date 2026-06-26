DROP POLICY IF EXISTS "Users can read their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can update their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can delete their own state" ON public.bumpnotes_state;
DROP POLICY IF EXISTS "Users can insert their own state" ON public.bumpnotes_state;

CREATE POLICY "Users can read their own state" ON public.bumpnotes_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users can insert their own state" ON public.bumpnotes_state
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users can update their own state" ON public.bumpnotes_state
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users can delete their own state" ON public.bumpnotes_state
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users delete own profile" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  WITH CHECK (auth.uid() = id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
CREATE POLICY "Users delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);