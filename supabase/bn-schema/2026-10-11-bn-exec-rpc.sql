-- BumpNotes BP-DL-04a: service-role-only RPC so the app can reach schema bn
-- over HTTPS when Lovable Cloud exposes no Postgres connection string.
-- Spec: NightMode specs/BUMPNOTES-DATA-LAYER-2026-10-11.md (BP-DL-04a).
--
-- Target project: zsmusjlipihurchkmbwk (the one live uses). Apply AFTER
-- 2026-10-11-bn-v2-schema.sql. Only service_role may execute bn_exec: the
-- REVOKEs undo Supabase's default EXECUTE grant to anon/authenticated, and the
-- in-function role check stays as a second line of defence.

BEGIN;

GRANT USAGE ON SCHEMA bn TO service_role;
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

-- Overloads 2-4 were removed on 2026-10-29: they shared the argument names
-- (sql, params), so PostgREST refused every call (PGRST203). One function only;
-- see 2026-10-29-bn-exec-one-function.sql.

REVOKE EXECUTE ON FUNCTION public.bn_exec(params text[], sql text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bn_exec(params text[], sql text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
