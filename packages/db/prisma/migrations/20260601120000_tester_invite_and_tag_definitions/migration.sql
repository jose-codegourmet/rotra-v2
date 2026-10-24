-- 1. Tester accounts: relax facebook_id, add flag + CHECK
ALTER TABLE profiles ALTER COLUMN facebook_id DROP NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_tester_account bool NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD CONSTRAINT chk_identity_source
  CHECK (facebook_id IS NOT NULL OR is_tester_account = true);

CREATE INDEX IF NOT EXISTS idx_profiles_is_tester_account
  ON profiles(is_tester_account)
  WHERE is_tester_account = true;

-- 2. Tag definitions catalog
CREATE TYPE tag_assignable_by_enum AS ENUM ('any_admin', 'super_admin_only');

CREATE TABLE tag_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  label           text NOT NULL,
  description     text,
  is_active       bool NOT NULL DEFAULT true,
  assignable_by   tag_assignable_by_enum NOT NULL DEFAULT 'any_admin',
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tag_definitions_active ON tag_definitions(is_active);

INSERT INTO tag_definitions (slug, label, description, assignable_by)
VALUES (
  'tester-login-as-guest',
  'Tester Login As Guest',
  'Grants access to the /login-tester path on the client app.',
  'any_admin'
);

-- 3. Tester invitations
CREATE TABLE tester_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status      invitation_status_enum NOT NULL DEFAULT 'pending',
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tester_invitations_profile ON tester_invitations(profile_id);
CREATE INDEX idx_tester_invitations_status ON tester_invitations(status);

-- 4. Enum extensions
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tester_invited';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tester_invite_resent';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tester_invite_revoked';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tag_definition_created';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tag_definition_updated';
ALTER TYPE admin_action_enum ADD VALUE IF NOT EXISTS 'tag_definition_deactivated';

ALTER TYPE admin_action_entity_enum ADD VALUE IF NOT EXISTS 'tester_invitation';
ALTER TYPE admin_action_entity_enum ADD VALUE IF NOT EXISTS 'tag_definition';

ALTER TYPE admin_notification_type_enum ADD VALUE IF NOT EXISTS 'tester_invite_sent';
ALTER TYPE admin_notification_type_enum ADD VALUE IF NOT EXISTS 'tag_definition_changed';

-- 5. handle_new_user: support tester email invites (null facebook_id + is_tester_account)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_tester boolean := false;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'is_tester', '') IN ('true', 't', '1') THEN
    is_tester := true;
  ELSIF (NEW.raw_user_meta_data->'is_tester')::text = 'true' THEN
    is_tester := true;
  END IF;

  INSERT INTO profiles (id, facebook_id, name, avatar_url, email, is_tester_account)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'provider_id', ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', '')
    ),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    is_tester
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
