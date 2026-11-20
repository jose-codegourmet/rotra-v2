#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/pubmr.cases.json: the signed-in Player's match request and Move me to the waitlist on a public
Queue Session, called from the Queue session page (POST /api/public-sessions/{slug}/{match-request,match-request/cancel,step-down}). The app
is player.

Run it, then the capture (capture-writes-queue.test.mjs -t pubmr), which writes pubmr.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-pubmr-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/pubmr.cases.json')
MATCH = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/match.cases.json')))
JOIN = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/pubjoin.cases.json')))
SCEN = dict(MATCH['scenarios'])
for k in ('gil_on_s1',):
    SCEN[k] = JOIN['scenarios'][k]

ANN, BEN, GIL = (f'f4000000-0000-4000-8000-0000000000{n:02d}' for n in (1, 2, 6))
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
MR = lambda n: f'a3700000-0000-4000-8000-0000000000{n:02d}'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
ORIGIN = 'http://localhost:9000'
LIVE, PREP = 'live-now', 'prep-open'
RID = lambda n: f'b5000000-0000-4000-8000-{n:012d}'
cases = []


def case(name, steps, scenario='s3_full_house', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    cases.append({'name': name, 'scenario': scenario, 'steps': steps, **kw})


def post(slug, action, who=ANN, body=None, headers=None, **kw):
    s = {'method': 'POST', 'path': f'/api/public-sessions/{slug}/{action}', 'who': who, 'headers': {'Origin': ORIGIN} if headers is None else headers}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


def ask(body=None, slug=LIVE, who=ANN, **kw):
    return post(slug, 'match-request', who, {'requestId': RID(1)} if body is None else body, **kw)


def mr(**kw):
    b = {'requestId': RID(1), 'format': 'doubles'}
    b.update(kw)
    return {k: v for k, v in b.items() if v != '__missing__'}


# Ann (entry 22) and Ben (23) are registered Players on the live night; Gus, Gail, Hal, Ivy and Jo are guests; Gil is not on the roster.
SCEN['ann_has_an_open_request'] = SCEN['s3_full_house'] + [
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('{MR(60)}', '{CLUB1}', '{S[3]}', '{SP(22)}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)",
    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('{MR(60)}', '{CLUB1}', '{S[3]}', 'opponent', 0, NULL)"]
SCEN['ann_request_names_an_away_player'] = SCEN['s3_full_house'] + [
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('{MR(61)}', '{CLUB1}', '{S[3]}', '{SP(22)}', 'doubles', 'open', {NOW}, {NOW}, {NOW}, 1)",
    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('{MR(61)}', '{CLUB1}', '{S[3]}', 'partner', 0, '{SP(5)}')",
    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('{MR(61)}', '{CLUB1}', '{S[3]}', 'opponent', 0, NULL)",
    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('{MR(61)}', '{CLUB1}', '{S[3]}', 'opponent', 1, NULL)",
    f"UPDATE session_players SET present = false WHERE id = '{SP(5)}'"]
SCEN['ivy_away'] = SCEN['s3_full_house_ivy_away']
SCEN['ann_away'] = SCEN['s3_full_house'] + [f"UPDATE session_players SET present = false WHERE id = '{SP(22)}'"]
SCEN['requests_off'] = SCEN['s3_full_house'] + [f"UPDATE queue_sessions SET request_formats = '{{}}' WHERE id = '{S[3]}'"]
SCEN['fun_requests_on'] = SCEN['s3_full_house'] + [f"UPDATE queue_sessions SET request_formats = '{{doubles,singles,fun_3v3}}' WHERE id = '{S[3]}'"]
SCEN['only_singles_requests'] = SCEN['s3_full_house'] + [f"UPDATE queue_sessions SET request_formats = '{{singles}}' WHERE id = '{S[3]}'"]
SCEN['ann_in_a_waiting_match'] = SCEN['s3_waiting_matches']
SCEN['ann_in_a_match_on_court'] = SCEN['onc']
SCEN['ann_in_a_removed_draft'] = SCEN['removed']
SCEN['ann_steps_down_free'] = SCEN['s3_full_house'] + [f"UPDATE queue_sessions SET state = 'prepared', started_at = NULL WHERE id = '{S[3]}'"]
SCEN['ben_on_s1'] = [
    f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES ('{SP(41)}', '{CLUB1}', '{S[1]}', 'c6000000-0000-4000-8000-000000000004', 'Ben Santos', false, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)"]
SCEN['s3_publication_deleted'] = [
    f"INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, deleted_at, last_synced_at, created_at, updated_at) VALUES ('a3900000-0000-4000-8000-000000000003', '{CLUB1}', '{S[3]}', 'goneGoneGoneGone01', 'deleted', '{{}}', '[]', {NOW}, {NOW}, {NOW}, {NOW})"]

# ---------------------------------------------------------------- the preflight of the three routes
for action in ('match-request', 'match-request/cancel', 'step-down'):
    case('preflight_' + action.replace('/', '_').replace('-', '_'), {'method': 'OPTIONS', 'path': f'/api/public-sessions/prep-open/{action}', 'who': None, 'headers': {'Origin': ORIGIN}})
case('preflight_match_request_from_another_origin', {'method': 'OPTIONS', 'path': '/api/public-sessions/prep-open/match-request', 'who': None, 'headers': {'Origin': 'http://localhost:9999'}})

# ---------------------------------------------------------------- Send request: the guard, the body
case('ask_signed_out', ask(who=None))
case('ask_without_an_origin', ask(headers={}))
case('ask_from_another_origin', ask(headers={'Origin': 'http://localhost:9999'}))
case('ask_not_json_is_forbidden', ask(headers={'Origin': ORIGIN, 'Content-Type': 'text/plain'}))
case('ask_a_player_who_is_not_on_the_roster', ask(mr(), who=GIL))
case('ask_for_doubles_with_anyone', ask(mr()))
case('ask_for_doubles_with_a_partner_and_opponents', ask(mr(partners=[SP(23)], opponents=[SP(20), SP(21)])))
case('ask_for_doubles_with_spots_left_open_as_null', ask(mr(partners=[None], opponents=[None, SP(20)])))
case('ask_for_singles_against_a_named_player', ask(mr(format='singles', opponents=[SP(20)])))
case('ask_for_singles_with_nothing_named', ask(mr(format='singles')))
case('ask_for_a_fun_game_that_is_allowed', ask(mr(format='fun_3v3', partners=[SP(20)], opponents=[SP(21)])), 'fun_requests_on')
case('ask_for_a_fun_game_that_is_not_allowed', ask(mr(format='fun_3v3')))
case('ask_for_a_format_that_does_not_exist', ask(mr(format='triples')))
case('ask_without_a_format', ask(mr(format='__missing__')))
case('ask_with_a_format_that_is_not_text', ask(mr(format=4)))
case('ask_without_a_request_id', ask(mr(requestId='__missing__')))
case('ask_with_a_request_id_that_is_not_a_uuid', ask(mr(requestId='x')))
case('ask_with_an_upper_case_request_id', ask(mr(requestId=RID(7).upper())))
case('ask_partners_that_are_not_a_list', ask(mr(partners='x')))
case('ask_partners_that_are_null', ask(mr(partners=None)))
case('ask_partners_with_an_id_that_is_not_a_uuid', ask(mr(partners=['x'])))
case('ask_opponents_with_a_number', ask(mr(opponents=[5])))
case('ask_too_many_partners_for_doubles', ask(mr(partners=[SP(23), SP(20)])))
case('ask_too_many_opponents_for_singles', ask(mr(format='singles', opponents=[SP(20), SP(21)])))
case('ask_for_the_same_player_twice', ask(mr(partners=[SP(23)], opponents=[SP(23)])))
case('ask_for_yourself_as_a_partner', ask(mr(partners=[SP(22)])))
case('ask_for_a_player_who_is_away', ask(mr(partners=[SP(5)])), 'ivy_away')
case('ask_for_a_player_who_is_not_on_the_roster', ask(mr(partners=[SP(99)])))
case('ask_for_a_player_in_another_session', ask(mr(partners=[SP(1)])))
case('ask_while_you_are_away', ask(mr()), 'ann_away')
case('ask_with_an_open_request_already', ask(mr(requestId=RID(2))), 'ann_has_an_open_request')
case('ask_closes_a_stale_request_first', ask(mr(requestId=RID(2))), 'ann_request_names_an_away_player')
case('ask_twice_with_the_same_request_id', [ask(mr()), ask(mr(format='singles'))])
case('ask_a_request_id_that_is_another_players', ask(mr(requestId=MR(3))), 's3_full_house')
case('ask_a_request_id_of_a_request_of_a_guest_in_the_session', ask(mr(requestId=MR(1))))
case('ask_a_request_id_of_your_own_request_again', ask(mr(requestId=MR(60))), 'ann_has_an_open_request')
case('ask_in_a_session_that_has_not_started', ask(mr(), PREP))
case('ask_in_a_finished_session', ask(mr(), 'last-week'))
case('ask_when_the_session_takes_no_requests', ask(mr()), 'requests_off')
case('ask_for_a_format_the_session_does_not_take', ask(mr()), 'only_singles_requests')
case('ask_for_the_format_the_session_takes', ask(mr(format='singles')), 'only_singles_requests')
case('ask_unknown_slug', ask(mr(), 'nope'))
case('ask_a_removed_public_page', ask(mr()), 's3_publication_deleted')
case('ask_another_players_request_is_untouched', [ask(mr(requestId=RID(3)), who=ANN), ask(mr(requestId=RID(4)), who=BEN)])
case('ask_two_at_once_same_request_id', {'parallel': [ask(mr(requestId=RID(5)))] * 2})
# Two different request ids at once: which wins is not decided; race_match_test.go.

# ---------------------------------------------------------------- Cancel my request
def cancel(slug=LIVE, who=ANN, **kw):
    return post(slug, 'match-request/cancel', who, {}, **kw)


case('cancel_signed_out', cancel(who=None))
case('cancel_without_an_origin', cancel(headers={}))
case('cancel_my_open_request', cancel(), 'ann_has_an_open_request')
case('cancel_twice', [cancel(), cancel()], 'ann_has_an_open_request')
case('cancel_with_no_request', cancel())
case('cancel_when_not_on_the_roster', cancel(who=GIL))
case('cancel_a_request_that_names_an_away_player_still_open', cancel(), 'ann_request_names_an_away_player')
case('cancel_after_sending', [ask(mr(partners=[SP(23)])), cancel()])
case('cancel_leaves_another_players_request', cancel(who=ANN), 'ann_and_ben_have_requests')
SCEN['ann_and_ben_have_requests'] = SCEN['ann_has_an_open_request'] + [
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('{MR(62)}', '{CLUB1}', '{S[3]}', '{SP(23)}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)"]
case('cancel_in_a_session_that_has_not_started', cancel(PREP))
case('cancel_unknown_slug', cancel('nope'))
case('cancel_a_removed_public_page', cancel(), 's3_publication_deleted')
case('cancel_two_at_once', {'parallel': [cancel()] * 2}, 'ann_has_an_open_request')

# ---------------------------------------------------------------- Move me to the waitlist
def down(slug=PREP, who=GIL, op=RID(20), **kw):
    body = {} if op is None else {'operationId': op}
    return post(slug, 'step-down', who, body, **kw)


case('step_down_signed_out', down(who=None), 'gil_on_s1')
case('step_down_without_an_origin', down(headers={}), 'gil_on_s1')
case('step_down_before_the_start', down(), 'gil_on_s1')
case('step_down_twice_with_one_operation', [down(), down()], 'gil_on_s1')
case('step_down_twice_with_two_operations', [down(), down(op=RID(21))], 'gil_on_s1')
case('step_down_without_an_operation_id', down(op=None), 'gil_on_s1')
case('step_down_when_not_on_the_roster', down(who=BEN), 'gil_on_s1')
case('step_down_a_session_that_finished', down('last-week'), 'gil_on_s1')
case('step_down_a_cancelled_session', down(), 'gil_cancelled')
SCEN['gil_cancelled'] = SCEN['gil_on_s1'] + [f"UPDATE queue_sessions SET state = 'cancelled', cancelled_at = {NOW} WHERE id = '{S[1]}'"]
case('step_down_on_a_live_session_whose_level_is_not_locked', down(LIVE, ANN), 'ann_in_nothing')
SCEN['ann_in_nothing'] = SCEN['s3_full_house']
case('step_down_while_in_a_waiting_match', down(LIVE, ANN), 'ann_in_a_waiting_match')
case('step_down_while_on_court', down(LIVE, ANN), 'ann_in_a_match_on_court')
case('step_down_with_a_removed_draft_only', down(LIVE, ANN), 'ann_in_a_removed_draft')
case('step_down_a_prepared_session_with_a_match_request_that_goes_stale', down(PREP, BEN), 'ben_on_s1')
case('step_down_unknown_slug', down('nope'), 'gil_on_s1')
case('step_down_a_removed_public_page_still_works', down(), 'gil_on_s1_publication_deleted')
SCEN['gil_on_s1_publication_deleted'] = SCEN['gil_on_s1'] + [
    f"INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, deleted_at, last_synced_at, created_at, updated_at) VALUES ('a3900000-0000-4000-8000-000000000001', '{CLUB1}', '{S[1]}', 'goneGoneGoneGone02', 'deleted', '{{}}', '[]', {NOW}, {NOW}, {NOW}, {NOW})"]
case('step_down_two_at_once_same_operation', {'parallel': [down()] * 2}, 'gil_on_s1')

SNAPSHOT = list(MATCH['snapshot'])
doc = {'now': MATCH['now'], 'app': 'player', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}
for c in cases:
    for st in c['steps']:
        for k in [k for k, v in st.items() if v is None and k != 'who']:
            del st[k]
        for p in st.get('parallel', []):
            for k in [k for k, v in p.items() if v is None and k != 'who']:
                del p[k]
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
assert {c['scenario'] for c in cases} <= set(SCEN), {c['scenario'] for c in cases} - set(SCEN)
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
