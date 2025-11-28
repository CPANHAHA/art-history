CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reports (
  id text PRIMARY KEY,
  project_name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  ai_rating numeric,
  twitter_handle text,
  ticker text,
  launchpad text,
  labels text,
  basic_info text,
  team_background text,
  dev_activity_rating numeric,
  dev_activity_note text,
  token_mechanism text,
  progress_plan text,
  business_potential text,
  competitors text,
  focus_points jsonb,
  sources jsonb,
  generated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.last_edits (
  report_id text PRIMARY KEY,
  snapshot jsonb NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.categories(id,name)
SELECT 'qita','其他'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE id='qita');

INSERT INTO public.categories(id,name)
SELECT 'icm','ICM'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE id='icm');

INSERT INTO public.categories(id,name)
SELECT 'x402','X402'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE id='x402');

