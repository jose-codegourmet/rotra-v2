#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/roster.cases.json: the cases of POST /api/sessions/{id}/roster/batch.

Run it, then the capture (capture-writes-queue.test.mjs), which writes roster.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-cases.py
"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), '../../internal/queuewrites/testdata/roster.cases.json')

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
RQ = lambda n: f'a3400000-0000-4000-8000-0000000000{n:02d}'
PL = lambda n: f'd4000000-0000-4000-8000-0000000000{n:02d}'
LEVEL = 'intermediate_low'
_op = [0]


def op_id(n=None):
    if n is None:
        _op[0] += 1
        n = _op[0]
    return f'b0000000-0000-4000-8000-{n:012d}'


def saved(cp, op=None, **kw):
    return {'op': 'add', 'source': 'saved', 'operationId': op or op_id(), 'clubPlayerId': cp, 'level': LEVEL, **kw}


def directory(pl, op=None, **kw):
    return {'op': 'add', 'source': 'directory', 'operationId': op or op_id(), 'playerId': pl, 'level': LEVEL, **kw}


def new(name, op=None, **kw):
    return {'op': 'add', 'source': 'new', 'operationId': op or op_id(), 'name': name, 'level': LEVEL, **kw}


def remove(sp, op=None):
    return {'op': 'remove', 'operationId': op or op_id(), 'rosterId': sp}


def accept(rq, op=None, **kw):
    return {'op': 'acceptRequest', 'operationId': op or op_id(), 'requestId': rq, 'level': LEVEL, **kw}


def decline(rq, op=None):
    return {'op': 'declineRequest', 'operationId': op or op_id(), 'requestId': rq}


def step(session, ops, who=SMASH, **kw):
    body = {'operations': ops} if not isinstance(ops, dict) else ops
    s = {'method': 'POST', 'path': f'/api/sessions/{session}/roster/batch', 'who': who, 'body': body}
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    c = {'name': name, 'scenario': scenario, 'steps': steps if isinstance(steps, list) else [steps]}
    c.update(kw)
    cases.append(c)


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
# Nothing is redacted: what the batch writes is derived from the operation ids, and the ids Prisma makes at random (an assessment, a
# shared entry, a notification) are not selected by the snapshot, or are shown through the operation id or RTR ID they belong to.

# ---------------------------------------------------------------- request shape and validation
case('v_signed_out', step(S[1], [remove(SP(1))], who=None))
case('v_player_subject_is_not_a_club', step(S[1], [remove(SP(1))], who=PLAYER_SUBJECT, goExpects={'status': 401, 'code': 'unauthenticated'}))
case('v_unknown_subject', step(S[1], [remove(SP(1))], who='c7000000-0000-4000-8000-0000000000ff', goExpects={'status': 401, 'code': 'unauthenticated'}))
case('v_body_not_json', {**step(S[1], []), 'body': None, 'rawBody': 'nope'})
case('v_body_array', {**step(S[1], []), 'body': None, 'rawBody': '[]'})
case('v_body_null', {**step(S[1], []), 'body': None, 'rawBody': 'null'})
case('v_no_body', {'method': 'POST', 'path': f'/api/sessions/{S[1]}/roster/batch', 'who': SMASH})
case('v_no_operations_field', step(S[1], {}))
case('v_operations_object', step(S[1], {'operations': {}}))
case('v_operations_string', step(S[1], {'operations': 'x'}))
case('v_operations_empty_list', step(S[1], []))
case('v_operations_101', step(S[1], [remove(SP(1), op_id(1000 + i)) for i in range(101)]))
case('v_operations_100_removes', step(S[1], [remove(SP(1), op_id(2000 + i)) for i in range(100)]))
case('v_operation_null', step(S[1], [None]))
case('v_operation_string', step(S[1], ['x']))
case('v_operation_array', step(S[1], [[1]]))
case('v_operation_unknown_op', step(S[1], [{'op': 'explode', 'operationId': op_id()}]))
case('v_operation_missing_op', step(S[1], [{'operationId': op_id()}]))
case('v_operation_numeric_op', step(S[1], [{'op': 7, 'operationId': op_id()}]))
case('v_operation_bad_phone', step(S[1], [new('Newbie', phone='abc')]))
case('v_operation_blank_phone_ok', step(S[1], [new('Blank Phone', phone='   ')]))
case('v_second_operation_invalid_nothing_written', step(S[1], [saved(CP(1)), {'op': 'explode', 'operationId': op_id()}]))
case('v_operation_error_before_duplicate_ids', step(S[1], [remove(SP(1), op_id(1)), {'op': 'explode', 'operationId': op_id(1)}]))
case('v_duplicate_operation_ids', step(S[1], [remove(SP(1), op_id(1)), saved(CP(1), op_id(1))]))
case('v_empty_operation_id', step(S[1], [{'op': 'remove', 'rosterId': SP(1)}]))
case('v_empty_operation_id_string', step(S[1], [{'op': 'remove', 'operationId': '', 'rosterId': SP(1)}]))
case('v_unknown_session', step('a3000000-0000-4000-8000-0000000000ff', [remove(SP(1))]))
case('v_malformed_session_id', step('not-a-uuid', [remove(SP(1))], **MALFORMED))
case('v_validation_before_session_lookup', step('not-a-uuid', []))
case('v_other_clubs_session', step(S[9], [saved(CP(1))]))
case('v_closed_session', step(S[4], [saved(CP(1))]))
case('v_closed_session_validation_first', step(S[4], [{'op': 'explode', 'operationId': op_id()}]))
case('v_lapsed_club_prepared_session', step(S[7], [saved(CP(20))], who=LAPSED))
case('v_lapsed_club_live_session_runs_on', step(S[8], [saved(CP(20))], who=LAPSED))
case('v_malformed_operation_id_on_add', step(S[1], [saved(CP(1), op='not-a-uuid')]))
case('v_malformed_operation_id_on_remove_is_fine', step(S[1], [remove(SP(1), op='not-a-uuid')]))
case('v_uppercase_operation_id', step(S[1], [saved(CP(1), op=op_id(5).upper())]))

# ---------------------------------------------------------------- add: a saved player
case('add_saved_guest_open_slot', step(S[1], [saved(CP(1))]))
case('add_saved_registered_player_gets_the_spot_notification', step(S[1], [saved(CP(3))]))
case('add_saved_flags_that_are_not_true_do_not_count', step(S[2], [saved(CP(1), allowOverfill='true', toWaitlist='yes')]))
case('add_saved_to_waitlist_flag', step(S[1], [saved(CP(1), toWaitlist=True)]))
case('add_saved_to_waitlist_flag_registered_gets_the_place_notification', step(S[1], [saved(CP(4), toWaitlist=True)]))
case('add_saved_full_roster_goes_to_the_waitlist', step(S[2], [saved(CP(1))]))
case('add_saved_full_roster_registered_waitlist_notification', step(S[2], [saved(CP(4))]))
case('add_saved_full_roster_overfill', step(S[2], [saved(CP(1), allowOverfill=True)]))
case('add_saved_full_roster_overfill_registered', step(S[2], [saved(CP(4), allowOverfill=True)]))
case('add_saved_to_waitlist_beats_overfill', step(S[1], [saved(CP(1), allowOverfill=True, toWaitlist=True)]))
case('add_saved_already_on_the_roster', step(S[1], [saved(CP(7))]))
case('add_saved_already_on_the_waitlist', step(S[2], [saved(CP(3))]))
case('add_saved_removed_player', step(S[1], [saved(CP(6))]))
case('add_saved_unknown_player', step(S[1], [saved('c6000000-0000-4000-8000-0000000000ff')]))
case('add_saved_other_clubs_player', step(S[1], [saved(CP(30))]))
case('add_saved_malformed_player_id', step(S[1], [saved('zzz')], **MALFORMED))
case('add_saved_missing_player_id', step(S[1], [{'op': 'add', 'source': 'saved', 'operationId': op_id(), 'level': LEVEL}], **MALFORMED))
case('add_saved_bad_level', step(S[1], [saved(CP(1), level='expert')]))
case('add_saved_missing_level', step(S[1], [{'op': 'add', 'source': 'saved', 'operationId': op_id(), 'clubPlayerId': CP(1)}]))
case('add_saved_released_entry_comes_back', step(S[1], [saved(CP(7))]), scenario='hal_released')
case('add_saved_no_show_entry_is_still_live', step(S[3], [saved(CP(7))]), scenario='hal_no_show')
case('add_saved_live_session', step(S[3], [saved(CP(1))]))
case('add_saved_live_session_closes_stale_match_requests', step(S[3], [saved(CP(1))], snapshot=True))
case('add_saved_live_session_fills_then_waitlists_then_overfills', step(S[3], [saved(CP(1)), saved(CP(2)), saved(CP(12), allowOverfill=True)]))
case('add_saved_minimum_is_recomputed_when_calculated', step(S[1], [saved(CP(1)), saved(CP(2), toWaitlist=True)]))
case('add_saved_minimum_kept_when_not_calculated', step(S[2], [saved(CP(1), allowOverfill=True)]))
case('add_saved_midnight_hours_in_the_notification', step(S[5], [saved(CP(3))]))
case('add_saved_noon_hours_in_the_notification', step(S[6], [saved(CP(3))]))
case('add_saved_same_period_hours_in_the_notification', step(S[2], [saved(CP(4), allowOverfill=True)]))

# ---------------------------------------------------------------- add: a Player Information profile
case('add_directory_registered_player_deleted_record_is_restored', step(S[1], [directory(PL(3))]))
case('add_directory_registered_player_new_record', step(S[1], [directory(PL(6))]))
case('add_directory_registered_player_already_saved', step(S[1], [directory(PL(2))]))
case('add_directory_unclaimed_profile', step(S[1], [directory(PL(4))]))
case('add_directory_registered_without_rtr_id', step(S[1], [directory(PL(5))]))
case('add_directory_shared_entry_with_a_club_name', step(S[1], [directory('a6000000-0000-4000-8000-000000000008', name='Uri B.')]))
case('add_directory_shared_entry_name_is_trimmed', step(S[1], [directory('a6000000-0000-4000-8000-000000000008', name='  Uri Padded  ')]))
case('add_directory_shared_entry_without_a_name', step(S[1], [directory('a6000000-0000-4000-8000-000000000008')]))
case('add_directory_shared_entry_blank_name', step(S[1], [directory('a6000000-0000-4000-8000-000000000008', name='   ')]))
case('add_directory_shared_entry_name_ignored_for_a_registered_player', step(S[1], [directory(PL(6), name='Ignored')]))
case('add_directory_unknown_profile', step(S[1], [directory('d4000000-0000-4000-8000-0000000000ff')]))
case('add_directory_malformed_profile_id', step(S[1], [directory('x')], **MALFORMED))
case('add_directory_to_waitlist_registered', step(S[2], [directory(PL(6))]))
case('add_directory_retry_same_operation', [step(S[1], [directory(PL(6), op_id(77))], snapshot=True), step(S[1], [directory(PL(6), op_id(77))])])
case('add_directory_second_operation_for_the_same_player', [step(S[1], [directory(PL(6), op_id(77))]), step(S[1], [directory(PL(6), op_id(78))])])

# ---------------------------------------------------------------- add: a new player
case('add_new_guest', step(S[1], [new('Newbie')]))
case('add_new_guest_with_nickname_and_phone', step(S[1], [new('Newbie', nickname='Nub', phone='0917 555 0100')]))
case('add_new_guest_phone_plus63', step(S[1], [new('Newbie', phone='+63 917-555-0101')]))
case('add_new_guest_phone_639', step(S[1], [new('Newbie', phone='639175550102')]))
case('add_new_guest_name_is_trimmed', step(S[1], [new('  Padded Pat  ', nickname='  Pad  ')]))
case('add_new_guest_blank_name', step(S[1], [new('   ')]))
case('add_new_guest_missing_name', step(S[1], [{'op': 'add', 'source': 'new', 'operationId': op_id(), 'level': LEVEL}]))
case('add_new_guest_bad_level', step(S[1], [new('Newbie', level='nope')]))
case('add_new_unknown_source_is_a_new_player', step(S[1], [{'op': 'add', 'source': 'elsewhere', 'operationId': op_id(), 'name': 'Odd Source', 'level': LEVEL}]))
case('add_new_missing_source_is_a_new_player', step(S[1], [{'op': 'add', 'operationId': op_id(), 'name': 'No Source', 'level': LEVEL}]))
case('add_new_phone_that_is_not_text_is_empty', step(S[1], [new('Num Phone', phone=639175550102)]))
case('add_new_with_a_new_email_makes_an_unclaimed_entry', step(S[1], [new('Eli Newmail', email='eli@example.test')]))
case('add_new_with_a_new_email_registers_the_counter_day', [step(S[1], [new('Eli Newmail', email='eli@example.test')]), step(S[1], [new('Fin Newmail', email='fin@example.test', toWaitlist=True)])])
case('add_new_with_an_open_entry_email', step(S[1], [new('Eve Open', email='eve@example.test')]))
case('add_new_email_is_trimmed_and_lower_cased', step(S[1], [new('Eve Open', email='  EVE@Example.TEST ')]))
case('add_new_email_of_a_registered_player_links_them', step(S[1], [new('Gil Again', email='gil@example.test')]))
case('add_new_email_of_a_registered_player_by_google_email', step(S[1], [new('Cy Again', email='cy@gmail.test')]))
case('add_new_email_already_saved_by_the_club', step(S[1], [new('Una Again', email='una@example.test')]))
case('add_new_email_of_a_saved_registered_player', step(S[1], [new('Ben Again', email='ben@example.test')]))
case('add_new_bad_email', step(S[1], [new('Bad Mail', email='nope')]))
case('add_new_email_with_inner_space', step(S[1], [new('Bad Mail', email='a b@example.test')]))
case('add_new_with_email_goes_to_the_waitlist_when_full', step(S[2], [new('Eve Open', email='eve@example.test')]))
case('add_new_retry_same_operation', [step(S[1], [new('Newbie', op_id(88), email='eli@example.test')], snapshot=True), step(S[1], [new('Newbie', op_id(88), email='eli@example.test')])])
case('add_new_retry_with_a_changed_name_keeps_the_first', [step(S[1], [new('Newbie', op_id(88))]), step(S[1], [new('Renamed', op_id(88))])])
case('add_new_two_in_one_batch_share_the_counter', step(S[1], [new('One Mail', email='one@example.test', toWaitlist=True), new('Two Mail', email='two@example.test', toWaitlist=True)]))

# ---------------------------------------------------------------- remove
case('remove_prepared_entry', step(S[1], [remove(SP(1))]))
case('remove_already_released_is_a_no_op', step(S[1], [remove(SP(1))]), scenario='hal_released')
case('remove_unknown_entry', step(S[1], [remove('a7000000-0000-4000-8000-0000000000ff')]))
case('remove_entry_of_another_session', step(S[1], [remove(SP(2))]))
case('remove_on_a_live_session', step(S[3], [remove(SP(4))]))
case('remove_malformed_id', step(S[1], [remove('q')], **MALFORMED))
case('remove_missing_id', step(S[1], [{'op': 'remove', 'operationId': op_id()}], **MALFORMED))
case('remove_then_add_the_same_player_again', step(S[1], [remove(SP(1)), saved(CP(7))]))
case('remove_the_same_entry_twice', step(S[1], [remove(SP(1)), remove(SP(1))]))
case('remove_frees_the_slot_for_the_next_add', step(S[2], [remove(SP(2)), saved(CP(1))]))

# ---------------------------------------------------------------- accept and decline a join request
case('accept_guest_request', step(S[1], [accept(RQ(1))]))
case('accept_registered_players_request', step(S[1], [accept(RQ(2))]))
case('accept_waitlist_placement_request', step(S[1], [accept(RQ(3))]))
case('accept_declined_request', step(S[1], [accept(RQ(4))]))
case('accept_confirmed_request_under_another_operation', step(S[1], [accept(RQ(5))]))
case('accept_unknown_request', step(S[1], [accept('a3400000-0000-4000-8000-0000000000ff')]))
case('accept_other_clubs_request', step(S[1], [accept(RQ(9))]))
case('accept_request_of_another_session', step(S[1], [accept(RQ(6))]))
case('accept_malformed_request_id', step(S[1], [accept('m')], **MALFORMED))
case('accept_bad_level', step(S[1], [accept(RQ(1), level='nope')]))
case('accept_missing_level', step(S[1], [{'op': 'acceptRequest', 'operationId': op_id(), 'requestId': RQ(1)}]))
case('accept_guest_twice_same_operation', [step(S[1], [accept(RQ(1), op_id(99))], snapshot=True), step(S[1], [accept(RQ(1), op_id(99))])])
case('accept_guest_twice_other_operation', [step(S[1], [accept(RQ(1), op_id(99))]), step(S[1], [accept(RQ(1), op_id(98))])])
case('accept_registered_twice_other_operation', [step(S[1], [accept(RQ(2), op_id(99))]), step(S[1], [accept(RQ(2), op_id(98))])])
case('accept_from_waitlist_prepared_full', step(S[2], [accept(RQ(6))]))
case('accept_from_waitlist_prepared_with_a_free_slot', step(S[2], [accept(RQ(6))]), scenario='s2_free_slot')
case('accept_from_waitlist_reusing_an_operation_id_of_another_entry', [step(S[1], [saved(CP(1), op_id(10))]), step(S[2], [accept(RQ(6), op_id(10))])], scenario='s2_free_slot')
case('accept_from_waitlist_on_a_live_session', step(S[3], [accept(RQ(8))]))
case('accept_from_waitlist_when_no_longer_waiting', step(S[3], [accept(RQ(8))]), scenario='kai_not_waiting')
case('accept_from_waitlist_live_over_budget', step(S[3], [accept(RQ(8))]), scenario='s3_full')
case('accept_guest_request_goes_to_the_waitlist_when_full', step(S[2], [accept(RQ(7))]))
case('accept_midnight_session_request', step(S[5], [accept(RQ(10))]))
case('decline_pending_request', step(S[1], [decline(RQ(1))]))
case('decline_twice', [step(S[1], [decline(RQ(1), op_id(60))]), step(S[1], [decline(RQ(1), op_id(61))])])
case('decline_declined_request_answers_as_is', step(S[1], [decline(RQ(4))]))
case('decline_confirmed_request', step(S[1], [decline(RQ(5))]))
case('decline_unknown_request', step(S[1], [decline('a3400000-0000-4000-8000-0000000000ff')]))
case('decline_other_clubs_request', step(S[1], [decline(RQ(9))]))
case('decline_request_of_another_session', step(S[1], [decline(RQ(6))]))
case('decline_malformed_request_id', step(S[1], [decline('m')], **MALFORMED))
case('accept_after_decline_in_one_batch', step(S[1], [decline(RQ(1)), accept(RQ(1))]))
case('decline_after_accept_in_one_batch', step(S[1], [accept(RQ(1)), decline(RQ(1))]))

# ---------------------------------------------------------------- one batch: order, all or none, repeat
case('mixed_burst_in_click_order', step(S[1], [saved(CP(1)), remove(SP(1)), accept(RQ(1)), decline(RQ(3)), new('Zed Walkin'), directory(PL(6))]))
case('mixed_burst_later_operations_see_earlier_ones', step(S[1], [saved(CP(1)), saved(CP(1), op_id())]))
case('mixed_burst_rolls_back_when_one_fails', step(S[1], [saved(CP(1)), accept(RQ(1)), saved(CP(6))], snapshot=True))
case('retry_the_same_batch', [step(S[1], [saved(CP(1), op_id(10)), accept(RQ(1), op_id(11)), new('Newbie', op_id(12), email='eli@example.test')], snapshot=True),
                              step(S[1], [saved(CP(1), op_id(10)), accept(RQ(1), op_id(11)), new('Newbie', op_id(12), email='eli@example.test')], snapshot=True)])
case('retry_the_same_batch_five_minutes_later', [step(S[1], [saved(CP(3), op_id(10)), decline(RQ(3), op_id(11))], snapshot=True),
                                                 step(S[1], [saved(CP(3), op_id(10)), decline(RQ(3), op_id(11))], now='2026-11-19T04:05:00.000Z')])
case('retry_a_waitlisted_add', [step(S[2], [saved(CP(1), op_id(10))], snapshot=True), step(S[2], [saved(CP(1), op_id(10))])])
case('reuse_an_operation_id_for_another_player', [step(S[1], [saved(CP(1), op_id(10))]), step(S[1], [saved(CP(2), op_id(10))])])
case('reuse_an_operation_id_for_a_remove_after_an_add', [step(S[1], [saved(CP(1), op_id(10))]), step(S[1], [remove(SP(1), op_id(10))])])
case('replay_in_order_after_a_clock_jump', [step(S[3], [saved(CP(1), op_id(10))], now='2026-11-19T04:00:00.000Z'),
                                            step(S[3], [saved(CP(2), op_id(11))], now='2026-11-19T04:30:00.000Z', snapshot=True),
                                            step(S[3], [saved(CP(12), op_id(12))], now='2026-11-19T05:15:00.000Z')])
case('batch_then_single_player_leaves_then_returns', [step(S[1], [saved(CP(1), op_id(10)), remove(SP(1), op_id(11))]), step(S[1], [saved(CP(7), op_id(12))])])

# parallel: the same batch twice (the answers are compared as a set). Which of two different operations wins a race is not decided,
# so those are tested in race_test.go with what always holds.
twice = [saved(CP(1), op_id(10)), new('Newbie', op_id(12), email='eli@example.test')]
case('parallel_the_same_batch_twice', {'parallel': [step(S[1], twice), step(S[1], twice)]})
case('parallel_a_retry_and_its_original_on_a_live_session', {'parallel': [step(S[3], [saved(CP(1), op_id(10))]), step(S[3], [saved(CP(1), op_id(10))])]})

SNAPSHOT = [
    {'name': 'queue_sessions', 'sql': "SELECT id, state, revision::text AS revision, queue_revision::text AS queue_revision, minimum_games, updated_at FROM queue_sessions ORDER BY id"},
    {'name': 'session_players', 'sql': "SELECT id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, (SELECT a.source_operation_id FROM club_assessments a WHERE a.id = session_players.assessment_id) AS assessment_operation_id, skill_level_id, level_locked_at, confirmed_at, joined_at, over_budget_at, released_at, release_reason, no_show_at, revision::text AS revision, created_at, updated_at FROM session_players ORDER BY id"},
    {'name': 'club_assessments', 'sql': "SELECT club_player_id, session_id, session_player_id, player_id_at_assessment, skill_level_id, (SELECT s.source_operation_id FROM club_assessments s WHERE s.id = club_assessments.supersedes_id) AS supersedes_operation_id, source_operation_id, assessed_at, received_at, accepted_revision::text AS accepted_revision, actor_club_id FROM club_assessments ORDER BY source_operation_id"},
    {'name': 'session_waitlist', 'sql': "SELECT id, session_id, club_player_id, skill_level_id, added_at, demoted_at, demoted_confirmed_at, created_at, updated_at, revision::text AS revision FROM session_waitlist ORDER BY id"},
    {'name': 'session_join_requests', 'sql': "SELECT id, session_id, name, nickname, phone_e164, status, placement, requested_at, decided_at, decided_by_device_id, club_player_id, player_id, created_at, updated_at, revision::text AS revision FROM session_join_requests ORDER BY id"},
    {'name': 'club_players', 'sql': "SELECT id, club_id, player_id, (SELECT e.rtr_id FROM shared_player_entries e WHERE e.id = club_players.shared_entry_id) AS shared_entry_rtr_id, display_name, nickname, added_at, removed_at, linked_to_club_player_id, created_at, updated_at, revision::text AS revision FROM club_players ORDER BY id"},
    {'name': 'club_player_private_inputs', 'sql': "SELECT club_player_id, club_id, phone_e164, email, state, captured_at, created_at, updated_at, revision::text AS revision FROM club_player_private_inputs ORDER BY club_player_id"},
    {'name': 'shared_player_entries', 'sql': "SELECT email, rtr_id, creating_club_id, country_code, city_code, sync_date, sequence, allocated_at, claimed_player_id, retired_at, created_at, updated_at, revision::text AS revision FROM shared_player_entries ORDER BY rtr_id"},
    {'name': 'player_id_counters', 'sql': "SELECT l.country_code, l.city_code, c.sync_date, c.last_sequence FROM player_id_counters c JOIN location_codes l ON l.id = c.location_code_id ORDER BY l.city_code, c.sync_date"},
    {'name': 'player_notifications', 'sql': "SELECT n.player_id, n.kind, n.title, n.body, n.target, n.source_type, COALESCE((SELECT a.source_operation_id FROM club_assessments a WHERE n.source_type = 'club_assessment' AND a.id = n.source_id), n.source_id) AS source_id, n.created_at, n.read_at FROM player_notifications n ORDER BY n.player_id, n.kind, n.source_type, 7"},
    {'name': 'session_match_requests', 'sql': "SELECT id, session_id, session_player_id, status, decided_at, created_at, updated_at, revision::text AS revision FROM session_match_requests ORDER BY id"},
    {'name': 'admin_audit_events', 'sql': "SELECT count(*)::text AS n FROM admin_audit_events"},
]

SCENARIOS = {
    'base': [],
    # Hal was removed from Prep Open (released), and from the live night (released), or marked No show there.
    'hal_released': [f"UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-16 00:00:00+00', release_reason = 'removed' WHERE id = '{SP(1)}'"],
    'hal_no_show': [f"UPDATE session_players SET no_show_at = TIMESTAMPTZ '2026-11-19 02:00:00+00' WHERE id = '{SP(4)}'"],
    # Prep Full has a free slot again (Ivy left).
    's2_free_slot': [f"UPDATE session_players SET released_at = TIMESTAMPTZ '2026-11-16 00:00:00+00', release_reason = 'removed' WHERE id = '{SP(3)}'"],
    # Kai was taken off the live waitlist; the live night has no free slot (a fourth player is in).
    'kai_not_waiting': ["DELETE FROM session_waitlist WHERE id = 'a3300000-0000-4000-8000-000000000002'"],
    's3_full': [f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, assessment_id, skill_level_id, level_locked_at, confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{SP(9)}', 'c9000000-0000-4000-8000-000000000001', '{S[3]}', '{CP(12)}', 'Lee Guest', true, TIMESTAMPTZ '2026-11-19 01:08:00+00', 'a0300000-0000-4000-8000-000000000199', 3, TIMESTAMPTZ '2026-11-19 01:00:00+00', TIMESTAMPTZ '2026-11-18 04:00:00+00', TIMESTAMPTZ '2026-11-18 04:00:00+00', TIMESTAMPTZ '2026-11-18 04:00:00+00', TIMESTAMPTZ '2026-11-19 01:08:00+00', 3)"],
}


doc = {
    'now': '2026-11-19T04:00:00.000Z', 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCENARIOS, 'snapshot': SNAPSHOT, 'cases': cases,
}


def tidy(step_):
    """Drops what a step does not say: a null body is no body, a null field is left out (who stays: null is signed out)."""
    for k in [k for k, v in step_.items() if v is None and k != 'who']:
        del step_[k]
    for p in step_.get('parallel', []):
        tidy(p)
    return step_


for c in cases:
    c['steps'] = [tidy(s) for s in c['steps']]

names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
