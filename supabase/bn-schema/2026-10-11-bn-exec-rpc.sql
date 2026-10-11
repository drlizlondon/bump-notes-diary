-- BumpNotes BP-DL-04a: service-role-only RPC so the app can reach schema bn
-- over HTTPS when Lovable Cloud exposes no Postgres connection string.
-- Spec: NightMode specs/BUMPNOTES-DATA-LAYER-2026-10-11.md (BP-DL-04a).
--
-- Apply AFTER 2026-10-11-bn-v2-schema.sql, once, via Lovable Cloud.
-- Additive only. Plain CREATE (no OR REPLACE): a second run fails fast and
-- changes nothing.
--
-- Privilege: bn_exec runs arbitrary SQL, but only service_role may call it,
-- and the service-role key already has full database access. anon and
-- authenticated get 42501.

BEGIN;

GRANT USAGE ON SCHEMA bn TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bn TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA bn TO service_role;

CREATE FUNCTION public.bn_exec(sql text, params text[] DEFAULT '{}')
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
  -- Single pass: substituted values are never re-scanned for $n.
  -- Row-returning is judged on the static SQL text, never on user values.
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

REVOKE ALL ON FUNCTION public.bn_exec(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bn_exec(text, text[]) TO service_role;

COMMIT;

-- Verify (read-only):
-- SELECT has_function_privilege('anon', 'public.bn_exec(text, text[])', 'EXECUTE');          -- false
-- SELECT has_function_privilege('authenticated', 'public.bn_exec(text, text[])', 'EXECUTE'); -- false
-- SELECT has_function_privilege('service_role', 'public.bn_exec(text, text[])', 'EXECUTE');  -- true
