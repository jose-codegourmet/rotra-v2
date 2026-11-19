-- Fictional admins, ranking settings versions, clubs, licenses and name change requests for the Admin writes
-- characterization of the ranking settings, license, club name review and Add club groups. Applied on top of the
-- Prisma migrations. Accounts are linked with auth_provider 'supabase' (the TypeScript side); the Go test relinks
-- them to its own sign-in identities. Foreign key checks and triggers are off for this load.
-- The file is also the reset between cases, so it removes everything any of these groups writes. Edit by hand and
-- rerun apps/api/testdata/tools/capture-writes-clubs.test.mjs.
BEGIN;
SET LOCAL session_replication_role = replica;

DELETE FROM player_notifications;
DELETE FROM admin_audit_events;
DELETE FROM session_publications;
DELETE FROM club_expiry_cycles;
DELETE FROM club_entitlements;
DELETE FROM club_license_terms;
DELETE FROM club_name_change_requests;
DELETE FROM club_accounts;
DELETE FROM auth_identities WHERE audience = 'club';
DELETE FROM clubs;
DELETE FROM location_codes;
DELETE FROM ranking_policy_versions;
DELETE FROM admin_accounts;

-- ---- admins: two active, one that left ----
INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now()),
  ('ad000000-0000-4000-8000-000000000002', 'supabase', 'ad100000-0000-4000-8000-000000000002', true, 'Second Admin', now()),
  ('ad000000-0000-4000-8000-000000000003', 'supabase', 'ad100000-0000-4000-8000-000000000003', false, 'Former Admin', now());

-- ---- ranking settings: version 1 (no admin saved it), version 2 (an admin, with a note and its own algorithm
--      reference, which the next version must carry forward) ----
INSERT INTO ranking_policy_versions (id, version, effective_at, assessment_weight_bp, performance_weight_bp, recent_standard_match_threshold, algorithm_version, created_by_admin_id, change_note, created_at) VALUES
  ('b1000000-0000-4000-8000-000000000001', 1, TIMESTAMPTZ '2026-10-01 00:00:00+00', 7000, 3000, 10, 'unapproved', NULL, 'Initial settings', TIMESTAMPTZ '2026-10-01 00:00:00+00'),
  ('b1000000-0000-4000-8000-000000000002', 2, TIMESTAMPTZ '2026-11-02 08:00:00.123+00', 6000, 4000, 12, 'algo-2026-q4', 'ad000000-0000-4000-8000-000000000001', 'Raise performance weight', TIMESTAMPTZ '2026-11-02 08:00:00.123+00');

-- ---- founding cities ----
INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'PH', 'CEB', 'Cebu City', now()),
  ('10000000-0000-4000-8000-000000000002', 'PH', 'MNL', 'Manila', now());

-- ---- clubs ----
-- 1 Lahug Smashers      paid, licensed now (a term ends 2026-12-10 03:00 UTC): a renewal stacks after it
-- 2 Free Birds          free (keeps its last paid price), never licensed
-- 3 Sampaloc Shuttle    paid, lapsed: a running expiry cycle with two public pages under it
-- 4 Fresh Start         paid, never licensed, an empty entitlement row
-- 5 No Entitlement      paid, never licensed, no entitlement row at all
-- 6 Stale Projection    paid; the entitlement still says access to 2026-12-31 but its only term ended 2026-11-01
-- 7 Microseconds        paid, licensed now, the access end has microseconds (JavaScript keeps milliseconds)
INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, license_monthly_minor, license_yearly_minor, invite_code, source_command_id, created_at, updated_at, revision) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'Lahug Smashers', 'lahug smashers', '10000000-0000-4000-8000-000000000001', 'Gym 1, Lahug, Cebu City', 'paid', 150000, 1500000, 'LAHUGSMASH', 'c3000000-0000-4000-8000-0000000000c1', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-09-01 00:00:00+00', 3),
  ('d1000000-0000-4000-8000-000000000002', 'Free Birds', 'free birds', '10000000-0000-4000-8000-000000000001', 'Hall 2, Banilad, Cebu City', 'free', 100000, 1000000, 'FREEBIRDS2', 'c3000000-0000-4000-8000-0000000000c2', TIMESTAMPTZ '2026-09-02 00:00:00+00', TIMESTAMPTZ '2026-09-02 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000003', 'Sampaloc Shuttle', 'sampaloc shuttle', '10000000-0000-4000-8000-000000000002', 'Court 3, Sampaloc, Manila', 'paid', 120000, 1200000, 'SAMPALOC03', 'c3000000-0000-4000-8000-0000000000c3', TIMESTAMPTZ '2026-09-03 00:00:00+00', TIMESTAMPTZ '2026-09-03 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000004', 'Fresh Start', 'fresh start', '10000000-0000-4000-8000-000000000002', 'Court 4, Malate, Manila', 'paid', 180000, 1800000, 'FRESHSTART', 'c3000000-0000-4000-8000-0000000000c4', TIMESTAMPTZ '2026-09-04 00:00:00+00', TIMESTAMPTZ '2026-09-04 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000005', 'No Entitlement', 'no entitlement', '10000000-0000-4000-8000-000000000001', 'Court 5, Mabolo, Cebu City', 'paid', 150000, 1500000, 'NOENTITLE5', 'c3000000-0000-4000-8000-0000000000c5', TIMESTAMPTZ '2026-09-05 00:00:00+00', TIMESTAMPTZ '2026-09-05 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000006', 'Stale Projection', 'stale projection', '10000000-0000-4000-8000-000000000001', 'Court 6, Guadalupe, Cebu City', 'paid', 150000, 1500000, 'STALEPROJ6', 'c3000000-0000-4000-8000-0000000000c6', TIMESTAMPTZ '2026-09-06 00:00:00+00', TIMESTAMPTZ '2026-09-06 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000007', 'Microseconds', 'microseconds', '10000000-0000-4000-8000-000000000002', 'Court 7, Ermita, Manila', 'paid', 150000, 1500000, 'MICROSEC07', 'c3000000-0000-4000-8000-0000000000c7', TIMESTAMPTZ '2026-09-07 00:00:00+00', TIMESTAMPTZ '2026-09-07 00:00:00+00', 1);

INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, created_at, updated_at) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'lahug.smash', 'supabase', 'e1000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-09-01 00:00:00+00'),
  ('d1000000-0000-4000-8000-000000000002', 'freebirds', 'supabase', 'e1000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-09-02 00:00:00+00', TIMESTAMPTZ '2026-09-02 00:00:00+00', TIMESTAMPTZ '2026-09-02 00:00:00+00'),
  ('d1000000-0000-4000-8000-000000000003', 'sampaloc', 'supabase', 'e1000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-09-03 00:00:00+00', TIMESTAMPTZ '2026-09-03 00:00:00+00', TIMESTAMPTZ '2026-09-03 00:00:00+00'),
  ('d1000000-0000-4000-8000-000000000004', 'freshstart', 'supabase', NULL, NULL, TIMESTAMPTZ '2026-09-04 00:00:00+00', TIMESTAMPTZ '2026-09-04 00:00:00+00');

-- ---- license terms (the payment reference is LIC- and the count of all terms plus one, so the next is LIC-0005) ----
INSERT INTO club_license_terms (id, club_id, plan, starts_at, ends_at, activated_by_admin_id, activated_at, source_command_id, pricing_at_activation, paid_on, amount_minor, currency, payment_reference, notes, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'monthly', TIMESTAMPTZ '2026-11-10 03:00:00+00', TIMESTAMPTZ '2026-12-10 03:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-09 08:00:00+00', 'c3000000-0000-4000-8000-000000000001', 'paid', DATE '2026-11-09', 150000, 'PHP', 'LIC-0001', 'First month', TIMESTAMPTZ '2026-11-09 08:00:00+00'),
  ('f1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'monthly', TIMESTAMPTZ '2026-09-10 00:00:00+00', TIMESTAMPTZ '2026-10-10 00:00:00+00', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-09-09 08:00:00+00', 'c3000000-0000-4000-8000-000000000002', 'paid', DATE '2026-09-09', 120000, 'PHP', 'LIC-0002', NULL, TIMESTAMPTZ '2026-09-09 08:00:00+00'),
  ('f1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000006', 'yearly', TIMESTAMPTZ '2025-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2025-10-31 08:00:00+00', 'c3000000-0000-4000-8000-000000000003', 'paid', DATE '2025-10-31', 1500000, 'PHP', 'LIC-0003', NULL, TIMESTAMPTZ '2025-10-31 08:00:00+00'),
  ('f1000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000007', 'monthly', TIMESTAMPTZ '2026-11-05 03:00:00+00', TIMESTAMPTZ '2026-12-05 03:00:00.123789+00', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-11-04 08:00:00+00', 'c3000000-0000-4000-8000-000000000004', 'paid', DATE '2026-11-04', 150000, 'PHP', 'LIC-0004', NULL, TIMESTAMPTZ '2026-11-04 08:00:00+00');

-- ---- expiry cycles: club 3 has one running, club 6's has not started yet ----
INSERT INTO club_expiry_cycles (id, club_id, expired_at, delete_public_pages_after, cancelled_at, cancellation_term_id, state, created_at, updated_at, revision) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-10-10 00:00:00+00', TIMESTAMPTZ '2027-04-10 00:00:00+00', NULL, NULL, 'running', TIMESTAMPTZ '2026-10-10 00:05:00+00', TIMESTAMPTZ '2026-10-10 00:05:00+00', 1);

-- ---- entitlements ----
INSERT INTO club_entitlements (club_id, effective_term_id, effective_access_ends_at, current_expiry_cycle_id, refreshed_at, updated_at, revision) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-12-10 03:00:00+00', NULL, TIMESTAMPTZ '2026-11-09 08:00:00+00', TIMESTAMPTZ '2026-11-09 08:00:00+00', 2),
  ('d1000000-0000-4000-8000-000000000002', NULL, NULL, NULL, TIMESTAMPTZ '2026-09-02 00:00:00+00', TIMESTAMPTZ '2026-09-02 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000003', NULL, NULL, 'e2000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-10 00:05:00+00', TIMESTAMPTZ '2026-10-10 00:05:00+00', 3),
  ('d1000000-0000-4000-8000-000000000004', NULL, NULL, NULL, TIMESTAMPTZ '2026-09-04 00:00:00+00', TIMESTAMPTZ '2026-09-04 00:00:00+00', 1),
  ('d1000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000003', TIMESTAMPTZ '2026-12-31 00:00:00+00', NULL, TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 4),
  ('d1000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000004', TIMESTAMPTZ '2026-12-05 03:00:00.123789+00', NULL, TIMESTAMPTZ '2026-11-04 08:00:00+00', TIMESTAMPTZ '2026-11-04 08:00:00+00', 2);

-- ---- public session pages: club 3's are retained under its running cycle; club 6's are not yet under any cycle ----
INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, expiry_cycle_id, last_synced_at, deleted_at, created_at, updated_at, revision) VALUES
  ('e3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'e4000000-0000-4000-8000-000000000001', 'page-sampaloc-0001', 'details', '{}', '[]', 'e2000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-01 00:00:00+00', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-10 00:05:00+00', 2),
  ('e3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000006', 'e4000000-0000-4000-8000-000000000002', 'page-stale-details-01', 'details', '{}', '[]', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00', 1),
  ('e3000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000006', 'e4000000-0000-4000-8000-000000000003', 'page-stale-details-02', 'details', '{}', '[]', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00', 5),
  ('e3000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000006', 'e4000000-0000-4000-8000-000000000004', 'page-stale-deleted-01', 'deleted', '{}', '[]', NULL, TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-02 00:00:00+00', TIMESTAMPTZ '2026-10-01 00:00:00+00', TIMESTAMPTZ '2026-10-02 00:00:00+00', 2);

-- ---- name change requests: pending for clubs 1 (free name), 2 (free name) and 3 (a name club 1 holds); an older
--      approved one for club 1 and a rejected one for club 4 ----
INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at, state, reviewed_by_admin_id, reviewed_at, source_command_id, created_at, updated_at, revision) VALUES
  ('e5000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Lahug Smash Club', 'lahug smash club', TIMESTAMPTZ '2026-11-15 08:00:00+00', 'pending', NULL, NULL, 'c3000000-0000-4000-8000-000000000011', TIMESTAMPTZ '2026-11-15 08:00:00+00', TIMESTAMPTZ '2026-11-15 08:00:00+00', 1),
  ('e5000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'Free Birds Collective', 'free birds collective', TIMESTAMPTZ '2026-11-16 08:00:00+00', 'pending', NULL, NULL, 'c3000000-0000-4000-8000-000000000012', TIMESTAMPTZ '2026-11-16 08:00:00+00', TIMESTAMPTZ '2026-11-16 08:00:00+00', 1),
  ('e5000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000003', 'LAHUG  smashers', 'lahug smashers', TIMESTAMPTZ '2026-11-17 08:00:00+00', 'pending', NULL, NULL, 'c3000000-0000-4000-8000-000000000013', TIMESTAMPTZ '2026-11-17 08:00:00+00', TIMESTAMPTZ '2026-11-17 08:00:00+00', 1),
  ('e5000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000001', 'Lahug Smash', 'lahug smash', TIMESTAMPTZ '2026-10-01 08:00:00+00', 'approved', 'ad000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-10-02 08:00:00+00', 'c3000000-0000-4000-8000-000000000014', TIMESTAMPTZ '2026-10-01 08:00:00+00', TIMESTAMPTZ '2026-10-02 08:00:00+00', 2),
  ('e5000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-000000000004', 'Fresh Beginnings', 'fresh beginnings', TIMESTAMPTZ '2026-11-01 08:00:00+00', 'rejected', 'ad000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-11-02 08:00:00+00', 'c3000000-0000-4000-8000-000000000015', TIMESTAMPTZ '2026-11-01 08:00:00+00', TIMESTAMPTZ '2026-11-02 08:00:00+00', 2);

-- ---- audit events: a flag event and a club event, whose command ids a ranking save may be retried with ----
INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'flag.created', 'feature_flag', 'sessions_beta', 'c0000000-0000-4000-8000-0000000000a1', TIMESTAMPTZ '2026-11-02 08:00:00.123+00', '{"value": true}'),
  ('a0000000-0000-4000-8000-000000000002', 'ad000000-0000-4000-8000-000000000001', 'club.created', 'club', 'd0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000b2', TIMESTAMPTZ '2026-11-03 08:00:00+00', NULL);

COMMIT;
