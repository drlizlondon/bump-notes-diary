-- BumpNotes BP-DL-04a: service-role-only RPC so the app can reach schema bn
-- over HTTPS when Lovable Cloud exposes no Postgres connection string.
-- Spec: NightMode specs/BUMPNOTES-DATA-LAYER-2026-10-11.md (BP-DL-04a).

BEGIN;

GRANT USAGE ON SCHEMA bn TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bn TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA bn TO service_role;

-- 1. Primary function: (params text[], sql text)
CREATE OR REPLACE FUNCTION public.bn_exec(params text[], sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = bn, pg_temp
AS $fn$
DECLARE
  parts text[];
  idx int[];
  s text;
  i int;
  n_params int := coalesce(array_length(params, 1), 0);
  rows_json jsonb;
  rc bigint;
BEGIN
  IF coalesce(auth.role(), '') != 'service_role' AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'permission denied for bn_exec: service_role required' USING ERRCODE = '42501';
  END IF;

  parts := regexp_split_to_array(sql, '\$[0-9]+');
  SELECT coalesce(array_agg(m[1]::int ORDER BY ord), '{}')
    INTO idx
    FROM regexp_matches(sql, '\$([0-9]+)', 'g') WITH ORDINALITY AS t(m, ord);

  s := parts[1];
  FOR i IN 1 .. coalesce(array_length(idx, 1), 0) LOOP
    IF idx[i] < 1 OR idx[i] > n_params THEN
      RAISE EXCEPTION 'bn_exec: missing parameter $%', idx[i] USING ERRCODE = '22023';
    END IF;
    s := s || quote_nullable(params[idx[i]]) || parts[i + 1];
  END LOOP;

  IF sql ~* '^\s*(select|with)\M' OR sql ~* '\mreturning\M' THEN
    EXECUTE 'WITH q AS (' || s || ') SELECT coalesce(jsonb_agg(to_jsonb(q)), ''[]''::jsonb), count(*) FROM q'
      INTO rows_json, rc;
  ELSE
    EXECUTE s;
    GET DIAGNOSTICS rc = ROW_COUNT;
    rows_json := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object('rows', rows_json, 'rowCount', rc);
END;
$fn$;

-- 2. Overload: (sql text, params text[])
CREATE OR REPLACE FUNCTION public.bn_exec(sql text, params text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = bn, pg_temp
AS $fn$
BEGIN
  RETURN public.bn_exec(params, sql);
END;
$fn$;

-- 3. Overload: (params jsonb, sql text)
CREATE OR REPLACE FUNCTION public.bn_exec(params jsonb, sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = bn, pg_temp
AS $fn$
DECLARE
  arr text[];
BEGIN
  IF jsonb_typeof(params) = 'array' THEN
    SELECT coalesce(array_agg(value), '{}')
      INTO arr
      FROM jsonb_array_elements_text(params) AS t(value);
  ELSE
    arr := '{}';
  END IF;
  RETURN public.bn_exec(arr, sql);
END;
$fn$;

-- 4. Overload: (sql text, params jsonb)
CREATE OR REPLACE FUNCTION public.bn_exec(sql text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = bn, pg_temp
AS $fn$
BEGIN
  RETURN public.bn_exec(params, sql);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.bn_exec(params text[], sql text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bn_exec(sql text, params text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bn_exec(params jsonb, sql text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bn_exec(sql text, params jsonb) TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
