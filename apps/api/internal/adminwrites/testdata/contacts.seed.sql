-- Fictional admins, clubs, players, shared entries, club records and contact-change requests for the Admin player
-- writes characterization (POST /api/players, PATCH /api/players/{id}, PATCH /api/players/{id}/verification).
-- Applied on top of the Prisma migrations. Cut from internal/signedin/testdata/admin.seed.sql and extended by
-- apps/api/testdata/tools/gen-writes-admin-players-cases.py: edit that, not this. Admin accounts are linked with
-- auth_provider 'supabase' (the Go test relinks them); the player accounts are already 'rotra' with a sign-in identity
-- (auth_identities, id = the account's auth_subject, login key = the contact email) because the TypeScript side
-- mocks the provider and the Go side has none. Foreign key checks and triggers are off for this load. The file is
-- also the reset between cases, so it removes what it inserts.
BEGIN;
SET LOCAL session_replication_role = replica;

DELETE FROM player_notifications; DELETE FROM admin_audit_events; DELETE FROM admin_player_email_edits;
DELETE FROM player_social_links; DELETE FROM player_contact_change_requests; DELETE FROM player_password_reset_requests;
DELETE FROM club_player_private_inputs; DELETE FROM club_players; DELETE FROM shared_player_entries;
DELETE FROM player_accounts; DELETE FROM player_private_contacts; DELETE FROM player_id_allocations; DELETE FROM player_id_counters;
DELETE FROM players; DELETE FROM club_accounts; DELETE FROM clubs; DELETE FROM admin_accounts;
DELETE FROM auth_events WHERE audience = 'player'; DELETE FROM auth_sessions WHERE audience = 'player'; DELETE FROM auth_identities WHERE audience = 'player';

INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('ad000000-0000-4000-8000-000000000002', 'supabase', 'ad100000-0000-4000-8000-000000000002', true, 'Second Admin', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('ad000000-0000-4000-8000-000000000003', 'supabase', 'ad100000-0000-4000-8000-000000000003', false, 'Former Admin', TIMESTAMPTZ '2026-11-01 00:00:00+00');


INSERT INTO clubs (id, name, name_key, logo_ref, founding_location_code_id, founding_address, license_pricing, license_monthly_minor, license_yearly_minor, source_command_id, created_at, updated_at, revision) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'Smash Club', 'smash-club', 'https://example.test/smash.png', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere in Cebu', 'paid', 150000, 1500000, 'c8000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 3),
  ('c9000000-0000-4000-8000-000000000002', '  😀 Birdie Club', 'birdie-club', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'Manila hall', 'free', NULL, NULL, 'c8000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-10-05 00:00:00.5+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1),
  ('c9000000-0000-4000-8000-000000000003', 'ßeta  Net Ninjas', 'beta-ninjas', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'DVO'), 'Davao court', 'paid', 200000, 2000000, 'c8000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-05 00:00:00.5+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 2),
  ('c9000000-0000-4000-8000-000000000004', 'No Account Club', 'no-account', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Nowhere', 'free', 120000, 1200000, 'c8000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1);
INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, disabled_at, updated_at) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'smash', 'supabase', 'c7000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 01:00:00+00', NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c9000000-0000-4000-8000-000000000002', 'birdie', 'supabase', NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c9000000-0000-4000-8000-000000000003', 'ninjas', 'supabase', 'c7000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-05 01:00:00.25+00', TIMESTAMPTZ '2026-11-10 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00');

INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ((SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), DATE '2026-10-29', 40);
INSERT INTO players (id, full_name, nickname, avatar_ref, profile_visibility, profile_state, hide_phone_from_clubs, verification_override, verification_override_by, verification_override_at, revision, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'Alice Reyes', 'Ace', 'https://example.test/alice.png', 'public', 'claimed', false, NULL, NULL, NULL, 3, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000002', 'Bob Santos', NULL, NULL, 'private', 'claimed', true, 'verified', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 00:00:00+00', 9007199254740993, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000003', 'Carla Dizon', 'CD', 'character:a', 'always_private', 'claimed', true, NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000004', 'Dan Uy', NULL, NULL, 'public', 'unclaimed', false, NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000005', 'Erin Lim', NULL, NULL, 'public', 'unclaimed', false, NULL, NULL, NULL, 2, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000006', 'Frank No Id', NULL, NULL, 'public', 'claimed', false, NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000007', 'Gina Claimed No Contact', NULL, NULL, 'public', 'claimed', false, NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00');
UPDATE players SET experience_months = 30, experience_recorded_at = TIMESTAMPTZ '2026-05-20 00:00:00+00', personal_details = '{"playingStyle":"Aggressive net player"}'::jsonb, details_version = 1,
  avatar_previous_ref = 'https://example.test/alice-old.png', show_profile_stats = false WHERE id = 'd4000000-0000-4000-8000-000000000001';
UPDATE players SET experience_months = 5, experience_recorded_at = TIMESTAMPTZ '2026-11-01 00:00:00+00', personal_details = '{"playingStyle":7}'::jsonb, details_version = 1 WHERE id = 'd4000000-0000-4000-8000-000000000002';
INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'RTR-PH-CEB-102926-0001', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 1),
  ('d4000000-0000-4000-8000-000000000002', 'RTR-PH-CEB-102926-0002', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 2),
  ('d4000000-0000-4000-8000-000000000003', 'RTR-PH-CEB-102926-0003', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 3),
  ('d4000000-0000-4000-8000-000000000004', 'RTR-PH-CEB-102926-0004', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 4),
  ('d4000000-0000-4000-8000-000000000005', 'RTR-PH-MNL-102926-0005', 'c9000000-0000-4000-8000-000000000002', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-29', 5),
  ('d4000000-0000-4000-8000-000000000007', 'RTR-PH-CEB-102926-0013', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 13);
INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', '+639175550001', 'alice@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000002', '+639175550002', 'bob@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000003', '+639175550003', NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000004', '+639175550004', 'dan@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000005', '+639175550005', NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'supabase', 'f4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'alice@example.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000002', 'supabase', 'f4000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-10-02 12:00:00+00', 1, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000003', 'supabase', 'f4000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-03 00:00:00+00', 1, 'carla@gmail.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000007', 'supabase', 'f4000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-04 00:00:00+00', 1, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00');

-- Open entries of unclaimed people saved with an email: one under two clubs, one under a club, a retired one, a
-- claimed one and one with no club record; Dan Uy's RTR ID also has an open entry (a registration in progress).
INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, claimed_player_id, claimed_at, retired_at, revision, updated_at) VALUES
  ('a6000000-0000-4000-8000-000000000007', 'una@example.test', 'RTR-PH-CEB-102926-0007', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 7, TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('a6000000-0000-4000-8000-000000000008', 'uri@example.test', 'RTR-PH-MNL-103026-0008', 'c9000000-0000-4000-8000-000000000002', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-30', 8, TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, NULL, NULL, 5, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('a6000000-0000-4000-8000-000000000009', NULL, 'RTR-PH-CEB-102926-0009', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 9, TIMESTAMPTZ '2026-10-29 04:00:00+00', NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('a6000000-0000-4000-8000-000000000010', NULL, 'RTR-PH-CEB-102926-0010', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 10, TIMESTAMPTZ '2026-10-29 05:00:00+00', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('a6000000-0000-4000-8000-000000000011', 'empty@example.test', 'RTR-PH-CEB-102926-0011', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 11, TIMESTAMPTZ '2026-10-29 06:00:00+00', NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('a6000000-0000-4000-8000-000000000012', 'dan@example.test', 'RTR-PH-CEB-102926-0004', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 12, TIMESTAMPTZ '2026-10-29 07:00:00+00', NULL, NULL, NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO club_players (id, club_id, player_id, display_name, nickname, shared_entry_id, added_at, removed_at, revision, updated_at) VALUES
  -- Alice in two clubs (the Smash Club record carries a nickname only the Birdie one is blank about); Bob in one with a nickname
  ('c6000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', NULL, NULL, TIMESTAMPTZ '2026-01-02 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', 'Aly', NULL, TIMESTAMPTZ '2026-01-01 00:00:00.5+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002', 'Bob Santos', 'Bobby', NULL, TIMESTAMPTZ '2026-02-01 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000003', 'Carla Dizon', NULL, NULL, TIMESTAMPTZ '2026-02-02 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000005', 'Erin Lim', 'Er', NULL, TIMESTAMPTZ '2026-02-03 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  -- Una: one person under two clubs (a nickname in the second); Uri under one; the retired and empty entries
  ('c6000000-0000-4000-8000-000000000011', 'c9000000-0000-4000-8000-000000000001', NULL, 'Una Alonzo', NULL, 'a6000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000012', 'c9000000-0000-4000-8000-000000000002', NULL, 'Una A.', 'Uni', 'a6000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-29 04:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000013', 'c9000000-0000-4000-8000-000000000002', NULL, 'Uri Beltran', 'Uri', 'a6000000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-10-30 04:00:00.123+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000014', 'c9000000-0000-4000-8000-000000000001', NULL, 'Retired Person', NULL, 'a6000000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-10-30 04:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000015', 'c9000000-0000-4000-8000-000000000001', NULL, 'Removed From Open Entry', NULL, 'a6000000-0000-4000-8000-000000000011', TIMESTAMPTZ '2026-10-30 04:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000016', 'c9000000-0000-4000-8000-000000000001', NULL, 'Dan Uy', NULL, 'a6000000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-10-30 05:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  -- Club-only records: a phone only, a phone and an email, a removed one, one with no phone, one with no private input
  ('c6000000-0000-4000-8000-000000000021', 'c9000000-0000-4000-8000-000000000001', NULL, 'Cory Only', 'Cor', NULL, TIMESTAMPTZ '2026-11-01 08:00:00.5+00', NULL, 7, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000022', 'c9000000-0000-4000-8000-000000000003', NULL, 'Dina Davao', NULL, NULL, TIMESTAMPTZ '2026-11-02 08:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000023', 'c9000000-0000-4000-8000-000000000001', NULL, 'Removed Rae', NULL, NULL, TIMESTAMPTZ '2026-11-02 09:00:00+00', TIMESTAMPTZ '2026-11-05 00:00:00+00', 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000024', 'c9000000-0000-4000-8000-000000000001', NULL, 'No Phone Ned', NULL, NULL, TIMESTAMPTZ '2026-11-03 09:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000025', 'c9000000-0000-4000-8000-000000000001', NULL, 'No Input Nia', NULL, NULL, TIMESTAMPTZ '2026-11-03 10:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, email, captured_at, updated_at) VALUES
  ('c6000000-0000-4000-8000-000000000012', 'c9000000-0000-4000-8000-000000000002', '+639175550912', NULL, TIMESTAMPTZ '2026-10-29 04:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000011', 'c9000000-0000-4000-8000-000000000001', '+639175550911', NULL, TIMESTAMPTZ '2026-10-29 03:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000021', 'c9000000-0000-4000-8000-000000000001', '+639175550921', NULL, TIMESTAMPTZ '2026-11-01 08:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000022', 'c9000000-0000-4000-8000-000000000003', '+639175550922', 'dina@example.test', TIMESTAMPTZ '2026-11-02 08:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000023', 'c9000000-0000-4000-8000-000000000001', '+639175550923', NULL, TIMESTAMPTZ '2026-11-02 09:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000024', 'c9000000-0000-4000-8000-000000000001', NULL, 'ned@example.test', TIMESTAMPTZ '2026-11-03 09:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00');

INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, source_command_id, submitted_by_admin_id, reviewed_by_admin_id, reviewed_at, approved_at, rejected_at, provider_operation_ref, applied_at, provider_applied_at, superseded_at, application_attempts, failure_code, updated_at) VALUES
  -- Alice: a phone change waiting, nobody else holds the number (all four checks pass)
  ('b1000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'phone', 'app', '+639175550999', '+639175550001', 1, 'pending', TIMESTAMPTZ '2026-11-15 01:00:00+00', 'b2000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  -- Bob: an email waiting that Alice holds (linked elsewhere), and a phone change being applied (in progress for him)
  ('b1000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000002', 'email', 'owner', 'alice@example.test', 'bob@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-16 01:00:00+00', 'b2000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000002', 'phone', 'app', '+639175550777', '+639175550002', 1, 'applying', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'b2000000-0000-4000-8000-000000000003', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 02:00:00+00', TIMESTAMPTZ '2026-11-14 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000003', NULL, NULL, NULL, 1, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  -- Carla: the email she had when she asked is not the one she has now (original changed), a newer request for the same
  -- field, and a phone change whose original no longer matches (shown in display form)
  ('b1000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000003', 'email', 'owner', 'carla.new@example.test', 'carla.old@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-10 01:00:00+00', 'b2000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000005', 'd4000000-0000-4000-8000-000000000003', 'email', 'owner', 'carla.newest@example.test', 'carla.old@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-12 01:00:00+00', 'b2000000-0000-4000-8000-000000000005', 'ad000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000006', 'd4000000-0000-4000-8000-000000000003', 'phone', 'owner', '+639175550003', '+639175550009', 1, 'pending', TIMESTAMPTZ '2026-11-11 01:00:00+00', 'b2000000-0000-4000-8000-000000000006', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  -- Closed ones: applied, rejected, rejected and superseded, failed
  ('b1000000-0000-4000-8000-000000000007', 'd4000000-0000-4000-8000-000000000004', 'phone', 'app', '+639175550444', NULL, 1, 'applied', TIMESTAMPTZ '2026-11-01 01:00:00+00', 'b2000000-0000-4000-8000-000000000007', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 02:00:00+00', TIMESTAMPTZ '2026-11-01 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-11-01 03:00:00.5+00', TIMESTAMPTZ '2026-11-01 03:00:00+00', NULL, 2, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000008', 'd4000000-0000-4000-8000-000000000001', 'email', 'app', 'alice2@example.test', 'alice@example.test', 1, 'rejected', TIMESTAMPTZ '2026-11-02 01:00:00+00', 'b2000000-0000-4000-8000-000000000008', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-02 02:00:00+00', NULL, TIMESTAMPTZ '2026-11-02 02:00:00+00', NULL, NULL, NULL, NULL, 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000009', 'd4000000-0000-4000-8000-000000000001', 'email', 'app', 'alice3@example.test', 'alice@example.test', 1, 'rejected', TIMESTAMPTZ '2026-11-03 01:00:00+00', 'b2000000-0000-4000-8000-000000000009', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-04 01:00:00+00', NULL, TIMESTAMPTZ '2026-11-04 01:00:00+00', NULL, NULL, NULL, TIMESTAMPTZ '2026-11-04 01:00:00+00', 0, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000010', 'd4000000-0000-4000-8000-000000000005', 'email', 'owner', 'erin@example.test', NULL, 1, 'failed', TIMESTAMPTZ '2026-11-05 01:00:00+00', 'b2000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-05 02:00:00+00', TIMESTAMPTZ '2026-11-05 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000010', NULL, NULL, NULL, 3, 'provider_unavailable', TIMESTAMPTZ '2026-11-01 00:00:00+00');

-- ---- more registered players: Hana (a clean player in Cebu), Ivan (Manila, number 4: the CEB number 4 is Dan's),
--      June (private, a club record in two clubs); their club records, contacts and accounts ----
INSERT INTO players (id, full_name, nickname, avatar_ref, profile_visibility, profile_state, hide_phone_from_clubs, revision, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000008', 'Hana Ocampo', NULL, NULL, 'public', 'claimed', false, 4, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000009', 'Ivan Cruz', 'Iv', 'https://example.test/ivan.png', 'private', 'claimed', false, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000010', 'June Tan', NULL, NULL, 'always_private', 'claimed', true, 2, TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES
  ('d4000000-0000-4000-8000-000000000008', 'RTR-PH-CEB-102926-0014', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 14),
  ('d4000000-0000-4000-8000-000000000009', 'RTR-PH-MNL-102926-0004', 'c9000000-0000-4000-8000-000000000002', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-29', 4),
  ('d4000000-0000-4000-8000-000000000010', 'RTR-PH-CEB-102926-0016', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 16);
INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ((SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), DATE '2026-10-29', 5);
INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000008', '+639175550008', 'hana@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000009', '+639175550009', 'ivan@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000010', '+639175550010', 'june@example.test', TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000008', 'supabase', 'f4000000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-10-05 00:00:00+00', 1, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000009', 'supabase', 'f4000000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-10-06 00:00:00+00', 1, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('d4000000-0000-4000-8000-000000000010', 'supabase', 'f4000000-0000-4000-8000-000000000010', TIMESTAMPTZ '2026-10-07 00:00:00+00', 1, 'june@gmail.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00');
INSERT INTO club_players (id, club_id, player_id, display_name, nickname, shared_entry_id, added_at, removed_at, revision, updated_at) VALUES
  ('c6000000-0000-4000-8000-000000000031', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000008', 'Hana Ocampo', NULL, NULL, TIMESTAMPTZ '2026-10-06 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000032', 'c9000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000009', 'Ivan Cruz', 'Iv', NULL, TIMESTAMPTZ '2026-10-07 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000033', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000010', 'June Tan', NULL, NULL, TIMESTAMPTZ '2026-10-08 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('c6000000-0000-4000-8000-000000000034', 'c9000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000010', 'June T.', 'JT', NULL, TIMESTAMPTZ '2026-10-09 00:00:00+00', NULL, 1, TIMESTAMPTZ '2026-11-01 00:00:00+00');

-- Hana registered from an entry: it is claimed, has no email, and holds the RTR ID Hana has (an Admin RTR ID change moves both)
INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, claimed_player_id, claimed_at, retired_at, revision, updated_at) VALUES
  ('a6000000-0000-4000-8000-000000000013', NULL, 'RTR-PH-CEB-102926-0014', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 14, TIMESTAMPTZ '2026-10-29 08:00:00+00', 'd4000000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-10-05 00:00:00+00', NULL, 3, TIMESTAMPTZ '2026-11-01 00:00:00+00');

-- ---- social links (Alice has two) ----
INSERT INTO player_social_links (id, player_id, provider, url, updated_at) VALUES
  ('5a000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'facebook', 'https://facebook.com/alice', TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('5a000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'youtube', 'https://youtube.com/@alice', TIMESTAMPTZ '2026-11-01 00:00:00+00');

-- ---- sign-in identities of the player accounts (login key = the contact email), and one that is nobody's ----
UPDATE player_accounts SET auth_provider = 'rotra';
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision)
SELECT a.auth_subject, 'player', lower(coalesce(c.email, 'login-' || a.player_id::text)), 'fake-hash-for-tests', 'argon2id', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1
FROM player_accounts a LEFT JOIN player_private_contacts c ON c.player_id = a.player_id;
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision) VALUES
  ('f5000000-0000-4000-8000-000000000001', 'player', 'taken@example.test', 'fake-hash-for-tests', 'argon2id', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1);

-- ---- password-reset requests (contacts.seed.sql: players.seed.sql plus these; gen-writes-admin-contact-cases.py) ----
INSERT INTO player_password_reset_requests (id, email, player_id, status, requested_at, reviewed_by_admin_id, reviewed_at, auth_subject, token_digest, updated_at) VALUES
  ('b3000000-0000-4000-8000-000000000101', 'alice@example.test', 'd4000000-0000-4000-8000-000000000001', 'pending', TIMESTAMPTZ '2026-11-18 00:00:00+00', NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000102', 'bob@example.test', 'd4000000-0000-4000-8000-000000000002', 'issued', TIMESTAMPTZ '2026-11-17 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 01:00:00+00', 'f4000000-0000-4000-8000-000000000002', sha256('old-bob-link'::bytea), TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000103', 'carla@example.test', 'd4000000-0000-4000-8000-000000000003', 'declined', TIMESTAMPTZ '2026-11-16 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-16 01:00:00+00', NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000104', 'hana@example.test', 'd4000000-0000-4000-8000-000000000008', 'pending', TIMESTAMPTZ '2026-11-18 01:00:00+00', NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000105', 'hana@example.test', 'd4000000-0000-4000-8000-000000000008', 'issued', TIMESTAMPTZ '2026-11-15 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-15 01:00:00+00', 'f4000000-0000-4000-8000-000000000008', sha256('old-hana-link'::bytea), TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000106', 'unknown@example.test', NULL, 'pending', TIMESTAMPTZ '2026-11-18 02:00:00+00', NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000107', 'dan@example.test', 'd4000000-0000-4000-8000-000000000004', 'pending', TIMESTAMPTZ '2026-11-18 03:00:00+00', NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00'),
  ('b3000000-0000-4000-8000-000000000108', 'june@example.test', 'd4000000-0000-4000-8000-000000000010', 'pending', TIMESTAMPTZ '2026-11-18 04:00:00+00', NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00');

COMMIT;
