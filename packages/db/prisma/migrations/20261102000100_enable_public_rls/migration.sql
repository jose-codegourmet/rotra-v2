-- Server Route Handlers use the database only through a server-side runtime role. Public API roles
-- retain no table privileges; RLS is a second, explicit safeguard for every exposed-schema table.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Do not leave the allocation helper callable by implicit PUBLIC or Supabase client roles.
REVOKE EXECUTE ON FUNCTION public.rotra_next_player_sequence(uuid, date)
  FROM anon, authenticated, PUBLIC;
