#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/match.cases.json: match control and the queue of waiting matches of the Queue app
(Put on court, Start match, Send back, Move court, Swap with the queue, Replace player, Substitute, Team wins / No result, Invalid,
Add match in its four sources, edit and remove a waiting match, reorder, Auto queue, Regenerate, and the Auto Queue fill a court
command triggers).

Run it, then the capture (capture-writes-queue.test.mjs -t match), which writes match.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-match-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/match.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/requests.cases.json')))
SCEN = dict(BASE['scenarios'])

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
CT = lambda n: f'a2c00000-0000-4000-8000-0000000000{n:02d}'
M = lambda n: f'a4000000-0000-4000-8000-0000000000{n:02d}'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
UNKNOWN = 'a4000000-0000-4000-8000-0000000000ff'
_op = [0]


def op_id(n=None):
    if n is None:
        _op[0] += 1
        n = _op[0]
    return f'b4000000-0000-4000-8000-{n:012d}'


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='s3_full_house', **kw):
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
RAND = {'match_court_usage': ['id', 'acquire_operation_id']}

FULL_HOUSE = SCEN['s3_full_house']


def match_sql(n, players, state='waiting', fmt='singles', pos=None, origin='manual', protected=False, courts=(), generation=None, decision=None):
    """A match of the live night. players is [(entry, team)]; an On court or Playing match takes the courts' holds and its players'."""
    mid = M(n)
    pos = n if pos is None else pos
    placed = state in ('on_court', 'active', 'completed', 'invalid')
    started = state in ('active', 'completed', 'invalid')
    out = [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, manual_protected, generation_id, source_operation_id, placed_at, started_at, ended_at, created_at, updated_at, revision) "
           f"VALUES ('{mid}', '{CLUB1}', '{S[3]}', {n}, '{state}', '{fmt}', {pos if state == 'waiting' else 'NULL'}, '{origin}', {'true' if protected else 'false'}, "
           f"{repr(generation) if generation else 'NULL'}, 'a4100000-0000-4000-8000-0000000000{n:02d}', "
           f"{NOW if placed else 'NULL'}, {NOW if started else 'NULL'}, {NOW if state in ('completed', 'invalid') else 'NULL'}, {NOW}, {NOW}, 1)"]
    sw = 'true' if started else 'false'
    fw = 'true' if state in ('completed', 'invalid') else 'false'
    for i, (sp, team) in enumerate(players):
        out.append(f"INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, joined_at, started_with_match, finished_with_match, created_at, updated_at) "
                   f"VALUES ('a4200000-0000-4000-8000-0000000{n:02d}{i:03d}', '{CLUB1}', '{S[3]}', '{mid}', '{SP(sp)}', '{team}', 1, 'a4300000-0000-4000-8000-0000000000{n:02d}', {NOW}, {sw}, {fw}, {NOW}, {NOW})")
    for court in courts:
        rel = f"{NOW}, 'a4300000-0000-4000-8000-0000000000{n:02d}'" if state in ('completed', 'invalid') else 'NULL, NULL'
        out.append(f"INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, acquire_operation_id, released_at, release_operation_id) VALUES "
                   f"('a4400000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[3]}', '{mid}', '{CT(court)}', {NOW}, 'a4300000-0000-4000-8000-0000000000{n:02d}', {rel})")
        if state in ('on_court', 'active'):
            out.append(f"INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES ('{CT(court)}', '{CLUB1}', '{S[3]}', '{mid}', {NOW})")
    if state in ('on_court', 'active'):
        for sp, _ in players:
            out.append(f"INSERT INTO active_player_holds (session_player_id, club_id, session_id, match_id, held_at) VALUES ('{SP(sp)}', '{CLUB1}', '{S[3]}', '{mid}', {NOW})")
    if decision:
        kind, winner, a, b = decision
        out.append(f"INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, accepted_at, actor_club_id) "
                   f"VALUES ('{mid}', '{CLUB1}', '{S[3]}', '{kind}', {repr(winner) if winner else 'NULL'}, {a if a is not None else 'NULL'}, {b if b is not None else 'NULL'}, 'a4300000-0000-4000-8000-0000000000{n:02d}', {NOW}, {NOW}, '{CLUB1}')")
    return out


AUTO = [f"UPDATE queue_sessions SET court_fill_mode = 'auto' WHERE id = '{S[3]}'"]
WM = [(20, 'A'), (21, 'B')], [(22, 'A'), (23, 'B')], [(4, 'A'), (6, 'B')]
DOUBLES = [(20, 'A'), (21, 'A'), (22, 'B'), (23, 'B')]

# One match On court (20 v 21 on Court 1), then two waiting (22 v 23, Hal v Jo).
SCEN['onc'] = FULL_HOUSE + match_sql(1, WM[0], 'on_court', courts=[3]) + match_sql(2, WM[1], pos=1) + match_sql(3, WM[2], pos=2)
SCEN['onc_auto'] = SCEN['onc'] + AUTO
# One Playing (20 v 21 on Court 1), then two waiting.
SCEN['play'] = FULL_HOUSE + match_sql(1, WM[0], 'active', courts=[3]) + match_sql(2, WM[1], pos=1) + match_sql(3, WM[2], pos=2)
SCEN['play_auto'] = SCEN['play'] + AUTO
SCEN['play_record_off'] = SCEN['play'] + [f"UPDATE queue_sessions SET record_games = false WHERE id = '{S[3]}'"]
SCEN['play_record_off_auto'] = SCEN['play_record_off'] + AUTO
# Two Playing: Court 1 and Court 2, then one waiting.
SCEN['play2'] = FULL_HOUSE + match_sql(1, WM[0], 'active', courts=[3]) + match_sql(2, WM[1], 'active', courts=[4]) + match_sql(3, WM[2], pos=1)
SCEN['play2_auto'] = SCEN['play2'] + AUTO
# A doubles match Playing, with Hal, Ivy and Jo free to come in; and the same On court.
SCEN['play_doubles'] = FULL_HOUSE + match_sql(1, DOUBLES, 'active', 'doubles', courts=[3])
SCEN['onc_doubles'] = FULL_HOUSE + match_sql(1, DOUBLES, 'on_court', 'doubles', courts=[3])
# A match that already ended: completed with a winner, and invalid.
SCEN['done'] = FULL_HOUSE + match_sql(1, WM[0], 'completed', decision=('completed', 'A', 21, 15)) + match_sql(2, WM[1], pos=1)
SCEN['done_winner_only'] = FULL_HOUSE + match_sql(1, WM[0], 'completed', decision=('completed', 'B', None, None))
SCEN['done_invalid'] = FULL_HOUSE + match_sql(1, WM[0], 'invalid', decision=('invalid', None, None, None))
# A removed draft keeps its number.
SCEN['removed'] = SCEN['s3_waiting_matches'] + [f"UPDATE matches SET removed_at = {NOW}, queue_position = NULL WHERE id = '{M(2)}'"]
SCEN['wait_protected_attention'] = FULL_HOUSE + match_sql(1, WM[0], protected=True) + match_sql(2, WM[1], pos=2, origin='auto') + match_sql(3, WM[2], pos=3, origin='suggested') + [
    f"UPDATE session_players SET present = false WHERE id = '{SP(20)}'"]
SCEN['wait_manual_healthy'] = FULL_HOUSE + match_sql(1, WM[0], protected=True) + match_sql(2, WM[1], pos=2, origin='auto')
SCEN['wait_all_protected'] = FULL_HOUSE + match_sql(1, WM[0], protected=True) + match_sql(2, WM[1], pos=2, protected=True)
SCEN['only_two_present'] = [f"UPDATE session_players SET present = (id IN ('{SP(4)}', '{SP(6)}'))"]
SCEN['one_present'] = [f"UPDATE session_players SET present = (id = '{SP(4)}')"]
SCEN['no_singles'] = FULL_HOUSE + [f"UPDATE queue_sessions SET allow_singles = false WHERE id = '{S[3]}'"]
SCEN['no_doubles'] = SCEN['s3_full_house_no_doubles']
SCEN['neither_format'] = FULL_HOUSE + [f"UPDATE queue_sessions SET allow_singles = false, allow_doubles = false WHERE id = '{S[3]}'"]
SCEN['mode_chill'] = FULL_HOUSE + [f"UPDATE queue_sessions SET session_mode = 'chill' WHERE id = '{S[3]}'"]
SCEN['mode_hard'] = FULL_HOUSE + match_sql(1, WM[0]) + match_sql(2, WM[1], pos=2) + [f"UPDATE queue_sessions SET session_mode = 'hard' WHERE id = '{S[3]}'"]
SCEN['full_house_played'] = SCEN['s3_full_house_games']
SCEN['away_player'] = FULL_HOUSE + [f"UPDATE session_players SET present = false WHERE id = '{SP(21)}'"]
SCEN['onc_player_away'] = SCEN['onc'] + [f"UPDATE session_players SET present = false WHERE id = '{SP(21)}'"]
# Court 2 is not open until later, and a fourth court exists for the Add court cases.
SCEN['onc_court_2_closed'] = SCEN['onc'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(4)}'"]
SCEN['wait_auto_court_2_closed'] = SCEN['s3_waiting_matches_court_closed_auto'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(4)}'"]
SCEN['wait_auto_both_closed'] = SCEN['s3_waiting_matches_court_closed_auto'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(4)}'"]
SCEN['wait_auto_court_free'] = SCEN['s3_waiting_matches_auto'] + [
    f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, manual_protected, source_operation_id, placed_at, started_at, ended_at, created_at, updated_at, revision) VALUES ('{M(9)}', '{CLUB1}', '{S[3]}', 9, 'completed', 'singles', NULL, 'manual', false, 'a4100000-0000-4000-8000-000000000009', {NOW}, {NOW}, {NOW}, {NOW}, {NOW}, 1)"]


def q(n=1):
    return str(n)


P = f'/api/sessions/{S[3]}'


def post(path, body=None, **kw):
    return req('POST', f'{P}{path}', body, **kw)


def lineup(fmt, a, b):
    return {'format': fmt, 'teamA': [SP(i) for i in a], 'teamB': [SP(i) for i in b]}


# ------------------------------------------------------------------ Put on court
def place(m, courts, op=None, **kw):
    return post(f'/matches/{m}/place', {'operationId': op or op_id(), 'courtIds': [CT(c) for c in courts]}, **kw)


case('place_signed_out', place(M(1), [3], who=None), 's3_waiting_matches')
case('place_body_not_json', post(f'/matches/{M(1)}/place', rawBody='nope'), 's3_waiting_matches')
case('place_a_waiting_match', place(M(1), [3]), 's3_waiting_matches')
case('place_on_the_second_court', place(M(1), [4]), 's3_waiting_matches')
case('place_twice_same_operation', [place(M(1), [3], op_id(90)), place(M(1), [3], op_id(90))], 's3_waiting_matches')
case('place_then_the_other_on_the_busy_court', [place(M(1), [3], op_id(91)), place(M(2), [3], op_id(92))], 's3_waiting_matches')
SCEN['onc_busy'] = SCEN['onc'] + match_sql(4, [(20, 'A'), (5, 'B')], pos=3)
case('place_with_a_busy_player', place(M(4), [4]), 'onc_busy')
case('place_on_a_held_court', place(M(3), [3]), 'onc')
case('place_without_courts', place(M(1), []), 's3_waiting_matches')
case('place_courts_that_are_not_text_are_dropped', post(f'/matches/{M(1)}/place', {'operationId': op_id(), 'courtIds': [5, None, CT(3)]}), 's3_waiting_matches')
case('place_on_an_unknown_court', place(M(1), [7]), 's3_waiting_matches')
case('place_on_a_court_not_open_yet', place(M(1), [3]), 's3_waiting_matches_court_closed')
case('place_unknown_match', place(UNKNOWN, [3]), 's3_waiting_matches')
case('place_malformed_match_id', place('m', [3]), 's3_waiting_matches', **MALFORMED)
case('place_malformed_session_id', req('POST', '/api/sessions/m/matches/' + M(1) + '/place', {'operationId': op_id(), 'courtIds': [CT(3)]}), 's3_waiting_matches', **MALFORMED)
case('place_a_playing_match', place(M(1), [4]), 'play')
case('place_a_removed_draft', place(M(2), [3]), 'removed')
case('place_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/{M(1)}/place', {'operationId': op_id(), 'courtIds': [CT(1)]}))
case('place_on_another_clubs_session', req('POST', f'/api/sessions/{S[9]}/matches/{M(1)}/place', {'operationId': op_id(), 'courtIds': [CT(9)]}))
case('place_on_a_lapsed_clubs_live_session', req('POST', f'/api/sessions/{S[8]}/matches/{M(1)}/place', {'operationId': op_id(), 'courtIds': [CT(8)]}, who=LAPSED))
case('place_missing_operation_id', post(f'/matches/{M(1)}/place', {'courtIds': [CT(3)]}), 's3_waiting_matches', **BADOP)
# Two different operations placing one match: which wins is not decided; race_match_test.go.
case('place_two_at_once_same_operation', {'parallel': [place(M(1), [3], op_id(93)), place(M(1), [3], op_id(93))]}, 's3_waiting_matches')

# ------------------------------------------------------------------ Start match
def start(m, courts=None, op=None, **kw):
    body = {'operationId': op or op_id()}
    if courts is not None:
        body['courtIds'] = [CT(c) for c in courts]
    return post(f'/matches/{m}/start', body, **kw)


case('start_signed_out', start(M(1), who=None), 'onc')
case('start_an_on_court_match', start(M(1)), 'onc')
case('start_an_on_court_match_twice', [start(M(1), op=op_id(80)), start(M(1), op=op_id(81))], 'onc')
case('start_an_on_court_match_naming_its_court', start(M(1), [3]), 'onc')
case('start_a_playing_match_naming_another_court', start(M(1), [4]), 'play')
case('start_a_playing_match', start(M(1)), 'play')
case('start_with_a_player_away', start(M(1)), 'onc_player_away')
case('start_a_waiting_match_in_one_step', start(M(1), [3]), 's3_waiting_matches')
case('start_a_waiting_match_in_one_step_twice', [start(M(1), [3], op_id(82)), start(M(1), [3], op_id(82))], 's3_waiting_matches')
case('start_a_waiting_match_without_courts', start(M(1)), 's3_waiting_matches')
case('start_a_waiting_match_on_a_held_court', start(M(3), [3]), 'onc')
case('start_a_finished_match', start(M(1)), 'done')
case('start_unknown_match', start(UNKNOWN), 'onc')
case('start_courts_that_are_not_text_are_dropped', post(f'/matches/{M(1)}/start', {'operationId': op_id(), 'courtIds': [3, CT(3)]}), 's3_waiting_matches')
case('start_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/{M(1)}/start', {'operationId': op_id()}))
case('start_two_at_once', {'parallel': [start(M(1), op=op_id(83)), start(M(1), op=op_id(84))]}, 'onc')

# ------------------------------------------------------------------ Send back to the queue
def send_back(m, op=None, **kw):
    return post(f'/matches/{m}/send-back', {'operationId': op or op_id()}, **kw)


case('send_back_signed_out', send_back(M(1), who=None), 'onc')
case('send_back_an_on_court_match', send_back(M(1)), 'onc')
case('send_back_twice_same_operation', [send_back(M(1), op_id(70)), send_back(M(1), op_id(70))], 'onc')
case('send_back_in_auto_queue_refills_the_court', send_back(M(1)), 'onc_auto')
case('send_back_a_waiting_match', send_back(M(2)), 'onc')
case('send_back_a_playing_match', send_back(M(1)), 'play')
case('send_back_unknown_match', send_back(UNKNOWN), 'onc')
case('send_back_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/{M(1)}/send-back', {'operationId': op_id()}))
case('send_back_then_place_again_takes_the_usage_up', [send_back(M(1), op_id(71)), place(M(1), [3], op_id(72))], 'onc')

# ------------------------------------------------------------------ Move to another court
def move(m, courts, op=None, **kw):
    return post(f'/matches/{m}/move', {'operationId': op or op_id(), 'courtIds': [CT(c) for c in courts]}, **kw)


case('move_signed_out', move(M(1), [4], who=None), 'onc')
case('move_to_a_free_court', move(M(1), [4]), 'onc')
case('move_twice_same_operation', [move(M(1), [4], op_id(60)), move(M(1), [4], op_id(60))], 'onc')
case('move_back_to_a_court_it_used', [move(M(1), [4], op_id(61)), move(M(1), [3], op_id(62))], 'onc')
case('move_in_auto_queue_refills_the_court_it_left', move(M(1), [4]), 'onc_auto')
case('move_to_a_court_not_open_yet', move(M(1), [4]), 'onc_court_2_closed')
case('move_to_a_held_court', move(M(1), [4]), 'play2')
case('move_a_playing_match', move(M(1), [4]), 'play')
case('move_a_waiting_match', move(M(2), [4]), 'onc')
case('move_without_courts', move(M(1), []), 'onc')
case('move_unknown_match', move(UNKNOWN, [4]), 'onc')

# ------------------------------------------------------------------ Swap with the queue
def swap(m, other, op=None, **kw):
    return post(f'/matches/{m}/swap', {'operationId': op or op_id(), 'withMatchId': other}, **kw)


case('swap_signed_out', swap(M(1), M(2), who=None), 'onc')
case('swap_with_the_next_waiting_match', swap(M(1), M(2)), 'onc')
case('swap_twice_same_operation', [swap(M(1), M(2), op_id(50)), swap(M(1), M(2), op_id(50))], 'onc')
case('swap_with_a_match_that_is_not_the_target', swap(M(1), M(3)), 'onc')
case('swap_with_an_unknown_match', swap(M(1), UNKNOWN), 'onc')
case('swap_without_a_target_id', post(f'/matches/{M(1)}/swap', {'operationId': op_id()}), 'onc')
case('swap_a_waiting_match', swap(M(2), M(3)), 'onc')
case('swap_a_playing_match', swap(M(1), M(2)), 'play')
case('swap_unknown_match', swap(UNKNOWN, M(2)), 'onc')

# ------------------------------------------------------------------ Replace player
def replace(m, out, into, op=None, **kw):
    return post(f'/matches/{m}/replace', {'operationId': op or op_id(), 'outId': SP(out), 'inId': SP(into)}, **kw)


case('replace_signed_out', replace(M(1), 20, 22, who=None), 'onc')
case('replace_on_an_on_court_match', replace(M(1), 20, 22), 'onc')
case('replace_on_an_on_court_match_twice', [replace(M(1), 20, 22, op_id(40)), replace(M(1), 20, 22, op_id(40))], 'onc')
case('replace_on_a_playing_match', replace(M(1), 21, 22), 'play')
case('replace_on_a_playing_match_twice', [replace(M(1), 21, 22, op_id(41)), replace(M(1), 21, 22, op_id(42))], 'play')
case('replace_on_a_playing_match_after_a_substitution', [post(f'/matches/{M(1)}/substitution', {'operationId': op_id(43), 'outId': SP(21), 'inId': SP(4), 'creditTo': 'incoming'}), replace(M(1), 4, 5, op_id(44))], 'play')
case('replace_the_incoming_player_is_busy', replace(M(1), 20, 23), 'play2')
case('replace_the_outgoing_player_is_not_in_the_lineup', replace(M(1), 22, 4), 'onc')
case('replace_with_a_player_already_in_the_lineup', replace(M(1), 20, 21), 'onc')
case('replace_with_a_player_who_is_not_on_the_roster', post(f'/matches/{M(1)}/replace', {'operationId': op_id(), 'outId': SP(20), 'inId': SP(99)}), 'onc')
case('replace_a_waiting_match', replace(M(2), 22, 4), 'onc')
case('replace_a_finished_match', replace(M(1), 20, 4), 'done')
case('replace_unknown_match', replace(UNKNOWN, 20, 4), 'onc')

# ------------------------------------------------------------------ Substitute
def sub(m, out, into, credit=None, op=None, **kw):
    body = {'operationId': op or op_id(), 'outId': SP(out), 'inId': SP(into)}
    if credit is not None:
        body['creditTo'] = credit
    return post(f'/matches/{m}/substitution', body, **kw)


case('substitute_signed_out', sub(M(1), 20, 4, who=None), 'play_doubles')
case('substitute_with_no_credit', sub(M(1), 20, 4), 'play_doubles')
case('substitute_crediting_the_incoming_player', sub(M(1), 20, 4, 'incoming'), 'play_doubles')
case('substitute_crediting_the_outgoing_player', sub(M(1), 20, 4, 'outgoing'), 'play_doubles')
case('substitute_credit_none_named', sub(M(1), 20, 4, 'none'), 'play_doubles')
case('substitute_twice_same_operation', [sub(M(1), 20, 4, 'incoming', op_id(30)), sub(M(1), 20, 4, 'incoming', op_id(30))], 'play_doubles')
case('substitute_a_second_time_in_the_slot_moves_the_credit', [sub(M(1), 20, 4, 'incoming', op_id(31)), sub(M(1), 4, 5, 'incoming', op_id(32))], 'play_doubles')
case('substitute_a_second_time_without_credit_keeps_the_first', [sub(M(1), 20, 4, 'outgoing', op_id(33)), sub(M(1), 4, 5, None, op_id(34))], 'play_doubles')
case('substitute_the_player_who_left_comes_back', [sub(M(1), 20, 4, None, op_id(35)), sub(M(1), 4, 20, None, op_id(36))], 'play_doubles')
case('substitute_unknown_credit', sub(M(1), 20, 4, 'both'), 'play_doubles')
case('substitute_unknown_credit_is_checked_before_the_match', sub(UNKNOWN, 20, 4, 'both'), 'play_doubles')
case('substitute_credit_null_is_none', post(f'/matches/{M(1)}/substitution', {'operationId': op_id(), 'outId': SP(20), 'inId': SP(4), 'creditTo': None}), 'play_doubles')
case('substitute_an_on_court_match', sub(M(1), 20, 4), 'onc_doubles')
case('substitute_an_incoming_player_who_is_busy', sub(M(1), 20, 23), 'play2')
case('substitute_a_player_who_is_not_in_the_lineup', sub(M(1), 4, 5), 'play_doubles')
case('substitute_a_decided_match', sub(M(1), 20, 4), 'done')
case('substitute_unknown_match', sub(UNKNOWN, 20, 4), 'play_doubles')

# ------------------------------------------------------------------ Team wins / no result
def result(m, winner=None, a=None, b=None, op=None, hold=None, raw=None, **kw):
    body = {'operationId': op or op_id()}
    if winner is not None:
        body['winningTeam'] = winner
    if a is not None:
        body['teamAScore'] = a
    if b is not None:
        body['teamBScore'] = b
    if hold is not None:
        body['holdCourtId'] = CT(hold)
    return post(f'/matches/{m}/result', raw if raw is not None else body, **kw)


case('result_signed_out', result(M(1), 'A', who=None), 'play')
case('result_team_a_wins', result(M(1), 'A'), 'play')
case('result_team_b_wins', result(M(1), 'B'), 'play')
case('result_with_scores', result(M(1), None, 21, 15), 'play')
case('result_with_scores_and_the_matching_winner', result(M(1), 'B', 11, 21), 'play')
case('result_scores_that_tie', result(M(1), None, 15, 15), 'play')
case('result_scores_that_disagree_with_the_winner', result(M(1), 'B', 21, 15), 'play')
case('result_one_score_only', result(M(1), 'A', 21, None), 'play')
case('result_a_fractional_score', result(M(1), None, 21.5, 10), 'play')
# A score beyond a 32-bit integer: Prisma refuses the value (a 500). Ported as is.
case('result_a_score_beyond_a_32_bit_integer', result(M(1), None, 2147483648, 3), 'play', allow500=True)
case('result_a_negative_score', result(M(1), None, -1, 10), 'play')
case('result_without_a_winner', result(M(1)), 'play')
case('result_an_unknown_winner', result(M(1), 'C'), 'play')
case('result_the_check_comes_before_the_match_lookup', result(UNKNOWN), 'play')
case('result_twice_same_operation', [result(M(1), 'A', None, None, op_id(20)), result(M(1), 'A', None, None, op_id(20))], 'play')
case('result_an_agreeing_confirmation_from_another_operation', [result(M(1), 'A', 21, 15, op_id(21)), result(M(1), 'A', 21, 15, op_id(22))], 'play')
case('result_a_contradicting_confirmation_is_quarantined', [result(M(1), 'A', None, None, op_id(23)), result(M(1), 'B', None, None, op_id(24))], 'play')
case('result_on_an_already_decided_match', result(M(1), 'B', 11, 21), 'done')
case('result_winner_only_decided_then_scores', result(M(1), None, 21, 15), 'done_winner_only')
case('result_an_invalid_match_asked_for_a_win', result(M(1), 'A'), 'done_invalid')
case('result_an_on_court_match', result(M(1), 'A'), 'onc')
case('result_a_waiting_match', result(M(2), 'A'), 'onc')
case('result_unknown_match', result(UNKNOWN, 'A'), 'play')
case('result_in_auto_queue_refills_the_freed_court', result(M(1), 'A'), 'play_auto')
case('result_in_auto_queue_leaves_the_held_court_free', result(M(1), 'A', hold=3), 'play_auto')
case('result_in_auto_queue_hold_court_that_is_not_text', post(f'/matches/{M(1)}/result', {'operationId': op_id(), 'winningTeam': 'A', 'holdCourtId': 3}), 'play_auto')
case('result_with_record_games_off_keeps_no_winner', result(M(1), 'A', 21, 15), 'play_record_off')
case('result_with_record_games_off_needs_no_winner', result(M(1)), 'play_record_off')
case('result_with_record_games_off_ignores_a_bad_score', result(M(1), None, 3, 3), 'play_record_off')
case('result_with_record_games_off_twice', [result(M(1), None, None, None, op_id(25)), result(M(1), 'A', None, None, op_id(26))], 'play_record_off')
case('result_with_record_games_off_in_auto_queue', result(M(1)), 'play_record_off_auto')
case('result_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/{M(1)}/result', {'operationId': op_id(), 'winningTeam': 'A'}))
case('result_two_at_once_same_operation', {'parallel': [result(M(1), 'A', None, None, op_id(27)), result(M(1), 'A', None, None, op_id(27))]}, 'play')
# Two results that disagree at once: which wins is not decided; race_match_test.go.

# ------------------------------------------------------------------ Invalid (a match)
def minvalid(m, op=None, **kw):
    return post(f'/matches/{m}/invalid', {'operationId': op or op_id()}, **kw)


case('invalid_signed_out', minvalid(M(1), who=None), 'play')
case('invalid_a_playing_match', minvalid(M(1)), 'play')
case('invalid_twice_same_operation', [minvalid(M(1), op_id(10)), minvalid(M(1), op_id(10))], 'play')
case('invalid_twice_other_operation_agrees', [minvalid(M(1), op_id(11)), minvalid(M(1), op_id(12))], 'play')
case('invalid_after_a_win_is_quarantined', minvalid(M(1)), 'done')
case('invalid_then_a_win_is_quarantined', [minvalid(M(1), op_id(13)), result(M(1), 'A', None, None, op_id(14))], 'play')
case('invalid_an_on_court_match', minvalid(M(1)), 'onc')
case('invalid_a_waiting_match', minvalid(M(2)), 'onc')
case('invalid_in_auto_queue_refills_the_freed_court', minvalid(M(1)), 'play_auto')
case('invalid_with_record_games_off', minvalid(M(1)), 'play_record_off')
case('invalid_unknown_match', minvalid(UNKNOWN), 'play')

# ------------------------------------------------------------------ Add match: manual, selection, suggested and Auto queue drafts
def add(body, **kw):
    return post('/matches', body, **kw)


def manual(fmt, a, b, op=None, **kw):
    return add({'operationId': op or op_id(), 'lineup': lineup(fmt, a, b)}, **kw)


case('add_signed_out', manual('singles', [20], [21], who=None))
case('add_body_not_json', post('/matches', rawBody='nope'))
case('add_a_manual_singles_match', manual('singles', [20], [21]), 'full_house_played')
case('add_a_manual_doubles_match', manual('doubles', [20, 21], [22, 23]))
case('add_a_manual_fun_match', manual('fun_3v3', [20, 21, 22], [23, 4, 5]), 'mode_chill')
case('add_after_two_waiting_matches', manual('singles', [20], [21]), 's3_waiting_matches')
case('add_after_a_removed_draft_keeps_the_numbers', manual('singles', [20], [21]), 'removed')
case('add_twice_same_operation', [manual('singles', [20], [21], op_id(5)), manual('singles', [20], [21], op_id(5))])
case('add_the_same_operation_with_another_lineup_returns_the_stored_match', [manual('singles', [20], [21], op_id(6)), manual('singles', [22], [23], op_id(6))])
case('add_a_player_who_is_away', manual('singles', [20], [21]), 'away_player')
case('add_a_player_who_is_not_on_the_roster', add({'operationId': op_id(), 'lineup': {'format': 'singles', 'teamA': [SP(20)], 'teamB': [SP(99)]}}))
case('add_an_incomplete_lineup', manual('doubles', [20, 21], [22]))
case('add_a_lineup_that_repeats_a_player', manual('doubles', [20, 21], [21, 22]))
case('add_singles_when_singles_is_off', manual('singles', [20], [21]), 'no_singles')
case('add_doubles_when_doubles_is_off', manual('doubles', [20, 21], [22, 23]), 'no_doubles')
case('add_without_a_lineup', add({'operationId': op_id()}))
case('add_a_lineup_with_an_unknown_format', add({'operationId': op_id(), 'lineup': {'format': 'triples', 'teamA': [], 'teamB': []}}))
case('add_a_lineup_whose_team_is_not_a_list', add({'operationId': op_id(), 'lineup': {'format': 'singles', 'teamA': SP(20), 'teamB': [SP(21)]}}))
case('add_a_lineup_with_ids_that_are_not_text', add({'operationId': op_id(), 'lineup': {'format': 'singles', 'teamA': [1], 'teamB': [SP(21)]}}))
case('add_malformed_operation_id', manual('singles', [20], [21], 'x'), allow500=True, goExpects={'status': 422, 'code': 'invalid'})
case('add_missing_operation_id', add({'lineup': lineup('singles', [20], [21])}), allow500=True, goExpects={'status': 422, 'code': 'invalid'})
case('add_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches', {'operationId': op_id(), 'lineup': lineup('singles', [1], [1])}))
case('add_in_auto_queue_places_it_on_a_free_court', manual('singles', [20], [21]), 'full_house_auto_ready', redact=RAND)
case('add_in_auto_queue_twice_does_not_fill_again', [manual('singles', [20], [21], op_id(7)), manual('singles', [20], [21], op_id(7))], 'full_house_auto_ready', redact=RAND)
case('add_in_auto_queue_when_every_court_is_busy', manual('singles', [4], [6]), 'play2_auto', redact=RAND)
SCEN['full_house_auto_ready'] = FULL_HOUSE + AUTO
case('add_two_at_once_same_operation', {'parallel': [manual('singles', [20], [21], op_id(8)), manual('singles', [20], [21], op_id(8))]})

SEL = lambda ids: [SP(i) for i in ids]
case('make_match_from_two_players', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 6])}), 'full_house_played')
case('make_match_from_four_players_balances_the_teams', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 6, 5])}))
case('make_match_from_three_players_is_a_fun_game', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 6, 5])}))
case('make_match_from_six_players', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23, 6, 5])}))
case('make_match_with_the_arranged_lineup', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23]), 'lineup': lineup('doubles', [20, 22], [21, 23])}))
case('make_match_whose_lineup_changed_the_format', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23]), 'lineup': lineup('singles', [20], [21])}))
case('make_match_whose_lineup_misses_a_selected_player', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23]), 'lineup': lineup('doubles', [20, 21], [22, 4])}))
case('make_match_whose_lineup_is_malformed', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21]), 'lineup': {'format': 'singles'}}))
case('make_match_from_one_player', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20])}))
case('make_match_from_five_players', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23, 6])}))
case('make_match_without_a_selection', add({'operationId': op_id(), 'source': 'selection'}))
case('make_match_selection_ids_that_are_not_text_are_dropped', add({'operationId': op_id(), 'source': 'selection', 'selection': [SP(20), 5, SP(21)]}))
case('make_match_singles_when_singles_is_off', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 6])}), 'no_singles')
case('make_match_doubles_when_doubles_is_off', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21, 22, 23])}), 'no_doubles')
case('make_match_with_a_player_who_is_not_available', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 99])}))
case('make_match_with_a_player_who_is_away_is_still_available', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 21])}), 'away_player')
case('make_match_twice_same_operation', [add({'operationId': op_id(3), 'source': 'selection', 'selection': SEL([20, 6])}), add({'operationId': op_id(3), 'source': 'selection', 'selection': SEL([20, 6])})])
case('make_match_in_auto_queue', add({'operationId': op_id(), 'source': 'selection', 'selection': SEL([20, 6])}), 'full_house_auto_ready', redact=RAND)

SUG = lambda op=None, qr='1', r='12', sw=None, l=None: add({'operationId': op or op_id(), 'source': 'suggested', 'lineup': l or lineup('singles', [20], [21]), 'switched': sw, 'expectedQueueRevision': qr, 'expectedRevision': r})
case('suggested_match', SUG())
case('suggested_match_switched_is_protected', SUG(sw=True))
case('suggested_match_switched_that_is_not_true_is_unprotected', SUG(sw='yes'))
case('suggested_match_stale_queue_revision', SUG(qr='0'))
case('suggested_match_stale_session_revision', SUG(r='11'))
case('suggested_match_revision_that_is_not_a_number', SUG(qr='abc'))
case('suggested_match_missing_revisions', add({'operationId': op_id(), 'source': 'suggested', 'lineup': lineup('singles', [20], [21])}))
case('suggested_match_two_at_once_at_one_revision', {'parallel': [SUG(op_id(11))] * 2})
case('suggested_match_twice_same_operation', [SUG(op_id(4)), SUG(op_id(4), qr='2')])
case('suggested_match_fun_format_is_refused', SUG(l=lineup('fun_3v3', [20, 21, 22], [23, 4, 5])))
case('suggested_match_in_auto_queue', SUG(), 'full_house_auto_ready', redact=RAND)

DRAFT = lambda mode='available', op=None, l=None: {'operationId': op or op_id(), 'mode': mode, 'lineup': l or lineup('singles', [20], [21])}
DRAFTS = lambda ds, qr='1', r='12': add({'source': 'auto', 'drafts': ds, 'expectedQueueRevision': qr, 'expectedRevision': r})
case('drafts_one', DRAFTS([DRAFT()]))
case('drafts_two_keep_their_order', DRAFTS([DRAFT('fewest', None, lineup('singles', [22], [23])), DRAFT('wait', None, lineup('doubles', [20, 21], [4, 6]))]))
case('drafts_twice_returns_the_stored_matches', [DRAFTS([DRAFT('available', op_id(100))]), DRAFTS([DRAFT('available', op_id(100))], qr='5', r='5')])
case('drafts_only_one_of_two_was_added_is_a_conflict', [DRAFTS([DRAFT('available', op_id(101))]), DRAFTS([DRAFT('available', op_id(101)), DRAFT('available', op_id(102))])])
case('drafts_two_at_once_same_drafts', {'parallel': [DRAFTS([DRAFT('available', op_id(104))])] * 2})
case('drafts_stale_queue_revision', DRAFTS([DRAFT()], qr='0'))
case('drafts_stale_session_revision', DRAFTS([DRAFT()], r='11'))
case('drafts_empty', DRAFTS([]))
case('drafts_not_a_list', add({'source': 'auto', 'drafts': 'x', 'expectedQueueRevision': '1', 'expectedRevision': '12'}))
case('drafts_more_than_thirty', DRAFTS([DRAFT('available', op_id(200 + i)) for i in range(31)]))
case('drafts_without_an_operation_id', DRAFTS([{'mode': 'available', 'lineup': lineup('singles', [20], [21])}]))
case('drafts_with_a_blank_operation_id', DRAFTS([{'operationId': '  ', 'mode': 'available', 'lineup': lineup('singles', [20], [21])}]))
case('drafts_with_an_unknown_mode', DRAFTS([DRAFT('nope')]))
case('drafts_with_a_malformed_lineup', DRAFTS([{'operationId': op_id(), 'mode': 'available', 'lineup': {}}]))
case('drafts_that_repeat_an_operation_id', DRAFTS([DRAFT('available', op_id(103)), DRAFT('wait', op_id(103), lineup('singles', [22], [23]))]))
case('drafts_a_player_who_is_away_conflicts', DRAFTS([DRAFT()]), 'away_player')
case('drafts_a_player_who_is_not_on_the_roster', DRAFTS([DRAFT('available', None, lineup('singles', [20], [99]))]))
case('drafts_a_player_who_is_playing_conflicts', DRAFTS([DRAFT('available', None, lineup('singles', [22], [23]))]), 'play2')
case('drafts_a_player_who_is_playing_is_fine_when_planning_ahead', DRAFTS([DRAFT('ahead', None, lineup('singles', [22], [23]))]), 'play2')
case('drafts_a_fun_format_conflicts', DRAFTS([DRAFT('available', None, lineup('fun_3v3', [20, 21, 22], [23, 4, 5]))]))
case('drafts_an_incomplete_lineup_conflicts', DRAFTS([DRAFT('available', None, lineup('doubles', [20, 21], [22]))]))
case('drafts_singles_when_singles_is_off_conflicts', DRAFTS([DRAFT()]), 'no_singles')
case('drafts_doubles_when_doubles_is_off_conflicts', DRAFTS([DRAFT('available', None, lineup('doubles', [20, 21], [22, 23]))]), 'no_doubles')
case('drafts_a_player_with_a_club_nickname_is_named_by_it', DRAFTS([DRAFT()]), 'away_player_nicknamed')
SCEN['away_player_nicknamed'] = SCEN['away_player'] + [f"UPDATE club_players SET nickname = '  Gail Club  ' WHERE id = 'c6000000-0000-4000-8000-000000000002'"]
case('drafts_in_auto_queue', DRAFTS([DRAFT(), DRAFT('wait', None, lineup('singles', [22], [23]))]), 'full_house_auto_ready', redact=RAND)

# ------------------------------------------------------------------ Edit and remove a waiting match, reorder
def edit(m, body, **kw):
    return req('PATCH', f'{P}/matches/{m}', body, **kw)


def remove(m, body=None, **kw):
    return req('DELETE', f'{P}/matches/{m}', {} if body is None else body, **kw)


case('edit_signed_out', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}, who=None), 's3_waiting_matches')
case('edit_switch_sides', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('edit_to_other_players_and_a_new_format', edit(M(1), {'operationId': op_id(), 'lineup': lineup('doubles', [20, 21], [4, 6]), 'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('edit_stale_queue_revision', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '0'}), 's3_waiting_matches')
case('edit_queue_revision_that_is_not_a_number', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': 'x'}), 's3_waiting_matches')
case('edit_without_a_queue_revision', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20])}), 's3_waiting_matches')
case('edit_a_malformed_lineup', edit(M(1), {'operationId': op_id(), 'lineup': {}, 'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('edit_to_a_player_who_is_away', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [20], [21]), 'expectedQueueRevision': '1'}), 'away_waiting_21')
SCEN['away_waiting_21'] = SCEN['s3_waiting_matches'] + [f"UPDATE session_players SET present = false WHERE id = '{SP(21)}'"]
case('edit_a_fun_game_manually', edit(M(1), {'operationId': op_id(), 'lineup': lineup('fun_3v3', [20, 21, 22], [23, 4, 5]), 'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('edit_an_on_court_match', edit(M(1), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}), 'onc')
case('edit_a_removed_draft', edit(M(2), {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}), 'removed')
case('edit_unknown_match', edit(UNKNOWN, {'operationId': op_id(), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('edit_missing_operation_id', edit(M(1), {'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'}), 's3_waiting_matches', **BADOP)
case('edit_two_at_once_at_one_revision', {'parallel': [edit(M(1), {'operationId': op_id(95), 'lineup': lineup('singles', [21], [20]), 'expectedQueueRevision': '1'})] * 2}, 's3_waiting_matches')

case('remove_signed_out', remove(M(1), who=None), 's3_waiting_matches')
case('remove_a_waiting_match', remove(M(2)), 's3_waiting_matches')
case('remove_a_waiting_match_at_the_queue_revision', remove(M(2), {'expectedQueueRevision': '1'}), 's3_waiting_matches')
case('remove_stale_queue_revision', remove(M(2), {'expectedQueueRevision': '0'}), 's3_waiting_matches')
case('remove_queue_revision_that_is_not_a_number', remove(M(2), {'expectedQueueRevision': 'x'}), 's3_waiting_matches')
case('remove_queue_revision_that_is_not_text_is_ignored', remove(M(2), {'expectedQueueRevision': 1}), 's3_waiting_matches')
case('remove_twice_is_a_no_op', [remove(M(2)), remove(M(2))], 's3_waiting_matches')
case('remove_a_draft_already_removed', remove(M(2)), 'removed')
case('remove_an_on_court_match', remove(M(1)), 'onc')
case('remove_unknown_match', remove(UNKNOWN), 's3_waiting_matches')
case('remove_without_a_body', req('DELETE', f'{P}/matches/{M(2)}'), 's3_waiting_matches')
case('remove_a_match_does_not_renumber_the_queue', [remove(M(1)), manual('singles', [20], [21])], 's3_waiting_matches')
case('remove_two_at_once', {'parallel': [remove(M(1)), remove(M(1))]}, 's3_waiting_matches')


def position(m, to, qr='1', **kw):
    body = {'expectedQueueRevision': qr}
    if to is not None:
        body['toIndex'] = to
    return post(f'/matches/{m}/position', body, **kw)


case('position_signed_out', position(M(3), 0, who=None), 's3_waiting_matches')
case('position_to_the_top', position(M(3), 0), 's3_waiting_matches')
case('position_to_the_middle', position(M(3), 1), 's3_waiting_matches')
case('position_past_the_end_stops_at_the_last_place', position(M(1), 99), 's3_waiting_matches')
case('position_below_zero_stops_at_the_first_place', position(M(3), -4), 's3_waiting_matches')
case('position_where_it_already_is', position(M(2), 1), 's3_waiting_matches')
case('position_skips_a_removed_draft', position(M(3), 0), 'removed')
case('position_stale_queue_revision', position(M(3), 0, '0'), 's3_waiting_matches')
case('position_queue_revision_that_is_not_a_number', position(M(3), 0, 'x'), 's3_waiting_matches')
case('position_not_a_whole_number', position(M(3), 1.5), 's3_waiting_matches')
case('position_missing_index', position(M(3), None), 's3_waiting_matches')
case('position_an_on_court_match', position(M(1), 0), 'onc')
case('position_unknown_match', position(UNKNOWN, 0), 's3_waiting_matches')
case('position_two_at_once_at_one_revision', {'parallel': [position(M(3), 0)] * 2}, 's3_waiting_matches')

# ------------------------------------------------------------------ Auto queue and Regenerate (the server generates from n)
def auto(n, op=None, qr='1', **kw):
    body = {'operationId': op or op_id(), 'n': n, 'expectedQueueRevision': qr}
    return post('/matches/auto', body, **kw)


case('auto_signed_out', auto(2, who=None))
for n in (2, 3, 4, 6):
    case(f'auto_queue_{n}_matches', auto(n))
case('auto_queue_in_chill_mode', auto(4), 'mode_chill')
case('auto_queue_in_hard_mode_counts_no_queued_games', auto(3), 'mode_hard')
case('auto_queue_counts_games_already_played', auto(3), 'full_house_played')
case('auto_queue_counts_the_waiting_matches', auto(3), 's3_waiting_matches')
case('auto_queue_singles_only', auto(3), 'no_doubles')
case('auto_queue_doubles_only', auto(3), 'no_singles')
case('auto_queue_with_only_two_present_runs_out_of_doubles', auto(2), 'only_two_present')
case('auto_queue_with_one_present', auto(2), 'one_present')
case('auto_queue_with_both_formats_off', auto(2), 'neither_format')
case('auto_queue_a_size_that_is_not_offered', auto(5))
case('auto_queue_n_that_is_not_a_number', post('/matches/auto', {'operationId': op_id(), 'n': '4', 'expectedQueueRevision': '1'}))
case('auto_queue_n_missing', post('/matches/auto', {'operationId': op_id(), 'expectedQueueRevision': '1'}))
case('auto_queue_stale_queue_revision', auto(2, qr='0'))
case('auto_queue_queue_revision_that_is_not_a_number_conflicts', auto(2, qr='x'))
case('auto_queue_missing_queue_revision_conflicts', post('/matches/auto', {'operationId': op_id(), 'n': 2}))
case('auto_queue_twice_same_operation_returns_the_stored_matches', [auto(3, op_id(300)), auto(3, op_id(300), qr='9')])
case('auto_queue_another_operation_seeds_another_lineup', [auto(3, op_id(301)), auto(3, op_id(302), qr='2')])
case('auto_queue_in_auto_queue_places_matches', auto(2), 'full_house_auto_ready', redact=RAND)
case('auto_queue_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/auto', {'operationId': op_id(), 'n': 2, 'expectedQueueRevision': '1'}))
case('auto_queue_two_at_once_same_operation', {'parallel': [auto(2, op_id(303))] * 2})


def regenerate(op=None, qr='1', **kw):
    return post('/matches/regenerate', {'operationId': op or op_id(), 'expectedQueueRevision': qr}, **kw)


case('regenerate_signed_out', regenerate(who=None), 's3_waiting_matches')
case('regenerate_waiting_drafts', regenerate(), 's3_waiting_matches')
case('regenerate_keeps_healthy_manual_entries', regenerate(), 'wait_manual_healthy')
case('regenerate_rebuilds_a_manual_entry_that_needs_attention', regenerate(), 'wait_protected_attention')
case('regenerate_with_nothing_to_rebuild', regenerate(), 'wait_all_protected')
case('regenerate_without_waiting_matches', regenerate())
case('regenerate_keeps_the_queue_positions', regenerate(), 's3_waiting_matches_protected')
case('regenerate_in_chill_mode', regenerate(), 'chill_waiting')
SCEN['chill_waiting'] = SCEN['s3_waiting_matches'] + [f"UPDATE queue_sessions SET session_mode = 'chill' WHERE id = '{S[3]}'"]
case('regenerate_stale_queue_revision', regenerate(qr='0'), 's3_waiting_matches')
case('regenerate_twice_same_operation_returns_the_stored_matches', [regenerate(op_id(310)), regenerate(op_id(310), qr='9')], 's3_waiting_matches')
case('regenerate_with_too_few_players_present', regenerate(), 'waiting_one_present')
SCEN['waiting_one_present'] = SCEN['s3_waiting_matches'] + [f"UPDATE session_players SET present = (id = '{SP(4)}')"]
case('regenerate_in_auto_queue_places_matches', regenerate(), 'wait_auto_court_free', redact=RAND)
case('regenerate_on_a_prepared_session', req('POST', f'/api/sessions/{S[1]}/matches/regenerate', {'operationId': op_id(), 'expectedQueueRevision': '1'}))
case('regenerate_two_at_once_same_operation', {'parallel': [regenerate(op_id(311))] * 2}, 's3_waiting_matches')

# ------------------------------------------------------------------ Auto Queue after a court command (the stub of the earlier slice)
NEWCT = 'a2c00000-0000-4000-8000-000000000190'
case('add_a_court_to_an_auto_queue_session_fills_it', req('POST', f'{P}/courts', {'courtId': NEWCT, 'label': 'Court 9'}), 's3_waiting_matches_auto_placed', redact=RAND)
case('add_a_court_to_a_manual_queue_session_places_nothing', req('POST', f'{P}/courts', {'courtId': NEWCT, 'label': 'Court 9'}), 'onc')
case('add_a_court_that_is_not_open_yet_places_nothing', req('POST', f'{P}/courts', {'courtId': NEWCT, 'label': 'Court 9', 'startsAt': '2026-11-19T10:00:00.000Z'}), 's3_waiting_matches_auto_placed', redact=RAND)
case('open_all_courts_early_in_auto_queue_fills_them', req('POST', f'{P}/courts/open-early'), 'wait_auto_both_closed', redact=RAND)
case('open_a_court_early_in_auto_queue_fills_it', req('POST', f'{P}/courts/{CT(4)}/open-early'), 'wait_auto_court_2_closed_only_4', redact=RAND)
SCEN['wait_auto_court_2_closed_only_4'] = SCEN['s3_waiting_matches_auto'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(4)}'"]
case('open_a_court_early_in_manual_queue_places_nothing', req('POST', f'{P}/courts/{CT(4)}/open-early'), 'closed_court_manual')
SCEN['closed_court_manual'] = SCEN['s3_waiting_matches'] + [f"UPDATE session_courts SET starts_at = TIMESTAMPTZ '2026-11-20 00:00:00+00' WHERE id = '{CT(4)}'"]

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'matches':
        s['sql'] = s['sql'].replace('ORDER BY session_id, match_no, id', 'ORDER BY session_id, match_no, id')
    SNAPSHOT.append(s)
SNAPSHOT += [
    {'name': 'match_decisions', 'sql': "SELECT match_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, accepted_at, actor_club_id FROM match_decisions ORDER BY match_id", 'redact': ['accepted_at']},
    {'name': 'sync_conflicts', 'sql': "SELECT id, session_id, category, state, evidence::text AS evidence, detected_at FROM sync_conflicts ORDER BY session_id, evidence::text", 'redact': ['detected_at']},
    {'name': 'session_courts', 'sql': "SELECT id, session_id, label, starts_at, opened_early_at, open_until, removed_at, revision::text AS revision, created_at, updated_at FROM session_courts ORDER BY session_id, id"},
]
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
