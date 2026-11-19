-- Fictional players, clubs and notifications for the signed-in Player reads characterization (me/account,
-- me/clubs, me/notifications, me/verification, account/contact-change). Applied on top of the Prisma
-- migrations. Accounts are linked with auth_provider 'supabase' (the TypeScript side); the Go test relinks
-- them to its own sign-in identities. Foreign key checks are off for this load.
BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now());

INSERT INTO clubs (id, name, name_key, logo_ref, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at) VALUES
  ('e5000000-0000-4000-8000-000000000001', 'Smash Club', 'smash-club', 'https://example.test/smash.png', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere', 'free', 'e6000000-0000-4000-8000-000000000001', now()),
  ('e5000000-0000-4000-8000-000000000002', '  😀 Birdie Club', 'birdie-club', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere', 'free', 'e6000000-0000-4000-8000-000000000002', now()),
  ('e5000000-0000-4000-8000-000000000003', 'ßeta  Net Ninjas', 'beta-ninjas', 'https://example.test/ninjas.png', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere', 'free', 'e6000000-0000-4000-8000-000000000003', now()),
  ('e5000000-0000-4000-8000-000000000004', 'solo', 'solo', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere', 'free', 'e6000000-0000-4000-8000-000000000004', now());

INSERT INTO players (id, full_name, nickname, profile_visibility, hide_phone_from_clubs, hidden_from_directory, verification_override, verification_override_by, verification_override_at, profile_state, revision, updated_at) VALUES
  ('d2000000-0000-4000-8000-000000000001', 'Alice Reyes', 'Ace', 'public', false, false, NULL, NULL, NULL, 'claimed', 3, now()),
  ('d2000000-0000-4000-8000-000000000002', 'Bob Santos', NULL, 'private', true, false, 'verified', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 00:00:00+00', 'claimed', 12, now()),
  ('d2000000-0000-4000-8000-000000000003', 'Carla Dizon', 'CD', 'always_private', true, true, NULL, NULL, NULL, 'claimed', 1, now()),
  ('d2000000-0000-4000-8000-000000000004', 'Dan Uy', NULL, 'public', false, false, NULL, NULL, NULL, 'claimed', 1, now()),
  ('d2000000-0000-4000-8000-000000000005', 'Eve Alcala', 'Ali', 'public', false, false, NULL, NULL, NULL, 'claimed', 9007199254740993, now());

INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('d2000000-0000-4000-8000-000000000001', '+639175550001', 'alice@example.test', now()),
  ('d2000000-0000-4000-8000-000000000002', '+639175550002', 'bob@example.test', now()),
  ('d2000000-0000-4000-8000-000000000003', '+639175550003', 'carla@example.test', now()),
  ('d2000000-0000-4000-8000-000000000004', '+639175550004', 'dan@example.test', now()),
  ('d2000000-0000-4000-8000-000000000005', '+639175550005', 'eve@example.test', now());

INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, verification_reminder_read_at, updated_at) VALUES
  ('d2000000-0000-4000-8000-000000000001', 'supabase', 'f2000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'alice@example.test', TIMESTAMPTZ '2026-11-18 08:30:15.123+00', NULL, now()),
  ('d2000000-0000-4000-8000-000000000002', 'supabase', 'f2000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, NULL, NULL, NULL, now()),
  ('d2000000-0000-4000-8000-000000000003', 'supabase', 'f2000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'carla@gmail.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', TIMESTAMPTZ '2026-11-12 09:00:00+00', now()),
  ('d2000000-0000-4000-8000-000000000004', 'supabase', 'f2000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, NULL, NULL, NULL, now()),
  ('d2000000-0000-4000-8000-000000000005', 'supabase', 'f2000000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'eve.alt@gmail.test', TIMESTAMPTZ '2026-11-11 00:00:00+00', NULL, now());

INSERT INTO club_players (id, club_id, player_id, display_name, added_at, removed_at, updated_at) VALUES
  ('e7000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'Alice Reyes', TIMESTAMPTZ '2026-01-02 00:00:00+00', NULL, now()),
  ('e7000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'Alice Reyes', TIMESTAMPTZ '2026-01-01 00:00:00+00', NULL, now()),
  ('e7000000-0000-4000-8000-000000000003', 'e5000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', 'Alice Reyes', TIMESTAMPTZ '2026-01-01 00:00:00+00', NULL, now()),
  ('e7000000-0000-4000-8000-000000000004', 'e5000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000001', 'Alice Reyes', TIMESTAMPTZ '2026-01-03 00:00:00+00', TIMESTAMPTZ '2026-02-01 00:00:00+00', now()),
  ('e7000000-0000-4000-8000-000000000005', 'e5000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000004', 'Dan Uy', TIMESTAMPTZ '2026-03-01 00:00:00+00', NULL, now()),
  ('e7000000-0000-4000-8000-000000000006', 'e5000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000004', 'Dan Uy', TIMESTAMPTZ '2026-03-01 00:00:00+00', NULL, now());

-- A confirmed join request makes the club read as a session link. A pending one, another player's request and a
-- request for another saved player do not.
INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, status, requested_at, decided_at, club_player_id, player_id, updated_at) VALUES
  ('e9000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000002', 'e8000000-0000-4000-8000-000000000001', 'Alice Reyes', 'unsure', 'confirmed', TIMESTAMPTZ '2026-01-01 00:00:00+00', TIMESTAMPTZ '2026-01-01 01:00:00+00', 'e7000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', now()),
  ('e9000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000002', 'e8000000-0000-4000-8000-000000000001', 'Dan Uy', 'unsure', 'pending', TIMESTAMPTZ '2026-01-01 00:00:00+00', NULL, 'e7000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000004', now());

INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, submitted_by_admin_id, reviewed_by_admin_id, reviewed_at, approved_at, rejected_at, superseded_at, provider_operation_ref, provider_applied_at, applied_at, failure_code, source_command_id, updated_at) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001', 'phone', 'app', '+639175559999', '+639175550001', 1, 'applied', TIMESTAMPTZ '2026-11-01 00:00:00.5+00', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, NULL, 'c3000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', TIMESTAMPTZ '2026-11-02 00:00:00+00', NULL, 'c2000000-0000-4000-8000-000000000001', now()),
  ('c1000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'email', 'owner', 'alice.new@example.test', 'alice@example.test', 1, 'approved', TIMESTAMPTZ '2026-11-10 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, NULL, 'c3000000-0000-4000-8000-000000000002', NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000002', now()),
  ('c1000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000001', 'email', 'app', 'alice.older@example.test', NULL, 1, 'rejected', TIMESTAMPTZ '2026-10-10 00:00:00+00', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, TIMESTAMPTZ '2026-10-11 00:00:00+00', NULL, NULL, NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000003', now()),
  ('c1000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000003', 'email', 'app', 'carla@gmail.test', 'carla@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-12 00:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000004', now()),
  ('c1000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000003', 'phone', 'owner', '+639175558888', '+639175550003', 1, 'failed', TIMESTAMPTZ '2026-11-13 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, NULL, 'c3000000-0000-4000-8000-000000000005', NULL, NULL, 'provider_conflict', 'c2000000-0000-4000-8000-000000000005', now()),
  ('c1000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000005', 'email', 'app', 'eve.alt@gmail.test', 'eve@example.test', 1, 'rejected', TIMESTAMPTZ '2026-11-12 00:00:00+00', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, TIMESTAMPTZ '2026-11-12 12:00:00+00', NULL, NULL, NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000006', now()),
  ('c1000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000005', 'phone', 'app', '+639175557777', '+639175550005', 1, 'applying', TIMESTAMPTZ '2026-11-12 00:00:00+00', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, NULL, 'c3000000-0000-4000-8000-000000000007', NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000007', now()),
  ('c1000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000005', 'phone', 'app', '+639175556666', '+639175550005', 1, 'rejected', TIMESTAMPTZ '2026-11-12 00:00:00+00', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 00:00:00+00', NULL, TIMESTAMPTZ '2026-11-12 13:00:00+00', TIMESTAMPTZ '2026-11-12 06:00:00+00', NULL, NULL, NULL, NULL, 'c2000000-0000-4000-8000-000000000008', now());

-- Notifications. Dan: inside the 90-day window (2026-08-21 04:00 UTC), at its edge, outside it, read and unread,
-- a club notification for a club he is in, one for a club he is not in, one with a target that is no club ID.
INSERT INTO player_notifications (id, player_id, kind, title, body, target, created_at, read_at) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000004', 'club', 'Smash Club posted', 'New session', '/clubs/e5000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-18 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000004', 'club', 'Net Ninjas posted', 'Not a member', '/clubs/e5000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-11-17 10:00:00+00', TIMESTAMPTZ '2026-11-17 11:00:00.25+00'),
  ('a1000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000004', 'club', 'Odd club target', 'Bad target', '/clubs/not-a-uuid', TIMESTAMPTZ '2026-11-16 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000004', 'session', 'Session starts', 'Tonight', '/s/friday-night', TIMESTAMPTZ '2026-11-16 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000004', 'rank', 'Rank updated', 'Level up', '/rank', TIMESTAMPTZ '2026-08-21 04:00:00.001+00', TIMESTAMPTZ '2026-08-22 00:00:00+00'),
  ('a1000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000004', 'account', 'Too old', 'Outside the window', '/profile', TIMESTAMPTZ '2026-08-21 04:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000004', 'announce', 'Welcome', 'Hello', '/', TIMESTAMPTZ '2026-08-01 00:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000008', 'd2000000-0000-4000-8000-000000000004', 'invite', 'Same instant B', 'Tie', '/invite', TIMESTAMPTZ '2026-11-15 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-000000000009', 'd2000000-0000-4000-8000-000000000004', 'invite', 'Same instant A', 'Tie', '/invite', TIMESTAMPTZ '2026-11-15 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001', 'club', 'Upper case target', 'Id in capitals', '/clubs/E5000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-18 10:00:00+00', NULL),
  ('a1000000-0000-4000-8000-00000000000b', 'd2000000-0000-4000-8000-000000000005', 'account', 'Eve read', 'Done', '/profile', TIMESTAMPTZ '2026-11-18 10:00:00+00', TIMESTAMPTZ '2026-11-18 11:00:00+00');

COMMIT;
