-- Players can now sign up with email + password and have no Facebook identity at all.
-- Identity is proven by the Supabase auth.users row, not by facebook_id.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_identity_source;

-- handle_new_user must survive a signup that carries no Facebook metadata.
-- profiles.name is NOT NULL, so it needs a deterministic fallback; the onboarding
-- wizard overwrites it on step 1.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_tester boolean := false;
  resolved_name text;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'is_tester', '') IN ('true', 't', '1') THEN
    is_tester := true;
  ELSIF (NEW.raw_user_meta_data->'is_tester')::text = 'true' THEN
    is_tester := true;
  END IF;

  resolved_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Player'
  );

  INSERT INTO profiles (id, facebook_id, name, avatar_url, email, is_tester_account)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'provider_id', ''),
    resolved_name,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    is_tester
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
