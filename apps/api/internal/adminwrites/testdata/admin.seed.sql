-- Fictional admins, feature flags and audit events for the Admin writes characterization (feature flags first; the
-- other Admin write groups add their own rows below). Applied on top of the Prisma migrations. Accounts are linked
-- with auth_provider 'supabase' (the TypeScript side); the Go test relinks them to its own sign-in identities.
-- Foreign key checks and triggers are off for this load.
-- The file is also the reset between cases, so it removes what it inserts. Edit by hand and rerun
-- apps/api/testdata/tools/capture-writes-admin.test.mjs.
BEGIN;
SET LOCAL session_replication_role = replica;

DELETE FROM player_notifications;
DELETE FROM admin_audit_events;
DELETE FROM feature_flags;
DELETE FROM admin_accounts;

-- ---- admins: two active, one that left ----
INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now()),
  ('ad000000-0000-4000-8000-000000000002', 'supabase', 'ad100000-0000-4000-8000-000000000002', true, 'Second Admin', now()),
  ('ad000000-0000-4000-8000-000000000003', 'supabase', 'ad100000-0000-4000-8000-000000000003', false, 'Former Admin', now());

-- ---- feature flags: the one the product ships with (no admin yet), one an admin added and another changed, and
--      one with an empty description, no admins and a revision above 2^53 ----
INSERT INTO feature_flags (key, name, description, value, created_by_admin_id, updated_by_admin_id, created_at, updated_at, revision) VALUES
  ('player_google_sign_in', 'Google sign-in for players', 'Players sign in and register with Continue with Google. While off, the Player app uses email and password as before.', false, NULL, NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1),
  ('sessions_beta', 'Sessions beta', 'Lets clubs try the new session page.', true, 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', TIMESTAMPTZ '2026-11-05 09:30:00+00', 4),
  ('night_mode', 'Night mode', '', false, NULL, NULL, TIMESTAMPTZ '2026-11-02 08:00:00.123+00', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', 9007199254740993),
  ('cafe_mode', 'Café mode', 'Shows the café menu on the session page.', false, 'ad000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-03 08:00:00+00', TIMESTAMPTZ '2026-11-03 08:00:00+00', 1);

-- ---- audit events: one for a flag, one for a club (a command id that a flag add may be retried with) ----
INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'flag.created', 'feature_flag', 'sessions_beta', 'c0000000-0000-4000-8000-0000000000a1', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', '{"value": true}'),
  ('a0000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', 'club.created', 'club', 'd0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000b2', TIMESTAMPTZ '2026-11-03 08:00:00+00', NULL);

COMMIT;
