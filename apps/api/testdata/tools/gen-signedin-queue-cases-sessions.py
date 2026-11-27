# Cases of the Queue session reads. Included by gen-signedin-queue-cases.py (it runs this file with its names in scope).
# Sessions of the seed: 1 Live Now (Smash, active), 2 Wrapping Up (Birdie, finalizing), 3 Not Yet (Ninjas, prepared),
# 4 Friday Night, 6 October Night, 7 Short Night (Smash, completed), 5 Saturday Morning (Birdie, completed),
# 8 Invalid Night (Ninjas, invalid), 9 Next Friday (Smash, prepared).
SIDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
stale_close = scenario("requests_close_stale")

started = scenario("live_started_under_term", "UPDATE queue_sessions SET start_license_term_id = 'a1000000-0000-4000-8000-000000000002' WHERE id = '%s'" % SESSION(1))
expired_started = scenario("smash_expired_live_started", "UPDATE club_entitlements SET effective_access_ends_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE club_id = '%s'" % CLUB[1],
                           "UPDATE queue_sessions SET start_license_term_id = 'a1000000-0000-4000-8000-000000000002' WHERE id = '%s'" % SESSION(1))

case("sessions-signed-out", "/api/sessions")
for n in ALL:
    case(f"sessions-club{n}", "/api/sessions", club=n)
case("sessions-disabled", "/api/sessions", club=6, go=(401, "unauthenticated"))
case("sessions-club1-expired", "/api/sessions", club=1, scenario=expired)
case("sessions-club1-no-courts", "/api/sessions", club=1, scenario=scenario("no_courts", "DELETE FROM session_courts"))
case("sessions-club1-later", "/api/sessions", club=1, now="2026-11-28T04:00:00.000Z")

for tail, label in [("", "session"), ("/roster", "roster"), ("/matches", "matches"), ("/cost", "cost"), ("/payments", "payments"), ("/results", "results"), ("/requests", "requests")]:
    case(f"{label}-signed-out", f"/api/sessions/{SESSION(1)}{tail}")
    for sid in SIDS:
        # The Requests read closes stale requests before it reads, so the capture reloads the seed after each one.
        case(f"{label}-club1-s{sid}", f"/api/sessions/{SESSION(sid)}{tail}", club=1, scenario=stale_close if label == "requests" else "base")
    case(f"{label}-club2-own-s2", f"/api/sessions/{SESSION(2)}{tail}", club=2)       # lapsed
    case(f"{label}-club3-own-s3", f"/api/sessions/{SESSION(3)}{tail}", club=3)       # a past end still recorded
    case(f"{label}-club3-unknown", f"/api/sessions/a3000000-0000-4000-8000-0000000000ff{tail}", club=3)
    case(f"{label}-club4-edge", f"/api/sessions/{SESSION(1)}{tail}", club=4)
    case(f"{label}-club5-no-row", f"/api/sessions/{SESSION(1)}{tail}", club=5)
    case(f"{label}-club1-unknown", f"/api/sessions/a3000000-0000-4000-8000-0000000000ff{tail}", club=1)
    case(f"{label}-club1-not-a-uuid", f"/api/sessions/nope{tail}", club=1, go=(404, "not_found"))
    case(f"{label}-club1-expired-live", f"/api/sessions/{SESSION(1)}{tail}", club=1, scenario=expired)
    case(f"{label}-club1-expired-live-started", f"/api/sessions/{SESSION(1)}{tail}", club=1, scenario=expired_started)
    case(f"{label}-club1-expired-prepared", f"/api/sessions/{SESSION(9)}{tail}", club=1, scenario=expired_started)
    case(f"{label}-club1-started-term-live", f"/api/sessions/{SESSION(1)}{tail}", club=1, scenario=started)
case("session-disabled", f"/api/sessions/{SESSION(1)}", club=6, go=(401, "unauthenticated"))

# the live roster page in other states
nobody = scenario("live_nobody_present", "UPDATE session_players SET present = false WHERE session_id = '%s'" % SESSION(1))
case("session-club1-s1-nobody-present", f"/api/sessions/{SESSION(1)}", club=1, scenario=nobody)
case("roster-club1-s1-nobody-present", f"/api/sessions/{SESSION(1)}/roster", club=1, scenario=nobody)
case("roster-club1-s1-later", f"/api/sessions/{SESSION(1)}/roster", club=1, now="2026-11-20T04:00:00.000Z")
case("roster-club1-s4-finalized", f"/api/sessions/{SESSION(4)}/roster", club=1)
finalized_later = scenario("live_finalized_before_history", "UPDATE queue_sessions SET state = 'completed', finalized_at = TIMESTAMPTZ '2026-11-13 13:00:00+00' WHERE id = '%s'" % SESSION(1))
case("roster-club1-s1-finalized-before-history", f"/api/sessions/{SESSION(1)}/roster", club=1, scenario=finalized_later)
registered_nick = scenario("nicknames_changed", "UPDATE club_players SET nickname = '  ' WHERE id = 'c6000000-0000-4000-8000-000000000003'",
                           "UPDATE club_players SET nickname = ' Ally ' WHERE id = 'c6000000-0000-4000-8000-000000000001'",
                           "UPDATE players SET nickname = NULL WHERE id = 'd4000000-0000-4000-8000-000000000001'",
                           "UPDATE club_players SET nickname = 'Cor ' WHERE id = 'c6000000-0000-4000-8000-000000000021'")
case("roster-club1-s1-nicknames", f"/api/sessions/{SESSION(1)}/roster", club=1, scenario=registered_nick)

# money: no estimate, a custom fee, names that sort differently, an estimate with nobody on the roster, a changed fee
no_fee = scenario("live_no_estimate", "DELETE FROM session_cost_estimates WHERE session_id = '%s'" % SESSION(1))
case("cost-club1-s1-no-estimate", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=no_fee)
case("payments-club1-s1-no-estimate", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=no_fee)
custom = scenario("live_custom_fee", "UPDATE session_cost_estimates SET payment_mode = 'custom', custom_fee_per_head_minor = 100000 WHERE session_id = '%s'" % SESSION(1))
case("cost-club1-s1-custom-profit", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=custom)
case("payments-club1-s1-custom-profit", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=custom)
loss = scenario("live_custom_loss", "UPDATE session_cost_estimates SET payment_mode = 'custom', custom_fee_per_head_minor = 10000 WHERE session_id = '%s'" % SESSION(1))
case("cost-club1-s1-custom-loss", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=loss)
case("payments-club1-s1-custom-loss", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=loss)
names = scenario("live_names", "UPDATE session_players SET name_snapshot = 'alice reyes' WHERE id = 'a7000000-0000-4000-8000-000000000018'",
                 "UPDATE session_players SET name_snapshot = 'Álvaro' WHERE id = 'a7000000-0000-4000-8000-000000000015'",
                 "UPDATE session_players SET name_snapshot = 'Alice Reyes' WHERE id = 'a7000000-0000-4000-8000-000000000014'",
                 "DELETE FROM session_payment_marks WHERE session_id = '%s'" % SESSION(1))
case("payments-club1-s1-name-order", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=names)
empty = scenario("live_empty_roster", "DELETE FROM session_players WHERE session_id = '%s'" % SESSION(1))
case("payments-club1-s1-empty-roster", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=empty)
case("cost-club1-s1-empty-roster", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=empty)
expected = scenario("prepared_no_roster", "DELETE FROM session_players WHERE session_id = '%s'" % SESSION(9), "UPDATE queue_sessions SET expected_players = NULL WHERE id = '%s'" % SESSION(9))
case("cost-club1-s9-no-players", f"/api/sessions/{SESSION(9)}/cost", club=1, scenario=expected)
case("payments-club1-s9-no-players", f"/api/sessions/{SESSION(9)}/payments", club=1, scenario=expected)
ceil = scenario("live_even_split", "UPDATE session_cost_estimates SET court_fee_per_court_hour_minor = 30000, entrance_fee_per_head_minor = 0 WHERE session_id = '%s'" % SESSION(1), "DELETE FROM session_shuttle_plan_lines WHERE session_id = '%s'" % SESSION(1))
case("cost-club1-s1-even-split", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=ceil)
case("payments-club1-s1-even-split", f"/api/sessions/{SESSION(1)}/payments", club=1, scenario=ceil)
odd_len = scenario("live_odd_length", "UPDATE queue_sessions SET scheduled_end_at = scheduled_start_at + interval '100 minutes 40 seconds' WHERE id = '%s'" % SESSION(1))
case("cost-club1-s1-odd-length", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=odd_len)
half = scenario("live_half_minute", "UPDATE queue_sessions SET scheduled_end_at = scheduled_start_at + interval '90 minutes 30 seconds' WHERE id = '%s'" % SESSION(1))
case("cost-club1-s1-half-minute", f"/api/sessions/{SESSION(1)}/cost", club=1, scenario=half)

# an invalid session reads payments as null before any access check
case("payments-club3-s8-invalid-expired", f"/api/sessions/{SESSION(8)}/payments", club=3)
case("cost-club3-s8-invalid-expired", f"/api/sessions/{SESSION(8)}/cost", club=3)
inv = scenario("prepared_invalid", "UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Wrong date' WHERE id = '%s'" % SESSION(9))
case("payments-club1-s9-invalid", f"/api/sessions/{SESSION(9)}/payments", club=1, scenario=inv)
case("session-club1-s9-invalid", f"/api/sessions/{SESSION(9)}", club=1, scenario=inv)

# results follow Record games: off reads null even with a snapshot, and before the access check
norecord = scenario("friday_no_record", "UPDATE queue_sessions SET record_games = false WHERE id = '%s'" % SESSION(4))
case("results-club1-s4-record-off", f"/api/sessions/{SESSION(4)}/results", club=1, scenario=norecord)
case("results-club1-s4-expired-record-off", f"/api/sessions/{SESSION(4)}/results", club=1, scenario=scenario("friday_off_expired", "UPDATE queue_sessions SET record_games = false WHERE id = '%s'" % SESSION(4), "UPDATE club_entitlements SET effective_access_ends_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE club_id = '%s'" % CLUB[1]))
case("results-club1-s4-expired", f"/api/sessions/{SESSION(4)}/results", club=1, scenario=expired)
case("results-club3-s8-invalid-expired", f"/api/sessions/{SESSION(8)}/results", club=3)
nosnap = scenario("friday_no_snapshot", "DELETE FROM session_result_snapshots", "DELETE FROM session_publications", "DELETE FROM session_finalizations", "DELETE FROM result_exports")
case("results-club1-s4-nothing-stored", f"/api/sessions/{SESSION(4)}/results", club=1, scenario=nosnap)
many = scenario("friday_many_exports", "INSERT INTO result_exports (id, club_id, session_id, snapshot_id, slides, format, include_off_day, club_name_snapshot, footer, frame_count, source_command_id, created_at) SELECT ('a3b00000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid, '%s', '%s', 'a3a00000-0000-4000-8000-000000000002', ARRAY['standings'::result_slide], 'feed', false, 'Smash Club', 'powered by rotra', 1, ('a3b10000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid, TIMESTAMPTZ '2026-11-14 00:00:00+00' + make_interval(secs => n) FROM generate_series(1, 12) AS n" % (CLUB[1], SESSION(4)))
case("results-club1-s4-twelve-exports", f"/api/sessions/{SESSION(4)}/results", club=1, scenario=many)

# requests: a request that names someone who is not here reads as closed; presence and the queue change the places
una_here = scenario("una_present", "UPDATE session_players SET present = true WHERE id = 'a7000000-0000-4000-8000-000000000015'")
case("requests-club1-s1-una-present", f"/api/sessions/{SESSION(1)}/requests", club=1, scenario=una_here)
nobody_requests = scenario("live_nobody_present_2", "UPDATE session_players SET present = false WHERE session_id = '%s'" % SESSION(1))
case("requests-club1-s1-nobody-present", f"/api/sessions/{SESSION(1)}/requests", club=1, scenario=nobody_requests)
nomatches = scenario("live_no_matches", "DELETE FROM active_court_holds", "UPDATE matches SET state = 'completed', started_at = TIMESTAMPTZ '2026-11-19 03:00:00+00', ended_at = TIMESTAMPTZ '2026-11-19 03:10:00+00', placed_at = NULL WHERE state IN ('on_court','active')")
case("requests-club1-s1-no-court-matches", f"/api/sessions/{SESSION(1)}/requests", club=1, scenario=nomatches)
ended_requests = scenario("live_finalizing", "UPDATE queue_sessions SET state = 'finalizing' WHERE id = '%s'" % SESSION(1))
case("requests-club1-s1-finalizing", f"/api/sessions/{SESSION(1)}/requests", club=1, scenario=ended_requests)
case("session-club1-s1-finalizing", f"/api/sessions/{SESSION(1)}", club=1, scenario=ended_requests)
leftnotice = scenario("notice_player_released", "UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-19 00:00:00+00', release_reason = 'removed' WHERE id = 'a7000000-0000-4000-8000-000000000021'")
case("requests-club1-s9-notice-entry-released", f"/api/sessions/{SESSION(9)}/requests", club=1, scenario=leftnotice)
case("session-club1-s9-notice-entry-released", f"/api/sessions/{SESSION(9)}", club=1, scenario=leftnotice)
case("requests-club2-s2-finalizing-lapsed", f"/api/sessions/{SESSION(2)}/requests", club=2, scenario=stale_close)

# Restrictions (D-2026-11-19-12, task 2.2): the session object carries the pick, and the slots per level for slots per level only.
for label, sql in (("beginners", "level_restriction = 'beginners'"), ("beginners-intermediate", "level_restriction = 'beginners_intermediate'"),
                   ("per-level", "level_restriction = 'slots_per_band', beginner_slots = 3, intermediate_slots = 2, advanced_slots = 1")):
    restricted = scenario("s9_restricted_" + label.replace("-", "_"), "UPDATE queue_sessions SET %s WHERE id = '%s'" % (sql, SESSION(9)))
    case(f"sessions-club1-restricted-{label}", "/api/sessions", club=1, scenario=restricted)
    case(f"session-club1-s9-restricted-{label}", f"/api/sessions/{SESSION(9)}", club=1, scenario=restricted)
