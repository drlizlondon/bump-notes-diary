-- BumpNotes (2026-10-29): leave exactly ONE public.bn_exec.
-- 2026-10-11-bn-exec-rpc.sql created four overloads that all take arguments
-- named (sql, params). The app calls POST /rest/v1/rpc/bn_exec with
-- {"sql": ..., "params": [...]}, and PostgREST matches by argument name, so it
-- refused every call with PGRST203 ("Could not choose the best candidate
-- function"), and /api/health reported the database down.
-- Keeps the real implementation, bn_exec(params text[], sql text); PostgREST
-- turns the JSON array into text[]. Safe to re-run.

BEGIN;
DROP FUNCTION IF EXISTS public.bn_exec(sql text, params text[]);
DROP FUNCTION IF EXISTS public.bn_exec(params jsonb, sql text);
DROP FUNCTION IF EXISTS public.bn_exec(sql text, params jsonb);
REVOKE EXECUTE ON FUNCTION public.bn_exec(params text[], sql text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bn_exec(params text[], sql text) TO service_role;
COMMIT;

-- Make PostgREST see the change now.
NOTIFY pgrst, 'reload schema';

-- Verify (read only): one row, "params text[], sql text".
-- select pg_get_function_identity_arguments(p.oid) from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'bn_exec';
