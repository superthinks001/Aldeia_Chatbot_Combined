-- =========================
-- CONFIG: set your schema
-- =========================
DO $cfg$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'public'
  ) THEN
    RAISE EXCEPTION 'Schema % does not exist', 'public';
  END IF;
END
$cfg$;

-- =========================================================
-- Helper: create/ensure permissive policies on a given table
-- =========================================================
CREATE OR REPLACE FUNCTION public._ensure_allow_all_policies(rel regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  fqname text := (SELECT quote_ident(n.nspname) || '.' || quote_ident(c.relname)
                  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.oid = rel);
BEGIN
  -- Enable RLS (idempotent)
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', fqname);

  -- SELECT policy
  BEGIN
    EXECUTE format($sql$
      CREATE POLICY "allow all select"
      ON %s
      FOR SELECT
      TO authenticated
      USING (true);
    $sql$, fqname);
  EXCEPTION WHEN duplicate_object THEN
    -- ignore if exists
    NULL;
  END;

  -- INSERT policy
  BEGIN
    EXECUTE format($sql$
      CREATE POLICY "allow all insert"
      ON %s
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    $sql$, fqname);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- UPDATE policy
  BEGIN
    EXECUTE format($sql$
      CREATE POLICY "allow all update"
      ON %s
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    $sql$, fqname);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- DELETE policy
  BEGIN
    EXECUTE format($sql$
      CREATE POLICY "allow all delete"
      ON %s
      FOR DELETE
      TO authenticated
      USING (true);
    $sql$, fqname);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;

-- =========================================================
-- 1) Apply to all EXISTING base tables in the target schema
-- =========================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r' -- regular tables only
  LOOP
    PERFORM public._ensure_allow_all_policies(r.rel);
  END LOOP;
END
$$;

-- =========================================================
-- 2) Event trigger to apply to any NEW tables created later
-- =========================================================

-- Function that runs after DDL and applies RLS/policies to new tables
CREATE OR REPLACE FUNCTION public._auto_rls_policies_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE','CREATE TABLE AS')
  LOOP
    -- Only act on tables in our target schema
    IF cmd.object_type = 'table'
       AND split_part(cmd.object_identity, '.', 1) = 'public' THEN
      -- cmd.object_identity is already schema-qualified, may include quotes
      EXECUTE format('SELECT public._ensure_allow_all_policies(%s::regclass);',
                     quote_literal(cmd.object_identity));
    END IF;
  END LOOP;
END
$$;

-- Create the event trigger (fires after CREATE TABLE)
DROP EVENT TRIGGER IF EXISTS auto_rls_policies_on_create;
CREATE EVENT TRIGGER auto_rls_policies_on_create
  ON ddl_command_end
  EXECUTE PROCEDURE public._auto_rls_policies_ddl();
