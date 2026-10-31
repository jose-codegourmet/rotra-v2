-- Fictional fixtures for a DISPOSABLE database only (F07.19). Every name, phone, email and auth subject
-- is invented; phones use the 555 range. IDs are fixed, so a rebuild + seed always gives the same
-- relationships. Run through `scripts/disposable-db.sh seed`, never against a shared project.
--
-- Covers: two clubs (paid and free/tester), same-name players and guests, claimed/unclaimed profiles
-- with private contacts, RTR IDs, a claim link, a pending contact change, sessions in prepared /
-- active / completed / invalid states, a demoted waitlist entry, a join request, a device stream with
-- a gap and an open conflict, decided and active matches with holds, costs and payment marks, a
-- finalization with facts, a snapshot, projection work, current rank, a guest-history attribution,
-- and a publication without Off Day.

BEGIN;

-- Reference data ------------------------------------------------------------------------------
INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES
  ('10c00000-0000-4000-8000-000000000001', 'PH', 'CEB', 'Cebu City', now()),
  ('10c00000-0000-4000-8000-000000000002', 'PH', 'MNL', 'Manila', now());

INSERT INTO admin_accounts (id, auth_provider, auth_subject, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'a0000000-0000-4000-8000-0000000000a1', 'Fictional Owner', now());

-- Clubs: A is paid, B is a free tester club with no prices ---------------------------------------
INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing,
  license_monthly_minor, license_yearly_minor, default_players_per_court, default_entrance_fee_minor,
  source_command_id, updated_at) VALUES
  ('c1000000-0000-4000-8000-00000000000a', 'Fictional Shuttle Club', 'fictional shuttle club',
   '10c00000-0000-4000-8000-000000000001', '1 Sample Street, Cebu City', 'paid', 150000, 1500000, 8, 5000,
   'c0de0000-0000-4000-8000-0000000000a1', now()),
  ('c1000000-0000-4000-8000-00000000000b', 'Tester Badminton Club', 'tester badminton club',
   '10c00000-0000-4000-8000-000000000002', '2 Example Avenue, Manila', 'free', NULL, NULL, 6, NULL,
   'c0de0000-0000-4000-8000-0000000000b1', now());

INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, updated_at) VALUES
  ('c1000000-0000-4000-8000-00000000000a', 'fictional-shuttle', 'supabase', 'a0000000-0000-4000-8000-0000000000c1', '2026-10-01T00:00:00Z', now()),
  -- Provisioning not finished: no provider subject yet.
  ('c1000000-0000-4000-8000-00000000000b', 'tester-club', 'supabase', NULL, NULL, now());

-- Licenses: a paid term with evidence, a free ₱0 term, one cancelled expiry cycle ------------------
INSERT INTO club_license_terms (id, club_id, plan, starts_at, ends_at, activated_by_admin_id, activated_at,
  source_command_id, pricing_at_activation, paid_on, amount_minor, payment_reference) VALUES
  ('7e000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'monthly',
   '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z', 'ad000000-0000-4000-8000-000000000001', '2026-09-01T00:00:00Z',
   'c0de0000-0000-4000-8000-0000000000a2', 'paid', '2026-08-30', 150000, 'LIC-0001'),
  ('7e000000-0000-4000-8000-0000000000a2', 'c1000000-0000-4000-8000-00000000000a', 'yearly',
   '2026-10-03T00:00:00Z', '2027-10-03T00:00:00Z', 'ad000000-0000-4000-8000-000000000001', '2026-10-03T00:00:00Z',
   'c0de0000-0000-4000-8000-0000000000a3', 'paid', '2026-10-02', 1500000, 'LIC-0002'),
  ('7e000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', 'yearly',
   '2026-10-01T00:00:00Z', '2027-10-01T00:00:00Z', 'ad000000-0000-4000-8000-000000000001', '2026-10-01T00:00:00Z',
   'c0de0000-0000-4000-8000-0000000000b2', 'free', NULL, 0, 'LIC-0003');

-- Club A lapsed for two days, then renewed: that cycle is cancelled by the renewal term.
INSERT INTO club_expiry_cycles (id, club_id, expired_at, delete_public_pages_after, cancelled_at,
  cancellation_term_id, state, updated_at) VALUES
  ('ec000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '2026-10-01T00:00:00Z',
   '2027-04-01T00:00:00Z', '2026-10-03T00:00:00Z', '7e000000-0000-4000-8000-0000000000a2', 'cancelled', now());

INSERT INTO club_entitlements (club_id, effective_term_id, effective_access_ends_at, refreshed_at, updated_at) VALUES
  ('c1000000-0000-4000-8000-00000000000a', '7e000000-0000-4000-8000-0000000000a2', '2027-10-03T00:00:00Z', now(), now()),
  ('c1000000-0000-4000-8000-00000000000b', '7e000000-0000-4000-8000-0000000000b1', '2027-10-01T00:00:00Z', now(), now());

INSERT INTO club_name_change_requests (id, club_id, requested_name, requested_name_key, requested_at,
  source_command_id, updated_at) VALUES
  ('c4000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', 'Tester Shuttle Club',
   'tester shuttle club', '2026-10-20T10:00:00Z', 'c0de0000-0000-4000-8000-0000000000b3', now());

INSERT INTO admin_audit_events (id, actor_admin_id, action, target_type, target_id, source_command_id, occurred_at, metadata) VALUES
  ('ae000000-0000-4000-8000-000000000001', 'ad000000-0000-4000-8000-000000000001', 'license.activated', 'club',
   'c1000000-0000-4000-8000-00000000000a', 'c0de0000-0000-4000-8000-0000000000a3', '2026-10-03T00:00:00Z',
   '{"plan": "yearly", "amountMinor": 1500000}');

-- Players: two "Juan Dela Cruz" (one claimed, one not) and a claimed "Maria Santos" ----------------
INSERT INTO players (id, full_name, nickname, profile_state, hide_phone_from_clubs, updated_at) VALUES
  ('91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', 'Juan', 'claimed', false, now()),
  ('91000000-0000-4000-8000-000000000002', 'Juan Dela Cruz', NULL, 'unclaimed', false, now()),
  ('91000000-0000-4000-8000-000000000003', 'Maria Santos', 'Mars', 'claimed', true, now());

INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('91000000-0000-4000-8000-000000000001', '+639175550101', 'juan.fictional@example.com', now()),
  ('91000000-0000-4000-8000-000000000002', '+639175550102', NULL, now()),
  ('91000000-0000-4000-8000-000000000003', '+639175550103', 'maria.fictional@example.com', now());

INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at) VALUES
  ('91000000-0000-4000-8000-000000000001', 'supabase', 'a0000000-0000-4000-8000-0000000000e1', '2026-10-10T00:00:00Z', 1, now()),
  ('91000000-0000-4000-8000-000000000003', 'supabase', 'a0000000-0000-4000-8000-0000000000e3', '2026-10-11T00:00:00Z', 1, now());

INSERT INTO player_social_links (id, player_id, provider, url, updated_at) VALUES
  ('5c000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'facebook', 'https://example.com/juan-fictional', now());

INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES
  ('10c00000-0000-4000-8000-000000000001', '2026-10-09', 2),
  ('10c00000-0000-4000-8000-000000000002', '2026-10-09', 1);

INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES
  ('91000000-0000-4000-8000-000000000001', 'RTR-PH-CEB-100926-0001', 'c1000000-0000-4000-8000-00000000000a', '10c00000-0000-4000-8000-000000000001', 'PH', 'CEB', '2026-10-09', 1),
  ('91000000-0000-4000-8000-000000000002', 'RTR-PH-CEB-100926-0002', 'c1000000-0000-4000-8000-00000000000a', '10c00000-0000-4000-8000-000000000001', 'PH', 'CEB', '2026-10-09', 2),
  ('91000000-0000-4000-8000-000000000003', 'RTR-PH-MNL-100926-0001', 'c1000000-0000-4000-8000-00000000000b', '10c00000-0000-4000-8000-000000000002', 'PH', 'MNL', '2026-10-09', 1);

INSERT INTO player_claim_links (id, player_id, issuing_club_id, token_digest, issued_at, expires_at, updated_at) VALUES
  ('c7000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-00000000000a',
   sha256('fictional-claim-token-0002'::bytea), '2026-10-20T00:00:00Z', '2026-11-20T00:00:00Z', now());

INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_value,
  original_contact_revision, requested_at, source_command_id, updated_at) VALUES
  ('cc000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'phone', 'app', '+639175550111',
   '+639175550101', 1, '2026-10-25T00:00:00Z', 'c0de0000-0000-4000-8000-0000000000d1', now());

-- Club players: club A has a linked Juan, the unclaimed Juan, and a same-name guest; club B also
-- knows the claimed Juan (cross-club link) ---------------------------------------------------------
INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, updated_at) VALUES
  ('cb000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', 'Juan', '2026-10-09T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000a2', 'c1000000-0000-4000-8000-00000000000a', '91000000-0000-4000-8000-000000000002', 'Juan Dela Cruz', NULL, '2026-10-09T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000a3', 'c1000000-0000-4000-8000-00000000000a', NULL, 'Juan Dela Cruz', 'JD', '2026-10-15T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000a4', 'c1000000-0000-4000-8000-00000000000a', NULL, 'Ana Reyes', NULL, '2026-10-15T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000a5', 'c1000000-0000-4000-8000-00000000000a', NULL, 'Ben Cruz', NULL, '2026-10-28T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', '91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', NULL, '2026-10-12T00:00:00Z', now()),
  ('cb000000-0000-4000-8000-0000000000b2', 'c1000000-0000-4000-8000-00000000000b', '91000000-0000-4000-8000-000000000003', 'Maria Santos', 'Mars', '2026-10-12T00:00:00Z', now());

INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, captured_at, updated_at) VALUES
  ('cb000000-0000-4000-8000-0000000000a5', 'c1000000-0000-4000-8000-00000000000a', '+639175550199', '2026-10-28T00:00:00Z', now());

INSERT INTO club_venues (id, club_id, name, address, court_fee_per_court_hour_minor, entrance_fee_minor, updated_at) VALUES
  ('ce000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'Court House', '3 Sample Road', 30000, NULL, now()),
  ('ce000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', 'Court House', '4 Example Road', NULL, 0, now());

-- Sessions: A has completed (S1), active (S2), prepared (S3); B has an invalid one (S4) ------------
INSERT INTO queue_sessions (id, club_id, title, scheduled_start_at, scheduled_end_at, venue_id, venue_name, venue_address,
  state, invalid_reason, minimum_games, minimum_is_calculated, players_per_court, started_at, finalized_at,
  start_license_term_id, public_slug, source_command_id, updated_at) VALUES
  ('5e000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'Tuesday Doubles',
   '2026-10-20T10:00:00Z', '2026-10-20T13:00:00Z', 'ce000000-0000-4000-8000-0000000000a1', 'Court House', '3 Sample Road',
   'completed', NULL, 4, false, 8, '2026-10-20T10:05:00Z', '2026-10-20T13:10:00Z', '7e000000-0000-4000-8000-0000000000a2',
   'tuesday-a1', 'c0de0000-0000-4000-8000-0000000005a1', now()),
  ('5e000000-0000-4000-8000-0000000000a2', 'c1000000-0000-4000-8000-00000000000a', 'Friday Open Play',
   '2026-10-30T10:00:00Z', '2026-10-30T13:00:00Z', 'ce000000-0000-4000-8000-0000000000a1', 'Court House', '3 Sample Road',
   'active', NULL, 3, false, 8, '2026-10-30T10:02:00Z', NULL, '7e000000-0000-4000-8000-0000000000a2',
   'friday-a2', 'c0de0000-0000-4000-8000-0000000005a2', now()),
  ('5e000000-0000-4000-8000-0000000000a3', 'c1000000-0000-4000-8000-00000000000a', 'Next Tuesday',
   '2026-11-03T10:00:00Z', '2026-11-03T12:00:00Z', 'ce000000-0000-4000-8000-0000000000a1', 'Court House', '3 Sample Road',
   'prepared', NULL, 2, true, 2, NULL, NULL, NULL, 'next-tuesday-a3', 'c0de0000-0000-4000-8000-0000000005a3', now()),
  ('5e000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', 'Tester Night',
   '2026-10-25T10:00:00Z', '2026-10-25T12:00:00Z', 'ce000000-0000-4000-8000-0000000000b1', 'Court House', '4 Example Road',
   'invalid', 'Fictional: records from the second device were lost.', 2, false, 6, '2026-10-25T10:00:00Z', NULL,
   '7e000000-0000-4000-8000-0000000000b1', 'tester-night-b1', 'c0de0000-0000-4000-8000-0000000005b1', now());

INSERT INTO session_courts (id, club_id, session_id, label, updated_at) VALUES
  ('c0000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'Court 1', now()),
  ('c0000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'Court 1', now()),
  ('c0000000-0000-4000-8000-0000000a2002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'Court 2', now()),
  ('c0000000-0000-4000-8000-0000000a3001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'Court 1', now()),
  ('c0000000-0000-4000-8000-0000000b1001', 'c1000000-0000-4000-8000-00000000000b', '5e000000-0000-4000-8000-0000000000b1', 'Court 1', now());

INSERT INTO club_session_reservations (club_id, session_id, acquired_at) VALUES
  ('c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '2026-10-30T09:00:00Z');

-- Device and stream (needed for provenance below) -----------------------------------------------
INSERT INTO devices (id, club_id, label, registered_at, updated_at) VALUES
  ('de000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'Front desk tablet', '2026-10-01T00:00:00Z', now());

-- Roster: entries first, then their assessments, then point each entry at its own assessment ------
INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present,
  present_changed_at, skill_level_id, confirmed_at, joined_at, updated_at) VALUES
  ('e1000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'cb000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', true, '2026-10-20T10:05:00Z', 4, '2026-10-19T00:00:01Z', '2026-10-19T00:00:01Z', now()),
  ('e1000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'cb000000-0000-4000-8000-0000000000a2', '91000000-0000-4000-8000-000000000002', 'Juan Dela Cruz', true, '2026-10-20T10:05:00Z', 3, '2026-10-19T00:00:02Z', '2026-10-19T00:00:02Z', now()),
  ('e1000000-0000-4000-8000-0000000a1003', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'cb000000-0000-4000-8000-0000000000a3', NULL, 'Juan Dela Cruz', true, '2026-10-20T10:05:00Z', 4, '2026-10-19T00:00:03Z', '2026-10-19T00:00:03Z', now()),
  ('e1000000-0000-4000-8000-0000000a1004', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'cb000000-0000-4000-8000-0000000000a4', NULL, 'Ana Reyes', true, '2026-10-20T10:05:00Z', 3, '2026-10-19T00:00:04Z', '2026-10-19T00:00:04Z', now()),
  ('e1000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'cb000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', true, '2026-10-30T10:02:00Z', 4, '2026-10-29T00:00:01Z', '2026-10-29T00:00:01Z', now()),
  ('e1000000-0000-4000-8000-0000000a2002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'cb000000-0000-4000-8000-0000000000a4', NULL, 'Ana Reyes', true, '2026-10-30T10:02:00Z', 3, '2026-10-29T00:00:02Z', '2026-10-29T00:00:02Z', now()),
  -- S3 (prepared, budget 2): one live entry; Ana was demoted when the budget shrank (released, kept).
  ('e1000000-0000-4000-8000-0000000a3001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'cb000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', false, '2026-10-30T00:00:00Z', 4, '2026-10-30T00:00:01Z', '2026-10-30T00:00:01Z', now()),
  ('e1000000-0000-4000-8000-0000000a3002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'cb000000-0000-4000-8000-0000000000a4', NULL, 'Ana Reyes', false, '2026-10-30T00:00:00Z', 3, '2026-10-30T00:00:02Z', '2026-10-30T00:00:02Z', now()),
  ('e1000000-0000-4000-8000-0000000b1001', 'c1000000-0000-4000-8000-00000000000b', '5e000000-0000-4000-8000-0000000000b1', 'cb000000-0000-4000-8000-0000000000b2', '91000000-0000-4000-8000-000000000003', 'Maria Santos', true, '2026-10-25T10:00:00Z', 6, '2026-10-24T00:00:01Z', '2026-10-24T00:00:01Z', now());

INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, player_id_at_assessment,
  skill_level_id, source_operation_id, assessed_at, accepted_revision, actor_club_id, device_id)
SELECT ('a5' || substr(sp.id::text, 3))::uuid, sp.club_id, sp.club_player_id, sp.session_id, sp.id, sp.player_id_at_entry,
  sp.skill_level_id, ('0f' || substr(sp.id::text, 3))::uuid, sp.confirmed_at, 1, sp.club_id,
  CASE WHEN sp.club_id = 'c1000000-0000-4000-8000-00000000000a' THEN 'de000000-0000-4000-8000-0000000000a1'::uuid END
FROM session_players sp;

UPDATE session_players sp SET assessment_id = ('a5' || substr(sp.id::text, 3))::uuid,
  level_locked_at = CASE WHEN s.state <> 'prepared' THEN s.started_at END
FROM queue_sessions s WHERE s.id = sp.session_id;

UPDATE session_players SET released_at = '2026-10-30T12:00:00Z', release_reason = 'demoted'
WHERE id = 'e1000000-0000-4000-8000-0000000a3002';

INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, demoted_at, demoted_confirmed_at, updated_at) VALUES
  ('a1000000-0000-4000-8000-0000000a3002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'cb000000-0000-4000-8000-0000000000a4', 3, '2026-10-30T00:00:02Z', '2026-10-30T12:00:00Z', '2026-10-30T00:00:02Z', now()),
  ('a1000000-0000-4000-8000-0000000a3005', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'cb000000-0000-4000-8000-0000000000a5', NULL, '2026-10-30T13:00:00Z', NULL, NULL, now());

INSERT INTO session_join_requests (id, club_id, session_id, name, phone_e164, stated_band, requested_at, updated_at) VALUES
  ('a7000000-0000-4000-8000-0000000a3001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'Carlo Visitor', '+639175550177', 'intermediate', '2026-10-31T01:00:00Z', now());

-- Matches: S1 has a winner-only completed doubles (M1) and an invalid match (M2); S2 has an active
-- doubles on Court 1 with holds (M3) ------------------------------------------------------------------
INSERT INTO matches (id, club_id, session_id, match_no, state, format, origin, manual_protected, source_operation_id, started_at, updated_at) VALUES
  ('3a000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 1, 'active', 'doubles', 'manual', true, '0a000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', now()),
  ('3a000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 2, 'active', 'singles', 'auto', false, '0a000000-0000-4000-8000-0000000a1002', '2026-10-20T10:40:00Z', now()),
  ('3a000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 1, 'active', 'singles', 'manual', true, '0a000000-0000-4000-8000-0000000a2001', '2026-10-30T10:10:00Z', now());

INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no,
  joined_operation_id, joined_at, started_with_match, finished_with_match, updated_at) VALUES
  ('9a000000-0000-4000-8000-0000000a1101', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1001', 'A', 1, '0a000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a1102', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1002', 'A', 1, '0a000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a1103', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1003', 'B', 1, '0a000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a1104', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1004', 'B', 1, '0a000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a1201', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1002', 'e1000000-0000-4000-8000-0000000a1001', 'A', 1, '0a000000-0000-4000-8000-0000000a1002', '2026-10-20T10:40:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a1202', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1002', 'e1000000-0000-4000-8000-0000000a1004', 'B', 1, '0a000000-0000-4000-8000-0000000a1002', '2026-10-20T10:40:00Z', true, true, now()),
  ('9a000000-0000-4000-8000-0000000a2101', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', 'e1000000-0000-4000-8000-0000000a2001', 'A', 1, '0a000000-0000-4000-8000-0000000a2001', '2026-10-30T10:10:00Z', true, false, now()),
  ('9a000000-0000-4000-8000-0000000a2102', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', 'e1000000-0000-4000-8000-0000000a2002', 'B', 1, '0a000000-0000-4000-8000-0000000a2001', '2026-10-30T10:10:00Z', true, false, now());

INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, released_at, acquire_operation_id, release_operation_id) VALUES
  ('c5000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'c0000000-0000-4000-8000-0000000a1001', '2026-10-20T10:10:00Z', '2026-10-20T10:35:00Z', '0a000000-0000-4000-8000-0000000a1001', '0b000000-0000-4000-8000-0000000a1001'),
  ('c5000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', 'c0000000-0000-4000-8000-0000000a2001', '2026-10-30T10:10:00Z', NULL, '0a000000-0000-4000-8000-0000000a2001', NULL);

INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES
  ('c0000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', '2026-10-30T10:10:00Z');
INSERT INTO active_player_holds (session_player_id, club_id, session_id, match_id, player_id, held_at) VALUES
  ('e1000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', '91000000-0000-4000-8000-000000000001', '2026-10-30T10:10:00Z'),
  ('e1000000-0000-4000-8000-0000000a2002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', NULL, '2026-10-30T10:10:00Z');

-- Decisions: M1 winner-only (no scores), M2 invalid. Then end both matches.
INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, source_operation_id, confirmed_at, actor_club_id, device_id) VALUES
  ('3a000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'completed', 'A', '0d000000-0000-4000-8000-0000000a1001', '2026-10-20T10:35:00Z', 'c1000000-0000-4000-8000-00000000000a', 'de000000-0000-4000-8000-0000000000a1'),
  ('3a000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'invalid', NULL, '0d000000-0000-4000-8000-0000000a1002', '2026-10-20T10:45:00Z', 'c1000000-0000-4000-8000-00000000000a', 'de000000-0000-4000-8000-0000000000a1');
UPDATE matches SET state = 'completed', ended_at = '2026-10-20T10:35:00Z' WHERE id = '3a000000-0000-4000-8000-0000000a1001';
UPDATE matches SET state = 'invalid', ended_at = '2026-10-20T10:45:00Z' WHERE id = '3a000000-0000-4000-8000-0000000a1002';

-- Sync: S2 stream with a gap (2 missing) and an open conflict on operation 3 ------------------------
INSERT INTO device_session_streams (id, club_id, session_id, device_id, generation_no, downloaded_revision,
  contiguous_sequence, highest_received_sequence, enrolled_at, updated_at) VALUES
  ('d5000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'de000000-0000-4000-8000-0000000000a1', 1, 4, 1, 3, '2026-10-30T09:00:00Z', now());
INSERT INTO sync_operations (id, club_id, session_id, stream_id, sequence, entity_type, entity_id, command_kind,
  base_revision, payload_version, payload, payload_digest, occurred_at, received_at, state, processed_at, result_revision, updated_at) VALUES
  ('0e000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'd5000000-0000-4000-8000-0000000a2001', 1, 'session_player', 'e1000000-0000-4000-8000-0000000a2002', 'set_presence', 4, 1, '{"present": true}', sha256('{"present": true}'::bytea), '2026-10-30T10:01:00Z', '2026-10-30T10:01:05Z', 'accepted', '2026-10-30T10:01:05Z', 5, now()),
  ('0e000000-0000-4000-8000-0000000a2003', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'd5000000-0000-4000-8000-0000000a2001', 3, 'match', '3a000000-0000-4000-8000-0000000a2001', 'start_match', 5, 1, '{"courtId": "c0000000-0000-4000-8000-0000000a2001"}', sha256('{"courtId": "c0000000-0000-4000-8000-0000000a2001"}'::bytea), '2026-10-30T10:09:00Z', '2026-10-30T10:15:00Z', 'conflicted', '2026-10-30T10:15:00Z', NULL, now());
INSERT INTO sync_conflicts (id, club_id, session_id, category, detected_at, evidence, updated_at) VALUES
  ('5f000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'missing_prerequisite', '2026-10-30T10:15:00Z', '{"missingSequence": 2}', now());
INSERT INTO sync_conflict_operations (conflict_id, operation_id, club_id, session_id) VALUES
  ('5f000000-0000-4000-8000-0000000a2001', '0e000000-0000-4000-8000-0000000a2003', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2');

-- Money: inventory, an S1 estimate with a plan line, two paid marks (one deliberately ₱0) ------------
INSERT INTO inventory_items (id, club_id, name, category, stock, unit_cost_minor, updated_at) VALUES
  ('17000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'Fictional Feather Tube', 'shuttlecocks', 12, 95000, now()),
  ('17000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', 'Tester Tube', 'shuttlecocks', 0, 0, now());
INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode, updated_at) VALUES
  ('5e000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 30000, NULL, 'break_even', now());
INSERT INTO session_shuttle_plan_lines (id, club_id, session_id, inventory_item_id, tubes, position) VALUES
  ('18000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '17000000-0000-4000-8000-0000000000a1', 2, 0);
INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, marked_at, source_operation_id, actor_club_id, device_id) VALUES
  ('5e000000-0000-4000-8000-0000000000a1', 'e1000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', 70000, '2026-10-20T10:20:00Z', '0c000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', 'de000000-0000-4000-8000-0000000000a1'),
  ('5e000000-0000-4000-8000-0000000000a1', 'e1000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', 0, '2026-10-20T10:21:00Z', '0c000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', NULL);

-- Finalization of S1 with facts for the completed doubles only -----------------------------------
INSERT INTO session_finalizations (session_id, club_id, command_id, state, stage, stream_manifest, manifest_digest,
  accepted_session_revision, policy_version_id, started_at, committed_at, completed_at, facts_digest, updated_at)
SELECT '5e000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', 'f1000000-0000-4000-8000-0000000000a1',
  'done', 'slides', '[]', sha256('[]'::bytea), 12, p.id, '2026-10-20T13:05:00Z', '2026-10-20T13:06:00Z', '2026-10-20T13:10:00Z',
  sha256('fictional-facts-s1'::bytea), now()
FROM ranking_policy_versions p WHERE p.version = 1;

INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization,
  played_at, format, team, winning_team, full_participation, standard_match, skill_level_snapshot_id,
  partner_entry_ids, opponent_entry_ids, fact_version) VALUES
  ('fa000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1001', 'cb000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', '2026-10-20T10:35:00Z', 'doubles', 'A', 'A', true, true, 4, ARRAY['e1000000-0000-4000-8000-0000000a1002']::uuid[], ARRAY['e1000000-0000-4000-8000-0000000a1003', 'e1000000-0000-4000-8000-0000000a1004']::uuid[], 1),
  ('fa000000-0000-4000-8000-0000000a1002', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1002', 'cb000000-0000-4000-8000-0000000000a2', '91000000-0000-4000-8000-000000000002', '2026-10-20T10:35:00Z', 'doubles', 'A', 'A', true, true, 3, ARRAY['e1000000-0000-4000-8000-0000000a1001']::uuid[], ARRAY['e1000000-0000-4000-8000-0000000a1003', 'e1000000-0000-4000-8000-0000000a1004']::uuid[], 1),
  ('fa000000-0000-4000-8000-0000000a1003', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1003', 'cb000000-0000-4000-8000-0000000000a3', NULL, '2026-10-20T10:35:00Z', 'doubles', 'B', 'A', true, true, 4, ARRAY['e1000000-0000-4000-8000-0000000a1004']::uuid[], ARRAY['e1000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1002']::uuid[], 1),
  ('fa000000-0000-4000-8000-0000000a1004', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1004', 'cb000000-0000-4000-8000-0000000000a4', NULL, '2026-10-20T10:35:00Z', 'doubles', 'B', 'A', true, true, 3, ARRAY['e1000000-0000-4000-8000-0000000a1003']::uuid[], ARRAY['e1000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1002']::uuid[], 1);

INSERT INTO club_session_player_summaries (id, club_id, session_id, session_player_id, club_player_id, player_id_snapshot,
  full_games, standard_games, fun_games, wins, losses, skill_level_snapshot_id, summary_version, projected_at)
SELECT ('5a' || substr(f.session_player_id::text, 3))::uuid, f.club_id, f.session_id, f.session_player_id, f.club_player_id,
  f.player_id_at_finalization, 1, 1, 0, (f.team = f.winning_team)::int, (f.team <> f.winning_team)::int, f.skill_level_snapshot_id, 1,
  '2026-10-20T13:07:00Z'
FROM player_match_facts f;

INSERT INTO session_result_snapshots (id, club_id, session_id, version, calculation_version, standings, awards, off_day, baseline_session_ids, generated_at) VALUES
  ('55000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 1, 'prototype-reference',
   '[{"position": 1, "name": "Juan Dela Cruz", "wins": 1, "losses": 0}]', '{"mvp": null}', '{"player": "Ana Reyes"}', '{}', '2026-10-20T13:08:00Z');

-- Guest history: club A's same-name guest is confirmed as the unclaimed Juan (facts untouched).
INSERT INTO player_history_attributions (id, club_id, club_player_id, player_id, confirmed_at, confirmation_evidence, source_command_id) VALUES
  ('a8000000-0000-4000-8000-0000000000a3', 'c1000000-0000-4000-8000-00000000000a', 'cb000000-0000-4000-8000-0000000000a3', '91000000-0000-4000-8000-000000000002',
   '2026-10-28T00:00:00Z', '{"check": "rtr-id", "reviewedBy": "club"}', 'c0de0000-0000-4000-8000-0000000000a8');

INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, target_player_id, status, completed_at, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'player_rank', 1, 'finalization', '5e000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', 'done', '2026-10-20T13:09:00Z', now());
INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_attribution_id, target_player_id, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000002', 'player_history', 1, 'attribution', 'a8000000-0000-4000-8000-0000000000a3', '91000000-0000-4000-8000-000000000002', now());
INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_assessment_id, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000003', 'player_rank', 1, 'assessment', 'a5000000-0000-4000-8000-0000000a3001', now());

INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, assessment_component, performance_component,
  input_counts, policy_version_id, algorithm_version, window_start, window_end, calculated_at, input_watermark,
  next_recheck_at, recent_standard_match_count, last_valid_played_at, leaderboard_eligible, updated_at)
SELECT '91000000-0000-4000-8000-000000000001', 4, NULL, 'provisional', NULL, NULL, '{"assessments": 2, "matches": 1}',
  p.id, 'unapproved', '2026-07-20T00:00:00Z', '2026-10-20T13:09:00Z', '2026-10-20T13:09:00Z', 12,
  '2026-11-20T00:00:00Z', 1, '2026-10-20T10:35:00Z', false, now()
FROM ranking_policy_versions p WHERE p.version = 1;

-- Publication of S1: standings only, Off Day not included -----------------------------------------
INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection,
  published_snapshot_id, published_slides, include_off_day, public_results, published_at, last_synced_at, updated_at) VALUES
  ('56000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1',
   'fictionalPublicKey00001', 'published', '{"title": "Tuesday Doubles", "minimumGames": 4}',
   '[{"name": "Juan Dela Cruz", "hasProfile": true}, {"name": "Ana Reyes", "hasProfile": false}]',
   '55000000-0000-4000-8000-0000000000a1', ARRAY['standings']::result_slide[], false,
   '{"standings": [{"position": 1, "name": "Juan Dela Cruz", "wins": 1, "losses": 0}]}', '2026-10-20T14:00:00Z', '2026-10-20T14:00:00Z', now());
INSERT INTO session_publication_events (id, club_id, session_id, publication_id, snapshot_id, slides, include_off_day, actor_club_id, source_command_id, occurred_at) VALUES
  ('57000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '56000000-0000-4000-8000-0000000000a1',
   '55000000-0000-4000-8000-0000000000a1', ARRAY['standings']::result_slide[], false, 'c1000000-0000-4000-8000-00000000000a', 'c0de0000-0000-4000-8000-0000000000a9', '2026-10-20T14:00:00Z');
INSERT INTO result_exports (id, club_id, session_id, snapshot_id, slides, format, include_off_day, club_name_snapshot, frame_count, source_command_id) VALUES
  ('58000000-0000-4000-8000-0000000000a1', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '55000000-0000-4000-8000-0000000000a1',
   ARRAY['standings', 'awards']::result_slide[], 'story', true, 'Fictional Shuttle Club', 1, 'c0de0000-0000-4000-8000-0000000000aa');

COMMIT;
