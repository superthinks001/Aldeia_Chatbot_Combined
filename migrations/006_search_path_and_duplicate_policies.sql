-- This script recreates all the existing functions, but adds the 'SET search_path'
-- clause to ensure that they always run with the correct search path

CREATE OR REPLACE FUNCTION public._auto_rls_policies_ddl()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SET search_path = pg_catalog, public
AS $function$
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
$function$
;


CREATE OR REPLACE FUNCTION public._ensure_allow_all_policies(rel regclass)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = pg_catalog, public
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.can_user_send_message(p_user_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_messages_used INTEGER;
  v_messages_limit INTEGER;
BEGIN
  -- Get current usage
  SELECT messages_used, messages_limit
  INTO v_messages_used, v_messages_limit
  FROM usage_quotas
  WHERE user_id = p_user_id
    AND period_start <= CURRENT_DATE
    AND period_end > CURRENT_DATE;

  -- If no record found, assume free tier with 10 message limit
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Unlimited
  IF v_messages_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Check quota
  RETURN v_messages_used < v_messages_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_message_usage(p_user_id integer, p_period_start timestamp without time zone, p_period_end timestamp without time zone, p_messages_limit integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = pg_catalog, public
AS $function$
BEGIN
  INSERT INTO usage_quotas (
    user_id,
    period_start,
    period_end,
    messages_used,
    messages_limit
  )
  VALUES (
    p_user_id,
    p_period_start::DATE,
    p_period_end::DATE,
    1,
    p_messages_limit
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    messages_used = usage_quotas.messages_used + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = pg_catalog, public
AS $function$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$function$
;


-- This removes policies whose names start with 'conversation' from the
-- conversation_messages table. These are duplicate policies that were created by mistake
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_messages'
      AND policyname ILIKE 'conversation%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_messages;', r.policyname);
  END LOOP;
END;
$$ LANGUAGE plpgsql;