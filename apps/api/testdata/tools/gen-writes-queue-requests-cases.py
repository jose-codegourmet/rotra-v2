#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/requests.cases.json: the join and match requests of the Queue app (confirm and decline a
join request, add and decline a match request, Auto Queue court fill, the drop-out notices the Queue Master keeps or removes).

Run it, then the capture (capture-writes-queue.test.mjs -t requests), which writes requests.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-requests-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/requests.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
RQ = lambda n: f'a3400000-0000-4000-8000-0000000000{n:02d}'
MR = lambda n: f'a3700000-0000-4000-8000-0000000000{n:02d}'
DN = lambda n: f'a3800000-0000-4000-8000-0000000000{n:02d}'
CT = lambda n: f'a2c00000-0000-4000-8000-0000000000{n:02d}'
LEVEL = 'intermediate_low'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
UNKNOWN = 'a3400000-0000-4000-8000-0000000000ff'
_op = [0]


def op_id(n=None):
    if n is None:
        _op[0] += 1
        n = _op[0]
    return f'b3000000-0000-4000-8000-{n:012d}'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    """A case. allow500 and goExpects given here belong to the last step."""
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
BADOP = {'allow500': True, 'goExpects': {'status': 422, 'code': 'invalid'}}
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}

# ---------------------------------------------------------------- POST /api/join-requests/{id}/confirm and /decline
def confirm(rq, body=None, **kw):
    b = {'operationId': op_id(), 'level': LEVEL}
    if body is not None:
        b = body
    return req('POST', f'/api/join-requests/{rq}/confirm', b, **kw)


def decline(rq, **kw):
    return req('POST', f'/api/join-requests/{rq}/decline', **kw)


case('confirm_signed_out', confirm(RQ(1), who=None))
case('confirm_a_player_subject_is_not_a_club', confirm(RQ(1), who=PLAYER_SUBJECT, **NOSUBJECT))
case('confirm_body_not_json', req('POST', f'/api/join-requests/{RQ(1)}/confirm', rawBody='nope'))
case('confirm_without_a_body', req('POST', f'/api/join-requests/{RQ(1)}/confirm'))
case('confirm_guest_request', confirm(RQ(1)))
case('confirm_registered_players_request', confirm(RQ(2)))
case('confirm_waitlist_placement_request', confirm(RQ(3)))
case('confirm_declined_request', confirm(RQ(4)))
case('confirm_confirmed_request_under_another_operation', confirm(RQ(5)))
case('confirm_unknown_request', confirm(UNKNOWN))
case('confirm_other_clubs_request', confirm(RQ(9)))
case('confirm_malformed_request_id', confirm('m'), **MALFORMED)
case('confirm_bad_level', confirm(RQ(1), {'operationId': op_id(), 'level': 'nope'}))
case('confirm_missing_level', confirm(RQ(1), {'operationId': op_id()}))
case('confirm_level_is_checked_before_the_request_is_looked_up', confirm(UNKNOWN, {'operationId': op_id(), 'level': 'nope'}))
case('confirm_missing_operation_id', confirm(RQ(1), {'level': LEVEL}), **BADOP)
case('confirm_malformed_operation_id', confirm(RQ(1), {'operationId': 'x', 'level': LEVEL}), **BADOP)
case('confirm_unknown_fields_are_ignored', confirm(RQ(1), {'operationId': op_id(), 'level': LEVEL, 'deviceId': 'x', 'phone': '0917'}))
case('confirm_twice_same_operation', [confirm(RQ(1), {'operationId': op_id(99), 'level': LEVEL}, snapshot=True), confirm(RQ(1), {'operationId': op_id(99), 'level': LEVEL})])
case('confirm_twice_other_operation', [confirm(RQ(1), {'operationId': op_id(99), 'level': LEVEL}), confirm(RQ(1), {'operationId': op_id(98), 'level': LEVEL})])
case('confirm_registered_twice_other_operation', [confirm(RQ(2), {'operationId': op_id(99), 'level': LEVEL}), confirm(RQ(2), {'operationId': op_id(98), 'level': LEVEL})])
case('confirm_from_waitlist_prepared_full', confirm(RQ(6)))
case('confirm_from_waitlist_prepared_with_a_free_slot', confirm(RQ(6)), scenario='s2_free_slot')
case('confirm_from_waitlist_on_a_live_session', confirm(RQ(8)))
case('confirm_from_waitlist_when_no_longer_waiting', confirm(RQ(8)), scenario='kai_not_waiting')
case('confirm_from_waitlist_live_over_budget', confirm(RQ(8)), scenario='s3_full')
case('confirm_guest_goes_to_the_waitlist_when_full', confirm(RQ(7)))
case('confirm_midnight_session_request', confirm(RQ(10)))
case('confirm_closes_stale_match_requests_and_bumps_the_revision', confirm(RQ(8)), scenario='s2_free_slot')
case('confirm_on_a_finished_session', confirm(RQ(31)), scenario='request_on_s4')
case('confirm_on_a_lapsed_prepared_session', confirm(RQ(32), who=LAPSED), scenario='request_on_s7')
case('confirm_on_a_lapsed_live_session_started_under_a_term', confirm(RQ(33), who=LAPSED), scenario='request_on_s8')
case('confirm_two_at_once_same_request', {'parallel': [confirm(RQ(1), {'operationId': op_id(99), 'level': LEVEL}), confirm(RQ(1), {'operationId': op_id(99), 'level': LEVEL})]})
# Two different requests confirmed at once get their revisions in an order that is not decided: tested in race_test.go, not pinned.
case('decline_signed_out', decline(RQ(1), who=None))
case('decline_pending_request', decline(RQ(1)))
case('decline_registered_players_request', decline(RQ(2)))
case('decline_twice', [decline(RQ(1)), decline(RQ(1))])
case('decline_declined_request_answers_as_is', decline(RQ(4)))
case('decline_confirmed_request', decline(RQ(5)))
case('decline_unknown_request', decline(UNKNOWN))
case('decline_other_clubs_request', decline(RQ(9)))
case('decline_malformed_request_id', decline('m'), **MALFORMED)
case('decline_ignores_a_body_that_is_not_json', req('POST', f'/api/join-requests/{RQ(1)}/decline', rawBody='nope'))
case('decline_on_a_finished_session', decline(RQ(31)), scenario='request_on_s4')
case('decline_on_a_lapsed_prepared_session', decline(RQ(32), who=LAPSED), scenario='request_on_s7')
case('decline_two_at_once_same_request', {'parallel': [decline(RQ(1)), decline(RQ(1))]})

# ---------------------------------------------------------------- POST /api/sessions/{id}/match-requests/{id}/add and /decline
def add(session, rq, **kw):
    return req('POST', f'/api/sessions/{session}/match-requests/{rq}/add', **kw)


def mdecline(session, rq, **kw):
    return req('POST', f'/api/sessions/{session}/match-requests/{rq}/decline', **kw)


case('madd_signed_out', add(S[3], MR(3), who=None))
case('madd_a_player_subject_is_not_a_club', add(S[3], MR(3), who=PLAYER_SUBJECT, **NOSUBJECT))
case('madd_not_enough_present_players_to_fill', add(S[3], MR(3)))
case('madd_doubles_fills_the_anyone_spots', add(S[3], MR(3)), scenario='s3_full_house')
case('madd_singles_fills_the_anyone_spot', add(S[3], MR(2)), scenario='s3_full_house')
case('madd_fills_with_the_fewest_games_first', add(S[3], MR(3)), scenario='s3_full_house_games')
case('madd_a_games_adjustment_counts_for_the_fill', add(S[3], MR(3)), scenario='s3_full_house_adjusted')
case('madd_a_waiting_match_counts_as_a_game_for_the_fill', add(S[3], MR(3)), scenario='s3_full_house_waiting')
case('madd_numbers_the_match_after_the_last_one', add(S[3], MR(3)), scenario='s3_full_house_waiting')
case('madd_retry_returns_the_same_match', [add(S[3], MR(3), snapshot=True), add(S[3], MR(3))], scenario='s3_full_house')
case('madd_two_at_once_same_request', {'parallel': [add(S[3], MR(3)), add(S[3], MR(3))]}, scenario='s3_full_house')
case('madd_in_auto_queue_places_the_match_on_a_free_court', add(S[3], MR(3)), scenario='s3_full_house_auto')
case('madd_in_auto_queue_with_every_court_busy', add(S[3], MR(3)), scenario='s3_full_house_auto_busy')
case('madd_in_auto_queue_skips_a_court_not_open_yet', add(S[3], MR(3)), scenario='s3_full_house_auto_court_closed')
case('madd_in_auto_queue_retry_places_nothing_more', [add(S[3], MR(3), snapshot=True), add(S[3], MR(3))], scenario='s3_full_house_auto')
case('madd_doubles_with_a_named_partner', add(S[3], MR(1)), scenario='s3_full_house')
case('madd_the_request_names_someone_who_left_so_it_is_closed', add(S[3], MR(1)), scenario='s3_full_house_ivy_away')
case('madd_the_requester_is_away_so_it_is_closed', add(S[3], MR(2)))
case('madd_closed_request', add(S[3], MR(4)), scenario='s3_full_house')
case('madd_declined_request', add(S[3], MR(3)), scenario='mr3_declined')
case('madd_added_request_answers_its_match_again', add(S[3], MR(3)), scenario='mr3_already_added')
case('madd_format_switched_off_for_the_session', add(S[3], MR(3)), scenario='s3_full_house_no_doubles')
case('madd_unknown_request', add(S[3], UNKNOWN))
case('madd_malformed_request_id_is_not_found', add(S[3], 'm'))
case('madd_unknown_session', add('a3000000-0000-4000-8000-0000000000ff', MR(3)))
case('madd_malformed_session_id', add('m', MR(3)), **MALFORMED)
case('madd_other_clubs_session', add(S[9], MR(3)))
case('madd_on_a_prepared_session', add(S[1], MR(3)))
case('madd_on_a_finished_session', add(S[4], MR(40)), scenario='mr_on_s4')
case('madd_on_a_lapsed_live_session_started_under_a_term', add(S[8], MR(41), who=LAPSED), scenario='mr_on_s8')
case('mdecline_signed_out', mdecline(S[3], MR(3), who=None))
case('mdecline_open_request', mdecline(S[3], MR(3)))
case('mdecline_twice', [mdecline(S[3], MR(3)), mdecline(S[3], MR(3))])
case('mdecline_closes_stale_requests_first_but_not_when_it_fails', mdecline(S[3], MR(1)))
case('mdecline_requester_with_a_club_nickname', mdecline(S[3], MR(3)), scenario='jo_has_a_club_nickname')
case('mdecline_registered_requester_names', mdecline(S[3], MR(3)), scenario='jo_is_registered')
case('mdecline_closed_request', mdecline(S[3], MR(4)))
case('mdecline_unknown_request', mdecline(S[3], UNKNOWN))
case('mdecline_malformed_request_id_is_not_found', mdecline(S[3], 'm'))
case('mdecline_request_of_another_session', mdecline(S[1], MR(3)))
case('mdecline_malformed_session_id', mdecline('m', MR(3)), **MALFORMED)
case('mdecline_other_clubs_session', mdecline(S[9], MR(3)))
case('mdecline_on_a_finished_session_is_not_checked', mdecline(S[4], MR(40)), scenario='mr_on_s4')
case('mdecline_on_a_lapsed_live_session_started_under_a_term', mdecline(S[8], MR(41), who=LAPSED), scenario='mr_on_s8')
case('mdecline_on_a_lapsed_prepared_session', mdecline(S[7], MR(3), who=LAPSED))
case('mdecline_two_at_once', {'parallel': [mdecline(S[3], MR(3)), mdecline(S[3], MR(3))]})

# ---------------------------------------------------------------- PATCH and POST /api/sessions/{id}/court-fill
def fill_mode(session, mode, **kw):
    return req('PATCH', f'/api/sessions/{session}/court-fill', {'mode': mode}, **kw)


def fill_courts(session, ids, **kw):
    return req('POST', f'/api/sessions/{session}/court-fill', {'courtIds': ids}, **kw)


# The operation ids of the court fill are random, so the court usage rows of these cases hide them (Case.redact).
RAND = {'match_court_usage': ['id', 'acquire_operation_id']}
case('fill_mode_signed_out', fill_mode(S[3], 'auto', who=None))
case('fill_mode_a_player_subject_is_not_a_club', fill_mode(S[3], 'auto', who=PLAYER_SUBJECT, **NOSUBJECT))
case('fill_mode_body_not_json', req('PATCH', f'/api/sessions/{S[3]}/court-fill', rawBody='nope'))
case('fill_mode_unknown_mode', fill_mode(S[3], 'both'))
case('fill_mode_missing_mode', req('PATCH', f'/api/sessions/{S[3]}/court-fill', {}))
case('fill_mode_manual_when_it_is_manual_changes_nothing', fill_mode(S[3], 'manual'))
case('fill_mode_auto_with_no_waiting_matches', fill_mode(S[3], 'auto'))
case('fill_mode_auto_places_waiting_matches_on_free_courts', fill_mode(S[3], 'auto'), scenario='s3_waiting_matches', redact=RAND)
case('fill_mode_auto_when_it_is_auto_places_nothing', fill_mode(S[3], 'auto'), scenario='s3_waiting_matches_auto')
case('fill_mode_manual_leaves_matches_on_court', fill_mode(S[3], 'manual'), scenario='s3_waiting_matches_auto_placed')
case('fill_mode_auto_skips_a_court_not_open_yet', fill_mode(S[3], 'auto'), scenario='s3_waiting_matches_court_closed', redact=RAND)
case('fill_mode_auto_skips_a_player_already_on_court', fill_mode(S[3], 'auto'), scenario='s3_waiting_matches_one_on_court', redact=RAND)
case('fill_mode_auto_keeps_a_protected_match_in_order', fill_mode(S[3], 'auto'), scenario='s3_waiting_matches_protected', redact=RAND)
case('fill_mode_on_a_prepared_session', fill_mode(S[1], 'auto'))
case('fill_mode_on_a_finished_session', fill_mode(S[4], 'auto'))
case('fill_mode_unknown_session', fill_mode('a3000000-0000-4000-8000-0000000000ff', 'auto'))
case('fill_mode_malformed_session_id', fill_mode('m', 'auto'), **MALFORMED)
case('fill_mode_other_clubs_session', fill_mode(S[9], 'auto'))
case('fill_mode_on_a_lapsed_live_session_started_under_a_term', fill_mode(S[8], 'auto', who=LAPSED))
case('fill_mode_two_at_once', {'parallel': [fill_mode(S[3], 'auto'), fill_mode(S[3], 'auto')]}, scenario='s3_waiting_matches', redact=RAND)
case('fill_courts_signed_out', fill_courts(S[3], [CT(3)], who=None))
case('fill_courts_in_manual_queue_places_nothing', fill_courts(S[3], [CT(3), CT(4)]), scenario='s3_waiting_matches')
case('fill_courts_in_auto_queue_fills_the_named_court', fill_courts(S[3], [CT(4)]), scenario='s3_waiting_matches_auto', redact=RAND)
case('fill_courts_in_auto_queue_fills_every_named_court', fill_courts(S[3], [CT(3), CT(4)]), scenario='s3_waiting_matches_auto', redact=RAND)
case('fill_courts_in_auto_queue_with_no_ids_places_nothing', fill_courts(S[3], []), scenario='s3_waiting_matches_auto')
case('fill_courts_ids_that_are_not_text_are_dropped', req('POST', f'/api/sessions/{S[3]}/court-fill', {'courtIds': [5, None, CT(3)]}), scenario='s3_waiting_matches_auto', redact=RAND)
case('fill_courts_ids_not_a_list_place_nothing', req('POST', f'/api/sessions/{S[3]}/court-fill', {'courtIds': CT(3)}), scenario='s3_waiting_matches_auto')
case('fill_courts_a_court_of_another_session_places_nothing', fill_courts(S[3], [CT(1)]), scenario='s3_waiting_matches_auto')
case('fill_courts_unknown_court_places_nothing', fill_courts(S[3], ['not-a-court']), scenario='s3_waiting_matches_auto')
case('fill_courts_a_court_not_open_yet_places_nothing', fill_courts(S[3], [CT(3)]), scenario='s3_waiting_matches_court_closed_auto')
case('fill_courts_body_not_json', req('POST', f'/api/sessions/{S[3]}/court-fill', rawBody='nope'))
case('fill_courts_on_a_prepared_session', fill_courts(S[1], [CT(1)]))
case('fill_courts_other_clubs_session', fill_courts(S[9], [CT(9)]))
case('fill_courts_malformed_session_id', fill_courts('m', [CT(3)]), **MALFORMED)
case('fill_courts_two_at_once', {'parallel': [fill_courts(S[3], [CT(3), CT(4)]), fill_courts(S[3], [CT(3), CT(4)])]}, scenario='s3_waiting_matches_auto', redact=RAND)

# ---------------------------------------------------------------- POST /api/sessions/{id}/requests/drop-outs/{id}/keep and /remove
def keep(session, n, **kw):
    return req('POST', f'/api/sessions/{session}/requests/drop-outs/{n}/keep', **kw)


def remove(session, n, **kw):
    return req('POST', f'/api/sessions/{session}/requests/drop-outs/{n}/remove', **kw)


case('keep_signed_out', keep(S[1], DN(1), who=None), scenario='notices')
case('keep_a_player_subject_is_not_a_club', keep(S[1], DN(1), who=PLAYER_SUBJECT, **NOSUBJECT), scenario='notices')
case('keep_open_notice', keep(S[1], DN(1)), scenario='notices')
case('keep_twice', [keep(S[1], DN(1)), keep(S[1], DN(1))], scenario='notices')
case('keep_closed_notice', keep(S[1], DN(2)), scenario='notices')
case('keep_notice_whose_entry_was_released', keep(S[1], DN(3)), scenario='notices')
case('keep_unknown_notice', keep(S[1], DN(99)), scenario='notices')
case('keep_malformed_notice_id_is_not_found', keep(S[1], 'm'), scenario='notices')
case('keep_notice_of_another_session', keep(S[2], DN(1)), scenario='notices')
case('keep_malformed_session_id', keep('m', DN(1)), scenario='notices', **MALFORMED)
case('keep_other_clubs_session', keep(S[9], DN(1)), scenario='notices')
case('keep_on_a_live_session', keep(S[3], DN(4)), scenario='notices')
case('keep_on_a_lapsed_session', keep(S[7], DN(5), who=LAPSED), scenario='notices')
case('keep_two_at_once', {'parallel': [keep(S[1], DN(1)), keep(S[1], DN(1))]}, scenario='notices')
case('remove_open_notice_releases_the_entry', remove(S[1], DN(1)), scenario='notices')
case('remove_recomputes_the_minimum', remove(S[1], DN(1)), scenario='notices_calculated_minimum')
case('remove_twice', [remove(S[1], DN(1)), remove(S[1], DN(1))], scenario='notices')
case('remove_closed_notice', remove(S[1], DN(2)), scenario='notices')
case('remove_notice_whose_entry_was_released', remove(S[1], DN(3)), scenario='notices')
case('remove_on_a_live_session', remove(S[3], DN(4)), scenario='notices')
case('remove_unknown_notice', remove(S[1], DN(99)), scenario='notices')
case('remove_malformed_notice_id_is_not_found', remove(S[1], 'm'), scenario='notices')
case('remove_notice_of_another_session', remove(S[2], DN(1)), scenario='notices')
case('remove_malformed_session_id', remove('m', DN(1)), scenario='notices', **MALFORMED)
case('remove_other_clubs_session', remove(S[9], DN(1)), scenario='notices')
case('remove_on_a_lapsed_session', remove(S[7], DN(5), who=LAPSED), scenario='notices')
# Keep and Remove at once race for the decision (which wins is not decided), so that is tested in race_test.go, not pinned.

# ---------------------------------------------------------------- scenarios
SCEN = dict(BASE['scenarios'])


def entry_sql(sp, session, cp, name, present=True):
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, "
            f"created_at, updated_at, revision) VALUES ('{SP(sp)}', '{CLUB1}', '{S[session]}', '{CP(cp)}', '{name}', {'true' if present else 'false'}, {NOW}, 3, "
            f"TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', {NOW}, {NOW}, 1)")


def request_sql(n, club, session, name, status='pending'):
    return (f"INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, created_at, updated_at, revision) VALUES "
            f"('{RQ(n)}', '{club}', '{session}', '{name}', 'unsure', 'slot', '{status}', {NOW}, {NOW}, {NOW}, 1)")


LAPSED_CLUB = 'c9000000-0000-4000-8000-000000000002'
SCEN['request_on_s4'] = [request_sql(31, CLUB1, S[4], 'Late Lena')]
SCEN['request_on_s7'] = [request_sql(32, LAPSED_CLUB, S[7], 'Lapsed Lou')]
SCEN['request_on_s8'] = [request_sql(33, LAPSED_CLUB, S[8], 'Live Lou')]

# The live night with four more people here: Gus, Gail, Ann and Ben join Hal and Jo (Ivy stays away unless a scenario brings her).
FULL_HOUSE = [entry_sql(20, 3, 1, 'Gus Guest'), entry_sql(21, 3, 2, 'Gail Guest'), entry_sql(22, 3, 3, 'Ann Reyes'), entry_sql(23, 3, 4, 'Ben Santos'),
              f"UPDATE session_players SET present = true WHERE id = '{SP(5)}'"]
SCEN['s3_full_house'] = FULL_HOUSE
SCEN['s3_full_house_ivy_away'] = FULL_HOUSE[:-1]
LAPSED_ENTRIES = [f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{SP(n)}', '{LAPSED_CLUB}', '{S[8]}', '{CP(c)}', '{name}', true, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)" for n, c, name in ((31, 20, 'Larry Lapsed'), (32, 31, 'Uri Beltran'))]
SCEN['mr_on_s8'] = LAPSED_ENTRIES + [f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('{MR(41)}', '{LAPSED_CLUB}', '{S[8]}', '{SP(31)}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)",
                                    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('{MR(41)}', '{LAPSED_CLUB}', '{S[8]}', 'opponent', 0, NULL)"]
SCEN['mr_on_s4'] = [f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('{MR(40)}', '{CLUB1}', '{S[4]}', '{SP(7)}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)"]


def match_sql(n, session, players, state='waiting', fmt='singles', pos=None, origin='manual', protected=False, court=None):
    mid = f'a4000000-0000-4000-8000-0000000000{n:02d}'
    pos = n if pos is None else pos
    out = [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, manual_protected, source_operation_id, placed_at, started_at, ended_at, created_at, updated_at, revision) "
           f"VALUES ('{mid}', '{CLUB1}', '{S[session]}', {n}, '{state}', '{fmt}', {pos if state == 'waiting' else 'NULL'}, '{origin}', {'true' if protected else 'false'}, 'a4100000-0000-4000-8000-0000000000{n:02d}', "
           f"{NOW if state != 'waiting' else 'NULL'}, {NOW if state in ('active', 'completed') else 'NULL'}, {NOW if state == 'completed' else 'NULL'}, {NOW}, {NOW}, 1)"]
    for i, (sp, team) in enumerate(players):
        done = 'true' if state == 'completed' else 'false'
        out.append(f"INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, started_with_match, finished_with_match, created_at, updated_at) "
                   f"VALUES ('a4200000-0000-4000-8000-0000000{n:02d}{i:03d}', '{CLUB1}', '{S[session]}', '{mid}', '{SP(sp)}', '{team}', 1, 'a4300000-0000-4000-8000-0000000000{n:02d}', {NOW}, {done}, {done}, {NOW}, {NOW})")
    if court is not None:
        out.append(f"INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES ('{CT(court)}', '{CLUB1}', '{S[session]}', '{mid}', {NOW})")
        out.append(f"INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, acquire_operation_id) VALUES "
                   f"('a4400000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[session]}', '{mid}', '{CT(court)}', {NOW}, 'a4300000-0000-4000-8000-0000000000{n:02d}')")
        for sp, _ in players:
            out.append(f"INSERT INTO active_player_holds (session_player_id, club_id, session_id, match_id, held_at) VALUES ('{SP(sp)}', '{CLUB1}', '{S[session]}', '{mid}', {NOW})")
    return out


SCEN['s3_full_house_games'] = FULL_HOUSE + [
    # Hal and Jo have each played two games, Gus one, so the fill takes the other present players first.
    *match_sql(1, 3, [(4, 'A'), (20, 'B')], state='completed'),
    *match_sql(2, 3, [(4, 'A'), (6, 'B')], state='completed')]
SCEN['s3_full_house_adjusted'] = FULL_HOUSE + [f"UPDATE session_players SET games_adjustment = 3 WHERE id IN ('{SP(22)}', '{SP(23)}')",
                                                f"UPDATE session_players SET games_adjustment = -1 WHERE id = '{SP(20)}'"]
SCEN['s3_full_house_waiting'] = FULL_HOUSE + match_sql(1, 3, [(20, 'A'), (21, 'B')]) + match_sql(2, 3, [(22, 'A'), (23, 'B')], pos=2)
SCEN['s3_full_house_auto'] = FULL_HOUSE + [f"UPDATE queue_sessions SET court_fill_mode = 'auto' WHERE id = '{S[3]}'"]
SCEN['s3_full_house_auto_busy'] = SCEN['s3_full_house_auto'] + match_sql(1, 3, [(20, 'A'), (21, 'B')], state='on_court', court=3) + match_sql(2, 3, [(22, 'A'), (23, 'B')], state='active', court=4)
SCEN['s3_full_house_auto_court_closed'] = SCEN['s3_full_house_auto'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(3)}'"]
SCEN['s3_full_house_no_doubles'] = FULL_HOUSE + [f"UPDATE queue_sessions SET allow_doubles = false WHERE id = '{S[3]}'"]
SCEN['mr3_declined'] = FULL_HOUSE + [f"UPDATE session_match_requests SET status = 'declined', decided_at = {NOW} WHERE id = '{MR(3)}'"]
SCEN['mr3_already_added'] = FULL_HOUSE + match_sql(1, 3, [(6, 'A'), (4, 'A'), (20, 'B'), (21, 'B')], fmt='doubles') + [
    f"UPDATE session_match_requests SET status = 'added', decided_at = {NOW}, match_id = 'a4000000-0000-4000-8000-000000000001' WHERE id = '{MR(3)}'"]
SCEN['jo_has_a_club_nickname'] = [f"UPDATE club_players SET nickname = 'Joey' WHERE id = '{CP(9)}'"]
SCEN['jo_is_registered'] = [f"UPDATE club_players SET player_id = 'd4000000-0000-4000-8000-000000000006', nickname = NULL WHERE id = '{CP(9)}'"]
WM = [(20, 'A'), (21, 'B')], [(22, 'A'), (23, 'B')], [(4, 'A'), (6, 'B')]
SCEN['s3_waiting_matches'] = FULL_HOUSE + match_sql(1, 3, WM[0]) + match_sql(2, 3, WM[1]) + match_sql(3, 3, WM[2])
SCEN['s3_waiting_matches_auto'] = SCEN['s3_waiting_matches'] + [f"UPDATE queue_sessions SET court_fill_mode = 'auto' WHERE id = '{S[3]}'"]
SCEN['s3_waiting_matches_auto_placed'] = FULL_HOUSE + match_sql(1, 3, WM[0], state='on_court', court=3) + match_sql(2, 3, WM[1], state='on_court', court=4) + match_sql(3, 3, WM[2]) + [
    f"UPDATE queue_sessions SET court_fill_mode = 'auto' WHERE id = '{S[3]}'"]
SCEN['s3_waiting_matches_court_closed'] = SCEN['s3_waiting_matches'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(3)}'"]
SCEN['s3_waiting_matches_court_closed_auto'] = SCEN['s3_waiting_matches_court_closed'] + [f"UPDATE queue_sessions SET court_fill_mode = 'auto' WHERE id = '{S[3]}'"]
SCEN['s3_waiting_matches_one_on_court'] = FULL_HOUSE + match_sql(1, 3, WM[0], state='on_court', court=3) + match_sql(2, 3, [(20, 'A'), (22, 'B')], pos=2) + match_sql(3, 3, WM[2], pos=3)
SCEN['s3_waiting_matches_protected'] = FULL_HOUSE + match_sql(1, 3, WM[0], protected=True, pos=2) + match_sql(2, 3, WM[1], pos=1) + match_sql(3, 3, WM[2], pos=3)


def notice_sql(n, session, sp, status='open', decision=None):
    return (f"INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, status, decision, created_at, closed_at) VALUES "
            f"('{DN(n)}', '{CLUB1}', '{S[session]}', '{SP(sp)}', 'd4000000-0000-4000-8000-000000000001', '{status}', {repr(decision) if decision else 'NULL'}, TIMESTAMPTZ '2026-11-18 0{n % 10}:00:00+00', "
            f"{NOW if status == 'closed' else 'NULL'})")


SCEN['notices'] = [notice_sql(1, 1, 1), notice_sql(2, 1, 1, 'closed', 'kept'),
                   f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, released_at, release_reason, created_at, updated_at, revision) VALUES ('{SP(21)}', '{CLUB1}', '{S[1]}', '{CP(1)}', 'Gus Out', false, {NOW}, 3, {NOW}, {NOW}, {NOW}, 'removed', {NOW}, {NOW}, 1)",
                   notice_sql(3, 1, 21), notice_sql(4, 3, 4),
                   f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{SP(30)}', '{LAPSED_CLUB}', '{S[7]}', '{CP(20)}', 'Larry Lapsed', false, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)",
                   f"INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, status, created_at) VALUES ('{DN(5)}', '{LAPSED_CLUB}', '{S[7]}', '{SP(30)}', 'd4000000-0000-4000-8000-000000000001', 'open', TIMESTAMPTZ '2026-11-18 05:00:00+00')"]
SCEN['notices_calculated_minimum'] = SCEN['notices'] + [f"UPDATE queue_sessions SET minimum_is_calculated = true, minimum_games = 99 WHERE id = '{S[1]}'"]

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'queue_sessions':
        s['sql'] = s['sql'].replace('minimum_games, updated_at', 'minimum_games, court_fill_mode, updated_at')
    if s['name'] == 'session_players':
        s['sql'] = s['sql'].replace('no_show_at, revision::text', 'no_show_at, games_adjustment, self_checked_in_at, left_at, revision::text')
    SNAPSHOT.append(s)
SNAPSHOT += [
    {'name': 'matches', 'sql': "SELECT id, session_id, match_no, state, format, queue_position, origin, manual_protected, generation_id, source_operation_id, placed_at, started_at, ended_at, removed_at, created_at, updated_at, revision::text AS revision FROM matches ORDER BY session_id, match_no, id"},
    {'name': 'match_participations', 'sql': "SELECT id, match_id, session_player_id, team, segment_no, joined_operation_id, left_operation_id, joined_at, left_at, started_with_match, finished_with_match, credit_to, created_at, updated_at FROM match_participations ORDER BY match_id, session_player_id, segment_no, id"},
    {'name': 'match_court_usage', 'sql': "SELECT id, match_id, court_id, acquired_at, released_at, acquire_operation_id, release_operation_id FROM match_court_usage ORDER BY match_id, court_id"},
    {'name': 'active_court_holds', 'sql': "SELECT court_id, session_id, match_id, held_at FROM active_court_holds ORDER BY court_id"},
    {'name': 'active_player_holds', 'sql': "SELECT session_player_id, session_id, match_id, player_id, held_at FROM active_player_holds ORDER BY session_player_id"},
    {'name': 'session_match_request_spots', 'sql': "SELECT request_id, side, slot_no, session_player_id FROM session_match_request_spots ORDER BY request_id, side, slot_no"},
    {'name': 'session_drop_out_notices', 'sql': "SELECT id, session_id, session_player_id, player_id, status, decision, created_at, closed_at, closed_by_device_id FROM session_drop_out_notices ORDER BY id"},
]
# The request spec shows who decided it and when.
for s in SNAPSHOT:
    if s['name'] == 'session_match_requests':
        s['sql'] = "SELECT id, session_id, session_player_id, format, status, requested_at, decided_at, match_id, revision::text AS revision, updated_at FROM session_match_requests ORDER BY id"

doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}


def tidy(step_):
    for k in [k for k, v in step_.items() if v is None and k != 'who']:
        del step_[k]
    for p in step_.get('parallel', []):
        tidy(p)
    return step_


for c in cases:
    for s in c['steps']:
        tidy(s)
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
used = {c['scenario'] for c in cases}
assert used <= set(SCEN), used - set(SCEN)
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
