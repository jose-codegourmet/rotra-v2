# Cases of the Queue sync reads: GET /api/sync, GET /api/sessions/{id}/sync and GET /api/sessions/{id}/done-review.
# Included by gen-signedin-queue-cases.py (it runs this file with its names in scope). Sessions of the seed: see
# gen-signedin-queue-cases-sessions.py. The seed has no device streams, operations or conflicts: the scenarios add them.
DEV = "a8000000-0000-4000-8000-0000000000%02d"
STREAM = lambda n: "a8100000-0000-4000-8000-0000000000%02d" % n
OP = lambda n: "a8200000-0000-4000-8000-0000000000%02d" % n
CONF = lambda n: "a8300000-0000-4000-8000-0000000000%02d" % n
SMASH = CLUB[1]


def stream(n, sid, state="open", club=SMASH, contiguous=0, highest=0, sealed_final=None, enrolled="2026-11-19 01:00:00+00", gen=1, dl_rev=1, rev=1):
    sf = "NULL" if sealed_final is None else str(sealed_final)
    sealed_at = "NULL" if state != "sealed" else "TIMESTAMPTZ '2026-11-19 03:00:00.25+00'"
    digest = "NULL" if state != "sealed" else "decode(repeat('ab', 32), 'hex')"
    return ("INSERT INTO device_session_streams (id, club_id, session_id, device_id, generation_no, downloaded_revision, contiguous_sequence, highest_received_sequence, "
            "sealed_final_sequence, sealed_at, sealed_digest, state, enrolled_at, updated_at, revision) VALUES ('%s', '%s', '%s', '%s', %d, %s, %s, %s, %s, %s, %s, '%s', TIMESTAMPTZ '%s', now(), %d)"
            % (STREAM(n), club, SESSION(sid), DEV % n, gen, dl_rev, contiguous, highest, sf, sealed_at, digest, state, enrolled, rev))


def op(n, sid, stream_n, seq, state="received", club=SMASH, rejection=None, result_rev=None):
    if state == "accepted" and result_rev is None:
        result_rev = "5"
    if state == "rejected" and rejection is None:
        rejection = "'invalid'"
    processed = "NULL" if state in ("received", "waiting") else "TIMESTAMPTZ '2026-11-19 02:10:00+00'"
    rejection = rejection or "NULL"
    result_rev = result_rev or "NULL"
    return ("INSERT INTO sync_operations (id, club_id, session_id, stream_id, sequence, entity_type, entity_id, command_kind, payload_version, payload, payload_digest, "
            "occurred_at, state, processed_at, result_revision, rejection_code, updated_at) VALUES ('%s', '%s', '%s', '%s', %d, 'match', '%s', 'match.complete', 1, '{}'::jsonb, decode(repeat('00', 32), 'hex'), "
            "TIMESTAMPTZ '2026-11-19 02:00:00+00', '%s', %s, %s, %s, now())" % (OP(n), club, SESSION(sid), STREAM(stream_n), seq, OP(n), state, processed, result_rev, rejection))


def conflict(n, sid, state="open", club=SMASH, category="missing_prerequisite", detected="2026-11-19 02:30:00+00"):
    res = "NULL, NULL" if state == "open" else "TIMESTAMPTZ '2026-11-19 03:30:00+00', '{\"version\":1,\"note\":\"checked\"}'::jsonb"
    return ("INSERT INTO sync_conflicts (id, club_id, session_id, category, state, detected_at, evidence, resolved_at, resolution_evidence, updated_at) VALUES ('%s', '%s', '%s', '%s', '%s', TIMESTAMPTZ '%s', "
            "'{\"secret\":\"private evidence\"}'::jsonb, %s, now())" % (CONF(n), club, SESSION(sid), category, state, detected, res))


# ---- the club summary ----
case("sync-signed-out", "/api/sync")
for n in ALL:
    case(f"sync-club{n}", "/api/sync", club=n)
case("sync-disabled", "/api/sync", club=6, go=(401, "unauthenticated"))
case("sync-unprovisioned", "/api/sync", club=7, go=(401, "unauthenticated"))
case("sync-club1-expired", "/api/sync", club=1, scenario=expired)
case("sync-club1-later", "/api/sync", club=1, now="2026-11-28T04:00:00.123Z")
open_live = scenario("sync_open_stream_live", stream(1, 1))
case("sync-club1-open-stream", "/api/sync", club=1, scenario=open_live)
sealed_ok = scenario("sync_sealed_proven", stream(1, 1, "sealed", contiguous=2, highest=2, sealed_final=2),
                     op(1, 1, 1, 1, "accepted", result_rev="3"), op(2, 1, 1, 2, "rejected", rejection="'invalid'"))
case("sync-club1-sealed-proven", "/api/sync", club=1, scenario=sealed_ok)
sealed_short = scenario("sync_sealed_short", stream(1, 1, "sealed", contiguous=1, highest=2, sealed_final=2))
case("sync-club1-sealed-prefix-short", "/api/sync", club=1, scenario=sealed_short)
revoked = scenario("sync_revoked_only", stream(1, 1, "revoked", contiguous=3, highest=5))
case("sync-club1-revoked-stream-alone-is-fine", "/api/sync", club=1, scenario=revoked)
conf_open = scenario("sync_open_conflict", conflict(1, 1))
case("sync-club1-open-conflict", "/api/sync", club=1, scenario=conf_open)
conf_done = scenario("sync_resolved_conflict", conflict(1, 1, "resolved"))
case("sync-club1-resolved-conflict", "/api/sync", club=1, scenario=conf_done)
for st in ["received", "waiting", "accepted", "rejected", "conflicted"]:
    sc = scenario(f"sync_op_{st}", stream(1, 1, "sealed", contiguous=1, highest=1, sealed_final=1), op(1, 1, 1, 1, st))
    case(f"sync-club1-operation-{st}", "/api/sync", club=1, scenario=sc)
prep = scenario("sync_prepared_open", stream(1, 9))
case("sync-club1-prepared-session-open-stream", "/api/sync", club=1, scenario=prep)
done = scenario("sync_completed_open", stream(1, 4), conflict(1, 4), stream(2, 7), op(1, 7, 2, 1))
case("sync-club1-completed-sessions-are-ignored", "/api/sync", club=1, scenario=done)
fin = scenario("sync_finalizing_open", stream(1, 2, club=CLUB[2]))
case("sync-club2-finalizing-session-is-ignored", "/api/sync", club=2, scenario=fin)
other = scenario("sync_other_club", stream(1, 3, club=CLUB[3]), conflict(1, 1, club=CLUB[3]))
case("sync-club1-other-clubs-rows-are-ignored", "/api/sync", club=1, scenario=other)
case("sync-club3-own-open-stream", "/api/sync", club=3, scenario=other)
# a row of the session that names another club (a stray row) counts: the TypeScript filters on the session id only
stray = scenario("sync_stray_club", stream(1, 1, club=CLUB[2]))
case("sync-club1-stray-club-id-counts", "/api/sync", club=1, scenario=stray)
both = scenario("sync_two_incomplete", stream(1, 9), stream(2, 1), conflict(1, 1))
case("sync-club1-two-incomplete", "/api/sync", club=1, scenario=both)
mixed = scenario("sync_one_proven_one_not", stream(1, 1, "sealed", contiguous=4, highest=4, sealed_final=4), stream(2, 9, "open"))
case("sync-club1-one-proven-one-not", "/api/sync", club=1, scenario=mixed)

# ---- the session status ----
case("sessionsync-signed-out", f"/api/sessions/{SESSION(1)}/sync")
for sid in SIDS:
    case(f"sessionsync-club1-s{sid}", f"/api/sessions/{SESSION(sid)}/sync", club=1)
case("sessionsync-club2-own-s2", f"/api/sessions/{SESSION(2)}/sync", club=2)
case("sessionsync-club3-own-s3", f"/api/sessions/{SESSION(3)}/sync", club=3)
case("sessionsync-club3-unknown", "/api/sessions/a3000000-0000-4000-8000-0000000000ff/sync", club=3)
case("sessionsync-club4-edge", f"/api/sessions/{SESSION(1)}/sync", club=4)
case("sessionsync-club5-no-row", f"/api/sessions/{SESSION(1)}/sync", club=5)
case("sessionsync-club1-unknown", "/api/sessions/a3000000-0000-4000-8000-0000000000ff/sync", club=1)
case("sessionsync-club1-not-a-uuid", "/api/sessions/nope/sync", club=1, go=(404, "not_found"))
case("sessionsync-disabled", f"/api/sessions/{SESSION(1)}/sync", club=6, go=(401, "unauthenticated"))
case("sessionsync-club1-expired-live", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=expired)
case("sessionsync-club1-expired-prepared", f"/api/sessions/{SESSION(9)}/sync", club=1, scenario=expired)
big = scenario("sync_big_numbers", stream(1, 1, "sealed", contiguous=9007199254740993, highest=9007199254740995, sealed_final=9007199254740993, dl_rev=9007199254740993, rev=3))
case("sessionsync-club1-big-numbers", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=big)
many = scenario("sync_many_streams", stream(1, 1, "revoked", contiguous=2, highest=3, enrolled="2026-11-19 02:00:00+00", gen=1),
                stream(2, 1, "open", contiguous=0, highest=0, enrolled="2026-11-19 01:00:00.5+00", gen=2),
                stream(3, 1, "sealed", contiguous=5, highest=5, sealed_final=5, enrolled="2026-11-19 03:00:00+00", gen=3),
                conflict(2, 1, "open", category="payload_mismatch", detected="2026-11-19 02:45:00+00"),
                conflict(1, 1, "open", category="missing_prerequisite", detected="2026-11-19 02:15:00.5+00"),
                conflict(3, 1, "resolved", category="identity_link", detected="2026-11-19 01:15:00+00"),
                conflict(4, 1, "open", category="contradictory_decision", detected="2026-11-19 03:15:00+00"),
                op(1, 1, 2, 1, "received"), op(2, 1, 2, 2, "waiting"), op(3, 1, 3, 1, "accepted"))
case("sessionsync-club1-many-streams-and-conflicts", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=many)
case("sessionsync-club1-stray-session-rows-of-other-club", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=stray)
case("sessionsync-club2-cannot-read-smash-streams", f"/api/sessions/{SESSION(1)}/sync", club=2, scenario=many)
case("sessionsync-club1-completed-with-open-stream", f"/api/sessions/{SESSION(4)}/sync", club=1, scenario=done)
case("sessionsync-club1-sealed-proven", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=sealed_ok)
case("sessionsync-club1-sealed-prefix-short", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=sealed_short)
case("sessionsync-club1-revoked-only", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=revoked)
case("sessionsync-club1-resolved-conflict", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=conf_done)
case("sessionsync-club1-open-conflict-hides-evidence", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=conf_open)
for st in ["received", "waiting", "accepted", "rejected", "conflicted"]:
    case(f"sessionsync-club1-operation-{st}", f"/api/sessions/{SESSION(1)}/sync", club=1, scenario=f"sync_op_{st}")

# ---- the Session done review ----
case("donereview-signed-out", f"/api/sessions/{SESSION(1)}/done-review")
for sid in SIDS:
    case(f"donereview-club1-s{sid}", f"/api/sessions/{SESSION(sid)}/done-review", club=1)
case("donereview-club2-own-s2", f"/api/sessions/{SESSION(2)}/done-review", club=2)       # lapsed
case("donereview-club3-own-s3", f"/api/sessions/{SESSION(3)}/done-review", club=3)       # a past end still recorded
case("donereview-club3-unknown", "/api/sessions/a3000000-0000-4000-8000-0000000000ff/done-review", club=3)
case("donereview-club4-edge", f"/api/sessions/{SESSION(1)}/done-review", club=4)
case("donereview-club5-no-row", f"/api/sessions/{SESSION(1)}/done-review", club=5)
case("donereview-club1-unknown", "/api/sessions/a3000000-0000-4000-8000-0000000000ff/done-review", club=1)
case("donereview-club1-not-a-uuid", "/api/sessions/nope/done-review", club=1, go=(404, "not_found"))
case("donereview-disabled", f"/api/sessions/{SESSION(1)}/done-review", club=6, go=(401, "unauthenticated"))
case("donereview-club1-expired-live", f"/api/sessions/{SESSION(1)}/done-review", club=1, scenario=expired)
case("donereview-club1-expired-live-started", f"/api/sessions/{SESSION(1)}/done-review", club=1, scenario=expired_started)
case("donereview-club1-expired-prepared", f"/api/sessions/{SESSION(9)}/done-review", club=1, scenario=expired_started)
case("donereview-club1-started-term-live", f"/api/sessions/{SESSION(1)}/done-review", club=1, scenario=started)
case("donereview-club1-s4-expired", f"/api/sessions/{SESSION(4)}/done-review", club=1, scenario=expired)
DR = lambda sid=1: f"/api/sessions/{SESSION(sid)}/done-review"
for name, sc in [("open-stream", open_live), ("sealed-proven", sealed_ok), ("sealed-short", sealed_short), ("revoked", revoked),
                 ("open-conflict", conf_open), ("resolved-conflict", conf_done), ("many", many), ("big", big), ("stray-club", stray)]:
    case(f"donereview-club1-s1-{name}", DR(), club=1, scenario=sc)
for st in ["received", "waiting", "accepted", "rejected", "conflicted"]:
    case(f"donereview-club1-s1-operation-{st}", DR(), club=1, scenario=f"sync_op_{st}")
no_policy = scenario("review_no_policy", "DELETE FROM ranking_policy_versions")
case("donereview-club1-s1-no-policy", DR(), club=1, scenario=no_policy)
case("donereview-club1-s1-before-the-first-policy", DR(), club=1, now="2026-09-30T04:00:00.000Z")
edge_policy = scenario("review_policy_at_now", "DELETE FROM ranking_policy_versions WHERE version > 1", "UPDATE ranking_policy_versions SET effective_at = TIMESTAMPTZ '2026-11-19 04:00:00+00'")
case("donereview-club1-s1-policy-starts-this-instant", DR(), club=1, scenario=edge_policy)
late_policy = scenario("review_policy_after_now", "DELETE FROM ranking_policy_versions WHERE version > 1", "UPDATE ranking_policy_versions SET effective_at = TIMESTAMPTZ '2026-11-19 04:00:00.0004+00'")
case("donereview-club1-s1-policy-starts-in-a-moment", DR(), club=1, scenario=late_policy)
no_active = scenario("review_no_active_match", "UPDATE matches SET state = 'completed', ended_at = TIMESTAMPTZ '2026-11-19 04:00:00+00' WHERE session_id = '%s' AND state = 'active'" % SESSION(1))
case("donereview-club1-s1-no-active-match", DR(), club=1, scenario=no_active)
case("donereview-club1-s1-everything-blocks", DR(), club=1, scenario=scenario("review_all_block", "DELETE FROM ranking_policy_versions", stream(1, 1), conflict(1, 1), stream(2, 1, "sealed", contiguous=0, highest=0, sealed_final=0), op(1, 1, 1, 1, "received")))

# minimum games: the target, a target of zero (no shortfall list), counted games from a substitution and full games only
for n in [0, 1, 2, 5]:
    case(f"donereview-club1-s1-minimum-{n}", DR(), club=1, scenario=scenario(f"review_min_{n}", "UPDATE queue_sessions SET minimum_games = %d WHERE id = '%s'" % (n, SESSION(1))))
min1 = "UPDATE queue_sessions SET minimum_games = 1 WHERE id = '%s'" % SESSION(1)
PART = lambda n: "a9100000-0000-4000-8000-0000000000%02d" % n
M13 = "a5000000-0000-4000-8000-000000000013"


# Match 3 is completed with Ned (entry 18, replacing Bob) leaving at 03:55 and Una (entry 15) taking over, then the credit rules.
def sub_scenario(name, credit):
    return scenario(name, min1,
        "UPDATE matches SET state = 'completed', queue_position = NULL, started_at = TIMESTAMPTZ '2026-11-19 03:50:00+00', ended_at = TIMESTAMPTZ '2026-11-19 03:59:00+00' WHERE id = '%s'" % M13,
        "INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, actor_club_id) VALUES ('%s', '%s', '%s', 'completed', 'B', 10, 21, 'a9300000-0000-4000-8000-000000000013', TIMESTAMPTZ '2026-11-19 03:59:00+00', '%s')" % (M13, SMASH, SESSION(1), SMASH),
        "UPDATE match_participations SET session_player_id = 'a7000000-0000-4000-8000-000000000018', started_with_match = true, finished_with_match = false, left_operation_id = 'a9200000-0000-4000-8000-0000000000f1', left_at = TIMESTAMPTZ '2026-11-19 03:55:00+00' WHERE id = '%s'" % PART(7),
        "UPDATE match_participations SET started_with_match = true, finished_with_match = true WHERE id = '%s'" % PART(8),
        "INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, left_operation_id, joined_at, left_at, started_with_match, finished_with_match, credit_to, updated_at) VALUES ('a9100000-0000-4000-8000-0000000000f1', '%s', '%s', '%s', 'a7000000-0000-4000-8000-000000000015', 'A', 2, 'a9200000-0000-4000-8000-0000000000f1', NULL, TIMESTAMPTZ '2026-11-19 03:55:00+00', NULL, false, true, '%s', now())" % (SMASH, SESSION(1), M13, credit))


case("donereview-club1-s1-credit-outgoing", DR(), club=1, scenario=sub_scenario("review_credit_outgoing", "outgoing"))
case("donereview-club1-s1-credit-incoming", DR(), club=1, scenario=sub_scenario("review_credit_incoming", "incoming"))
case("donereview-club1-s1-credit-none", DR(), club=1, scenario=sub_scenario("review_credit_none", "none"))
# an outgoing credit whose closing segment is missing, and an incoming credit on a segment of a match that is not completed
dangling = scenario("review_credit_dangling", min1,
                    "INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, left_operation_id, joined_at, left_at, started_with_match, finished_with_match, credit_to, updated_at) VALUES ('a9100000-0000-4000-8000-0000000000f2', '%s', '%s', 'a5000000-0000-4000-8000-000000000011', 'a7000000-0000-4000-8000-000000000015', 'A', 2, 'a9200000-0000-4000-8000-0000000000f2', NULL, TIMESTAMPTZ '2026-11-19 01:40:00+00', NULL, false, true, 'outgoing', now())" % (SMASH, SESSION(1)),
                    "UPDATE match_participations SET credit_to = 'incoming', started_with_match = false WHERE id = '%s'" % PART(5))
case("donereview-club1-s1-credit-dangling", DR(), club=1, scenario=dangling)
case("donereview-club1-s1-invalid-match-gives-nothing", DR(), club=1, scenario=scenario("review_invalid_decision", min1, "UPDATE match_decisions SET kind = 'invalid', winning_team = NULL, team_a_score = NULL, team_b_score = NULL WHERE match_id = 'a5000000-0000-4000-8000-000000000011'"))
case("donereview-club1-s1-completed-without-decision", DR(), club=1, scenario=scenario("review_no_decision", min1, "DELETE FROM match_decisions WHERE match_id = 'a5000000-0000-4000-8000-000000000011'"))
case("donereview-club1-s1-no-completed-matches", DR(), club=1, scenario=scenario("review_no_completed", min1, "UPDATE matches SET state = 'invalid' WHERE state = 'completed' AND session_id = '%s'" % SESSION(1)))
case("donereview-club1-s1-games-adjustment-is-not-counted", DR(), club=1, scenario=scenario("review_adjusted", min1, "UPDATE session_players SET games_adjustment = 5"))
case("donereview-club1-s1-no-record-games", DR(), club=1, scenario=scenario("review_no_record", min1, "UPDATE queue_sessions SET record_games = false WHERE id = '%s'" % SESSION(1)))
case("donereview-club1-s1-released-and-no-show-leave-the-list", DR(), club=1, scenario=scenario("review_left", min1,
     "UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-19 02:00:00+00', release_reason = 'removed' WHERE id = 'a7000000-0000-4000-8000-000000000015'",
     "UPDATE session_players SET no_show_at = TIMESTAMPTZ '2026-11-19 02:00:00+00' WHERE id = 'a7000000-0000-4000-8000-000000000014'"))

# unresolved guests: a saved player with no ROTRA profile, matched to the club's profiled players by exact name only.
# Live guests of the seed: Cory (saved player 21), Una (11) and Ned (24). Erin is released and Dan is a no show.
CPN = lambda n: "c6000000-0000-4000-8000-0000000000%02d" % n
SP = lambda n: "a7000000-0000-4000-8000-0000000000%02d" % n
case("donereview-club1-s1-guest-named-like-a-profile", DR(), club=1, scenario=scenario("review_guest_alice",
     "UPDATE club_players SET display_name = '  alice   REYES ' WHERE id = '%s'" % CPN(21)))
case("donereview-club1-s1-guest-snapshot-matches", DR(), club=1, scenario=scenario("review_guest_snapshot",
     "UPDATE session_players SET name_snapshot = 'Bob Santos' WHERE id = '%s'" % SP(14)))
case("donereview-club1-s1-guest-nickname-matches", DR(), club=1, scenario=scenario("review_guest_nickname",
     "UPDATE club_players SET nickname = 'Ace' WHERE id = '%s'" % CPN(21)))
case("donereview-club1-s1-guest-matches-club-nickname", DR(), club=1, scenario=scenario("review_guest_club_nick",
     "UPDATE club_players SET nickname = 'bobby' WHERE id = '%s'" % CPN(21)))
case("donereview-club1-s1-guest-matches-two-profiles", DR(), club=1, scenario=scenario("review_guest_two",
     "UPDATE club_players SET display_name = 'Carla Dizon' WHERE id = '%s'" % CPN(21),
     "INSERT INTO club_players (id, club_id, player_id, display_name, nickname, added_at, revision, updated_at) VALUES ('c6000000-0000-4000-8000-0000000000f1', '%s', 'd4000000-0000-4000-8000-000000000004', 'Carla D.', 'carla dizon', TIMESTAMPTZ '2026-02-03 00:00:00+00', 1, now())" % SMASH))
case("donereview-club1-s1-guest-profile-unclaimed-has-rtr", DR(), club=1, scenario=scenario("review_guest_unclaimed",
     "UPDATE club_players SET display_name = 'Erin Lim' WHERE id = '%s'" % CPN(21),
     "UPDATE players SET profile_state = 'unclaimed' WHERE id = 'd4000000-0000-4000-8000-000000000005'"))
case("donereview-club1-s1-guest-profile-without-rtr-id", DR(), club=1, scenario=scenario("review_guest_no_rtr",
     "UPDATE club_players SET display_name = 'Frank No Id' WHERE id = '%s'" % CPN(21),
     "INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, updated_at) VALUES ('c6000000-0000-4000-8000-0000000000f2', '%s', 'd4000000-0000-4000-8000-000000000006', 'Frank No Id', TIMESTAMPTZ '2026-02-03 00:00:00+00', 1, now())" % SMASH))
case("donereview-club1-s1-guest-removed-profile-is-no-candidate", DR(), club=1, scenario=scenario("review_guest_removed",
     "UPDATE club_players SET display_name = 'Alice Reyes' WHERE id = '%s'" % CPN(21),
     "UPDATE club_players SET removed_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE id = '%s'" % CPN(1)))
case("donereview-club1-s1-guest-other-clubs-profile-is-no-candidate", DR(), club=1, scenario=scenario("review_guest_other_club",
     "UPDATE club_players SET display_name = 'Bob Santos' WHERE id = '%s'" % CPN(21),
     "UPDATE club_players SET club_id = '%s', nickname = NULL WHERE id = '%s'" % (CLUB[2], CPN(3))))
case("donereview-club1-s1-guest-blank-names-never-match", DR(), club=1, scenario=scenario("review_guest_blank",
     "UPDATE club_players SET nickname = ' ' WHERE id = '%s'" % CPN(21),
     "UPDATE players SET nickname = '' WHERE id = 'd4000000-0000-4000-8000-000000000001'"))
case("donereview-club1-s1-guest-unicode-lowercase", DR(), club=1, scenario=scenario("review_guest_unicode",
     "UPDATE club_players SET display_name = 'İlker' WHERE id = '%s'" % CPN(21),
     "UPDATE players SET full_name = 'i̇lker' WHERE id = 'd4000000-0000-4000-8000-000000000001'",
     "UPDATE club_players SET display_name = 'ΟΔΟΣ' WHERE id = '%s'" % CPN(11),
     "UPDATE players SET full_name = 'οδος' WHERE id = 'd4000000-0000-4000-8000-000000000002'",
     "UPDATE club_players SET display_name = 'Straße' WHERE id = '%s'" % CPN(24),
     "UPDATE players SET nickname = 'STRASSE' WHERE id = 'd4000000-0000-4000-8000-000000000003'",
     "UPDATE players SET full_name = 'ß' WHERE id = 'd4000000-0000-4000-8000-000000000005'"))
case("donereview-club1-s1-guest-js-whitespace", DR(), club=1, scenario=scenario("review_guest_space",
     "UPDATE club_players SET display_name = E'\\u00a0\\ufeffAlice\\u2003\\u3000 Reyes\\u2028' WHERE id = '%s'" % CPN(21)))
case("donereview-club1-s1-no-guests", DR(), club=1, scenario=scenario("review_no_guests", "UPDATE club_players SET player_id = 'd4000000-0000-4000-8000-000000000004' WHERE id = '%s'" % CPN(21),
     "UPDATE club_players SET player_id = 'd4000000-0000-4000-8000-000000000006' WHERE id = '%s'" % CPN(11),
     "UPDATE club_players SET player_id = 'd4000000-0000-4000-8000-000000000007' WHERE id = '%s'" % CPN(24)))
case("donereview-club1-s1-guest-entries-confirmed-the-same-moment", DR(), club=1, scenario=scenario("review_guest_ties",
     "UPDATE session_players SET confirmed_at = TIMESTAMPTZ '2026-11-18 12:10:00+00' WHERE club_player_id IN ('%s', '%s', '%s')" % (CPN(21), CPN(11), CPN(24))))
case("donereview-club1-s9-prepared", DR(9), club=1, scenario=scenario("review_prepared_stream", min1.replace(SESSION(1), SESSION(9)), stream(1, 9)))
case("donereview-club3-s8-invalid-expired", DR(8), club=3)
