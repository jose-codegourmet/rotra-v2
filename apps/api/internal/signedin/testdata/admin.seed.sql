-- Fictional clubs, players, license terms, audit events and requests for the Admin reads characterization (clubs,
-- players, sales, audit events, contact-change and password-reset requests, feature flags, ranking settings, license
-- operations, banner and character libraries). Applied on top of the Prisma migrations. Accounts are linked with
-- auth_provider 'supabase' (the TypeScript side); the Go test relinks them to its own sign-in identities. Foreign key
-- checks are off for this load. Edit by hand and rerun apps/api/testdata/tools/capture-signedin-admin.test.mjs.
BEGIN;
SET LOCAL session_replication_role = replica;

-- ---- start clean: the file is also the reset between cases, so it removes what it inserts ----
DELETE FROM player_match_facts; DELETE FROM session_players; DELETE FROM matches; DELETE FROM session_publications; DELETE FROM queue_sessions;
DELETE FROM club_name_change_requests; DELETE FROM club_license_terms; DELETE FROM club_accounts;
DELETE FROM player_contact_change_requests; DELETE FROM player_password_reset_requests; DELETE FROM admin_audit_events;
DELETE FROM player_rank_current; DELETE FROM club_player_private_inputs; DELETE FROM club_players; DELETE FROM shared_player_entries;
DELETE FROM player_accounts; DELETE FROM player_private_contacts; DELETE FROM player_id_allocations; DELETE FROM player_id_counters; DELETE FROM players;
DELETE FROM clubs; DELETE FROM admin_accounts;
DELETE FROM feature_flags WHERE key <> 'player_google_sign_in';
DELETE FROM ranking_policy_versions WHERE version > 1;
DELETE FROM profile_banners WHERE id LIKE 'b0000000%';
DELETE FROM profile_characters WHERE id LIKE 'c0000000%';
UPDATE admin_settings SET cost_per_session_minor = 1500;

-- ---- the rows the migrations seed carry the time the migration ran: pin them ----
UPDATE feature_flags SET created_at = TIMESTAMPTZ '2026-10-01 00:00:00+00', updated_at = TIMESTAMPTZ '2026-10-01 00:00:00+00';
UPDATE ranking_policy_versions SET id = 'fa000000-0000-4000-8000-000000000001', effective_at = TIMESTAMPTZ '2026-10-01 00:00:00+00', created_at = TIMESTAMPTZ '2026-10-01 00:00:00+00';
UPDATE profile_banners SET uploaded_at = TIMESTAMPTZ '2026-10-01 00:00:00+00';
UPDATE profile_characters SET uploaded_at = TIMESTAMPTZ '2026-10-01 00:00:00+00';

-- ---- admins: two active, one that left ----
INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now()),
  ('ad000000-0000-4000-8000-000000000002', 'supabase', 'ad100000-0000-4000-8000-000000000002', true, 'Second Admin', now()),
  ('ad000000-0000-4000-8000-000000000003', 'supabase', 'ad100000-0000-4000-8000-000000000003', false, 'Former Admin', now());

-- ---- feature flags and ranking settings ----
INSERT INTO feature_flags (key, name, description, value, created_by_admin_id, updated_by_admin_id, created_at, updated_at, revision) VALUES
  ('sessions_beta', 'Sessions beta', 'Lets clubs try the new session page.', true, 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', TIMESTAMPTZ '2026-11-05 09:30:00+00', 4),
  ('night_mode', 'Night mode', '', false, NULL, NULL, TIMESTAMPTZ '2026-11-02 08:00:00.123+00', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', 9007199254740993);
UPDATE feature_flags SET created_by_admin_id = 'ad000000-0000-4000-8000-000000000001', updated_by_admin_id = 'ad000000-0000-4000-8000-000000000001' WHERE key = 'player_google_sign_in';
INSERT INTO ranking_policy_versions (id, version, effective_at, assessment_weight_bp, performance_weight_bp, recent_standard_match_threshold, algorithm_version, created_by_admin_id, change_note, created_at) VALUES
  ('fa000000-0000-4000-8000-000000000002', 2, TIMESTAMPTZ '2026-11-03 00:00:00+00', 6000, 4000, 12, 'rank-test-v1', 'ad000000-0000-4000-8000-000000000001', 'Weighted performance more.', TIMESTAMPTZ '2026-11-03 01:00:00+00'),
  ('fa000000-0000-4000-8000-000000000003', 3, TIMESTAMPTZ '2026-11-10 00:00:00+00', 5000, 5000, 10, 'rank-test-v1', NULL, NULL, TIMESTAMPTZ '2026-11-10 01:00:00+00');

-- ---- banner and character libraries: an uploaded hidden banner, a deleted banner, a deleted character ----
INSERT INTO profile_banners (id, image, shown, uploaded_at, number, deleted_at, is_default) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'https://example.test/banner-1.png', false, TIMESTAMPTZ '2026-11-01 10:00:00.5+00', 10, NULL, false),
  ('b0000000-0000-4000-8000-000000000002', 'https://example.test/banner-2.png', true, TIMESTAMPTZ '2026-11-01 11:00:00+00', 11, TIMESTAMPTZ '2026-11-04 00:00:00+00', false);
INSERT INTO profile_characters (id, image, shown, uploaded_at, number, deleted_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'https://example.test/char-1.png', false, TIMESTAMPTZ '2026-11-01 10:00:00+00', 30, NULL),
  ('c0000000-0000-4000-8000-000000000002', 'https://example.test/char-2.png', true, TIMESTAMPTZ '2026-11-01 11:00:00+00', 31, TIMESTAMPTZ '2026-11-04 00:00:00+00');

-- ---- clubs ----
INSERT INTO clubs (id, name, name_key, logo_ref, founding_location_code_id, founding_address, license_pricing, license_monthly_minor, license_yearly_minor, source_command_id, created_at, updated_at, revision) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'Smash Club', 'smash-club', 'https://example.test/smash.png', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Somewhere in Cebu', 'paid', 150000, 1500000, 'c8000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 00:00:00+00', now(), 3),
  ('c9000000-0000-4000-8000-000000000002', '  😀 Birdie Club', 'birdie-club', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'Manila hall', 'free', NULL, NULL, 'c8000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-10-05 00:00:00.5+00', now(), 1),
  ('c9000000-0000-4000-8000-000000000003', 'ßeta  Net Ninjas', 'beta-ninjas', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'DVO'), 'Davao court', 'paid', 200000, 2000000, 'c8000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-05 00:00:00.5+00', now(), 2),
  ('c9000000-0000-4000-8000-000000000004', 'No Account Club', 'no-account', NULL, (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Nowhere', 'free', 120000, 1200000, 'c8000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-11-01 00:00:00+00', now(), 1);
INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, disabled_at, updated_at) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'smash', 'supabase', 'c7000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 01:00:00+00', NULL, now()),
  ('c9000000-0000-4000-8000-000000000002', 'birdie', 'supabase', NULL, NULL, NULL, now()),
  ('c9000000-0000-4000-8000-000000000003', 'ninjas', 'supabase', 'c7000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-05 01:00:00.25+00', TIMESTAMPTZ '2026-11-10 00:00:00+00', now());
-- Smash Club has two terms (the yearly one carries retention-free notes); Birdie Club a free one; Ninjas a free one.
INSERT INTO club_license_terms (id, club_id, plan, starts_at, ends_at, activated_by_admin_id, activated_at, source_command_id, pricing_at_activation, paid_on, amount_minor, currency, payment_reference, notes) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'monthly', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-02 02:00:00+00', 'e1000000-0000-4000-8000-000000000001', 'paid', DATE '2026-09-02', 150000, 'PHP', 'LIC-0001', NULL),
  ('a1000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'yearly', TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2027-10-01 00:00:00+00', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-10 02:00:00+00', 'e1000000-0000-4000-8000-000000000002', 'paid', DATE '2026-11-10', 1500000, 'PHP', 'LIC-0002', 'Paid in cash.'),
  ('a1000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000002', 'monthly', TIMESTAMPTZ '2026-10-05 00:00:00+00', TIMESTAMPTZ '2026-11-05 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-05 16:30:00+00', 'e1000000-0000-4000-8000-000000000003', 'free', NULL, 0, 'PHP', 'FREE-1', ''),
  ('a1000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000003', 'monthly', TIMESTAMPTZ '2026-11-12 00:00:00+00', TIMESTAMPTZ '2026-12-12 00:00:00+00', 'ad000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-11-15 05:00:00+00', 'e1000000-0000-4000-8000-000000000004', 'paid', DATE '2026-11-15', 200000, 'PHP', 'LIC-0003', NULL);
INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, reviewed_by_admin_id, reviewed_at, source_command_id, updated_at) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'Smash Club Cebu', 'smash-club-cebu', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'pending', NULL, NULL, 'e2000000-0000-4000-8000-000000000001', now()),
  ('a2000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'Smash Old', 'smash-old', TIMESTAMPTZ '2026-11-10 01:00:00+00', 'approved', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-10 02:00:00+00', 'e2000000-0000-4000-8000-000000000002', now()),
  ('a2000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000003', 'Net Ninjas Davao', 'net-ninjas-davao', TIMESTAMPTZ '2026-11-12 01:00:00+00', 'rejected', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-12 03:00:00+00', 'e2000000-0000-4000-8000-000000000003', now()),
  ('a2000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000003', 'Net Ninjas Pro', 'net-ninjas-pro', TIMESTAMPTZ '2026-11-13 01:00:00+00', 'rejected', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-13 02:00:00+00', 'e2000000-0000-4000-8000-000000000004', now());
-- Sessions: Smash Club is live now (Birdie Club is wrapping one up); Ninjas has one only prepared; completed sessions feed Sales.
INSERT INTO queue_sessions (id, club_id, title, state, invalid_reason, started_at, finalized_at, scheduled_start_at, scheduled_end_at, venue_name, players_per_court, public_slug, source_command_id, updated_at) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'Live Now', 'active', NULL, TIMESTAMPTZ '2026-11-19 01:00:00+00', NULL, TIMESTAMPTZ '2026-11-19 01:00:00+00', TIMESTAMPTZ '2026-11-19 05:00:00+00', 'Court A', 8, 'live-now', 'e3000000-0000-4000-8000-000000000001', now()),
  ('a3000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000002', 'Wrapping Up', 'finalizing', NULL, TIMESTAMPTZ '2026-11-18 01:00:00+00', NULL, TIMESTAMPTZ '2026-11-18 01:00:00+00', TIMESTAMPTZ '2026-11-18 05:00:00+00', NULL, 8, 'wrapping-up', 'e3000000-0000-4000-8000-000000000002', now()),
  ('a3000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000003', 'Not Yet', 'prepared', NULL, NULL, NULL, TIMESTAMPTZ '2026-11-25 01:00:00+00', TIMESTAMPTZ '2026-11-25 05:00:00+00', 'Hall', 8, 'not-yet', 'e3000000-0000-4000-8000-000000000003', now()),
  ('a3000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'Friday Night', 'completed', NULL, TIMESTAMPTZ '2026-11-13 09:00:00+00', TIMESTAMPTZ '2026-11-13 14:00:00.5+00', TIMESTAMPTZ '2026-11-13 09:00:00+00', TIMESTAMPTZ '2026-11-13 15:00:00+00', 'Court A', 8, 'friday-night', 'e3000000-0000-4000-8000-000000000004', now()),
  ('a3000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000002', 'Saturday Morning', 'completed', NULL, TIMESTAMPTZ '2026-11-14 17:30:00+00', TIMESTAMPTZ '2026-11-14 22:00:00+00', TIMESTAMPTZ '2026-11-14 17:30:00+00', TIMESTAMPTZ '2026-11-14 23:00:00+00', NULL, 8, 'sat-morning', 'e3000000-0000-4000-8000-000000000005', now()),
  ('a3000000-0000-4000-8000-000000000006', 'c9000000-0000-4000-8000-000000000001', 'October Night', 'completed', NULL, TIMESTAMPTZ '2026-10-20 09:00:00+00', TIMESTAMPTZ '2026-10-20 14:00:00+00', TIMESTAMPTZ '2026-10-20 09:00:00+00', TIMESTAMPTZ '2026-10-20 15:00:00+00', NULL, 8, 'october-night', 'e3000000-0000-4000-8000-000000000006', now()),
  ('a3000000-0000-4000-8000-000000000007', 'c9000000-0000-4000-8000-000000000001', 'Short Night', 'completed', NULL, TIMESTAMPTZ '2026-11-16 09:00:00+00', TIMESTAMPTZ '2026-11-16 15:00:00+00', TIMESTAMPTZ '2026-11-16 09:00:00+00', TIMESTAMPTZ '2026-11-16 15:00:00+00', NULL, 8, 'short-night', 'e3000000-0000-4000-8000-000000000007', now()),
  ('a3000000-0000-4000-8000-000000000008', 'c9000000-0000-4000-8000-000000000003', 'Invalid Night', 'invalid', 'Wrong date', TIMESTAMPTZ '2026-11-15 09:00:00+00', NULL, TIMESTAMPTZ '2026-11-15 09:00:00+00', TIMESTAMPTZ '2026-11-15 15:00:00+00', NULL, 8, 'invalid-night', 'e3000000-0000-4000-8000-000000000008', now());
INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, published_at, last_synced_at, updated_at) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'pk-friday-0123456789', 'details', '{}'::jsonb, '{}'::jsonb, TIMESTAMPTZ '2026-11-13 15:00:00+00', now(), now()),
  ('a4000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'pk-sat-0123456789abc', 'details', '{}'::jsonb, '{}'::jsonb, NULL, now(), now());
INSERT INTO matches (id, club_id, session_id, match_no, state, format, origin, source_operation_id, started_at, ended_at, updated_at) VALUES
  ('a5000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 1, 'completed', 'doubles', 'manual', 'e5000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-13 10:00:00+00', TIMESTAMPTZ '2026-11-13 10:20:00+00', now()),
  ('a5000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 2, 'completed', 'singles', 'manual', 'e5000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-13 11:00:00+00', TIMESTAMPTZ '2026-11-13 11:20:00+00', now()),
  ('a5000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 3, 'completed', 'doubles', 'manual', 'e5000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-11-13 12:00:00+00', TIMESTAMPTZ '2026-11-13 12:20:00+00', now()),
  ('a5000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 1, 'completed', 'singles', 'manual', 'e5000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-11-14 18:00:00+00', TIMESTAMPTZ '2026-11-14 18:20:00+00', now()),
  ('a5000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000006', 1, 'completed', 'doubles', 'manual', 'e5000000-0000-4000-8000-000000000005', TIMESTAMPTZ '2026-10-20 10:00:00+00', TIMESTAMPTZ '2026-10-20 10:20:00+00', now()),
  ('a5000000-0000-4000-8000-000000000006', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000006', 2, 'invalid', 'doubles', 'manual', 'e5000000-0000-4000-8000-000000000006', TIMESTAMPTZ '2026-10-20 11:00:00+00', TIMESTAMPTZ '2026-10-20 11:05:00+00', now()),
  ('a5000000-0000-4000-8000-000000000007', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000007', 1, 'completed', 'singles', 'manual', 'e5000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-11-16 10:00:00+00', TIMESTAMPTZ '2026-11-16 10:20:00+00', now());

-- ---- players ----
INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ((SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), DATE '2026-10-29', 40);
INSERT INTO players (id, full_name, nickname, avatar_ref, profile_visibility, profile_state, hide_phone_from_clubs, verification_override, verification_override_by, verification_override_at, revision, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'Alice Reyes', 'Ace', 'https://example.test/alice.png', 'public', 'claimed', false, NULL, NULL, NULL, 3, now()),
  ('d4000000-0000-4000-8000-000000000002', 'Bob Santos', NULL, NULL, 'private', 'claimed', true, 'verified', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 00:00:00+00', 9007199254740993, now()),
  ('d4000000-0000-4000-8000-000000000003', 'Carla Dizon', 'CD', 'character:a', 'always_private', 'claimed', true, NULL, NULL, NULL, 1, now()),
  ('d4000000-0000-4000-8000-000000000004', 'Dan Uy', NULL, NULL, 'public', 'unclaimed', false, NULL, NULL, NULL, 1, now()),
  ('d4000000-0000-4000-8000-000000000005', 'Erin Lim', NULL, NULL, 'public', 'unclaimed', false, NULL, NULL, NULL, 2, now()),
  ('d4000000-0000-4000-8000-000000000006', 'Frank No Id', NULL, NULL, 'public', 'claimed', false, NULL, NULL, NULL, 1, now()),
  ('d4000000-0000-4000-8000-000000000007', 'Gina Claimed No Contact', NULL, NULL, 'public', 'claimed', false, NULL, NULL, NULL, 1, now());
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
  ('d4000000-0000-4000-8000-000000000001', '+639175550001', 'alice@example.test', now()),
  ('d4000000-0000-4000-8000-000000000002', '+639175550002', 'bob@example.test', now()),
  ('d4000000-0000-4000-8000-000000000003', '+639175550003', NULL, now()),
  ('d4000000-0000-4000-8000-000000000004', '+639175550004', 'dan@example.test', now()),
  ('d4000000-0000-4000-8000-000000000005', '+639175550005', NULL, now());
INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, google_email, google_linked_at, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'supabase', 'f4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1, 'alice@example.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', now()),
  ('d4000000-0000-4000-8000-000000000002', 'supabase', 'f4000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-10-02 12:00:00+00', 1, NULL, NULL, now()),
  ('d4000000-0000-4000-8000-000000000003', 'supabase', 'f4000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-03 00:00:00+00', 1, 'carla@gmail.test', TIMESTAMPTZ '2026-11-10 00:00:00+00', now()),
  ('d4000000-0000-4000-8000-000000000007', 'supabase', 'f4000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-04 00:00:00+00', 1, NULL, NULL, now());

-- Open entries of unclaimed people saved with an email: one under two clubs, one under a club, a retired one, a
-- claimed one and one with no club record; Dan Uy's RTR ID also has an open entry (a registration in progress).
INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, claimed_player_id, claimed_at, retired_at, revision, updated_at) VALUES
  ('a6000000-0000-4000-8000-000000000007', 'una@example.test', 'RTR-PH-CEB-102926-0007', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 7, TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, NULL, NULL, 1, now()),
  ('a6000000-0000-4000-8000-000000000008', 'uri@example.test', 'RTR-PH-MNL-103026-0008', 'c9000000-0000-4000-8000-000000000002', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'MNL'), 'PH', 'MNL', DATE '2026-10-30', 8, TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, NULL, NULL, 5, now()),
  ('a6000000-0000-4000-8000-000000000009', NULL, 'RTR-PH-CEB-102926-0009', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 9, TIMESTAMPTZ '2026-10-29 04:00:00+00', NULL, NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, now()),
  ('a6000000-0000-4000-8000-000000000010', NULL, 'RTR-PH-CEB-102926-0010', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 10, TIMESTAMPTZ '2026-10-29 05:00:00+00', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 00:00:00+00', NULL, 1, now()),
  ('a6000000-0000-4000-8000-000000000011', 'empty@example.test', 'RTR-PH-CEB-102926-0011', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 11, TIMESTAMPTZ '2026-10-29 06:00:00+00', NULL, NULL, NULL, 1, now()),
  ('a6000000-0000-4000-8000-000000000012', 'dan@example.test', 'RTR-PH-CEB-102926-0004', 'c9000000-0000-4000-8000-000000000001', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'PH', 'CEB', DATE '2026-10-29', 12, TIMESTAMPTZ '2026-10-29 07:00:00+00', NULL, NULL, NULL, 1, now());
INSERT INTO club_players (id, club_id, player_id, display_name, nickname, shared_entry_id, added_at, removed_at, revision, updated_at) VALUES
  -- Alice in two clubs (the Smash Club record carries a nickname only the Birdie one is blank about); Bob in one with a nickname
  ('c6000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', NULL, NULL, TIMESTAMPTZ '2026-01-02 00:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', 'Aly', NULL, TIMESTAMPTZ '2026-01-01 00:00:00.5+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002', 'Bob Santos', 'Bobby', NULL, TIMESTAMPTZ '2026-02-01 00:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000003', 'Carla Dizon', NULL, NULL, TIMESTAMPTZ '2026-02-02 00:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000005', 'Erin Lim', 'Er', NULL, TIMESTAMPTZ '2026-02-03 00:00:00+00', NULL, 1, now()),
  -- Una: one person under two clubs (a nickname in the second); Uri under one; the retired and empty entries
  ('c6000000-0000-4000-8000-000000000011', 'c9000000-0000-4000-8000-000000000001', NULL, 'Una Alonzo', NULL, 'a6000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-29 03:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000012', 'c9000000-0000-4000-8000-000000000002', NULL, 'Una A.', 'Uni', 'a6000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-10-29 04:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000013', 'c9000000-0000-4000-8000-000000000002', NULL, 'Uri Beltran', 'Uri', 'a6000000-0000-4000-8000-000000000008', TIMESTAMPTZ '2026-10-30 04:00:00.123+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000014', 'c9000000-0000-4000-8000-000000000001', NULL, 'Retired Person', NULL, 'a6000000-0000-4000-8000-000000000009', TIMESTAMPTZ '2026-10-30 04:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000015', 'c9000000-0000-4000-8000-000000000001', NULL, 'Removed From Open Entry', NULL, 'a6000000-0000-4000-8000-000000000011', TIMESTAMPTZ '2026-10-30 04:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, now()),
  ('c6000000-0000-4000-8000-000000000016', 'c9000000-0000-4000-8000-000000000001', NULL, 'Dan Uy', NULL, 'a6000000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-10-30 05:00:00+00', NULL, 1, now()),
  -- Club-only records: a phone only, a phone and an email, a removed one, one with no phone, one with no private input
  ('c6000000-0000-4000-8000-000000000021', 'c9000000-0000-4000-8000-000000000001', NULL, 'Cory Only', 'Cor', NULL, TIMESTAMPTZ '2026-11-01 08:00:00.5+00', NULL, 7, now()),
  ('c6000000-0000-4000-8000-000000000022', 'c9000000-0000-4000-8000-000000000003', NULL, 'Dina Davao', NULL, NULL, TIMESTAMPTZ '2026-11-02 08:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000023', 'c9000000-0000-4000-8000-000000000001', NULL, 'Removed Rae', NULL, NULL, TIMESTAMPTZ '2026-11-02 09:00:00+00', TIMESTAMPTZ '2026-11-05 00:00:00+00', 1, now()),
  ('c6000000-0000-4000-8000-000000000024', 'c9000000-0000-4000-8000-000000000001', NULL, 'No Phone Ned', NULL, NULL, TIMESTAMPTZ '2026-11-03 09:00:00+00', NULL, 1, now()),
  ('c6000000-0000-4000-8000-000000000025', 'c9000000-0000-4000-8000-000000000001', NULL, 'No Input Nia', NULL, NULL, TIMESTAMPTZ '2026-11-03 10:00:00+00', NULL, 1, now());
INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, email, captured_at, updated_at) VALUES
  ('c6000000-0000-4000-8000-000000000012', 'c9000000-0000-4000-8000-000000000002', '+639175550912', NULL, TIMESTAMPTZ '2026-10-29 04:00:00+00', now()),
  ('c6000000-0000-4000-8000-000000000011', 'c9000000-0000-4000-8000-000000000001', '+639175550911', NULL, TIMESTAMPTZ '2026-10-29 03:00:00+00', now()),
  ('c6000000-0000-4000-8000-000000000021', 'c9000000-0000-4000-8000-000000000001', '+639175550921', NULL, TIMESTAMPTZ '2026-11-01 08:00:00+00', now()),
  ('c6000000-0000-4000-8000-000000000022', 'c9000000-0000-4000-8000-000000000003', '+639175550922', 'dina@example.test', TIMESTAMPTZ '2026-11-02 08:00:00+00', now()),
  ('c6000000-0000-4000-8000-000000000023', 'c9000000-0000-4000-8000-000000000001', '+639175550923', NULL, TIMESTAMPTZ '2026-11-02 09:00:00+00', now()),
  ('c6000000-0000-4000-8000-000000000024', 'c9000000-0000-4000-8000-000000000001', NULL, 'ned@example.test', TIMESTAMPTZ '2026-11-03 09:00:00+00', now());
INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, input_counts, policy_version_id, algorithm_version, window_start, window_end, calculated_at, input_watermark, next_recheck_at, recent_standard_match_count, leaderboard_eligible, updated_at)
SELECT v.player_id::uuid, v.skill_level_id, v.numeric_rank, v.state::rank_state, '{}'::jsonb, 'fa000000-0000-4000-8000-000000000003'::uuid, 'rank-test-v1',
       TIMESTAMPTZ '2026-01-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, TIMESTAMPTZ '2027-01-01 00:00:00+00', v.recent, v.eligible, now()
FROM (VALUES ('d4000000-0000-4000-8000-000000000001', 4::smallint, 61.5::numeric, 'established', 7, true), ('d4000000-0000-4000-8000-000000000002', 2::smallint, 40.0::numeric, 'provisional', 2, false), ('d4000000-0000-4000-8000-000000000005', NULL::smallint, NULL::numeric, 'provisional', 0, false)) AS v(player_id, skill_level_id, numeric_rank, state, recent, eligible);

-- Sessions of the record: who played, and the facts the games read shows (Alice and Carla beat Bob and Una; Alice beat
-- Cory in singles; the short night and the Birdie night also have Alice).
INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present_changed_at, confirmed_at, joined_at, updated_at) VALUES
  ('a7000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000002', 'Bob Santos', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000003', 'Carla Dizon', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000011', NULL, 'Una Alonzo', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000021', NULL, 'Cory Only', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000006', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000007', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000007', 'c6000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'Alice Reyes', now(), now(), now(), now()),
  ('a7000000-0000-4000-8000-000000000008', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000012', NULL, 'Una A.', now(), now(), now(), now());
INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization, played_at, format, team, winning_team, full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, team_a_score, team_b_score, fact_version) VALUES
  ('a8000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'c6000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-13 10:00:00+00', 'doubles', 'A', 'A', true, true, 4, '{a7000000-0000-4000-8000-000000000003}'::uuid[], '{a7000000-0000-4000-8000-000000000002,a7000000-0000-4000-8000-000000000004}'::uuid[], 21, 15, 1),
  ('a8000000-0000-4000-8000-000000000002', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000003', 'c6000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-11-13 10:00:00+00', 'doubles', 'A', 'A', true, true, 4, '{a7000000-0000-4000-8000-000000000001}'::uuid[], '{a7000000-0000-4000-8000-000000000002,a7000000-0000-4000-8000-000000000004}'::uuid[], 21, 15, 1),
  ('a8000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000002', 'c6000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-13 10:00:00+00', 'doubles', 'B', 'A', true, true, 4, '{a7000000-0000-4000-8000-000000000004}'::uuid[], '{a7000000-0000-4000-8000-000000000001,a7000000-0000-4000-8000-000000000003}'::uuid[], 21, 15, 1),
  ('a8000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000004', 'c6000000-0000-4000-8000-000000000011', NULL, TIMESTAMPTZ '2026-11-13 10:00:00+00', 'doubles', 'B', 'A', true, true, 3, '{a7000000-0000-4000-8000-000000000002}'::uuid[], '{a7000000-0000-4000-8000-000000000001,a7000000-0000-4000-8000-000000000003}'::uuid[], 21, 15, 1),
  ('a8000000-0000-4000-8000-000000000005', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000001', 'c6000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-13 11:00:00+00', 'singles', 'A', 'A', false, true, 4, '{}'::uuid[], '{a7000000-0000-4000-8000-000000000005}'::uuid[], 21, 18, 1),
  ('a8000000-0000-4000-8000-000000000006', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000021', NULL, TIMESTAMPTZ '2026-11-13 11:00:00+00', 'singles', 'B', 'A', true, true, 3, '{}'::uuid[], '{a7000000-0000-4000-8000-000000000001}'::uuid[], 21, 18, 1),
  ('a8000000-0000-4000-8000-000000000007', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'a5000000-0000-4000-8000-000000000004', 'a7000000-0000-4000-8000-000000000006', 'c6000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 18:00:00+00', 'singles', 'B', 'A', true, true, 4, '{}'::uuid[], '{a7000000-0000-4000-8000-000000000008}'::uuid[], NULL, NULL, 1),
  ('a8000000-0000-4000-8000-000000000008', 'c9000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000005', 'a5000000-0000-4000-8000-000000000004', 'a7000000-0000-4000-8000-000000000008', 'c6000000-0000-4000-8000-000000000012', NULL, TIMESTAMPTZ '2026-11-14 18:00:00+00', 'singles', 'A', 'A', true, true, 3, '{}'::uuid[], '{a7000000-0000-4000-8000-000000000006}'::uuid[], NULL, NULL, 1),
  ('a8000000-0000-4000-8000-000000000009', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000007', 'a5000000-0000-4000-8000-000000000007', 'a7000000-0000-4000-8000-000000000007', 'c6000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-16 10:00:00+00', 'singles', 'A', 'A', true, true, 4, '{}'::uuid[], '{}'::uuid[], 21, 3, 1);

-- ---- contact-change requests ----
INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value, original_contact_revision, status, requested_at, source_command_id, submitted_by_admin_id, reviewed_by_admin_id, reviewed_at, approved_at, rejected_at, provider_operation_ref, applied_at, provider_applied_at, superseded_at, application_attempts, failure_code, updated_at) VALUES
  -- Alice: a phone change waiting, nobody else holds the number (all four checks pass)
  ('b1000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 'phone', 'app', '+639175550999', '+639175550001', 1, 'pending', TIMESTAMPTZ '2026-11-15 01:00:00+00', 'b2000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, now()),
  -- Bob: an email waiting that Alice holds (linked elsewhere), and a phone change being applied (in progress for him)
  ('b1000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000002', 'email', 'owner', 'alice@example.test', 'bob@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-16 01:00:00+00', 'b2000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, now()),
  ('b1000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000002', 'phone', 'app', '+639175550777', '+639175550002', 1, 'applying', TIMESTAMPTZ '2026-11-14 01:00:00+00', 'b2000000-0000-4000-8000-000000000003', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-14 02:00:00+00', TIMESTAMPTZ '2026-11-14 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000003', NULL, NULL, NULL, 1, NULL, now()),
  -- Carla: the email she had when she asked is not the one she has now (original changed), a newer request for the same
  -- field, and a phone change whose original no longer matches (shown in display form)
  ('b1000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000003', 'email', 'owner', 'carla.new@example.test', 'carla.old@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-10 01:00:00+00', 'b2000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, now()),
  ('b1000000-0000-4000-8000-000000000005', 'd4000000-0000-4000-8000-000000000003', 'email', 'owner', 'carla.newest@example.test', 'carla.old@example.test', 1, 'pending', TIMESTAMPTZ '2026-11-12 01:00:00+00', 'b2000000-0000-4000-8000-000000000005', 'ad000000-0000-4000-8000-000000000002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, now()),
  ('b1000000-0000-4000-8000-000000000006', 'd4000000-0000-4000-8000-000000000003', 'phone', 'owner', '+639175550003', '+639175550009', 1, 'pending', TIMESTAMPTZ '2026-11-11 01:00:00+00', 'b2000000-0000-4000-8000-000000000006', 'ad000000-0000-4000-8000-000000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, now()),
  -- Closed ones: applied, rejected, rejected and superseded, failed
  ('b1000000-0000-4000-8000-000000000007', 'd4000000-0000-4000-8000-000000000004', 'phone', 'app', '+639175550444', NULL, 1, 'applied', TIMESTAMPTZ '2026-11-01 01:00:00+00', 'b2000000-0000-4000-8000-000000000007', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-01 02:00:00+00', TIMESTAMPTZ '2026-11-01 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000007', TIMESTAMPTZ '2026-11-01 03:00:00.5+00', TIMESTAMPTZ '2026-11-01 03:00:00+00', NULL, 2, NULL, now()),
  ('b1000000-0000-4000-8000-000000000008', 'd4000000-0000-4000-8000-000000000001', 'email', 'app', 'alice2@example.test', 'alice@example.test', 1, 'rejected', TIMESTAMPTZ '2026-11-02 01:00:00+00', 'b2000000-0000-4000-8000-000000000008', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-02 02:00:00+00', NULL, TIMESTAMPTZ '2026-11-02 02:00:00+00', NULL, NULL, NULL, NULL, 0, NULL, now()),
  ('b1000000-0000-4000-8000-000000000009', 'd4000000-0000-4000-8000-000000000001', 'email', 'app', 'alice3@example.test', 'alice@example.test', 1, 'rejected', TIMESTAMPTZ '2026-11-03 01:00:00+00', 'b2000000-0000-4000-8000-000000000009', NULL, 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-04 01:00:00+00', NULL, TIMESTAMPTZ '2026-11-04 01:00:00+00', NULL, NULL, NULL, TIMESTAMPTZ '2026-11-04 01:00:00+00', 0, NULL, now()),
  ('b1000000-0000-4000-8000-000000000010', 'd4000000-0000-4000-8000-000000000005', 'email', 'owner', 'erin@example.test', NULL, 1, 'failed', TIMESTAMPTZ '2026-11-05 01:00:00+00', 'b2000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-05 02:00:00+00', TIMESTAMPTZ '2026-11-05 02:00:00+00', NULL, 'b4000000-0000-4000-8000-000000000010', NULL, NULL, NULL, 3, 'provider_unavailable', now());

-- ---- password-reset requests: 28 rows so a second page exists ----
INSERT INTO player_password_reset_requests (id, email, player_id, status, requested_at, reviewed_by_admin_id, reviewed_at, updated_at)
SELECT ('b3000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'person' || n || '@example.test', NULL, 'pending', TIMESTAMPTZ '2026-11-01 00:00:00+00' + make_interval(hours => n), NULL, NULL, now()
FROM generate_series(1, 25) AS n;
INSERT INTO player_password_reset_requests (id, email, player_id, status, requested_at, reviewed_by_admin_id, reviewed_at, auth_subject, updated_at) VALUES
  ('b3000000-0000-4000-8000-000000000101', 'alice@example.test', 'd4000000-0000-4000-8000-000000000001', 'pending', TIMESTAMPTZ '2026-11-18 00:00:00+00', NULL, NULL, NULL, now()),
  ('b3000000-0000-4000-8000-000000000102', 'bob@example.test', 'd4000000-0000-4000-8000-000000000002', 'issued', TIMESTAMPTZ '2026-11-17 00:00:00.5+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-17 01:00:00+00', 'f4000000-0000-4000-8000-000000000002', now()),
  ('b3000000-0000-4000-8000-000000000103', 'carla@example.test', 'd4000000-0000-4000-8000-000000000003', 'declined', TIMESTAMPTZ '2026-11-16 00:00:00+00', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-16 01:00:00+00', NULL, now());
-- Alice's account signs in with the platform ('rotra' after the Go relink); eligibility needs the contact to match the request
-- and the sync status to be in sync, so only Alice's pending request can be issued.

-- ---- audit events ----
INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata) VALUES
  ('ae000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'club.created', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-09-01 00:30:00+00', '{"pricing":"paid"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', 'club.price_changed', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-09-15 00:30:00+00', '{"before":{"pricing":"paid","monthlyMinor":100000,"yearlyMinor":1000000},"after":{"pricing":"paid","monthlyMinor":150000,"yearlyMinor":1500000}}'::jsonb),
  ('ae000000-0000-4000-8000-000000000003', 'ad000000-0000-4000-8000-000000000002', 'club.name_change_approved', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-10-01 00:30:00+00', '{"before":"Smash Original","after":"Smash Club"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000004', 'ad000000-0000-4000-8000-000000000001', 'club.name_change_approved', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-09-20 00:30:00+00', '{"before":"Smash Earliest","after":"Smash Original"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000005', 'ad000000-0000-4000-8000-000000000001', 'club.license_activated', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-09-02 02:00:00+00', '{"termId":"a1000000-0000-4000-8000-000000000001"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000006', 'ad000000-0000-4000-8000-000000000002', 'club.license_renewed', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-10 02:00:00+00', '{"termId":"a1000000-0000-4000-8000-000000000002"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000007', 'ad000000-0000-4000-8000-000000000001', 'club.license_activated', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-11 02:00:00+00', '{"termId":"a1000000-0000-4000-8000-0000000000ff"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000008', 'ad000000-0000-4000-8000-000000000001', 'club.unknown_action', 'club', 'c9000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-12 02:00:00+00', '{}'::jsonb),
  ('ae000000-0000-4000-8000-000000000009', 'ad000000-0000-4000-8000-000000000003', 'club.created', 'club', 'c9000000-0000-4000-8000-000000000003', NULL, TIMESTAMPTZ '2026-10-05 00:30:00+00', '{"pricing":"paid"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000010', 'ad000000-0000-4000-8000-000000000001', 'club.name_change_rejected', 'club', 'c9000000-0000-4000-8000-000000000003', NULL, TIMESTAMPTZ '2026-11-12 03:00:00+00', '{"before":"ßeta  Net Ninjas"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000011', 'ad000000-0000-4000-8000-000000000001', 'club.name_change_rejected', 'club', 'c9000000-0000-4000-8000-000000000003', NULL, TIMESTAMPTZ '2026-11-13 02:00:00+00', '{"before":"ßeta  Net Ninjas"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000012', 'ad000000-0000-4000-8000-000000000001', 'club.created', 'club', 'c9000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-10-05 00:30:00+00', '{"pricing":"free"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000013', 'ad000000-0000-4000-8000-000000000001', 'club.created', 'club', 'c9000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-11-01 00:30:00+00', '{"pricing":"free"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000014', 'ad000000-0000-4000-8000-000000000001', 'club.price_changed', 'club', 'c9000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-11-02 00:30:00+00', '{"before":{"pricing":"free"},"after":{"pricing":"paid","monthlyMinor":120000,"yearlyMinor":1200000}}'::jsonb),
  -- players
  ('ae000000-0000-4000-8000-000000000021', 'ad000000-0000-4000-8000-000000000001', 'player.created', 'player', 'd4000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-10-29 01:00:00+00', '{"name":"Dan Uy"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000022', 'ad000000-0000-4000-8000-000000000001', 'player.profile_updated', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-05 01:00:00+00', '{"before":{"name":"Alice R","nickname":null},"after":{"name":"Alice Reyes","nickname":"Ace"},"reason":"Fixed the spelling"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000023', 'ad000000-0000-4000-8000-000000000001', 'player.profile_updated', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-06 01:00:00+00', '{"changed":["name","nickname"],"after":{"name":"Alice Reyes"},"reason":"Owner request","operationId":"op-1"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000024', 'ad000000-0000-4000-8000-000000000001', 'player.profile_updated', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-06 01:00:01+00', '{"changed":["picture","name"],"after":{"name":"Alice Reyes"},"reason":"Owner request","operationId":"op-1"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000025', 'ad000000-0000-4000-8000-000000000002', 'player.password_set', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-07 01:00:00+00', '{"reason":"Lost the phone"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000026', 'ad000000-0000-4000-8000-000000000002', 'player.password_set', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-08 01:00:00+00', '{}'::jsonb),
  ('ae000000-0000-4000-8000-000000000027', 'ad000000-0000-4000-8000-000000000001', 'player.verification_override_set', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00', '{"reason":"Met in person"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000028', 'ad000000-0000-4000-8000-000000000001', 'player.verification_override_cleared', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-02 00:00:00+00', '{"reason":"Wrong person"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000029', 'ad000000-0000-4000-8000-000000000001', 'player.profile_updated', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-09 00:00:00+00', '{"before":{"name":"Bob","nickname":null},"after":{"name":"Bob Santos","nickname":"Bob"},"reason":"Typo"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000030', 'ad000000-0000-4000-8000-000000000001', 'player.profile_updated', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-09 01:00:00+00', '{"before":{"name":"Bob"},"after":{"name":"Bob Santos"},"reason":"Typo"}'::jsonb),
  -- contact-change events live on the player with the request id in the metadata
  ('ae000000-0000-4000-8000-000000000031', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_submitted', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-16 01:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000002","field":"email","reason":"Owner entered it"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000032', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_approved', 'player', 'd4000000-0000-4000-8000-000000000002', NULL, TIMESTAMPTZ '2026-11-14 02:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000003","field":"phone"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000033', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_rejected', 'player', 'd4000000-0000-4000-8000-000000000001', NULL, TIMESTAMPTZ '2026-11-02 02:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000008","field":"email"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000034', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_applied', 'player', 'd4000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-11-01 03:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000007","field":"phone"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000035', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_approved', 'player', 'd4000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-11-01 02:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000007","field":"fax"}'::jsonb),
  ('ae000000-0000-4000-8000-000000000036', 'ad000000-0000-4000-8000-000000000001', 'player.contact_change_submitted', 'player', 'd4000000-0000-4000-8000-000000000004', NULL, TIMESTAMPTZ '2026-11-01 01:00:00+00', '{"requestId":"b1000000-0000-4000-8000-000000000007","field":"phone","reason":"Not an email"}'::jsonb);
COMMIT;
