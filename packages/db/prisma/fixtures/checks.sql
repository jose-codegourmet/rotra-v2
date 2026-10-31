-- Integrity checks for a DISPOSABLE database seeded with fictional.sql (F07.19).
-- Each `expect_rejected` statement must be refused by the database; each `expect_accepted` must pass.
-- Everything runs in one transaction that is rolled back, so the seed stays as it was.
-- Run through `scripts/disposable-db.sh check`.

BEGIN;

CREATE TEMP TABLE check_results (label text, ok boolean, detail text) ON COMMIT DROP;

CREATE FUNCTION pg_temp.expect_rejected(label text, statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    SET CONSTRAINTS ALL IMMEDIATE;
    EXECUTE statement;
    RAISE EXCEPTION 'ROTRA_CHECK_NOT_REJECTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ROTRA_CHECK_NOT_REJECTED' THEN
      INSERT INTO check_results VALUES (label, false, 'accepted, expected a rejection');
    ELSIF SQLSTATE IN ('42703', '42P01', '42601', '22P02') OR (SQLSTATE = '23502' AND SQLERRM LIKE '%column "id"%') THEN
      -- A mistake in the check itself, not a rule doing its job.
      INSERT INTO check_results VALUES (label, false, 'check is broken: ' || SQLSTATE || ' ' || left(SQLERRM, 80));
    ELSE
      INSERT INTO check_results VALUES (label, true, SQLSTATE || ' ' || left(SQLERRM, 90));
    END IF;
  END;
END;
$$;

CREATE FUNCTION pg_temp.expect_accepted(label text, statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    SET CONSTRAINTS ALL IMMEDIATE;
    EXECUTE statement;
    RAISE EXCEPTION 'ROTRA_CHECK_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ROTRA_CHECK_ACCEPTED' THEN
      INSERT INTO check_results VALUES (label, true, 'accepted (rolled back)');
    ELSE
      INSERT INTO check_results VALUES (label, false, SQLSTATE || ' ' || left(SQLERRM, 90));
    END IF;
  END;
END;
$$;

\o /dev/null

-- Cross-scope rejection -------------------------------------------------------------------------
SELECT pg_temp.expect_rejected('cross-club roster entry (club A row on club B session)', $q$
  INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present_changed_at, confirmed_at, joined_at, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000b1', 'cb000000-0000-4000-8000-0000000000a4', 'X', now(), now(), now(), now()) $q$);
SELECT pg_temp.expect_rejected('cross-club club player on a roster entry', $q$
  INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present_changed_at, confirmed_at, joined_at, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a3', 'cb000000-0000-4000-8000-0000000000b2', 'X', now(), now(), now(), now()) $q$);
SELECT pg_temp.expect_rejected('shuttle plan line using another club''s inventory item', $q$
  INSERT INTO session_shuttle_plan_lines (id, club_id, session_id, inventory_item_id, tubes, position)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '17000000-0000-4000-8000-0000000000b1', 1, 1) $q$);
SELECT pg_temp.expect_rejected('roster entry selecting another entry''s assessment', $q$
  UPDATE session_players SET assessment_id = 'a5000000-0000-4000-8000-0000000a1002' WHERE id = 'e1000000-0000-4000-8000-0000000a3001' $q$);
SELECT pg_temp.expect_rejected('conflict implicating an operation from another session', $q$
  INSERT INTO sync_conflicts (id, club_id, session_id, category, updated_at)
  VALUES ('5f000000-0000-4000-8000-0000000a1999', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'payload_mismatch', now());
  INSERT INTO sync_conflict_operations (conflict_id, operation_id, club_id, session_id)
  VALUES ('5f000000-0000-4000-8000-0000000a1999', '0e000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1') $q$);
SELECT pg_temp.expect_rejected('assessment recorded by another club''s device', $q$
  INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, skill_level_id, source_operation_id, assessed_at, accepted_revision, actor_club_id, device_id)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000b', 'cb000000-0000-4000-8000-0000000000b2', '5e000000-0000-4000-8000-0000000000b1', 'e1000000-0000-4000-8000-0000000b1001',
    6, gen_random_uuid(), now(), 1, 'c1000000-0000-4000-8000-00000000000b', 'de000000-0000-4000-8000-0000000000a1') $q$);
SELECT pg_temp.expect_rejected('court hold on a court from another session', $q$
  INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at)
  VALUES ('c0000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', now()) $q$);

-- Duplicates and identity -----------------------------------------------------------------------
SELECT pg_temp.expect_rejected('duplicate club name key', $q$
  INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
  VALUES (gen_random_uuid(), 'FICTIONAL  Shuttle Club', 'fictional shuttle club', '10c00000-0000-4000-8000-000000000001', 'x', 'free', gen_random_uuid(), now()) $q$);
SELECT pg_temp.expect_rejected('duplicate club username', $q$
  UPDATE club_accounts SET username = 'fictional-shuttle' WHERE club_id = 'c1000000-0000-4000-8000-00000000000b' $q$);
SELECT pg_temp.expect_rejected('duplicate phone across players', $q$
  UPDATE player_private_contacts SET phone_e164 = '+639175550101' WHERE player_id = '91000000-0000-4000-8000-000000000002' $q$);
SELECT pg_temp.expect_rejected('second RTR ID for the same player', $q$
  INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence)
  VALUES ('91000000-0000-4000-8000-000000000001', 'RTR-PH-CEB-100926-0009', 'c1000000-0000-4000-8000-00000000000a', '10c00000-0000-4000-8000-000000000001', 'PH', 'CEB', '2026-10-09', 9) $q$);
SELECT pg_temp.expect_rejected('RTR ID rewritten', $q$
  UPDATE player_id_allocations SET rtr_id = 'RTR-PH-CEB-100926-0099' WHERE player_id = '91000000-0000-4000-8000-000000000001' $q$);
SELECT pg_temp.expect_rejected('claimed account without an email', $q$
  INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at)
  VALUES ('91000000-0000-4000-8000-000000000002', 'supabase', gen_random_uuid(), now(), 1, now()) $q$);
SELECT pg_temp.expect_rejected('same-name players stay distinct: duplicate roster entry for one club player', $q$
  INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present_changed_at, confirmed_at, joined_at, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', 'cb000000-0000-4000-8000-0000000000a1', 'X', now(), now(), now(), now()) $q$);
SELECT pg_temp.expect_accepted('same-name guest added as a separate club player', $q$
  INSERT INTO club_players (id, club_id, display_name, added_at, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', 'Juan Dela Cruz', now(), now()) $q$);
SELECT pg_temp.expect_rejected('second open contact change from the app', $q$
  INSERT INTO player_contact_change_requests (id, player_id, field, source, proposed_value, original_contact_revision, requested_at, source_command_id, updated_at)
  VALUES (gen_random_uuid(), '91000000-0000-4000-8000-000000000001', 'email', 'app', 'other.fictional@example.com', 1, now(), gen_random_uuid(), now()) $q$);
SELECT pg_temp.expect_rejected('contact change marked applied without the provider stage', $q$
  UPDATE player_contact_change_requests SET status = 'applied', applied_at = now(), reviewed_by_admin_id = 'ad000000-0000-4000-8000-000000000001',
    reviewed_at = now(), approved_at = now(), provider_operation_ref = gen_random_uuid() WHERE id = 'cc000000-0000-4000-8000-000000000001' $q$);
SELECT pg_temp.expect_rejected('sync operation reused at a taken (stream, sequence)', $q$
  INSERT INTO sync_operations (id, club_id, session_id, stream_id, sequence, entity_type, entity_id, command_kind, payload_version, payload, payload_digest, occurred_at, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'd5000000-0000-4000-8000-0000000a2001', 1, 'x', gen_random_uuid(), 'x', 1, '{}', sha256('{}'::bytea), now(), now()) $q$);
SELECT pg_temp.expect_rejected('sync operation payload overwritten', $q$
  UPDATE sync_operations SET payload = '{"present": false}' WHERE id = '0e000000-0000-4000-8000-0000000a2001' $q$);
SELECT pg_temp.expect_rejected('second payment mark for one roster entry', $q$
  INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, marked_at, source_operation_id, actor_club_id)
  VALUES ('5e000000-0000-4000-8000-0000000000a1', 'e1000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', 70000, now(), gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a') $q$);

-- Sessions and occupancy ------------------------------------------------------------------------
SELECT pg_temp.expect_rejected('overlapping session in the same club', $q$
  INSERT INTO queue_sessions (id, club_id, title, scheduled_start_at, scheduled_end_at, players_per_court, public_slug, source_command_id, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', 'Clash', '2026-11-03T11:00:00Z', '2026-11-03T13:00:00Z', 8, 'clash-check', gen_random_uuid(), now()) $q$);
SELECT pg_temp.expect_accepted('same time slot in another club', $q$
  INSERT INTO queue_sessions (id, club_id, title, scheduled_start_at, scheduled_end_at, players_per_court, public_slug, source_command_id, updated_at)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000b', 'No clash', '2026-11-03T11:00:00Z', '2026-11-03T13:00:00Z', 8, 'no-clash-check', gen_random_uuid(), now()) $q$);
SELECT pg_temp.expect_rejected('second active session in one club', $q$
  UPDATE queue_sessions SET state = 'active', started_at = now() WHERE id = '5e000000-0000-4000-8000-0000000000a3' $q$);
SELECT pg_temp.expect_rejected('level changed after lock', $q$
  UPDATE session_players SET skill_level_id = 8 WHERE id = 'e1000000-0000-4000-8000-0000000a2001' $q$);
SELECT pg_temp.expect_rejected('roster entry deleted instead of released', $q$
  DELETE FROM session_players WHERE id = 'e1000000-0000-4000-8000-0000000a3002' $q$);
SELECT pg_temp.expect_rejected('second hold on an occupied court', $q$
  INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at)
  VALUES ('c0000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', '3a000000-0000-4000-8000-0000000a2001', now()) $q$);
SELECT pg_temp.expect_rejected('hold on a match that is not active', $q$
  INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at)
  VALUES ('c0000000-0000-4000-8000-0000000a1001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', now()) $q$);

-- Permanent results -----------------------------------------------------------------------------
SELECT pg_temp.expect_rejected('decision updated', $q$
  UPDATE match_decisions SET winning_team = 'B' WHERE match_id = '3a000000-0000-4000-8000-0000000a1001' $q$);
SELECT pg_temp.expect_rejected('decision deleted', $q$
  DELETE FROM match_decisions WHERE match_id = '3a000000-0000-4000-8000-0000000a1001' $q$);
SELECT pg_temp.expect_rejected('decided match edited', $q$
  UPDATE matches SET format = 'singles' WHERE id = '3a000000-0000-4000-8000-0000000a1001' $q$);
SELECT pg_temp.expect_rejected('segment of a decided match edited', $q$
  UPDATE match_participations SET finished_with_match = false WHERE id = '9a000000-0000-4000-8000-0000000a1101' $q$);
SELECT pg_temp.expect_rejected('tied score decision', $q$
  INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, actor_club_id)
  VALUES ('3a000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'completed', 'A', 21, 21, gen_random_uuid(), now(), 'c1000000-0000-4000-8000-00000000000a') $q$);
SELECT pg_temp.expect_rejected('score that disagrees with the winner', $q$
  INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, actor_club_id)
  VALUES ('3a000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'completed', 'A', 15, 21, gen_random_uuid(), now(), 'c1000000-0000-4000-8000-00000000000a') $q$);
SELECT pg_temp.expect_accepted('winner-only decision with null scores', $q$
  INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, source_operation_id, confirmed_at, actor_club_id)
  VALUES ('3a000000-0000-4000-8000-0000000a2001', 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a2', 'completed', 'B', gen_random_uuid(), now(), 'c1000000-0000-4000-8000-00000000000a') $q$);
SELECT pg_temp.expect_rejected('fact from an invalid match', $q$
  INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, played_at, format, team, winning_team,
    full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, fact_version)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1002', 'e1000000-0000-4000-8000-0000000a1001',
    'cb000000-0000-4000-8000-0000000000a1', now(), 'singles', 'A', 'A', true, true, 4, '{}', '{}', 1) $q$);
SELECT pg_temp.expect_rejected('duplicate fact for one match participant', $q$
  INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, played_at, format, team, winning_team,
    full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, fact_version)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a', '5e000000-0000-4000-8000-0000000000a1', '3a000000-0000-4000-8000-0000000a1001', 'e1000000-0000-4000-8000-0000000a1001',
    'cb000000-0000-4000-8000-0000000000a1', now(), 'doubles', 'A', 'A', true, true, 4, '{}', '{}', 2) $q$);
SELECT pg_temp.expect_rejected('fact rewritten by a later identity link', $q$
  UPDATE player_match_facts SET player_id_at_finalization = '91000000-0000-4000-8000-000000000002' WHERE id = 'fa000000-0000-4000-8000-0000000a1003' $q$);
SELECT pg_temp.expect_rejected('finalization for an invalid session', $q$
  INSERT INTO session_finalizations (session_id, club_id, command_id, stream_manifest, manifest_digest, accepted_session_revision, policy_version_id, started_at, updated_at)
  SELECT '5e000000-0000-4000-8000-0000000000b1', 'c1000000-0000-4000-8000-00000000000b', gen_random_uuid(), '[]', sha256('[]'::bytea), 1, id, now(), now()
  FROM ranking_policy_versions WHERE version = 1 $q$);
SELECT pg_temp.expect_rejected('committed finalization manifest changed', $q$
  UPDATE session_finalizations SET accepted_session_revision = 99 WHERE session_id = '5e000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('duplicate projection job for one source', $q$
  INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, target_player_id, updated_at)
  VALUES (gen_random_uuid(), 'player_rank', 1, 'finalization', '5e000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', now()) $q$);
SELECT pg_temp.expect_rejected('projection job naming two sources', $q$
  INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, source_assessment_id, updated_at)
  VALUES (gen_random_uuid(), 'player_rank', 2, 'finalization', '5e000000-0000-4000-8000-0000000000a1', 'a5000000-0000-4000-8000-0000000a1001', now()) $q$);

-- Money: null versus zero -----------------------------------------------------------------------
SELECT pg_temp.expect_rejected('paid club without prices', $q$
  UPDATE clubs SET license_pricing = 'paid' WHERE id = 'c1000000-0000-4000-8000-00000000000b' $q$);
SELECT pg_temp.expect_rejected('yearly price without a discount', $q$
  UPDATE clubs SET license_yearly_minor = 1800000 WHERE id = 'c1000000-0000-4000-8000-00000000000a' $q$);
SELECT pg_temp.expect_rejected('free license term that records money', $q$
  INSERT INTO club_license_terms (id, club_id, plan, starts_at, ends_at, activated_by_admin_id, activated_at, source_command_id, pricing_at_activation, amount_minor, payment_reference)
  VALUES (gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000b', 'monthly', now(), now() + interval '1 month', 'ad000000-0000-4000-8000-000000000001', now(), gen_random_uuid(), 'free', 100, 'LIC-9999') $q$);
SELECT pg_temp.expect_rejected('license term amount rewritten after a price change', $q$
  UPDATE club_license_terms SET amount_minor = 200000 WHERE id = '7e000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('negative payment mark', $q$
  INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, marked_at, source_operation_id, actor_club_id)
  VALUES ('5e000000-0000-4000-8000-0000000000a1', 'e1000000-0000-4000-8000-0000000a1004', 'c1000000-0000-4000-8000-00000000000a', -1, now(), gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a') $q$);
SELECT pg_temp.expect_rejected('payment mark amount changed after the tick', $q$
  UPDATE session_payment_marks SET amount_minor = 1 WHERE session_player_id = 'e1000000-0000-4000-8000-0000000a1002' $q$);
SELECT pg_temp.expect_accepted('payment mark with no fee set (null amount)', $q$
  INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, marked_at, source_operation_id, actor_club_id)
  VALUES ('5e000000-0000-4000-8000-0000000000a1', 'e1000000-0000-4000-8000-0000000a1003', 'c1000000-0000-4000-8000-00000000000a', NULL, now(), gen_random_uuid(), 'c1000000-0000-4000-8000-00000000000a') $q$);
SELECT pg_temp.expect_rejected('custom payment mode without a fee', $q$
  UPDATE session_cost_estimates SET payment_mode = 'custom' WHERE session_id = '5e000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('ranking weights that do not total 100%', $q$
  INSERT INTO ranking_policy_versions (id, version, effective_at, assessment_weight_bp, performance_weight_bp, recent_standard_match_threshold, algorithm_version)
  VALUES (gen_random_uuid(), 2, now(), 7000, 2000, 10, 'unapproved') $q$);

-- Publication boundary and retention ------------------------------------------------------------
SELECT pg_temp.expect_rejected('Off Day in the public copy without consent', $q$
  UPDATE session_publications SET public_results = public_results || '{"offDay": {"player": "Ana Reyes"}}' WHERE id = '56000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('awards in the public copy when only standings were selected', $q$
  UPDATE session_publications SET public_results = public_results || '{"awards": {}}' WHERE id = '56000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('page deleted under a cancelled (renewed) expiry cycle', $q$
  UPDATE session_publications SET expiry_cycle_id = 'ec000000-0000-4000-8000-0000000000a1' WHERE id = '56000000-0000-4000-8000-0000000000a1';
  UPDATE session_publications SET state = 'deleted', deleted_at = now(), public_results = NULL, published_slides = '{}', published_snapshot_id = NULL, published_at = NULL
  WHERE id = '56000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('publication event rewritten', $q$
  UPDATE session_publication_events SET include_off_day = true WHERE id = '57000000-0000-4000-8000-0000000000a1' $q$);

-- Restrictive deletion --------------------------------------------------------------------------
SELECT pg_temp.expect_rejected('club deleted', $q$ DELETE FROM clubs WHERE id = 'c1000000-0000-4000-8000-00000000000a' $q$);
SELECT pg_temp.expect_rejected('player with history deleted', $q$ DELETE FROM players WHERE id = '91000000-0000-4000-8000-000000000001' $q$);
SELECT pg_temp.expect_rejected('finalized session deleted', $q$ DELETE FROM queue_sessions WHERE id = '5e000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_rejected('publication deleted (cascade path into history)', $q$ DELETE FROM session_publications WHERE id = '56000000-0000-4000-8000-0000000000a1' $q$);
SELECT pg_temp.expect_accepted('player account removed without touching player history', $q$
  DELETE FROM player_accounts WHERE player_id = '91000000-0000-4000-8000-000000000003' $q$);

\o

-- Report ----------------------------------------------------------------------------------------
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM check_results ORDER BY ok, label;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM check_results;

ROLLBACK;
