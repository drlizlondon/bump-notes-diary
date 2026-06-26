CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('improvement','problem','love','question','other')),
  message text NOT NULL,
  reply_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tester_session_id text,
  is_tester boolean NOT NULL DEFAULT false,
  page_path text,
  app_version text,
  user_agent text,
  viewport text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.feedback_submissions TO anon, authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedback_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(message) BETWEEN 1 AND 5000
    AND category IN ('improvement','problem','love','question','other')
    AND (reply_email IS NULL OR length(reply_email) <= 200)
  );