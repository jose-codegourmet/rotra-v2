#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/prep.cases.json: session preparation and courts of the Queue app (create, edit, the two
join switches, start, delete, and the court commands).

Run it, then the capture with the server zone fixed, as the servers run (the clash texts and the dates of a repeating series read it):
  TZ=UTC ROTRA_CAPTURE_DB_URL=... node .../vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs \\
    apps/api/testdata/tools/capture-writes-queue.test.mjs -t prep
Usage: python3 apps/api/testdata/tools/gen-writes-queue-prep-cases.py
"""
import hashlib
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/prep.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
CT = lambda n: f'a2c00000-0000-4000-8000-0000000000{n:02d}'
V1, V2, V3 = (f'a5000000-0000-4000-8000-00000000000{n}' for n in (1, 2, 3))
UNKNOWN_COURT = 'a2c00000-0000-4000-8000-0000000000ff'
NEW_COURT = lambda n: f'a2c00000-0000-4000-8000-0000000001{n:02d}'


def derived_id(command, part):
    """derivedId in session-store.ts: the first 16 bytes of SHA-256 of "<command>:<part>", version 8, RFC variant."""
    b = bytearray(hashlib.sha256(f'{command}:{part}'.encode()).digest()[:16])
    b[6] = (b[6] & 0x0F) | 0x80
    b[8] = (b[8] & 0x3F) | 0x80
    h = b.hex()
    return f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    """A case. allow500 and goExpects given here belong to the step (the last one when there are several)."""
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
CRASH = {'allow500': True}  # a body field of the wrong type: the TypeScript crashes and Go does too (a 500)
NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}

# ---------------------------------------------------------------- the session form
START = '2026-12-05T01:00:00.000Z'
END = '2026-12-05T05:00:00.000Z'


def form(**kw):
    f = {'title': 'Saturday Smash', 'notes': 'Bring shuttles', 'venueId': V1, 'scheduledStartAt': START, 'scheduledEndAt': END, 'sessionMode': 'fair',
         'allowSingles': True, 'allowDoubles': True, 'minimumGames': 2, 'minimumIsCalculated': False, 'expectedPlayers': None,
         'courts': [{'label': 'Court 1'}, {'label': 'Court 2'}]}
    f.update(kw)
    return f


def create(n, input_, who=SMASH, **kw):
    return req('POST', '/api/sessions', {'commandId': f'cmd-{n}', 'input': input_}, who=who, **kw)


def edit(session, input_, revision, n=1, who=SMASH, **kw):
    return req('PATCH', f'/api/sessions/{session}', {'commandId': f'edit-{n}', 'expectedRevision': revision, 'input': input_}, who=who, **kw)


# Prep Open starts at 2026-11-20 01:00Z; its form as it is stored (the venue is Smash Hall).
def s1_form(**kw):
    base = dict(title='Prep Open', notes='', scheduledStartAt='2026-11-20T01:00:00.000Z', scheduledEndAt='2026-11-20T05:00:00.000Z',
                minimumGames=0, minimumIsCalculated=True, playersPerCourt=2, courts=[{'id': CT(1), 'label': 'Court 1'}])
    base.update(kw)
    return form(**base)


# ---- create
case('create_signed_out', create(1, form(), who=None))
case('create_player_subject_is_not_a_club', create(1, form(), who=PLAYER_SUBJECT, **NOSUBJECT))
case('create_body_not_json', req('POST', '/api/sessions', rawBody='nope'))
case('create_no_body', req('POST', '/api/sessions'))
case('create_without_a_command_id', req('POST', '/api/sessions', {'input': form()}))
case('create_command_id_not_text', req('POST', '/api/sessions', {'commandId': 7, 'input': form()}))
case('create_lapsed_club_is_refused_first', create(1, form(), who=LAPSED))
case('create_without_input', req('POST', '/api/sessions', {'commandId': 'cmd-1'}), **CRASH)
case('create_input_not_an_object', req('POST', '/api/sessions', {'commandId': 'cmd-1', 'input': 'x'}), **CRASH)
case('create_one_session', create(1, form()))
case('create_calculated_minimum', create(1, form(minimumIsCalculated=True, minimumGames=0, expectedPlayers=12)))
case('create_calculated_minimum_from_the_slot_capacity', create(1, form(minimumIsCalculated=True, minimumGames=0, playersPerCourt=4)))
case('create_minimum_kept_when_not_calculated', create(1, form(minimumGames=7)))
case('create_singles_off_formats', create(1, form(allowSingles=False)))
case('create_request_formats_as_a_list', create(1, form(requestFormats=['fun_3v3', 'singles'])))
case('create_request_formats_as_switches', create(1, form(requestFormats={'doubles': False, 'singles': True, 'fun_4v4': True})))
case('create_request_formats_empty_list', create(1, form(requestFormats=[])))
case('create_request_formats_malformed_falls_back', create(1, form(requestFormats=['nope'])))
case('create_request_formats_switches_not_booleans_falls_back', create(1, form(requestFormats={'doubles': 'yes'})))
case('create_record_games_off', create(1, form(recordGames=False)))
case('create_record_games_text_records', create(1, form(recordGames='no')))
case('create_title_is_trimmed_and_notes_empty_is_null', create(1, form(title='  Padded  ', notes='')))
case('create_players_per_court_given', create(1, form(playersPerCourt=6)))
case('create_courts_with_planned_start_and_end', create(1, form(courts=[{'label': 'Court 1'}, {'label': ' Late ', 'startsAt': '2026-12-05T02:00:00.000Z', 'openUntil': '2026-12-05T04:00:00.000Z'}])))
case('create_court_planned_start_equal_to_the_session_start_is_none', create(1, form(courts=[{'label': 'Court 1', 'startsAt': START}])))
case('create_court_end_in_the_past', create(1, form(courts=[{'label': 'Court 1', 'openUntil': '2026-11-01T00:00:00.000Z'}])))
case('create_court_end_after_the_session_end', create(1, form(courts=[{'label': 'Court 1', 'openUntil': '2026-12-05T06:00:00.000Z'}])))
case('create_court_start_before_the_session', create(1, form(courts=[{'label': 'Court 1', 'startsAt': '2026-12-05T00:00:00.000Z'}])))
case('create_court_start_at_the_session_end', create(1, form(courts=[{'label': 'Court 1', 'startsAt': END}])))
case('create_court_end_not_after_its_start', create(1, form(courts=[{'label': 'Court 1', 'startsAt': '2026-12-05T03:00:00.000Z', 'openUntil': '2026-12-05T02:00:00.000Z'}])))
case('create_court_start_not_a_date', create(1, form(courts=[{'label': 'Court 1', 'startsAt': 'soon'}])))
case('create_court_end_not_a_date', create(1, form(courts=[{'label': 'Court 1', 'openUntil': 'later'}])))
case('create_court_label_blank', create(1, form(courts=[{'label': '  '}])))
case('create_court_label_not_text', create(1, form(courts=[{'label': 4}])), **CRASH)
case('create_no_courts', create(1, form(courts=[])))
case('create_courts_missing', create(1, {k: v for k, v in form().items() if k != 'courts'}), **CRASH)
case('create_unknown_venue', create(1, form(venueId='a5000000-0000-4000-8000-0000000000ff')))
case('create_other_clubs_venue', create(1, form(venueId=V3)))
case('create_venue_not_a_uuid', create(1, form(venueId='x')), **CRASH)
case('create_venue_missing', create(1, {k: v for k, v in form().items() if k != 'venueId'}), **CRASH)
case('create_blank_title', create(1, form(title='   ')))
case('create_title_not_text', create(1, form(title=5)), **CRASH)
case('create_unknown_venue_wins_over_a_bad_title', create(1, form(venueId='a5000000-0000-4000-8000-0000000000ff', title=5)))
case('create_bad_start', create(1, form(scheduledStartAt='soon')))
case('create_bad_end', create(1, form(scheduledEndAt=None)))
case('create_bad_dates_win_over_a_blank_title', create(1, form(scheduledStartAt='soon', title='')))
case('create_end_not_after_start', create(1, form(scheduledEndAt=START)))
case('create_expected_players_zero', create(1, form(expectedPlayers=0)))
case('create_expected_players_fraction', create(1, form(expectedPlayers=1.5)))
case('create_expected_players_missing', create(1, {k: v for k, v in form().items() if k != 'expectedPlayers'}))
case('create_minimum_games_negative', create(1, form(minimumGames=-1)))
case('create_minimum_games_missing', create(1, {k: v for k, v in form().items() if k != 'minimumGames'}))
case('create_players_per_court_one', create(1, form(playersPerCourt=1)))
case('create_players_per_court_21', create(1, form(playersPerCourt=21)))
case('create_players_per_court_null_is_the_club_default', create(1, form(playersPerCourt=None)))
case('create_session_mode_unknown', create(1, form(sessionMode='wild')), **CRASH)
case('create_allow_singles_not_a_boolean', create(1, form(allowSingles='yes')), **CRASH)
case('create_weekly_series', create(1, form(repeat='weekly', occurrences=3)))
case('create_biweekly_series_default_count', create(1, form(repeat='biweekly')))
case('create_monthly_series_clamps_the_day', create(1, form(repeat='monthly', occurrences=4, scheduledStartAt='2026-12-31T01:00:00.000Z', scheduledEndAt='2026-12-31T05:00:00.000Z')))
case('create_series_count_is_at_least_two', create(1, form(repeat='weekly', occurrences=1)))
case('create_series_count_is_at_most_twelve', create(1, form(repeat='weekly', occurrences=40)))
case('create_series_count_fraction_is_floored', create(1, form(repeat='weekly', occurrences=3.9)))
case('create_repeat_none_is_one_session', create(1, form(repeat='none', occurrences=5)))
# An unknown repeat makes copies of one date; the database refuses overlapping sessions (the crash is pinned, nothing is written).
case('create_unknown_repeat_makes_copies_of_the_date', create(1, form(repeat='daily', occurrences=2)), **CRASH)
case('create_series_skips_a_clashing_date', create(1, form(repeat='weekly', occurrences=3, scheduledStartAt='2026-11-13T01:00:00.000Z', scheduledEndAt='2026-11-13T05:00:00.000Z')))
case('create_series_all_dates_clash', create(1, form(repeat='weekly', occurrences=2, scheduledStartAt='2026-11-20T01:00:00.000Z', scheduledEndAt='2026-11-20T05:00:00.000Z')))
case('create_time_clash', create(1, form(scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T03:00:00.000Z', venueId=V2)), scenario='s1_at_smash_hall')
case('create_venue_clash', create(1, form(scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T03:00:00.000Z', venueId=V1)), scenario='s1_at_smash_hall')
case('create_clash_names_the_venue_clash_first', create(1, form(scheduledStartAt='2026-11-20T04:00:00.000Z', scheduledEndAt='2026-11-20T06:30:00.000Z', venueId=V1)), scenario='s1_at_smash_hall_s5_overlaps')
case('create_a_session_ending_when_another_starts_does_not_clash', create(1, form(scheduledStartAt='2026-11-19T21:00:00.000Z', scheduledEndAt='2026-11-20T01:00:00.000Z')))
case('create_cancelled_sessions_do_not_clash', create(1, form(scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T03:00:00.000Z')), scenario='s1_cancelled')
case('create_other_clubs_sessions_do_not_clash', create(1, form(scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T03:00:00.000Z', venueId=V1), who=SMASH), scenario='base')
case('create_retry_same_command', [create(1, form(repeat='weekly', occurrences=3), snapshot=True), create(1, form(repeat='weekly', occurrences=3))])
case('create_retry_with_a_changed_form_answers_the_first', [create(1, form()), create(1, form(title='Changed', scheduledStartAt='2026-12-12T01:00:00.000Z', scheduledEndAt='2026-12-12T05:00:00.000Z'))])
case('create_retry_even_with_a_broken_form', [create(1, form()), req('POST', '/api/sessions', {'commandId': 'cmd-1'})], **CRASH)
case('create_two_commands_make_two_sessions', [create(1, form()), create(2, form(scheduledStartAt='2026-12-12T01:00:00.000Z', scheduledEndAt='2026-12-12T05:00:00.000Z'))])
case('create_second_session_at_the_same_time_clashes', [create(1, form()), create(2, form())])
case('create_command_id_of_another_club', create(1, form()), scenario='other_club_has_cmd_1')

# ---- edit (PATCH with an input)
case('edit_signed_out', edit(S[1], s1_form(), '5', who=None))
case('edit_body_not_json', req('PATCH', f'/api/sessions/{S[1]}', rawBody='nope'))
case('edit_without_command_id', req('PATCH', f'/api/sessions/{S[1]}', {'expectedRevision': '5', 'input': s1_form()}))
case('edit_without_input', req('PATCH', f'/api/sessions/{S[1]}', {'commandId': 'e', 'expectedRevision': '5'}))
case('edit_input_null', req('PATCH', f'/api/sessions/{S[1]}', {'commandId': 'e', 'expectedRevision': '5', 'input': None}))
case('edit_input_a_string', req('PATCH', f'/api/sessions/{S[1]}', {'commandId': 'e', 'expectedRevision': '5', 'input': 'x'}))
case('edit_input_a_list_is_an_object_without_fields', req('PATCH', f'/api/sessions/{S[1]}', {'commandId': 'e', 'expectedRevision': '5', 'input': []}), **CRASH)
case('edit_lapsed_club', edit(S[7], s1_form(), '1', who=LAPSED))
case('edit_title', edit(S[1], s1_form(title='Renamed'), '5'))
case('edit_every_field', edit(S[1], s1_form(title='New', notes='Hi', venueId=V2, scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T04:00:00.000Z',
                                          sessionMode='hard', allowSingles=False, minimumGames=3, minimumIsCalculated=False, expectedPlayers=10, playersPerCourt=4,
                                          requestFormats=['singles'], recordGames=False), '5'))
case('edit_without_request_formats_and_record_games_keeps_them', edit(S[1], s1_form(), '5'), scenario='s1_formats_and_no_record')
case('edit_malformed_request_formats_keep_the_stored_set', edit(S[1], s1_form(requestFormats=['nope']), '5'), scenario='s1_formats_and_no_record')
case('edit_record_games_text_keeps_the_stored_value', edit(S[1], s1_form(recordGames='yes'), '5'), scenario='s1_formats_and_no_record')
case('edit_stale_revision', edit(S[1], s1_form(), '4'))
case('edit_stale_revision_after_one_edit', [edit(S[1], s1_form(), '5', n=1), edit(S[1], s1_form(title='Again'), '5', n=2)])
case('edit_revision_is_big', edit(S[2], s1_form(playersPerCourt=2, courts=[{'id': CT(2), 'label': 'Court 1'}], title='Prep Full', scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z'), '9007199254740993'))
case('edit_revision_one_below_a_big_one', edit(S[2], s1_form(courts=[{'id': CT(2), 'label': 'Court 1'}]), '9007199254740992'))
case('edit_revision_not_a_number', edit(S[1], s1_form(), 'five'))
case('edit_revision_empty_is_zero', edit(S[1], s1_form(), ''))
case('edit_revision_missing', req('PATCH', f'/api/sessions/{S[1]}', {'commandId': 'e', 'input': s1_form()}))
case('edit_revision_hex', edit(S[1], s1_form(), '0x5'))
case('edit_live_session', edit(S[3], s1_form(), '12'))
case('edit_closed_session', edit(S[4], s1_form(), '20'))
case('edit_unknown_session', edit('a3000000-0000-4000-8000-0000000000ff', s1_form(), '1'))
case('edit_other_clubs_session', edit(S[9], s1_form(), '1'))
case('edit_malformed_session', edit('nope', s1_form(), '1'), **MALFORMED)
case('edit_state_wins_over_the_revision', edit(S[3], s1_form(), '1'))
case('edit_revision_wins_over_the_form', edit(S[1], {}, '4'))
case('edit_bad_form_after_the_revision', edit(S[1], s1_form(title=''), '5'))
case('edit_clash_with_another_session', edit(S[1], s1_form(scheduledStartAt='2026-11-21T10:00:00.000Z', scheduledEndAt='2026-11-21T18:00:00.000Z'), '5'))
case('edit_does_not_clash_with_itself', edit(S[1], s1_form(scheduledStartAt='2026-11-20T02:00:00.000Z', scheduledEndAt='2026-11-20T04:00:00.000Z'), '5'))
case('edit_venue_clash_text', edit(S[1], s1_form(venueId=V1, scheduledStartAt='2026-11-21T10:00:00.000Z', scheduledEndAt='2026-11-21T18:00:00.000Z'), '5'), scenario='s5_at_smash_hall')
case('edit_courts_keep_add_and_drop', edit(S[1], s1_form(courts=[{'id': CT(1), 'label': 'Court 1 (renamed)', 'startsAt': '2026-11-20T02:00:00.000Z', 'openUntil': '2026-11-20T04:00:00.000Z'}, {'label': 'Court B'}]), '5'))
case('edit_courts_drop_the_old_one', edit(S[1], s1_form(courts=[{'label': 'Only new'}]), '5'))
case('edit_court_id_of_another_session', edit(S[1], s1_form(courts=[{'id': CT(2), 'label': 'Court 1'}]), '5'))
case('edit_court_id_unknown', edit(S[1], s1_form(courts=[{'id': UNKNOWN_COURT, 'label': 'Court 1'}]), '5'))
case('edit_court_id_not_a_uuid', edit(S[1], s1_form(courts=[{'id': 'x', 'label': 'Court 1'}]), '5'), **CRASH)
case('edit_court_end_in_the_past', edit(S[1], s1_form(courts=[{'id': CT(1), 'label': 'Court 1', 'openUntil': '2026-11-01T00:00:00.000Z'}]), '5'))
case('edit_calculated_minimum_recomputed', edit(S[1], s1_form(courts=[{'id': CT(1), 'label': 'Court 1'}, {'label': 'Court 2'}, {'label': 'Court 3'}], playersPerCourt=4), '5'))
case('edit_capacity_up_promotes_the_waitlist', edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                                  courts=[{'id': CT(2), 'label': 'Court 1'}, {'label': 'Court 2'}]), '9007199254740993'))
case('edit_capacity_up_skips_a_waiter_without_a_level', edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                                          courts=[{'id': CT(2), 'label': 'Court 1'}, {'label': 'Court 2'}]), '9007199254740993'), scenario='s2_waiter_without_a_level')
case('edit_capacity_down_demotes_the_last_in_slot_order', edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                                            courts=[{'id': CT(2), 'label': 'Court 1'}]), '9007199254740993'), scenario='s2_four_courts_players')
case('edit_capacity_down_notifies_the_registered_demoted_player', edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                                                     courts=[{'id': CT(2), 'label': 'Court 1'}], notes='n'), '9007199254740993'), scenario='s2_four_courts_players')
case('edit_capacity_down_then_up_again', [edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                              courts=[{'id': CT(2), 'label': 'Court 1'}]), '9007199254740993', n=1),
                                          edit(S[2], s1_form(title='Prep Full', playersPerCourt=2, scheduledStartAt='2026-11-23T02:00:00.000Z', scheduledEndAt='2026-11-23T03:30:00.000Z',
                                                              courts=[{'id': CT(2), 'label': 'Court 1'}, {'id': NEW_COURT(1), 'label': 'x'}]), '9007199254740995', n=2)], scenario='s2_four_courts_players')
case('edit_retry_same_command_with_the_new_revision', [edit(S[1], s1_form(title='Renamed'), '5', n=1), edit(S[1], s1_form(title='Renamed'), '6', n=1)])

# The same label twice among a session's live courts: the unique index refuses it. Create, add court and edit preparation wrap the write
# (a conflict); editing a court does not (a 500).
case('create_duplicate_court_labels', create(1, form(courts=[{'label': 'Court A'}, {'label': 'Court A'}])))
case('edit_a_new_court_with_the_label_of_a_kept_one', edit(S[1], s1_form(courts=[{'id': CT(1), 'label': 'Court 1'}, {'label': 'Court 1'}]), '5'))
case('edit_parallel_same_revision', {'parallel': [edit(S[1], s1_form(title='One'), '5', n=1), edit(S[1], s1_form(title='One'), '5', n=1)]})

# ---- the two join switches
SW = lambda s: f'/api/sessions/{s}'
case('switch_accept_off', req('PATCH', SW(S[1]), {'acceptJoinRequests': False}))
case('switch_accept_on_a_closed_session', req('PATCH', SW(S[4]), {'acceptJoinRequests': True}))
case('switch_accept_on_a_live_session', req('PATCH', SW(S[3]), {'acceptJoinRequests': False}))
case('switch_always_require_on', req('PATCH', SW(S[1]), {'alwaysRequireRequest': True}))
case('switch_always_require_off_twice_still_bumps', [req('PATCH', SW(S[1]), {'alwaysRequireRequest': False}), req('PATCH', SW(S[1]), {'alwaysRequireRequest': False})])
case('switch_accept_wins_over_always_require', req('PATCH', SW(S[1]), {'acceptJoinRequests': False, 'alwaysRequireRequest': True}))
case('switch_accept_wins_over_the_edit', req('PATCH', SW(S[1]), {'acceptJoinRequests': False, 'commandId': 'e', 'input': s1_form(title='Ignored'), 'expectedRevision': '5'}))
case('switch_not_a_boolean_is_the_edit_form', req('PATCH', SW(S[1]), {'acceptJoinRequests': 'yes'}))
case('switch_lapsed_club_prepared', req('PATCH', SW(S[7]), {'acceptJoinRequests': False}, who=LAPSED))
case('switch_lapsed_club_live_runs_on', req('PATCH', SW(S[8]), {'acceptJoinRequests': False}, who=LAPSED))
case('switch_unknown_session', req('PATCH', SW('a3000000-0000-4000-8000-0000000000ff'), {'acceptJoinRequests': False}))
case('switch_other_clubs_session', req('PATCH', SW(S[9]), {'acceptJoinRequests': False}))
case('switch_malformed_session', req('PATCH', SW('nope'), {'acceptJoinRequests': False}), **MALFORMED)

# ---- start
ST = lambda s: f'/api/sessions/{s}/start'
NEW_END = '2026-11-19T10:00:00.000Z'
case('start_signed_out', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}, who=None))
case('start_body_not_json', req('POST', ST(S[1]), rawBody='nope'))
# Starting the day before the planned date moves the end before the planned start, which the database refuses (a 500, nothing written).
case('start_a_day_early_hits_the_schedule_check', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), scenario='s3_completed', **CRASH)
# A late start whose new end overlaps a finished session of the club: the exclusion constraint refuses it, which Prisma does not map to a conflict (a 500).
case('start_a_late_start_overlapping_a_finished_session', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), scenario='late_s1_s3_completed', **CRASH)
case('start_a_day_late_with_a_new_end', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), scenario='late_s1')
case('start_other_day_without_a_new_end', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='late_s1')
case('start_new_end_not_a_date', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': 'later'}), scenario='late_s1')
case('start_new_end_not_text_is_none', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': 5}), scenario='late_s1')
case('start_new_end_in_the_past', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': '2026-11-19T03:00:00.000Z'}), scenario='late_s1')
case('start_new_end_more_than_a_day_away', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': '2026-11-20T05:00:00.000Z'}), scenario='late_s1')
case('start_new_end_exactly_a_day_away', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': '2026-11-20T04:00:00.000Z'}), scenario='late_s1')
case('start_new_end_before_a_court_opens', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), scenario='late_s1_court_opens_late')
case('start_new_end_before_a_courts_booking_ends', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), scenario='late_s1_court_booked_long')
case('start_same_day_needs_no_new_end', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today')
case('start_same_day_ignores_a_new_end', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': 'later'}), scenario='s1_today')
case('start_same_day_after_the_planned_end_needs_a_new_end', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_ended_today')
case('start_same_day_after_the_planned_end_with_a_new_end', req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': '2026-11-19T08:00:00.000Z'}), scenario='s1_ended_today')
case('start_closes_pending_join_requests', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today')
case('start_locks_levels_and_stamps_presence', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today_hal_here')
case('start_freezes_the_calculated_minimum', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today_stale_minimum')
case('start_stale_revision', req('POST', ST(S[1]), {'expectedRevision': '4'}), scenario='s1_today')
case('start_revision_not_a_number', req('POST', ST(S[1]), {'expectedRevision': 'x'}), scenario='s1_today')
case('start_revision_missing_is_zero', req('POST', ST(S[1]), {}), scenario='s1_today')
case('start_already_running_session', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today_s3_running')
case('start_entry_without_a_level', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today_unleveled_entry')
case('start_two_entries_without_a_level', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_today_two_unleveled')
case('start_retry_answers_the_active_session', [req('POST', ST(S[1]), {'expectedRevision': '5'}), req('POST', ST(S[1]), {'expectedRevision': '5'}, snapshot=True)], scenario='s1_today')
case('start_an_active_session_ignores_the_revision', req('POST', ST(S[3]), {'expectedRevision': '1'}))
case('start_closed_session', req('POST', ST(S[4]), {'expectedRevision': '20'}))
case('start_lapsed_club_is_refused_first', req('POST', ST(S[7]), {'expectedRevision': '1'}, who=LAPSED))
case('start_lapsed_club_unknown_session', req('POST', ST('a3000000-0000-4000-8000-0000000000ff'), {}, who=LAPSED))
case('start_unknown_session', req('POST', ST('a3000000-0000-4000-8000-0000000000ff'), {'expectedRevision': '1'}))
case('start_other_clubs_session', req('POST', ST(S[9]), {'expectedRevision': '1'}))
case('start_malformed_session', req('POST', ST('nope'), {'expectedRevision': '1'}), **MALFORMED)
case('start_parallel_twice', {'parallel': [req('POST', ST(S[1]), {'expectedRevision': '5'}), req('POST', ST(S[1]), {'expectedRevision': '5'})]}, scenario='s1_today')
case('start_empty_roster', req('POST', ST(S[5]), {'expectedRevision': '1'}), scenario='s5_today')

# ---- delete
DEL = lambda s: f'/api/sessions/{s}'
case('delete_signed_out', req('DELETE', DEL(S[5]), who=None))
case('delete_prepared_session_with_nobody', req('DELETE', DEL(S[5])))
case('delete_removes_its_courts_waitlist_and_requests', req('DELETE', DEL(S[6])), scenario='s6_with_waitlist_and_request')
case('delete_session_with_a_player', req('DELETE', DEL(S[1])))
case('delete_session_with_two_players', req('DELETE', DEL(S[2])))
case('delete_session_with_a_released_player_is_refused_by_the_database', req('DELETE', DEL(S[1])), scenario='hal_released')
case('delete_live_session', req('DELETE', DEL(S[3])))
case('delete_closed_session', req('DELETE', DEL(S[4])))
case('delete_state_wins_over_the_roster', req('DELETE', DEL(S[3])))
case('delete_lapsed_club', req('DELETE', DEL(S[7]), who=LAPSED))
case('delete_unknown_session', req('DELETE', DEL('a3000000-0000-4000-8000-0000000000ff')))
case('delete_other_clubs_session', req('DELETE', DEL(S[9])))
case('delete_malformed_session', req('DELETE', DEL('nope')), **MALFORMED)
case('delete_twice', [req('DELETE', DEL(S[5])), req('DELETE', DEL(S[5]))])

# ---- courts
CTS = lambda s: f'/api/sessions/{s}/courts'
case('court_add_signed_out', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}, who=None))
case('court_add_to_a_prepared_session', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': ' Court 2 '}))
case('court_add_recomputes_the_calculated_minimum', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}))
case('court_add_to_a_live_manual_session', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3'}))
case('court_add_with_a_planned_start_and_end', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': '2026-11-19T03:00:00.000Z', 'openUntil': '2026-11-19T04:30:00.000Z'}))
case('court_add_planned_start_equal_to_the_start_is_none', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': '2026-11-19T01:00:00.000Z'}))
case('court_add_planned_start_before_the_start', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': '2026-11-19T00:00:00.000Z'}))
case('court_add_planned_start_at_the_end', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': '2026-11-19T05:00:00.000Z'}))
case('court_add_end_after_the_session_end', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'openUntil': '2026-11-19T06:00:00.000Z'}))
case('court_add_end_not_after_the_start', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': '2026-11-19T03:00:00.000Z', 'openUntil': '2026-11-19T02:00:00.000Z'}))
case('court_add_end_in_the_past_is_fine', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'openUntil': '2026-11-19T02:00:00.000Z'}))
case('court_add_start_not_a_date', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': 'soon'}))
case('court_add_start_not_text_is_none', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 3', 'startsAt': 5}))
case('court_add_blank_label', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': '  '}))
case('court_add_duplicate_label', req('POST', CTS(S[3]), {'courtId': NEW_COURT(1), 'label': 'Court 1'}))
case('court_add_label_of_40', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'x' * 40}))
case('court_add_label_of_41', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'x' * 41}))
case('court_add_label_of_20_emoji_is_40_units', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': '😀' * 20}))
case('court_add_label_of_21_emoji_is_42_units', req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': '😀' * 21}))
case('court_add_retry_answers_the_court', [req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}, snapshot=True), req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Changed'})])
case('court_add_retry_checks_nothing_else', [req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}), req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': ''})])
case('court_add_id_of_another_sessions_court', req('POST', CTS(S[1]), {'courtId': CT(2), 'label': 'Court 2'}))
case('court_add_id_missing', req('POST', CTS(S[1]), {'label': 'Court 2'}), **CRASH)
case('court_add_id_not_a_uuid', req('POST', CTS(S[1]), {'courtId': 'x', 'label': 'Court 2'}), **CRASH)
case('court_add_closed_session', req('POST', CTS(S[4]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}))
case('court_add_state_wins_over_the_id', req('POST', CTS(S[4]), {'label': 'Court 2'}))
case('court_add_unknown_session', req('POST', CTS('a3000000-0000-4000-8000-0000000000ff'), {'courtId': NEW_COURT(1), 'label': 'Court 2'}))
case('court_add_other_clubs_session', req('POST', CTS(S[9]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}))
case('court_add_malformed_session', req('POST', CTS('nope'), {'courtId': NEW_COURT(1), 'label': 'Court 2'}), **MALFORMED)
case('court_add_lapsed_club_prepared', req('POST', CTS(S[7]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}, who=LAPSED))
case('court_add_lapsed_club_live_runs_on', req('POST', CTS(S[8]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}, who=LAPSED))
case('court_add_body_not_json', req('POST', CTS(S[1]), rawBody='nope'))
case('court_add_parallel_same_court', {'parallel': [req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'}), req('POST', CTS(S[1]), {'courtId': NEW_COURT(1), 'label': 'Court 2'})]})

CT1 = lambda s, c: f'/api/sessions/{s}/courts/{c}'
case('court_edit_label', req('PATCH', CT1(S[3], CT(3)), {'label': ' Centre '}))
case('court_edit_start_and_end', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T02:00:00.000Z', 'openUntil': '2026-11-19T04:00:00.000Z'}))
case('court_edit_start_back_to_the_session_start_is_none', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T01:00:00.000Z'}), scenario='court3_starts_late')
case('court_edit_start_fixed_after_an_early_open', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T03:00:00.000Z'}), scenario='court3_opened_early')
case('court_edit_same_start_after_an_early_open_is_fine', req('PATCH', CT1(S[3], CT(3)), {'label': 'Renamed', 'startsAt': '2026-11-19T02:00:00.000Z'}), scenario='court3_opened_early')
case('court_edit_start_fixed_after_hosting_a_match', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T02:00:00.000Z'}), scenario='court3_hosted_a_match')
case('court_edit_end_stays_editable_after_use', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'openUntil': '2026-11-19T04:00:00.000Z'}), scenario='court3_hosted_a_match')
case('court_edit_end_after_the_session_end', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'openUntil': '2026-11-19T06:00:00.000Z'}))
case('court_edit_start_before_the_session', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T00:00:00.000Z'}))
case('court_edit_a_court_with_an_earlier_own_start_keeps_it_as_the_bound', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T00:30:00.000Z'}), scenario='court3_starts_before_the_session')
case('court_edit_end_not_after_the_start', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': '2026-11-19T03:00:00.000Z', 'openUntil': '2026-11-19T02:00:00.000Z'}))
case('court_edit_duplicate_label_is_a_crash', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 2'}), **CRASH)
case('court_edit_blank_label', req('PATCH', CT1(S[3], CT(3)), {'label': ''}))
case('court_edit_start_not_a_date', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1', 'startsAt': 'soon'}))
case('court_edit_prepared_session', req('PATCH', CT1(S[1], CT(1)), {'label': 'Court One'}))
case('court_edit_removed_court', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1'}), scenario='court3_removed')
case('court_edit_unknown_court', req('PATCH', CT1(S[3], UNKNOWN_COURT), {'label': 'Court 1'}))
case('court_edit_court_of_another_session', req('PATCH', CT1(S[3], CT(1)), {'label': 'Court 1'}))
case('court_edit_malformed_court_id_is_a_conflict', req('PATCH', CT1(S[3], 'nope'), {'label': 'Court 1'}))
case('court_edit_uppercase_court_id_is_a_conflict', req('PATCH', CT1(S[3], CT(3).upper()), {'label': 'Court 1'}))
case('court_edit_closed_session', req('PATCH', CT1(S[4], CT(3)), {'label': 'Court 1'}))
case('court_edit_signed_out', req('PATCH', CT1(S[3], CT(3)), {'label': 'Court 1'}, who=None))
case('court_edit_body_not_json', req('PATCH', CT1(S[3], CT(3)), rawBody='nope'))
case('court_edit_lapsed_club_live_runs_on', req('PATCH', CT1(S[8], CT(8)), {'label': 'Court 1b'}, who=LAPSED))
case('court_remove_one_of_two', req('DELETE', CT1(S[3], CT(4))))
case('court_remove_recomputes_the_calculated_minimum', req('DELETE', CT1(S[1], CT(1))), scenario='s1_two_courts')
case('court_remove_the_last_court', req('DELETE', CT1(S[1], CT(1))))
case('court_remove_a_court_that_is_held', req('DELETE', CT1(S[3], CT(3))), scenario='court3_held_by_a_match')
case('court_remove_unknown_court_is_null', req('DELETE', CT1(S[3], UNKNOWN_COURT)))
case('court_remove_malformed_id_is_null', req('DELETE', CT1(S[3], 'nope')))
case('court_remove_court_of_another_session_is_null', req('DELETE', CT1(S[3], CT(1))))
case('court_remove_already_removed_is_null', req('DELETE', CT1(S[3], CT(4))), scenario='court4_removed')
case('court_remove_twice', [req('DELETE', CT1(S[3], CT(4))), req('DELETE', CT1(S[3], CT(4)))])
case('court_remove_closed_session', req('DELETE', CT1(S[4], CT(4))))
case('court_remove_signed_out', req('DELETE', CT1(S[3], CT(4)), who=None))

OPEN = lambda s: f'/api/sessions/{s}/courts/open-early'
OPEN1 = lambda s, c: f'/api/sessions/{s}/courts/{c}/open-early'
case('open_all_courts_early', req('POST', OPEN(S[3])), scenario='court34_not_open_yet')
case('open_all_courts_early_only_the_ones_not_open', req('POST', OPEN(S[3])), scenario='court4_not_open_yet')
case('open_all_courts_early_nothing_to_open', req('POST', OPEN(S[3])))
case('open_all_courts_early_prepared_session', req('POST', OPEN(S[1])))
case('open_all_courts_early_closed_session', req('POST', OPEN(S[4])))
case('open_all_courts_early_signed_out', req('POST', OPEN(S[3]), who=None))
case('open_one_court_early', req('POST', OPEN1(S[3], CT(4))), scenario='court4_not_open_yet')
case('open_one_court_early_twice_is_the_same_court', [req('POST', OPEN1(S[3], CT(4))), req('POST', OPEN1(S[3], CT(4)), snapshot=True)], scenario='court4_not_open_yet')
case('open_one_court_early_already_open', req('POST', OPEN1(S[3], CT(3))))
case('open_one_court_early_removed', req('POST', OPEN1(S[3], CT(4))), scenario='court4_removed')
case('open_one_court_early_unknown', req('POST', OPEN1(S[3], UNKNOWN_COURT)))
case('open_one_court_early_malformed_id_is_a_conflict', req('POST', OPEN1(S[3], 'nope')))
case('open_one_court_early_prepared_session', req('POST', OPEN1(S[1], CT(1))))
case('undo_early_open', req('DELETE', OPEN1(S[3], CT(4))), scenario='court4_opened_early_start_ahead')
case('undo_early_open_twice_is_the_same_court', [req('DELETE', OPEN1(S[3], CT(4))), req('DELETE', OPEN1(S[3], CT(4)), snapshot=True)], scenario='court4_opened_early_start_ahead')
case('undo_early_open_court_not_open_yet_is_returned_as_it_is', req('DELETE', OPEN1(S[3], CT(4))), scenario='court4_not_open_yet')
case('undo_early_open_court_never_opened_early', req('DELETE', OPEN1(S[3], CT(4))))
case('undo_early_open_court_whose_start_has_passed', req('DELETE', OPEN1(S[3], CT(4))), scenario='court4_opened_early_start_passed')
case('undo_early_open_court_held_by_a_match', req('DELETE', OPEN1(S[3], CT(4))), scenario='court4_opened_early_held')
case('undo_early_open_removed_court', req('DELETE', OPEN1(S[3], CT(4))), scenario='court4_removed')
case('undo_early_open_prepared_session', req('DELETE', OPEN1(S[1], CT(1))))
case('undo_early_open_malformed_id_is_a_conflict', req('DELETE', OPEN1(S[3], 'nope')))

# ---------------------------------------------------------------- POST /api/sessions/{id}/back-to-preparation
BP = lambda sid: f'/api/sessions/{sid}/back-to-preparation'
case('bp_signed_out', req('POST', BP(S[3]), {'expectedRevision': '12'}, who=None))
case('bp_body_not_json', req('POST', BP(S[3]), rawBody='nope'))
case('bp_live_session', req('POST', BP(S[3]), {'expectedRevision': '12'}))
case('bp_with_an_on_court_match_fails_at_the_write', req('POST', BP(S[3]), {'expectedRevision': '12'}), scenario='s3_on_court_match', **CRASH)
case('bp_refused_while_a_game_is_playing', req('POST', BP(S[3]), {'expectedRevision': '12'}), scenario='court3_held_by_a_match')
case('bp_refused_after_a_game_was_played', req('POST', BP(S[3]), {'expectedRevision': '12'}), scenario='court3_hosted_a_match')
case('bp_stale_revision', req('POST', BP(S[3]), {'expectedRevision': '11'}))
case('bp_revision_missing_is_zero', req('POST', BP(S[3]), {}))
case('bp_prepared_session_answers_it', req('POST', BP(S[1]), {'expectedRevision': '1'}))
case('bp_closed_session', req('POST', BP(S[4]), {'expectedRevision': '20'}))
case('bp_retry_answers_the_prepared_session', [req('POST', BP(S[3]), {'expectedRevision': '12'}), req('POST', BP(S[3]), {'expectedRevision': '12'}, snapshot=True)])
case('bp_clears_an_early_opened_court', req('POST', BP(S[3]), {'expectedRevision': '12'}), scenario='court4_opened_early_start_ahead')
case('bp_puts_the_planned_window_back', [req('POST', ST(S[1]), {'expectedRevision': '5', 'newEndAt': NEW_END}), req('POST', BP(S[1]), {'expectedRevision': '6'}, snapshot=True)], scenario='late_s1')
case('bp_after_a_same_day_start', [req('POST', ST(S[1]), {'expectedRevision': '5'}), req('POST', BP(S[1]), {'expectedRevision': '6'}, snapshot=True)], scenario='s1_today')
case('bp_lapsed_club_is_refused_first', req('POST', BP(S[7]), {'expectedRevision': '1'}, who=LAPSED))
case('bp_unknown_session', req('POST', BP('a3000000-0000-4000-8000-0000000000ff'), {'expectedRevision': '1'}))
case('bp_other_clubs_session', req('POST', BP(S[9]), {'expectedRevision': '1'}))
case('bp_malformed_session', req('POST', BP('nope'), {'expectedRevision': '1'}), **MALFORMED)
case('bp_parallel_twice', {'parallel': [req('POST', BP(S[3]), {'expectedRevision': '12'}), req('POST', BP(S[3]), {'expectedRevision': '12'})]})

# ---------------------------------------------------------------- scenarios
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
# ---- Restrictions (D-2026-11-19-12, task 2.2): which levels may take a slot, saved on create and edit
LR = lambda **kw: {'levelRestriction': kw}
PL2 = {'playersPerCourt': 2}  # two courts of two: four slots
case('create_restriction_default_is_all', create(1, form()))
case('create_restriction_all', create(1, form(**LR(kind='all'))))
case('create_restriction_beginners', create(1, form(**LR(kind='beginners'))))
case('create_restriction_beginners_intermediate', create(1, form(**LR(kind='beginners-intermediate'))))
case('create_restriction_per_level', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 2, 'intermediate': 1, 'advanced': 1}))))
case('create_restriction_per_level_with_zero_slots', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 0, 'intermediate': 4, 'advanced': 0}))))
case('create_restriction_per_level_uses_the_club_default_per_court', create(1, form(**LR(kind='per-level', slots={'beginner': 4, 'intermediate': 4, 'advanced': 0}))))
case('create_restriction_slots_ignored_with_another_pick', create(1, form(**LR(kind='beginners', slots={'beginner': 9, 'intermediate': 9, 'advanced': 9}))))
case('create_restriction_null_is_all', create(1, form(levelRestriction=None)))
case('create_restriction_unknown_kind', create(1, form(**LR(kind='experts'))))
case('create_restriction_without_a_kind', create(1, form(**LR(slots={'beginner': 1}))))
case('create_restriction_not_an_object', create(1, form(levelRestriction='beginners')))
case('create_restriction_a_list', create(1, form(levelRestriction=['all'])))
case('create_restriction_slots_add_up_to_less', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 1, 'intermediate': 1, 'advanced': 1}))))
case('create_restriction_slots_add_up_to_more', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 2, 'intermediate': 2, 'advanced': 2}))))
case('create_restriction_slots_one_court', create(1, form(**PL2, courts=[{'label': 'Court 1'}], **LR(kind='per-level', slots={'beginner': 1, 'intermediate': 1, 'advanced': 1}))))
case('create_restriction_slots_missing_reads_zero_each', create(1, form(**PL2, **LR(kind='per-level'))))
case('create_restriction_slot_not_whole', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 1.5, 'intermediate': 1.5, 'advanced': 1}))))
case('create_restriction_slot_negative', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': -1, 'intermediate': 3, 'advanced': 2}))))
case('create_restriction_slot_text', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': '2', 'intermediate': 1, 'advanced': 1}))))
case('create_restriction_slots_null', create(1, form(**PL2, **LR(kind='per-level', slots=None))))
case('create_restriction_slots_missing_a_band', create(1, form(**PL2, **LR(kind='per-level', slots={'beginner': 2, 'intermediate': 2}))))
case('create_restriction_bad_slots_win_over_a_bad_kind', create(1, form(**LR(kind='experts', slots={'beginner': -1, 'intermediate': 0, 'advanced': 0}))))
case('create_restriction_a_series_gets_the_same_pick', create(1, form(repeat='weekly', occurrences=3, **LR(kind='beginners'))))
case('edit_restriction_beginners', edit(S[1], s1_form(**LR(kind='beginners')), '5'))
case('edit_restriction_per_level', edit(S[1], s1_form(**LR(kind='per-level', slots={'beginner': 1, 'intermediate': 1, 'advanced': 0})), '5'))
case('edit_restriction_slots_must_add_up', edit(S[1], s1_form(**LR(kind='per-level', slots={'beginner': 1, 'intermediate': 1, 'advanced': 1})), '5'))
case('edit_restriction_slots_not_whole', edit(S[1], s1_form(**LR(kind='per-level', slots={'beginner': 1.5, 'intermediate': 0.5, 'advanced': 0})), '5'))
case('edit_restriction_unknown_kind', edit(S[1], s1_form(**LR(kind='experts')), '5'))
case('edit_restriction_follows_a_new_court_count', edit(S[1], s1_form(courts=[{'id': CT(1), 'label': 'Court 1'}, {'label': 'Court 2'}], **LR(kind='per-level', slots={'beginner': 2, 'intermediate': 2, 'advanced': 0})), '5'))
case('edit_restriction_left_out_keeps_the_stored_pick', edit(S[1], s1_form(), '5'), scenario='s1_beginners_only')
case('edit_restriction_null_keeps_the_stored_pick', edit(S[1], s1_form(levelRestriction=None), '5'), scenario='s1_beginners_only')
case('edit_restriction_back_to_all', edit(S[1], s1_form(**LR(kind='all')), '5'), scenario='s1_per_level')
case('edit_restriction_per_level_to_beginners_drops_the_slots', edit(S[1], s1_form(**LR(kind='beginners')), '5'), scenario='s1_per_level')
case('edit_restriction_refused_keeps_the_stored_pick', edit(S[1], s1_form(**LR(kind='per-level', slots={'beginner': 5, 'intermediate': 0, 'advanced': 0})), '5'), scenario='s1_beginners_only')
case('start_a_restricted_session', req('POST', ST(S[1]), {'expectedRevision': '5'}), scenario='s1_per_level_today')

SCEN = dict(BASE['scenarios'])


def upd(table, sets, where):
    return f"UPDATE {table} SET {sets} WHERE {where}"


def entry_sql(sp, session, cp, name, level=3, assessed=True, present=False):
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, assessment_id, skill_level_id, "
            f"confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{SP(sp)}', '{CLUB1}', '{S[session]}', 'c6000000-0000-4000-8000-0000000000{cp:02d}', "
            f"'{name}', {'true' if present else 'false'}, {NOW}, NULL, {level if assessed else 'NULL'}, TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', {NOW}, {NOW}, 1)")


def assess_sql(n, sp, session, cp, level=3):
    return (f"INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, skill_level_id, source_operation_id, assessed_at, received_at, "
            f"accepted_revision, actor_club_id) VALUES ('a0300000-0000-4000-8000-0000000002{n:02d}', '{CLUB1}', 'c6000000-0000-4000-8000-0000000000{cp:02d}', '{S[session]}', "
            f"'{SP(sp)}', {level}, 'a0300000-0000-4000-8000-0000000003{n:02d}', {NOW}, {NOW}, 1, '{CLUB1}')")


def with_assessment(n, sp, session, cp, name, present=False):
    return [entry_sql(sp, session, cp, name, present=present), assess_sql(n, sp, session, cp),
            upd('session_players', f"assessment_id = 'a0300000-0000-4000-8000-0000000002{n:02d}'", f"id = '{SP(sp)}'")]


S3_GONE = upd('queue_sessions', "state = 'invalid', invalid_reason = 'Test night'", f"id = '{S[3]}'")
S3_DONE = upd('queue_sessions', "state = 'completed', finalized_at = TIMESTAMPTZ '2026-11-19 03:00:00+00'", f"id = '{S[3]}'")
YESTERDAY = upd('queue_sessions', "scheduled_start_at = TIMESTAMPTZ '2026-11-18 01:00:00+00', scheduled_end_at = TIMESTAMPTZ '2026-11-18 05:00:00+00'", f"id = '{S[1]}'")
TODAY = "scheduled_start_at = TIMESTAMPTZ '2026-11-19 03:00:00+00', scheduled_end_at = TIMESTAMPTZ '2026-11-19 07:00:00+00'"
s1_today = [S3_GONE, upd('queue_sessions', TODAY, f"id = '{S[1]}'")]
SCEN.update({
    's1_beginners_only': [f"UPDATE queue_sessions SET level_restriction = 'beginners' WHERE id = '{S[1]}'"],
    's1_per_level': [f"UPDATE queue_sessions SET level_restriction = 'slots_per_band', beginner_slots = 1, intermediate_slots = 1, advanced_slots = 0 WHERE id = '{S[1]}'"],
    's1_at_smash_hall': [upd('queue_sessions', f"venue_id = '{V1}', venue_name = 'Smash Hall'", f"id = '{S[1]}'")],
    's1_at_smash_hall_s5_overlaps': [upd('queue_sessions', f"venue_id = '{V1}', venue_name = 'Smash Hall'", f"id = '{S[1]}'"),
                                      upd('queue_sessions', f"scheduled_start_at = TIMESTAMPTZ '2026-11-20 05:00:00+00', scheduled_end_at = TIMESTAMPTZ '2026-11-20 06:00:00+00', venue_id = '{V2}', venue_name = 'Court Two'", f"id = '{S[5]}'")],
    's5_at_smash_hall': [upd('queue_sessions', f"venue_id = '{V1}', venue_name = 'Smash Hall'", f"id = '{S[5]}'")],
    's1_cancelled': [upd('queue_sessions', "state = 'cancelled', cancelled_at = TIMESTAMPTZ '2026-11-18 00:00:00+00'", f"id = '{S[1]}'")],
    'other_club_has_cmd_1': [upd('queue_sessions', f"source_command_id = '{derived_id('cmd-1', 'session:0')}'", f"id = '{S[9]}'")],
    's1_formats_and_no_record': [upd('queue_sessions', "request_formats = '{fun_3v3,singles}', record_games = false", f"id = '{S[1]}'")],
    's2_waiter_without_a_level': [upd('session_waitlist', 'skill_level_id = NULL', "id = 'a3300000-0000-4000-8000-000000000001'")],
    # Prep Full with two courts and four players (Hal, Ivy, Ben (registered), Gus) and Ann waiting.
    's2_four_courts_players': [f"INSERT INTO session_courts (id, club_id, session_id, label, position, created_at, updated_at) VALUES ('{CT(12)}', '{CLUB1}', '{S[2]}', 'Court 2', 2, {NOW}, {NOW})",
                                *with_assessment(21, 10, 2, 4, 'Ben Santos'), *with_assessment(22, 11, 2, 1, 'Gus Guest')],
    's3_completed': [S3_DONE],
    's1_today': s1_today,
    's1_today_hal_here': [*s1_today, upd('session_players', 'present = true', f"id = '{SP(1)}'")],
    's1_today_stale_minimum': [*s1_today, upd('queue_sessions', 'minimum_games = 99', f"id = '{S[1]}'")],
    's1_today_s3_running': [],
    's1_today_unleveled_entry': [*s1_today, entry_sql(10, 1, 1, 'Gus Guest', assessed=False)],
    's1_today_two_unleveled': [*s1_today, entry_sql(10, 1, 1, 'Gus Guest', assessed=False), entry_sql(11, 1, 2, 'Gail Guest', assessed=False)],
    's1_ended_today': [S3_GONE, upd('queue_sessions', "scheduled_start_at = TIMESTAMPTZ '2026-11-19 01:00:00+00', scheduled_end_at = TIMESTAMPTZ '2026-11-19 03:30:00+00'", f"id = '{S[1]}'")],
    # Prep Open was planned for yesterday and the live night is gone: a late start, which needs a new end.
    'late_s1': [YESTERDAY, S3_GONE],
    'late_s1_s3_completed': [YESTERDAY, S3_DONE],
    'late_s1_court_opens_late': [YESTERDAY, S3_GONE, upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-18 12:00:00+00'", f"id = '{CT(1)}'")],
    'late_s1_court_booked_long': [YESTERDAY, S3_GONE, upd('session_courts', "open_until = TIMESTAMPTZ '2026-11-18 20:00:00+00'", f"id = '{CT(1)}'")],
    's5_today': [S3_GONE, upd('queue_sessions', TODAY, f"id = '{S[5]}'")],
    's1_two_courts': [f"INSERT INTO session_courts (id, club_id, session_id, label, position, created_at, updated_at) VALUES ('{CT(11)}', '{CLUB1}', '{S[1]}', 'Court 2', 2, TIMESTAMPTZ '2026-11-10 00:00:01+00', TIMESTAMPTZ '2026-11-10 00:00:01+00')"],
    's6_with_waitlist_and_request': [f"INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at) VALUES ('a3300000-0000-4000-8000-000000000009', '{CLUB1}', '{S[6]}', 'c6000000-0000-4000-8000-000000000001', 3, {NOW}, {NOW}, {NOW})",
                                     f"INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, created_at, updated_at, revision) VALUES ('a3400000-0000-4000-8000-000000000020', '{CLUB1}', '{S[6]}', 'Noon Nell', 'unsure', 'slot', 'pending', {NOW}, {NOW}, {NOW}, 1)"],
    'court3_starts_late': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 02:00:00+00'", f"id = '{CT(3)}'")],
    'court3_starts_before_the_session': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 00:30:00+00'", f"id = '{CT(3)}'")],
    'court3_opened_early': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 02:00:00+00', opened_early_at = TIMESTAMPTZ '2026-11-19 01:30:00+00'", f"id = '{CT(3)}'")],
    'court3_removed': [upd('session_courts', "removed_at = TIMESTAMPTZ '2026-11-19 02:00:00+00'", f"id = '{CT(3)}'")],
    'court4_removed': [upd('session_courts', "removed_at = TIMESTAMPTZ '2026-11-19 02:00:00+00'", f"id = '{CT(4)}'")],
    'court3_hosted_a_match': [],
    'court3_held_by_a_match': [],
    'court34_not_open_yet': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 06:00:00+00'", f"id IN ('{CT(3)}', '{CT(4)}')")],
    'court4_not_open_yet': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 06:00:00+00'", f"id = '{CT(4)}'")],
    'court4_opened_early_start_ahead': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 06:00:00+00', opened_early_at = TIMESTAMPTZ '2026-11-19 03:00:00+00'", f"id = '{CT(4)}'")],
    'court4_opened_early_start_passed': [upd('session_courts', "starts_at = TIMESTAMPTZ '2026-11-19 03:00:00+00', opened_early_at = TIMESTAMPTZ '2026-11-19 02:30:00+00'", f"id = '{CT(4)}'")],
    'court4_opened_early_held': [],
})


def match_on_court(n, court, state='active', started=True):
    mid = f'a4000000-0000-4000-8000-0000000000{n:02d}'
    return [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, source_operation_id, placed_at, started_at, created_at, updated_at, revision) "
            f"VALUES ('{mid}', '{CLUB1}', '{S[3]}', {n}, '{state}', 'singles', {n}, 'manual', 'a4100000-0000-4000-8000-0000000000{n:02d}', {NOW}, {NOW if started else 'NULL'}, {NOW}, {NOW}, 1)",
            f"INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, acquire_operation_id) VALUES ('a4500000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[3]}', '{mid}', '{court}', {NOW}, 'a4600000-0000-4000-8000-0000000000{n:02d}')",
            f"INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES ('{court}', '{CLUB1}', '{S[3]}', '{mid}', {NOW})"]


def match_used_court(n, court):
    # A finished match used the court: its usage row stays, the hold is gone.
    mid = f'a4000000-0000-4000-8000-0000000000{n:02d}'
    return [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, source_operation_id, started_at, ended_at, created_at, updated_at, revision) "
            f"VALUES ('{mid}', '{CLUB1}', '{S[3]}', {n}, 'invalid', 'singles', {n}, 'manual', 'a4100000-0000-4000-8000-0000000000{n:02d}', {NOW}, TIMESTAMPTZ '2026-11-19 02:30:00+00', {NOW}, {NOW}, 1)",
            f"INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, released_at, acquire_operation_id, release_operation_id) VALUES ('a4500000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[3]}', '{mid}', '{court}', {NOW}, TIMESTAMPTZ '2026-11-19 02:30:00+00', 'a4600000-0000-4000-8000-0000000000{n:02d}', 'a4700000-0000-4000-8000-0000000000{n:02d}')"]


SCEN['s1_per_level_today'] = [*SCEN['s1_today'], *SCEN['s1_per_level']]
SCEN['court3_hosted_a_match'] = match_used_court(1, CT(3))
SCEN['court3_held_by_a_match'] = match_on_court(1, CT(3))
SCEN['s3_on_court_match'] = match_on_court(1, CT(3), state='on_court', started=False)
SCEN['court4_opened_early_held'] = [*SCEN['court4_opened_early_start_ahead'], *match_on_court(1, CT(4), state='on_court', started=False)]

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'queue_sessions':
        s['sql'] = ("SELECT id, club_id, title, notes, state, scheduled_start_at, scheduled_end_at, venue_id, venue_name, venue_address, session_mode, allow_singles, allow_doubles, "
                    "minimum_games, minimum_is_calculated, players_per_court, expected_players, queue_revision::text AS queue_revision, started_at, series_id, start_license_term_id, "
                    "public_slug, accept_join_requests, always_require_request, court_fill_mode, record_games, request_formats::text AS request_formats, source_command_id, "
                    "planned_start_before_start_at, planned_end_before_start_at, level_restriction::text AS level_restriction, beginner_slots, intermediate_slots, advanced_slots, revision::text AS revision, created_at, updated_at FROM queue_sessions ORDER BY id")
    if s['name'] == 'session_players':
        s['sql'] = s['sql'].replace('no_show_at, revision::text', 'no_show_at, games_adjustment, revision::text')
    SNAPSHOT.append(s)
SNAPSHOT.insert(1, {'name': 'session_courts', 'sql': "SELECT id, club_id, session_id, label, starts_at, opened_early_at, open_until, removed_at, created_at, updated_at, revision::text AS revision FROM session_courts ORDER BY id"})

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
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
