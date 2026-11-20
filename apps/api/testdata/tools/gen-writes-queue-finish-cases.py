#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/finish.cases.json: the session-level commands of the Queue app (Set end time, Extend,
Cancel session, Mark session invalid). Session done (finalization) is the finalize group (gen-writes-queue-finalize-cases.py): its in-request job drive writes the result
snapshot, the player history and the ranks.

Run it, then the capture (capture-writes-queue.test.mjs -t finish), which writes finish.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-finish-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/finish.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/match.cases.json')))
SCEN = dict(BASE['scenarios'])

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CT = lambda n: f'a2c00000-0000-4000-8000-0000000000{n:02d}'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
UNKNOWN = 'a3000000-0000-4000-8000-0000000000ff'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}

# S1 (prepared, revision 5, calculated minimum) holds a reservation; S3 is live (revision 12) with its ten waiting matches' worth of state.
SCEN['reserved'] = [f"INSERT INTO club_session_reservations (club_id, session_id, acquired_at, created_at) VALUES ('{CLUB1}', '{S[1]}', {NOW}, {NOW})"]
SCEN['reserved_with_requests'] = SCEN['reserved'] + SCEN['notices'] + [
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('a3700000-0000-4000-8000-000000000051', '{CLUB1}', '{S[1]}', 'a7000000-0000-4000-8000-000000000001', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)"]
SCEN['live_waiting'] = SCEN['s3_waiting_matches']
SCEN['live_on_court'] = SCEN['onc']
SCEN['live_playing'] = SCEN['play']
SCEN['court_booked_late'] = [f"UPDATE session_courts SET open_until = TIMESTAMPTZ '2026-11-19 07:00:00+00' WHERE id = '{CT(3)}'"]
SCEN['court_opens_late'] = [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-19 08:00:00+00' WHERE id = '{CT(4)}'"]
SCEN['prepared_court_opens_late'] = [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 04:30:00+00' WHERE id = '{CT(1)}'"]
SCEN['prepared_court_booked'] = [f"UPDATE session_courts SET open_until = TIMESTAMPTZ '2026-11-20 08:00:00+00' WHERE id = '{CT(1)}'"]
SCEN['prepared_fixed_minimum'] = [f"UPDATE queue_sessions SET minimum_is_calculated = false, minimum_games = 7 WHERE id = '{S[1]}'"]
SCEN['live_calculated_minimum'] = [f"UPDATE queue_sessions SET minimum_is_calculated = true WHERE id = '{S[3]}'"]
SCEN['cancelled'] = [f"UPDATE queue_sessions SET state = 'cancelled', cancelled_at = {NOW}, cancel_reason = 'Rain' WHERE id = '{S[1]}'"]
SCEN['invalid_session'] = [f"UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Wrong night' WHERE id = '{S[3]}'"]
SCEN['finalizing'] = [f"UPDATE queue_sessions SET state = 'finalizing' WHERE id = '{S[3]}'"]


def end(sid, at, rev, who=SMASH, **kw):
    body = {}
    if at is not None:
        body['endAt'] = at
    if rev is not None:
        body['expectedRevision'] = rev
    return req('POST', f'/api/sessions/{sid}/end', body, who=who, **kw)


def extend(sid, minutes, rev, who=SMASH, **kw):
    body = {}
    if minutes is not None:
        body['minutes'] = minutes
    if rev is not None:
        body['expectedRevision'] = rev
    return req('POST', f'/api/sessions/{sid}/extend', body, who=who, **kw)


LATER = '2026-11-19T06:00:00.000Z'
case('end_signed_out', end(S[3], LATER, '12', who=None))
case('end_body_not_json', req('POST', f'/api/sessions/{S[3]}/end', rawBody='nope'))
case('end_a_live_session_later', end(S[3], LATER, '12'))
case('end_a_live_session_at_the_end_it_has_is_unchanged', end(S[3], '2026-11-19T05:00:00.000Z', '99'))
case('end_a_live_session_twice_is_unchanged_the_second_time', [end(S[3], LATER, '12'), end(S[3], LATER, '12')])
case('end_a_live_session_with_a_date_without_milliseconds', end(S[3], '2026-11-19T06:00:00Z', '12'))
case('end_a_live_session_before_now', end(S[3], '2026-11-19T03:00:00.000Z', '12'))
case('end_a_live_session_exactly_now', end(S[3], '2026-11-19T04:00:00.000Z', '12'))
case('end_a_live_session_more_than_a_day_after_the_start', end(S[3], '2026-11-20T01:00:01.000Z', '12'))
case('end_a_live_session_exactly_a_day_after_the_start', end(S[3], '2026-11-20T01:00:00.000Z', '12'))
case('end_a_date_that_is_not_a_date', end(S[3], 'tomorrow-ish', '12'))
case('end_without_a_date', end(S[3], None, '12'))
case('end_a_date_that_is_not_text', end(S[3], 5, '12'))
case('end_stale_revision', end(S[3], LATER, '11'))
case('end_revision_that_is_not_a_number', end(S[3], LATER, 'x'))
case('end_without_a_revision', end(S[3], LATER, None))
case('end_a_court_booked_past_the_new_end', end(S[3], LATER, '12'), 'court_booked_late')
case('end_a_court_that_opens_after_the_new_end', end(S[3], '2026-11-19T07:00:00.000Z', '12'), 'court_opens_late')
case('end_earlier_while_a_court_opens_later_in_the_session', end(S[3], '2026-11-19T04:30:00.000Z', '12'), 'court_opens_late')
case('end_a_live_session_with_a_calculated_minimum_keeps_the_minimum', end(S[3], LATER, '12'), 'live_calculated_minimum')
case('end_a_prepared_session_later', end(S[1], '2026-11-20T06:00:00.000Z', '5'))
case('end_a_prepared_session_recomputes_a_calculated_minimum', end(S[1], '2026-11-20T09:00:00.000Z', '5'))
case('end_a_prepared_session_with_a_fixed_minimum', end(S[1], '2026-11-20T09:00:00.000Z', '5'), 'prepared_fixed_minimum')
case('end_a_prepared_session_before_its_start', end(S[1], '2026-11-20T00:30:00.000Z', '5'))
case('end_a_prepared_session_at_its_start', end(S[1], '2026-11-20T01:00:00.000Z', '5'))
case('end_a_prepared_session_more_than_a_day_after_its_start', end(S[1], '2026-11-21T01:00:01.000Z', '5'))
case('end_a_prepared_session_before_a_court_opens', end(S[1], '2026-11-20T04:00:00.000Z', '5'), 'prepared_court_opens_late')
case('end_a_prepared_session_before_a_court_booking_ends', end(S[1], '2026-11-20T06:00:00.000Z', '5'), 'prepared_court_booked')
case('end_a_completed_session', end(S[4], LATER, '1'))
case('end_a_cancelled_session', end(S[1], LATER, '5'), 'cancelled')
case('end_an_invalid_session', end(S[3], LATER, '12'), 'invalid_session')
case('end_unknown_session', end(UNKNOWN, LATER, '1'))
case('end_malformed_session_id', end('m', LATER, '1'), **MALFORMED)
case('end_another_clubs_session', end(S[9], LATER, '1'))
case('end_a_live_session_started_under_a_term_of_a_lapsed_club', end(S[8], LATER, '12', who=LAPSED))
case('end_two_at_once_at_one_revision', {'parallel': [end(S[3], LATER, '12'), end(S[3], LATER, '12')]})

case('extend_signed_out', extend(S[3], 30, '12', who=None))
case('extend_a_live_session_30_minutes', extend(S[3], 30, '12'))
case('extend_a_live_session_60_minutes', extend(S[3], 60, '12'))
case('extend_twice_at_the_same_revision_conflicts', [extend(S[3], 30, '12'), extend(S[3], 30, '12')])
case('extend_twice_at_the_new_revision', [extend(S[3], 30, '12'), extend(S[3], 30, '13')])
case('extend_two_at_once_at_one_revision', {'parallel': [extend(S[3], 30, '12')] * 2})
case('extend_a_prepared_session', extend(S[1], 30, '5'))
case('extend_45_minutes', extend(S[3], 45, '12'))
case('extend_the_minutes_are_checked_before_the_session_is_looked_up', extend(UNKNOWN, 45, '1'))
case('extend_minutes_that_are_text', extend(S[3], '30', '12'))
case('extend_without_minutes', extend(S[3], None, '12'))
case('extend_stale_revision', extend(S[3], 30, '11'))
case('extend_without_a_revision', extend(S[3], 30, None))
case('extend_past_a_day_after_the_start', extend(S[3], 60, '12'), 'live_end_near_the_limit')
SCEN['live_end_near_the_limit'] = [f"UPDATE queue_sessions SET scheduled_end_at = TIMESTAMPTZ '2026-11-20 00:30:00+00' WHERE id = '{S[3]}'"]
case('extend_a_court_booked_past_the_new_end', extend(S[3], 30, '12'), 'court_booked_late_early_end')
SCEN['court_booked_late_early_end'] = [f"UPDATE session_courts SET open_until = TIMESTAMPTZ '2026-11-19 05:45:00+00' WHERE id = '{CT(3)}'"]
case('extend_a_completed_session', extend(S[4], 30, '1'))
case('extend_unknown_session', extend(UNKNOWN, 30, '1'))
case('extend_another_clubs_session', extend(S[9], 30, '1'))


def cancel(sid, body=None, who=SMASH, **kw):
    return req('POST', f'/api/sessions/{sid}/cancel', {} if body is None else body, who=who, **kw)


case('cancel_signed_out', cancel(S[1], who=None))
case('cancel_body_not_json', req('POST', f'/api/sessions/{S[1]}/cancel', rawBody='nope'))
case('cancel_without_a_body', req('POST', f'/api/sessions/{S[1]}/cancel'))
case('cancel_a_prepared_session', cancel(S[1], {'reason': 'Court flooded'}), 'reserved_with_requests')
case('cancel_without_a_reason', cancel(S[1]), 'reserved')
case('cancel_with_a_null_reason', cancel(S[1], {'reason': None}))
case('cancel_with_a_reason_of_spaces', cancel(S[1], {'reason': '   '}))
case('cancel_the_reason_is_trimmed', cancel(S[1], {'reason': '  Rain  '}))
case('cancel_a_reason_of_120_characters', cancel(S[1], {'reason': 'x' * 120}))
case('cancel_a_reason_of_121_characters', cancel(S[1], {'reason': 'x' * 121}))
case('cancel_a_reason_of_120_characters_and_spaces_round_it', cancel(S[1], {'reason': ' ' + 'x' * 120 + ' '}))
case('cancel_a_reason_of_surrogate_pairs_counts_two_each', cancel(S[1], {'reason': '😀' * 61}))
case('cancel_a_reason_that_is_not_text', cancel(S[1], {'reason': 5}))
case('cancel_a_reason_that_is_a_list', cancel(S[1], {'reason': ['x']}))
case('cancel_twice_returns_the_cancelled_session', [cancel(S[1], {'reason': 'Rain'}), cancel(S[1], {'reason': 'Other'})])
case('cancel_a_cancelled_session_whatever_the_reason', cancel(S[1], {'reason': 'Other'}), 'cancelled')
case('cancel_closes_the_pending_join_requests', cancel(S[1]))
case('cancel_a_live_session', cancel(S[3]))
case('cancel_a_completed_session', cancel(S[4]))
case('cancel_an_invalid_session', cancel(S[3]), 'invalid_session')
case('cancel_unknown_session', cancel(UNKNOWN))
case('cancel_malformed_session_id', cancel('m'), **MALFORMED)
case('cancel_another_clubs_session', cancel(S[9]))
case('cancel_a_prepared_session_of_a_lapsed_club', cancel(S[7], who=LAPSED))
case('cancel_a_reason_check_comes_before_the_session_lookup', cancel(UNKNOWN, {'reason': 'x' * 121}))
case('cancel_two_at_once', {'parallel': [cancel(S[1], {'reason': 'Rain'})] * 2})


def invalid(sid, reason=None, who=SMASH, **kw):
    body = {} if reason is None else {'reason': reason}
    return req('POST', f'/api/sessions/{sid}/invalid', body, who=who, **kw)


case('invalid_signed_out', invalid(S[3], 'x', who=None))
case('invalid_body_not_json', req('POST', f'/api/sessions/{S[3]}/invalid', rawBody='nope'))
case('invalid_a_live_session_with_waiting_matches', invalid(S[3], 'Wrong night'), 'live_waiting')
case('invalid_a_live_session_leaves_on_court_matches_as_they_are', invalid(S[3], 'Wrong night'), 'live_on_court')
case('invalid_a_live_session_with_a_playing_match', invalid(S[3], 'Wrong night'), 'live_playing')
case('invalid_a_live_session_closes_open_match_requests_and_notices', invalid(S[3], 'Wrong night'), 'live_with_notice')
SCEN['live_with_notice'] = SCEN['notices']
case('invalid_a_live_session_releases_its_reservation', invalid(S[3], 'Wrong night'), 'live_reserved')
SCEN['live_reserved'] = [f"INSERT INTO club_session_reservations (club_id, session_id, acquired_at, created_at) VALUES ('{CLUB1}', '{S[3]}', {NOW}, {NOW})"]
case('invalid_a_prepared_session', invalid(S[1], 'Duplicate'), 'reserved')
case('invalid_the_reason_is_trimmed', invalid(S[3], '  Wrong night  '))
case('invalid_without_a_reason', invalid(S[3]))
case('invalid_a_blank_reason', invalid(S[3], '  \t '))
case('invalid_a_reason_that_is_not_text', invalid(S[3], 5))
case('invalid_the_reason_is_checked_before_the_session_is_looked_up', invalid(UNKNOWN, ''))
case('invalid_twice_returns_the_first_reason', [invalid(S[3], 'First'), invalid(S[3], 'Second')])
case('invalid_an_invalid_session_whatever_the_reason', invalid(S[3], 'Other'), 'invalid_session')
case('invalid_a_completed_session', invalid(S[4], 'Oops'))
case('invalid_a_finalizing_session', invalid(S[3], 'Oops'), 'finalizing')
# A cancelled session cannot become invalid: the database refuses the change and main answers a 500. Ported as is.
case('invalid_a_cancelled_session', invalid(S[1], 'Oops'), 'cancelled', allow500=True)
case('invalid_unknown_session', invalid(UNKNOWN, 'Oops'))
case('invalid_malformed_session_id', invalid('m', 'Oops'), **MALFORMED)
case('invalid_another_clubs_session', invalid(S[9], 'Oops'))
case('invalid_a_prepared_session_of_a_lapsed_club', invalid(S[7], 'Oops', who=LAPSED))
case('invalid_a_live_session_started_under_a_term_of_a_lapsed_club', invalid(S[8], 'Oops', who=LAPSED))
case('invalid_two_at_once', {'parallel': [invalid(S[3], 'Wrong night')] * 2})

cases[:] = [c for c in cases if c is not None]
SNAPSHOT = list(BASE['snapshot'])
SNAPSHOT.append({'name': 'club_session_reservations', 'sql': "SELECT club_id, session_id, acquired_at FROM club_session_reservations ORDER BY session_id"})
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
