-- BumpNotes (2026-10-29): let the server use the invite tables.
-- 2026-10-29-bn-invites.sql created bn.account_invites and bn.access_requests
-- after bn-exec-rpc.sql had granted service_role access to the tables that
-- existed then, so the new two had no grant: "Request access" and redeeming an
-- invite code failed with "permission denied for table". Safe to re-run.

BEGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON bn.account_invites, bn.access_requests TO service_role;
-- Tables added to bn later get the same access automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA bn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bn GRANT USAGE, SELECT ON SEQUENCES TO service_role;
COMMIT;

-- Verify (read only): 2 rows, each listing INSERT among the privileges.
-- select table_name, string_agg(privilege_type, ', ') from information_schema.role_table_grants
--  where grantee = 'service_role' and table_schema = 'bn'
--    and table_name in ('account_invites', 'access_requests') group by 1;
