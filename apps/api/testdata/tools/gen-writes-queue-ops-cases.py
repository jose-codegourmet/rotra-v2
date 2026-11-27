#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/rosterops.cases.json: the single roster operations of the Queue app
(roster add and remove, level, no show, move to waitlist, set games, presence, waitlist remove, give slot, fill).

Run it, then the capture (capture-writes-queue.test.mjs -t rosterops), which writes rosterops.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-ops-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/rosterops.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
WL = lambda n: f'a3300000-0000-4000-8000-0000000000{n:02d}'
PL = lambda n: f'd4000000-0000-4000-8000-0000000000{n:02d}'
LEVEL = 'intermediate_low'
UNKNOWN = 'a7000000-0000-4000-8000-0000000000ff'


def op(n):
    return f'b1000000-0000-4000-8000-{n:012d}'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    c = {'name': name, 'scenario': scenario, 'steps': steps if isinstance(steps, list) else [steps]}
    c.update(kw)
    cases.append(c)


# A malformed id: the TypeScript crashes (a 500, Prisma or a raw uuid cast); Go answers not found. A malformed or missing operation
# id handed to Prisma as a uuid: 500 there, invalid here.
MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
BADOP = {}  # the TypeScript answers 404 for a malformed id anywhere (isMalformedId, main #1108); Go does the same
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}


def roster_path(session, *rest):
    return '/'.join([f'/api/sessions/{session}/roster', *rest])


def add_saved(cp, n=1, **kw):
    return {'source': 'saved', 'operationId': op(n), 'clubPlayerId': cp, 'level': LEVEL, **kw}


def add_dir(pl, n=1, **kw):
    return {'source': 'directory', 'operationId': op(n), 'playerId': pl, 'level': LEVEL, **kw}


def add_new(name, n=1, **kw):
    return {'operationId': op(n), 'name': name, 'level': LEVEL, **kw}


# ---------------------------------------------------------------- POST /roster
POST_ROSTER = lambda s: roster_path(s)
case('add_signed_out', req('POST', POST_ROSTER(S[1]), add_saved(CP(1)), who=None))
case('add_player_subject_is_not_a_club', req('POST', POST_ROSTER(S[1]), add_saved(CP(1)), who=PLAYER_SUBJECT, **NOSUBJECT))
case('add_body_not_json', req('POST', POST_ROSTER(S[1]), rawBody='nope'))
case('add_body_array', req('POST', POST_ROSTER(S[1]), rawBody='[]'))
case('add_no_body', req('POST', POST_ROSTER(S[1])))
case('add_saved_open_slot', req('POST', POST_ROSTER(S[1]), add_saved(CP(1))))
case('add_saved_registered_player', req('POST', POST_ROSTER(S[1]), add_saved(CP(3))))
case('add_saved_full_goes_to_the_waitlist', req('POST', POST_ROSTER(S[2]), add_saved(CP(1))))
case('add_saved_full_overfill', req('POST', POST_ROSTER(S[2]), add_saved(CP(1), allowOverfill=True)))
case('add_saved_to_waitlist', req('POST', POST_ROSTER(S[1]), add_saved(CP(4), toWaitlist=True)))
case('add_saved_already_on_the_roster', req('POST', POST_ROSTER(S[1]), add_saved(CP(7))))
case('add_saved_removed_player', req('POST', POST_ROSTER(S[1]), add_saved(CP(6))))
case('add_saved_unknown_player', req('POST', POST_ROSTER(S[1]), add_saved('c6000000-0000-4000-8000-0000000000ff')))
case('add_saved_other_clubs_player', req('POST', POST_ROSTER(S[1]), add_saved(CP(30))))
case('add_saved_bad_level', req('POST', POST_ROSTER(S[1]), add_saved(CP(1), level='expert')))
case('add_saved_missing_player_id', req('POST', POST_ROSTER(S[1]), {'source': 'saved', 'operationId': op(1), 'level': LEVEL}, **MALFORMED))
case('add_saved_missing_operation_id', req('POST', POST_ROSTER(S[1]), {'source': 'saved', 'clubPlayerId': CP(1), 'level': LEVEL}, **BADOP))
case('add_saved_retry_same_operation', [req('POST', POST_ROSTER(S[1]), add_saved(CP(1), 5), snapshot=True), req('POST', POST_ROSTER(S[1]), add_saved(CP(1), 5))])
case('add_saved_closed_session', req('POST', POST_ROSTER(S[4]), add_saved(CP(1))))
case('add_saved_live_session', req('POST', POST_ROSTER(S[3]), add_saved(CP(1))))
case('add_saved_unknown_session', req('POST', POST_ROSTER('a3000000-0000-4000-8000-0000000000ff'), add_saved(CP(1))))
case('add_saved_malformed_session', req('POST', POST_ROSTER('nope'), add_saved(CP(1)), **MALFORMED))
case('add_saved_other_clubs_session', req('POST', POST_ROSTER(S[9]), add_saved(CP(1))))
case('add_saved_lapsed_club_prepared', req('POST', POST_ROSTER(S[7]), add_saved(CP(20)), who=LAPSED))
case('add_saved_lapsed_club_live_runs_on', req('POST', POST_ROSTER(S[8]), add_saved(CP(20)), who=LAPSED))
case('add_directory_registered_player', req('POST', POST_ROSTER(S[1]), add_dir(PL(6))))
case('add_directory_shared_entry_with_a_name', req('POST', POST_ROSTER(S[1]), add_dir('a6000000-0000-4000-8000-000000000008', name='Uri B.')))
case('add_directory_unknown_profile', req('POST', POST_ROSTER(S[1]), add_dir('d4000000-0000-4000-8000-0000000000ff')))
case('add_directory_malformed_profile', req('POST', POST_ROSTER(S[1]), add_dir('x'), **MALFORMED))
case('add_new_guest', req('POST', POST_ROSTER(S[1]), add_new('Newbie', nickname='Nub', phone='0917 555 0100')))
case('add_new_guest_blank_phone_ok', req('POST', POST_ROSTER(S[1]), add_new('Blank Phone', phone='   ')))
case('add_new_bad_phone', req('POST', POST_ROSTER(S[1]), add_new('Newbie', phone='abc')))
case('add_new_bad_phone_before_the_session_lookup', req('POST', POST_ROSTER('nope'), add_new('Newbie', phone='abc')))
case('add_new_blank_name', req('POST', POST_ROSTER(S[1]), add_new('   ')))
case('add_new_with_email', req('POST', POST_ROSTER(S[1]), add_new('Eli Newmail', email='eli@example.test')))
case('add_new_with_a_registered_players_email', req('POST', POST_ROSTER(S[1]), add_new('Gil Again', email='gil@example.test')))
case('add_new_bad_email', req('POST', POST_ROSTER(S[1]), add_new('Bad Mail', email='nope')))
case('add_new_retry_same_operation', [req('POST', POST_ROSTER(S[1]), add_new('Newbie', 8, email='eli@example.test'), snapshot=True), req('POST', POST_ROSTER(S[1]), add_new('Newbie', 8, email='eli@example.test'))])
case('add_new_unknown_source_is_a_new_player', req('POST', POST_ROSTER(S[1]), {'source': 'elsewhere', 'operationId': op(1), 'name': 'Odd Source', 'level': LEVEL}))
case('add_flags_that_are_not_true_do_not_count', req('POST', POST_ROSTER(S[2]), add_saved(CP(1), allowOverfill='true', toWaitlist='yes')))

# ---------------------------------------------------------------- DELETE /roster/{rosterId}
D = lambda s, r: roster_path(s, r)
case('remove_signed_out', req('DELETE', D(S[1], SP(1)), who=None))
case('remove_prepared_entry', req('DELETE', D(S[1], SP(1))))
case('remove_released_entry_is_a_no_op', req('DELETE', D(S[1], SP(1))), scenario='hal_released')
case('remove_twice', [req('DELETE', D(S[1], SP(1))), req('DELETE', D(S[1], SP(1)))])
case('remove_unknown_entry', req('DELETE', D(S[1], UNKNOWN)))
case('remove_entry_of_another_session', req('DELETE', D(S[1], SP(2))))
case('remove_on_a_live_session', req('DELETE', D(S[3], SP(4))))
case('remove_on_a_closed_session', req('DELETE', D(S[4], SP(7))))
case('remove_malformed_id', req('DELETE', D(S[1], 'q'), **MALFORMED))
case('remove_unknown_session', req('DELETE', D('a3000000-0000-4000-8000-0000000000ff', SP(1))))
case('remove_other_clubs_session', req('DELETE', D(S[9], SP(1))))
case('remove_lapsed_club_prepared', req('DELETE', D(S[7], SP(1)), who=LAPSED))

# ---------------------------------------------------------------- POST /roster/{rosterId}/level
L = lambda s, r: roster_path(s, r, 'level')
case('level_signed_out', req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}, who=None))
case('level_body_not_json', req('POST', L(S[1], SP(1)), rawBody='nope'))
case('level_change', req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_same_level_still_appends', req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': LEVEL}))
case('level_retry_same_operation', [req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}, snapshot=True), req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'})])
case('level_two_changes_chain_the_assessments', [req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}), req('POST', L(S[1], SP(1)), {'operationId': op(2), 'level': 'beginner_low'})])
case('level_operation_id_of_another_entry', [req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}), req('POST', L(S[2], SP(2)), {'operationId': op(1), 'level': 'advanced_low'})])
case('level_bad_level', req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'expert'}))
case('level_bad_level_before_the_session_lookup', req('POST', L('nope', SP(1)), {'operationId': op(1), 'level': 'expert'}))
case('level_missing_operation_id', req('POST', L(S[1], SP(1)), {'level': 'advanced_low'}, **BADOP))
case('level_on_a_live_session_is_locked', req('POST', L(S[3], SP(4)), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_on_a_closed_session', req('POST', L(S[4], SP(7)), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_released_entry', req('POST', L(S[1], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}), scenario='hal_released')
case('level_no_show_entry_is_off_the_roster', req('POST', L(S[3], SP(4)), {'operationId': op(1), 'level': 'advanced_low'}), scenario='hal_no_show')
case('level_unknown_entry', req('POST', L(S[1], UNKNOWN), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_entry_of_another_session', req('POST', L(S[1], SP(2)), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_malformed_entry_id', req('POST', L(S[1], 'q'), {'operationId': op(1), 'level': 'advanced_low'}, **MALFORMED))
case('level_unknown_session', req('POST', L('a3000000-0000-4000-8000-0000000000ff', SP(1)), {'operationId': op(1), 'level': 'advanced_low'}))
case('level_lapsed_club_prepared', req('POST', L(S[7], SP(1)), {'operationId': op(1), 'level': 'advanced_low'}, who=LAPSED))

# ---------------------------------------------------------------- POST and DELETE /roster/{rosterId}/no-show
N = lambda s, r: roster_path(s, r, 'no-show')
case('no_show_signed_out', req('POST', N(S[3], SP(5)), {'operationId': op(1)}, who=None))
case('no_show_away_player_comes_off', req('POST', N(S[3], SP(5)), {'operationId': op(1)}))
case('no_show_twice_is_the_same_result', [req('POST', N(S[3], SP(5)), {'operationId': op(1)}), req('POST', N(S[3], SP(5)), {'operationId': op(2)}, snapshot=True)])
case('no_show_present_player_is_refused', req('POST', N(S[3], SP(4)), {'operationId': op(1)}))
case('no_show_player_in_a_waiting_match', req('POST', N(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_in_a_waiting_match')
case('no_show_player_in_a_finished_match_with_a_game', req('POST', N(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_played_a_game')
case('no_show_player_with_a_set_games_adjustment', req('POST', N(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_games_adjusted')
case('no_show_before_start', req('POST', N(S[1], SP(1)), {'operationId': op(1)}))
case('no_show_closed_session', req('POST', N(S[4], SP(7)), {'operationId': op(1)}))
case('no_show_released_entry', req('POST', N(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_released_on_s3')
case('no_show_unknown_entry', req('POST', N(S[3], UNKNOWN), {'operationId': op(1)}))
case('no_show_entry_of_another_session', req('POST', N(S[3], SP(1)), {'operationId': op(1)}))
case('no_show_malformed_entry', req('POST', N(S[3], 'q'), {'operationId': op(1)}, **MALFORMED))
case('no_show_missing_operation_id', req('POST', N(S[3], SP(5)), {}))
case('no_show_empty_operation_id', req('POST', N(S[3], SP(5)), {'operationId': ''}))
case('no_show_operation_id_is_any_text', req('POST', N(S[3], SP(5)), {'operationId': 'not-a-uuid'}))
case('no_show_body_not_json', req('POST', N(S[3], SP(5)), rawBody='nope'))
case('no_show_lapsed_club_live_runs_on', req('POST', N(S[8], SP(11)), {'operationId': op(1)}, who=LAPSED), scenario='lapsed_live_roster')
case('back_to_roster_signed_out', req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}, who=None))
case('back_to_roster_takes_a_free_slot', req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}), scenario='s2_ivy_no_show')
case('back_to_roster_twice', [req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}), req('DELETE', N(S[2], SP(3)), {'operationId': op(2)}, snapshot=True)], scenario='s2_ivy_no_show')
case('back_to_roster_refused_when_full', req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}), scenario='s2_ivy_no_show_full')
case('back_to_roster_not_a_no_show_is_the_same_result', req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}))
case('back_to_roster_on_a_live_session', req('DELETE', N(S[3], SP(5)), {'operationId': op(1)}), scenario='s3_ivy_no_show')
case('back_to_roster_released_entry', req('DELETE', N(S[2], SP(3)), {'operationId': op(1)}), scenario='s2_ivy_released')
case('back_to_roster_unknown_entry', req('DELETE', N(S[2], UNKNOWN), {'operationId': op(1)}))
case('back_to_roster_missing_operation_id', req('DELETE', N(S[2], SP(3)), {}))
case('back_to_roster_no_body', req('DELETE', N(S[2], SP(3))))
case('back_to_roster_closed_session', req('DELETE', N(S[4], SP(7)), {'operationId': op(1)}))

# ---------------------------------------------------------------- POST /roster/{rosterId}/waitlist
W = lambda s, r: roster_path(s, r, 'waitlist')
case('step_down_signed_out', req('POST', W(S[3], SP(4)), {'operationId': op(1)}, who=None))
case('step_down_live_player', req('POST', W(S[3], SP(4)), {'operationId': op(1)}))
case('step_down_registered_player_gets_the_place_notification', req('POST', W(S[3], SP(10)), {'operationId': op(1)}), scenario='ann_on_s3')
case('step_down_prepared_player_goes_to_the_front', req('POST', W(S[2], SP(2)), {'operationId': op(1)}))
case('step_down_retry_same_operation', [req('POST', W(S[3], SP(4)), {'operationId': op(1)}, snapshot=True), req('POST', W(S[3], SP(4)), {'operationId': op(1)})])
case('step_down_two_players_batch_in_slot_order', [req('POST', W(S[3], SP(4)), {'operationId': op(1)}), req('POST', W(S[3], SP(6)), {'operationId': op(2)})])
case('step_down_player_in_a_waiting_match', req('POST', W(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_in_a_waiting_match')
case('step_down_player_in_a_finished_match_is_fine', req('POST', W(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_played_a_game')
case('step_down_released_entry', req('POST', W(S[3], SP(5)), {'operationId': op(1)}), scenario='ivy_released_on_s3')
case('step_down_released_entry_retry_answers_the_first', [req('POST', W(S[3], SP(5)), {'operationId': op(1)}), req('POST', W(S[3], SP(5)), {'operationId': op(1)})])
case('step_down_no_show_entry_is_off_the_roster', req('POST', W(S[3], SP(4)), {'operationId': op(1)}), scenario='hal_no_show')
case('step_down_missing_operation_id', req('POST', W(S[3], SP(4)), {}))
case('step_down_operation_id_is_any_text', req('POST', W(S[3], SP(4)), {'operationId': 'not-a-uuid'}))
case('step_down_unknown_entry', req('POST', W(S[3], UNKNOWN), {'operationId': op(1)}))
case('step_down_entry_of_another_session', req('POST', W(S[3], SP(1)), {'operationId': op(1)}))
case('step_down_malformed_entry', req('POST', W(S[3], 'q'), {'operationId': op(1)}, **MALFORMED))
case('step_down_closed_session', req('POST', W(S[4], SP(7)), {'operationId': op(1)}))
case('step_down_body_not_json', req('POST', W(S[3], SP(4)), rawBody='nope'))
case('step_down_then_the_waitlist_order', [req('POST', W(S[3], SP(4)), {'operationId': op(1)}, now='2026-11-19T04:00:00.000Z'), req('POST', W(S[3], SP(6)), {'operationId': op(2)}, now='2026-11-19T04:10:00.000Z', snapshot=True)])

# ---------------------------------------------------------------- PATCH /roster/games
G = lambda s: roster_path(s, 'games')
case('games_signed_out', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': SP(4)}, who=None))
case('games_one_player', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': SP(4)}))
case('games_all_players', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 3, 'all': True}))
case('games_all_only_when_true', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 3, 'all': 'yes', 'rosterId': SP(4)}))
case('games_zero', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 0, 'rosterId': SP(4)}))
case('games_max_99', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 99, 'rosterId': SP(4)}))
case('games_over_99', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 100, 'rosterId': SP(4)}))
case('games_negative', req('PATCH', G(S[3]), {'operationId': op(1), 'games': -1, 'rosterId': SP(4)}))
case('games_fraction', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 1.5, 'rosterId': SP(4)}))
case('games_text', req('PATCH', G(S[3]), {'operationId': op(1), 'games': '2', 'rosterId': SP(4)}))
case('games_missing', req('PATCH', G(S[3]), {'operationId': op(1), 'rosterId': SP(4)}))
case('games_counts_games_already_played', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 3, 'rosterId': SP(6)}), scenario='jo_played_a_game')
case('games_below_the_counted_games_stores_a_negative_adjustment', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 0, 'rosterId': SP(6)}), scenario='jo_played_a_game')
case('games_all_with_counted_games', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'all': True}), scenario='jo_played_a_game')
case('games_same_count_again_writes_nothing_new', [req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': SP(4)}, snapshot=True), req('PATCH', G(S[3]), {'operationId': op(2), 'games': 2, 'rosterId': SP(4)})])
case('games_before_start', req('PATCH', G(S[1]), {'operationId': op(1), 'games': 2, 'rosterId': SP(1)}))
case('games_closed_session', req('PATCH', G(S[4]), {'operationId': op(1), 'games': 2, 'rosterId': SP(7)}))
case('games_all_with_nobody_on_the_roster', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'all': True}), scenario='s3_empty_roster')
case('games_released_entry', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': SP(5)}), scenario='ivy_released_on_s3')
case('games_unknown_entry', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': UNKNOWN}))
case('games_entry_of_another_session', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': SP(1)}))
case('games_missing_roster_id', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2}, **MALFORMED))
case('games_malformed_roster_id', req('PATCH', G(S[3]), {'operationId': op(1), 'games': 2, 'rosterId': 'q'}, **MALFORMED))
case('games_operation_id_is_not_read', req('PATCH', G(S[3]), {'games': 2, 'rosterId': SP(4)}))
case('games_body_not_json', req('PATCH', G(S[3]), rawBody='nope'))
case('games_lapsed_club_live_runs_on', req('PATCH', G(S[8]), {'operationId': op(1), 'games': 2, 'all': True}, who=LAPSED), scenario='lapsed_live_roster')

# ---------------------------------------------------------------- POST /presence
P = lambda s: f'/api/sessions/{s}/presence'
case('presence_signed_out', req('POST', P(S[1]), {'all': True}, who=None))
case('presence_all_here', req('POST', P(S[1]), {'all': True}))
case('presence_all_here_changes_only_the_absent', req('POST', P(S[2]), {'all': True}), scenario='s2_hal_here')
case('presence_all_away', req('POST', P(S[2]), {'all': False}), scenario='s2_hal_here')
case('presence_all_wins_over_changes', req('POST', P(S[1]), {'all': True, 'changes': [{'rosterId': SP(1), 'present': False}]}))
case('presence_all_on_a_live_session', req('POST', P(S[3]), {'all': True}))
case('presence_all_not_a_boolean_is_the_changes_form', req('POST', P(S[1]), {'all': 'yes'}))
case('presence_one_change', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}]}))
case('presence_two_changes_each_bump_the_revision', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}, {'rosterId': SP(4), 'present': False}]}))
case('presence_unchanged_entry_is_a_no_op_but_bumps', req('POST', P(S[3]), {'changes': [{'rosterId': SP(4), 'present': True}]}))
case('presence_present_not_true_means_away', req('POST', P(S[3]), {'changes': [{'rosterId': SP(4), 'present': 'yes'}]}))
case('presence_the_same_entry_twice', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}, {'rosterId': SP(5), 'present': False}]}))
case('presence_a_later_failure_keeps_the_earlier_changes', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}, {'rosterId': UNKNOWN, 'present': True}]}))
case('presence_a_malformed_id_keeps_the_earlier_changes', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}, {'rosterId': 'q', 'present': True}]}, allow500=True, goExpects={'status': 404, 'code': 'not_found'}))
case('presence_changes_empty', req('POST', P(S[3]), {'changes': []}))
case('presence_changes_missing', req('POST', P(S[3]), {}))
case('presence_changes_not_a_list', req('POST', P(S[3]), {'changes': 'x'}))
case('presence_released_entry', req('POST', P(S[3]), {'changes': [{'rosterId': SP(5), 'present': True}]}), scenario='ivy_released_on_s3')
case('presence_entry_of_another_session', req('POST', P(S[3]), {'changes': [{'rosterId': SP(1), 'present': True}]}))
case('presence_closed_session', req('POST', P(S[4]), {'changes': [{'rosterId': SP(7), 'present': False}]}))
case('presence_closed_session_with_no_changes', req('POST', P(S[4]), {'changes': []}))
case('presence_body_not_json', req('POST', P(S[3]), rawBody='nope'))
case('presence_unknown_session', req('POST', P('a3000000-0000-4000-8000-0000000000ff'), {'all': True}))
case('presence_lapsed_club_prepared', req('POST', P(S[7]), {'all': True}, who=LAPSED))

# ---------------------------------------------------------------- waitlist: DELETE, give slot, fill
WD = lambda s, w: f'/api/sessions/{s}/waitlist/{w}'
WS = lambda s, w: f'/api/sessions/{s}/waitlist/{w}/slot'
WF = lambda s: f'/api/sessions/{s}/waitlist/fill'
case('waitlist_remove_signed_out', req('DELETE', WD(S[2], WL(1)), who=None))
case('waitlist_remove', req('DELETE', WD(S[2], WL(1))))
case('waitlist_remove_twice_is_ok', [req('DELETE', WD(S[2], WL(1))), req('DELETE', WD(S[2], WL(1)))])
case('waitlist_remove_unknown_entry_is_ok', req('DELETE', WD(S[2], 'a3300000-0000-4000-8000-0000000000ff')))
case('waitlist_remove_entry_of_another_session', req('DELETE', WD(S[2], WL(2))))
case('waitlist_remove_malformed_id', req('DELETE', WD(S[2], 'q'), **MALFORMED))
case('waitlist_remove_closed_session', req('DELETE', WD(S[4], WL(1))))
case('waitlist_remove_live_session', req('DELETE', WD(S[3], WL(2))))
case('waitlist_remove_other_clubs_session', req('DELETE', WD(S[9], WL(1))))
case('waitlist_remove_lapsed_club_prepared', req('DELETE', WD(S[7], WL(1)), who=LAPSED))
case('slot_signed_out', req('POST', WS(S[2], WL(1)), {'operationId': op(1)}, who=None))
case('slot_over_budget_on_a_full_roster', req('POST', WS(S[2], WL(1)), {'operationId': op(1)}))
case('slot_within_budget_on_a_live_session', req('POST', WS(S[3], WL(2)), {'operationId': op(1)}))
case('slot_retry_answers_without_names', [req('POST', WS(S[2], WL(1)), {'operationId': op(1)}, snapshot=True), req('POST', WS(S[2], WL(1)), {'operationId': op(1)})])
case('slot_registered_player_gets_the_spot_notification', req('POST', WS(S[2], WL(1)), {'operationId': op(1)}))
case('slot_player_with_a_released_entry_comes_back', req('POST', WS(S[2], WL(1)), {'operationId': op(1)}), scenario='ann_released_on_s2')
case('slot_waiter_without_a_level', req('POST', WS(S[2], WL(1)), {'operationId': op(1)}), scenario='ann_no_level')
case('slot_unknown_waiter', req('POST', WS(S[2], 'a3300000-0000-4000-8000-0000000000ff'), {'operationId': op(1)}))
case('slot_waiter_of_another_session', req('POST', WS(S[2], WL(2)), {'operationId': op(1)}))
case('slot_malformed_waiter', req('POST', WS(S[2], 'q'), {'operationId': op(1)}, **MALFORMED))
case('slot_missing_operation_id', req('POST', WS(S[2], WL(1)), {}, **BADOP))
case('slot_operation_id_of_another_admission', [req('POST', WS(S[2], WL(1)), {'operationId': op(1)}), req('POST', WS(S[3], WL(2)), {'operationId': op(1)})])
case('slot_closed_session', req('POST', WS(S[4], WL(1)), {'operationId': op(1)}))
case('slot_body_not_json', req('POST', WS(S[2], WL(1)), rawBody='nope'))
case('slot_lapsed_club_prepared', req('POST', WS(S[7], WL(1)), {'operationId': op(1)}, who=LAPSED))
case('fill_signed_out', req('POST', WF(S[2]), {'operationId': op(1)}, who=None))
case('fill_a_full_roster_moves_nobody', req('POST', WF(S[2]), {'operationId': op(1)}))
case('fill_one_open_slot', req('POST', WF(S[2]), {'operationId': op(1)}), scenario='s2_free_slot')
case('fill_a_live_session', req('POST', WF(S[3]), {'operationId': op(1)}))
case('fill_skips_entries_without_a_level', req('POST', WF(S[2]), {'operationId': op(1)}), scenario='s2_free_slot_unlevelled_first')
case('fill_open_slots_in_waitlist_order', req('POST', WF(S[3]), {'operationId': op(1)}), scenario='s3_everyone_left_two_waiting')
case('fill_retry_same_operation', [req('POST', WF(S[2]), {'operationId': op(1)}, snapshot=True), req('POST', WF(S[2]), {'operationId': op(1)})], scenario='s2_free_slot')
case('fill_operation_id_is_any_text', req('POST', WF(S[2]), {'operationId': 'not-a-uuid'}), scenario='s2_free_slot')
case('fill_missing_operation_id', req('POST', WF(S[2]), {}), scenario='s2_free_slot')
case('fill_closed_session', req('POST', WF(S[4]), {'operationId': op(1)}))
case('fill_body_not_json', req('POST', WF(S[2]), rawBody='nope'))
case('fill_unknown_session', req('POST', WF('a3000000-0000-4000-8000-0000000000ff'), {'operationId': op(1)}))
case('fill_lapsed_club_prepared', req('POST', WF(S[7]), {'operationId': op(1)}, who=LAPSED))
case('fill_bumps_the_revision_even_when_nothing_moves', req('POST', WF(S[1]), {'operationId': op(1)}))

# ---------------------------------------------------------------- PATCH /roster/handicap
# Handicap · tonight (D-2026-11-25-03; prepared or active since the mockup change of 2026-11-27): the whole set of spots on one live entry.
H = lambda s: roster_path(s, 'handicap')
KNEE_BACK = ['lower_back', 'left_knee']
case('handicap_signed_out', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}, who=None))
case('handicap_player_subject_is_not_a_club', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}, who=PLAYER_SUBJECT, **NOSUBJECT))
case('handicap_body_not_json', req('PATCH', H(S[3]), rawBody='nope'))
case('handicap_one_spot', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}))
case('handicap_several_spots_in_figure_order', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['right_ankle', 'left_knee', 'lower_back', 'left_shoulder']}))
case('handicap_every_spot', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['right_ankle', 'left_ankle', 'right_knee', 'left_knee', 'lower_back', 'right_wrist', 'left_wrist', 'right_elbow', 'left_elbow', 'right_shoulder', 'left_shoulder']}))
case('handicap_duplicate_spots_count_once', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee', 'left_knee', 'lower_back']}))
case('handicap_unknown_spot', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee', 'neck']}))
case('handicap_spot_is_no_text', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': [3]}))
case('handicap_spot_null', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': [None]}))
case('handicap_spot_wrong_case', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['Left_Knee']}))
case('handicap_spots_not_a_list_clears', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': 'left_knee'}), scenario='ivy_handicapped')
case('handicap_spots_missing_clears', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5)}), scenario='ivy_handicapped')
case('handicap_empty_list_clears', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': []}), scenario='ivy_handicapped')
case('handicap_clear_when_none_writes_nothing', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': []}))
case('handicap_replaces_the_set', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['right_wrist']}), scenario='ivy_handicapped')
case('handicap_same_set_again_writes_nothing', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee', 'lower_back']}), scenario='ivy_handicapped')
case('handicap_same_set_in_another_order_writes_nothing', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee', 'lower_back']}), scenario='ivy_handicapped_reverse')
case('handicap_retry_same_operation', [req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}, snapshot=True), req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']})])
case('handicap_set_then_clear', [req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}, snapshot=True), req('PATCH', H(S[3]), {'operationId': op(2), 'rosterId': SP(5), 'spots': []})])
case('handicap_two_players', [req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}), req('PATCH', H(S[3]), {'operationId': op(2), 'rosterId': SP(6), 'spots': ['lower_back']})])
case('handicap_operation_id_is_not_read', req('PATCH', H(S[3]), {'rosterId': SP(5), 'spots': ['left_knee']}))
case('handicap_prepared_session', req('PATCH', H(S[1]), {'operationId': op(1), 'rosterId': SP(1), 'spots': ['left_knee']}))
case('handicap_prepared_session_clear', req('PATCH', H(S[1]), {'operationId': op(1), 'rosterId': SP(1), 'spots': []}), scenario='s1_handicapped')
case('handicap_closed_session', req('PATCH', H(S[4]), {'operationId': op(1), 'rosterId': SP(7), 'spots': ['left_knee']}))
case('handicap_closed_session_unknown_spot_says_ended', req('PATCH', H(S[4]), {'operationId': op(1), 'rosterId': SP(7), 'spots': ['neck']}))
case('handicap_unknown_spot_before_unknown_player', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': UNKNOWN, 'spots': ['neck']}))
case('handicap_unknown_entry', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': UNKNOWN, 'spots': ['left_knee']}))
case('handicap_entry_of_another_session', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(1), 'spots': ['left_knee']}))
case('handicap_malformed_entry', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': 'q', 'spots': ['left_knee']}, **MALFORMED))
case('handicap_missing_entry', req('PATCH', H(S[3]), {'operationId': op(1), 'spots': ['left_knee']}, **MALFORMED))
case('handicap_released_entry', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}), scenario='ivy_released_on_s3')
case('handicap_no_show_entry', req('PATCH', H(S[3]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}), scenario='s3_ivy_no_show')
case('handicap_unknown_session', req('PATCH', H('a3000000-0000-4000-8000-0000000000ff'), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}))
case('handicap_lapsed_club', req('PATCH', H(S[7]), {'operationId': op(1), 'rosterId': SP(5), 'spots': ['left_knee']}, who=LAPSED))

# ---------------------------------------------------------------- scenarios
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
CLUB1 = 'c9000000-0000-4000-8000-000000000001'


def entry_sql(sp, session, cp, name, level_id=3, present='false', locked=False, player=None):
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, "
            f"skill_level_id, level_locked_at, confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{sp}', '{CLUB1}', '{session}', "
            f"'{CP(cp)}', {('NULL' if player is None else repr(player))}, '{name}', {present}, {NOW}, {level_id}, {NOW if locked else 'NULL'}, {NOW}, {NOW}, {NOW}, {NOW}, 1)")


def match_sql(n, session, entries, state='waiting', decided=False):
    mid = f'a4000000-0000-4000-8000-0000000000{n:02d}'
    ended = decided
    out = [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, source_operation_id, started_at, ended_at, created_at, updated_at, revision) "
           f"VALUES ('{mid}', '{CLUB1}', '{session}', {n}, '{state}', 'singles', {n}, 'manual', 'a4100000-0000-4000-8000-0000000000{n:02d}', "
           f"{NOW if ended else 'NULL'}, {'TIMESTAMPTZ ' + repr('2026-11-19 02:30:00+00') if ended else 'NULL'}, {NOW}, {NOW}, 1)"]
    for i, sp in enumerate(entries):
        out.append(f"INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, "
                   f"started_with_match, finished_with_match, created_at, updated_at) VALUES ('a4200000-0000-4000-8000-0000000000{n}{i}', '{CLUB1}', '{session}', "
                   f"'{mid}', '{sp}', '{'A' if i == 0 else 'B'}', 1, 'a4300000-0000-4000-8000-0000000000{n}{i}', {NOW}, {'true' if decided else 'false'}, {'true' if decided else 'false'}, {NOW}, {NOW})")
    if decided:
        out.append(f"INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, actor_club_id) "
                   f"VALUES ('{mid}', '{CLUB1}', '{session}', 'completed', 'A', 21, 15, 'a4400000-0000-4000-8000-0000000000{n:02d}', {NOW}, '{CLUB1}')")
    return out


RELEASE = lambda sp: f"UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-16 00:00:00+00', release_reason = 'removed', level_locked_at = NULL WHERE id = '{sp}'"
SCENARIOS = dict(BASE['scenarios'])
SCENARIOS.update({
    'ivy_in_a_waiting_match': match_sql(1, S[3], [SP(5), SP(4)]),
    'ivy_played_a_game': match_sql(1, S[3], [SP(5), SP(4)], state='completed', decided=True),
    'jo_played_a_game': match_sql(1, S[3], [SP(6), SP(4)], state='completed', decided=True),
    'ivy_handicapped': [f"UPDATE session_players SET handicap_spots = '{{lower_back,left_knee}}' WHERE id = '{SP(5)}'"],
    'ivy_handicapped_reverse': [f"UPDATE session_players SET handicap_spots = '{{lower_back,left_knee}}' WHERE id = '{SP(5)}'"],
    's1_handicapped': [f"UPDATE session_players SET handicap_spots = '{{left_knee}}' WHERE id = '{SP(1)}'"],
    'ivy_games_adjusted': [f"UPDATE session_players SET games_adjustment = 1 WHERE id = '{SP(5)}'"],
    'ivy_released_on_s3': [RELEASE(SP(5))],
    's2_ivy_released': [RELEASE(SP(3))],
    's2_ivy_no_show': [f"UPDATE session_players SET no_show_at = {NOW} WHERE id = '{SP(3)}'"],
    's2_ivy_no_show_full': [f"UPDATE session_players SET no_show_at = {NOW} WHERE id = '{SP(3)}'", entry_sql(SP(10), S[2], 12, 'Lee Guest', locked=False)],
    's3_ivy_no_show': [f"UPDATE session_players SET no_show_at = {NOW} WHERE id = '{SP(5)}'"],
    'ann_on_s3': [entry_sql(SP(10), S[3], 3, 'Ann Reyes', player=PL(1))],
    's2_hal_here': [f"UPDATE session_players SET present = true WHERE id = '{SP(2)}'"],
    's3_empty_roster': [f"UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-16 00:00:00+00', release_reason = 'removed', level_locked_at = NULL WHERE session_id = '{S[3]}'"],
    'lapsed_live_roster': [entry_sql(SP(11), S[8], 20, 'Larry Lapsed').replace(f"'{CLUB1}'", "'c9000000-0000-4000-8000-000000000002'")],
    # Ann was on Prep Full's roster before (released) and waits on its list again.
    'ann_released_on_s2': [entry_sql(SP(10), S[2], 3, 'Ann Reyes', locked=False, player=PL(1)), RELEASE(SP(10))],
    'ann_no_level': ["UPDATE session_waitlist SET skill_level_id = NULL WHERE id = 'a3300000-0000-4000-8000-000000000001'"],
    # Prep Full has a free slot and its first waiter has no level; a second waiter (Gus) has one.
    's2_free_slot_unlevelled_first': [RELEASE(SP(3)), "UPDATE session_waitlist SET skill_level_id = NULL WHERE id = 'a3300000-0000-4000-8000-000000000001'",
                                      f"INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at) VALUES ('{WL(3)}', '{CLUB1}', '{S[2]}', '{CP(1)}', 4, TIMESTAMPTZ '2026-11-17 00:00:00+00', TIMESTAMPTZ '2026-11-17 00:00:00+00', TIMESTAMPTZ '2026-11-17 00:00:00+00')"],
    # The live night has two open slots (Ivy and Jo left) and two waiters (Kai, then Gus).
    's3_everyone_left_two_waiting': [RELEASE(SP(5)), RELEASE(SP(6)), RELEASE(SP(4)),
                                f"INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at) VALUES ('{WL(3)}', '{CLUB1}', '{S[3]}', '{CP(1)}', 4, TIMESTAMPTZ '2026-11-19 03:00:00+00', TIMESTAMPTZ '2026-11-19 03:00:00+00', TIMESTAMPTZ '2026-11-19 03:00:00+00')"],
})

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'session_players':
        s['sql'] = s['sql'].replace('no_show_at, revision::text', 'no_show_at, games_adjustment, handicap_spots, revision::text')
        assert 'games_adjustment' in s['sql']
    SNAPSHOT.append(s)

doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCENARIOS, 'snapshot': SNAPSHOT, 'cases': cases}


def tidy(step_):
    """Drops what a step does not say: a null field is left out (who stays: null is signed out)."""
    for k in [k for k, v in step_.items() if v is None and k != 'who']:
        del step_[k]
    return step_


for c in cases:
    for s in c['steps']:
        tidy(s)
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
