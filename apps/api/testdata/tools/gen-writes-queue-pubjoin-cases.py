#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/pubjoin.cases.json: the signed-in Player's writes on a public Queue Session, called from
the Queue session page (POST /api/public-sessions/{slug}/{join,cancel,check-in,leave,drop-out,invite-code}). The app is player.

Run it, then the capture (capture-writes-queue.test.mjs -t pubjoin), which writes pubjoin.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-pubjoin-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/pubjoin.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

ANN, BEN, CY, GIL = (f'f4000000-0000-4000-8000-0000000000{n:02d}' for n in (1, 2, 3, 6))
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
ORIGIN = 'http://localhost:9000'
SLUG = {1: 'prep-open', 2: 'prep-full', 3: 'live-now', 4: 'last-week', 8: 'lapsed-live'}
cases = []


def case(name, steps, scenario='base', **kw):
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


def join(n=1, who=ANN, body=None, **kw):
    return post(SLUG[n], 'join', who, {} if body is None else body, **kw)


JOIN_ID = {'redact': ['requestId']}
# What a random id of a join leaves in the rows (the admission of a member is keyed on it).
RAND_JOIN = {'session_join_requests': ['id'], 'session_players': ['id', 'assessment_operation_id'], 'session_waitlist': ['id'], 'club_assessments': ['source_operation_id', 'supersedes_operation_id', 'session_player_id'], 'player_notifications': ['source_id']}

# ---------------------------------------------------------------- the CORS and content-type guard, the pass
case('join_signed_out', join(1, who=None))
case('join_without_an_origin', join(1, headers={}))
case('join_from_another_origin', join(1, headers={'Origin': 'http://localhost:9999'}))
case('join_not_json_is_forbidden', join(1, headers={'Origin': ORIGIN, 'Content-Type': 'text/plain'}))
case('join_without_a_content_type_is_forbidden', join(1, headers={'Origin': ORIGIN, 'Content-Type': ''}))
case('join_a_content_type_with_a_charset_is_fine', join(1, who=GIL, headers={'Origin': ORIGIN, 'Content-Type': 'application/json; charset=utf-8'}, **JOIN_ID), redact=RAND_JOIN)
case('join_a_guest_player_requests_a_slot', join(1, who=GIL, **JOIN_ID), redact=RAND_JOIN)
case('join_placement_slot', join(1, who=GIL, body={'placement': 'slot'}, **JOIN_ID), redact=RAND_JOIN)
case('join_placement_waitlist', join(1, who=GIL, body={'placement': 'waitlist'}, **JOIN_ID), redact=RAND_JOIN)
case('join_placement_not_text_reads_slot', join(1, who=GIL, body={'placement': 5}, **JOIN_ID), redact=RAND_JOIN)
case('join_placement_unknown', join(1, who=GIL, body={'placement': 'vip'}))
case('join_placement_is_checked_after_the_slug', join(9, who=GIL, body={'placement': 'vip'}) if False else post('nope', 'join', GIL, {'placement': 'vip'}))
case('join_unknown_slug', post('nope', 'join', GIL, {}))
case('join_slots_full', join(2, who=GIL))
case('join_waitlist_when_full', join(2, who=GIL, body={'placement': 'waitlist'}, **JOIN_ID), redact=RAND_JOIN)
case('join_request_already_sent', join(1, who=ANN))
case('join_already_in_the_session', join(1, who=GIL), scenario='gil_on_s1')
case('join_from_waitlist_with_a_request_already_pending', join(2, who=ANN, body={'placement': 'from_waitlist'}))
case('join_from_waitlist_when_slots_are_full', join(2, who=ANN, body={'placement': 'from_waitlist'}), scenario='s2_ann_request_declined')
case('join_from_waitlist_with_a_free_slot', join(2, who=ANN, body={'placement': 'from_waitlist'}, **JOIN_ID), scenario='s2_free_slot_ann_request_declined', redact=RAND_JOIN)
case('join_from_waitlist_when_not_waitlisted', join(1, who=GIL, body={'placement': 'from_waitlist'}))
case('join_from_waitlist_when_already_in', join(1, who=GIL, body={'placement': 'from_waitlist'}), scenario='gil_on_s1')
case('join_a_session_that_started', join(3, who=GIL))
case('join_a_cancelled_session', join(1, who=GIL), scenario='s1_cancelled')
case('join_a_session_not_taking_requests', join(1, who=GIL), scenario='s1_closed_to_requests')
case('join_too_many_requests_are_waiting', join(1, who=GIL), scenario='s1_has_sixty_requests')
case('join_a_member_is_placed_right_away', join(1, who=BEN), scenario='ben_is_a_member', redact=RAND_JOIN)
case('join_a_member_waitlisted_by_choice', join(1, who=BEN, body={'placement': 'waitlist'}), scenario='ben_is_a_member', redact=RAND_JOIN)
case('join_a_member_with_every_slot_taken_goes_to_the_waitlist', join(2, who=BEN), scenario='ben_is_a_member', redact=RAND_JOIN)
case('join_a_member_where_a_request_is_always_required', join(1, who=BEN, **JOIN_ID), scenario='ben_is_a_member_s1_always_requires', redact=RAND_JOIN)
case('join_a_member_already_in', join(1, who=BEN), scenario='ben_is_a_member_and_on_s1')
case('join_a_member_with_a_pending_request', join(1, who=BEN), scenario='ben_is_a_member_with_a_pending_request')
case('join_a_member_recomputes_the_minimum', join(1, who=BEN), scenario='ben_is_a_member_calculated_minimum', redact=RAND_JOIN)
case('join_after_a_confirmed_request_was_removed_asks_again', join(1, who=ANN, **JOIN_ID), scenario='ann_request_confirmed_but_removed', redact=RAND_JOIN)
case('join_two_at_once_by_one_player', {'parallel': [join(1, who=GIL), join(1, who=GIL)], 'redact': ['requestId'], 'redactOptional': True}, redact=RAND_JOIN)
case('join_two_members_at_once', {'parallel': [join(1, who=BEN), join(1, who=BEN)]}, scenario='ben_is_a_member', redact=RAND_JOIN)

# Restrictions (D-2026-11-19-12, task 2.2): a Player outside the session's pick, or whose band is full, cannot request or join. Ben is an intermediate member.
case('join_restricted_beginners_blocks_a_member', join(1, who=BEN), scenario='ben_member_s1_beginners')
case('join_restricted_beginners_blocks_the_waitlist_choice_too', join(1, who=BEN, body={'placement': 'waitlist'}), scenario='ben_member_s1_beginners')
case('join_restricted_beginners_intermediate_places_a_member', join(1, who=BEN), scenario='ben_member_s1_beginners_intermediate', redact=RAND_JOIN)
case('join_restricted_per_level_band_full_blocks_a_member', join(1, who=BEN), scenario='ben_member_s1_per_level_full')
case('join_restricted_per_level_band_open_places_a_member', join(1, who=BEN), scenario='ben_member_s1_per_level_open', redact=RAND_JOIN)
case('join_restricted_a_player_with_no_level_may_request', join(1, who=GIL, **JOIN_ID), scenario='s1_beginners', redact=RAND_JOIN)
case('join_restricted_from_waitlist_is_not_checked', join(2, who=ANN, body={'placement': 'from_waitlist'}, **JOIN_ID), scenario='s2_free_slot_ann_request_declined_beginners', redact=RAND_JOIN)
case('join_restricted_a_member_already_in_is_not_checked', join(1, who=BEN), scenario='ben_member_on_s1_beginners')
case('join_restricted_member_always_requires_is_still_checked', join(1, who=BEN), scenario='ben_member_s1_beginners_always_requires')

CAN = lambda who=ANN, n=1, **kw: post(SLUG[n], 'cancel', who, {}, **kw)
case('cancel_signed_out', CAN(who=None))
case('cancel_without_an_origin', CAN(headers={}))
case('cancel_the_pending_request', CAN())
case('cancel_with_none_pending', CAN(who=GIL))
case('cancel_twice', [CAN(), CAN()])
case('cancel_unknown_slug', post('nope', 'cancel', ANN, {}))
case('cancel_a_decided_request', CAN(), scenario='ann_request_declined')
case('cancel_two_at_once', {'parallel': [CAN(), CAN()]})

CHK = lambda who=BEN, n=3, **kw: post(SLUG[n], 'check-in', who, {}, **kw)
case('checkin_signed_out', CHK(who=None))
case('checkin_without_an_origin', CHK(headers={}))
case('checkin_marks_the_player_present', CHK(), scenario='ben_away_on_s3')
case('checkin_already_present', CHK(), scenario='ben_present_on_s3')
case('checkin_after_leaving_is_a_new_checkin', [CHK(), post('live-now', 'leave', BEN, {}), CHK()], scenario='ben_away_on_s3')
case('checkin_the_club_turned_it_off', CHK(), scenario='ben_away_on_s3_checkin_off')
case('checkin_not_on_the_roster', CHK(who=GIL))
case('checkin_a_released_entry_is_not_on_the_roster', CHK(), scenario='ben_released_on_s3')
case('checkin_a_prepared_session', CHK(n=1), scenario='ben_on_s1')
case('checkin_unknown_slug', post('nope', 'check-in', BEN, {}))
case('checkin_two_at_once', {'parallel': [CHK(), CHK()]}, scenario='ben_away_on_s3')
LV = lambda who=BEN, n=3, **kw: post(SLUG[n], 'leave', who, {}, **kw)
case('leave_signed_out', LV(who=None))
case('leave_marks_the_player_left', LV(), scenario='ben_present_on_s3')
case('leave_closes_the_match_requests_that_name_them', LV(), scenario='ben_present_on_s3_named_in_a_request')
case('leave_not_present', LV(), scenario='ben_away_on_s3')
case('leave_not_on_the_roster', LV(who=GIL))
case('leave_a_prepared_session', LV(n=1), scenario='ben_on_s1')
case('leave_with_check_in_off_is_allowed', LV(), scenario='ben_present_on_s3_checkin_off')
case('leave_unknown_slug', post('nope', 'leave', BEN, {}))
case('leave_two_at_once', {'parallel': [LV(), LV()]}, scenario='ben_present_on_s3')
DRP = lambda who=ANN, n=1, **kw: post(SLUG[n], 'drop-out', who, {}, redact=['noticeId'], redactOptional=True, **kw)
DN = {'session_drop_out_notices': ['id']}
case('dropout_signed_out', DRP(who=None))
case('dropout_sends_a_notice', DRP(), scenario='ann_on_s1', redact=DN, **{'redact': None} if False else {})
case('dropout_twice_is_a_conflict', [DRP(), DRP()], scenario='ann_on_s1', redact=DN)
case('dropout_after_the_notice_was_decided_sends_a_new_one', DRP(), scenario='ann_on_s1_notice_kept', redact=DN)
case('dropout_not_on_the_roster', DRP(who=GIL))
case('dropout_a_waitlisted_player_is_not_on_the_roster', DRP(n=2))
case('dropout_a_live_session', DRP(who=BEN, n=3), scenario='ben_present_on_s3')
case('dropout_unknown_slug', post('nope', 'drop-out', ANN, {}))
case('dropout_two_at_once', {'parallel': [DRP(), DRP()], 'redact': ['noticeId'], 'redactOptional': True}, scenario='ann_on_s1', redact=DN)
INV = lambda who=ANN, n=1, **kw: post(SLUG[n], 'invite-code', who, {}, **kw)
CODE = {'session_invite_codes': ['id', 'code']}
case('invite_signed_out', INV(who=None))
case('invite_makes_a_code', INV(**{'redact': ['code']}), scenario='ann_on_s1', redact=CODE)
case('invite_a_second_call_answers_the_same_code', [INV(save={'first': 'code'}, redact=['code']), INV(redact=['code'])], scenario='ann_on_s1', redact=CODE)
case('invite_a_waitlisted_player_can_invite', INV(n=2, redact=['code']), redact=CODE)
case('invite_not_in_the_session', INV(who=GIL))
case('invite_a_live_session', INV(who=BEN, n=3), scenario='ben_present_on_s3')
case('invite_a_session_not_taking_requests', INV(), scenario='ann_on_s1_closed_to_requests')
case('invite_unknown_slug', post('nope', 'invite-code', ANN, {}))
case('invite_two_at_once', {'parallel': [INV(), INV()], 'redact': ['code']}, scenario='ann_on_s1', redact=CODE)

# The preflight of the JSON POSTs: the paired Queue origin only, and no pass is needed.
for action in ('join', 'cancel', 'check-in', 'leave', 'drop-out', 'invite-code'):
    name = action.replace('-', '_')
    case(f'preflight_{name}', {'method': 'OPTIONS', 'path': f'/api/public-sessions/prep-open/{action}', 'who': None, 'headers': {'Origin': ORIGIN}})
case('preflight_without_an_origin', {'method': 'OPTIONS', 'path': '/api/public-sessions/prep-open/join', 'who': None, 'headers': {}})
case('preflight_from_another_origin', {'method': 'OPTIONS', 'path': '/api/public-sessions/prep-open/join', 'who': None, 'headers': {'Origin': 'http://localhost:9999'}})

# ---------------------------------------------------------------- scenarios
SCEN = dict(BASE['scenarios'])


def entry_sql(sp, session, cp, name, present=False, released=False):
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, "
            f"released_at, release_reason, created_at, updated_at, revision) VALUES ('{SP(sp)}', '{CLUB1}', '{S[session]}', '{CP(cp)}', "
            f"(SELECT player_id FROM club_players WHERE id = '{CP(cp)}'), '{name}', {'true' if present else 'false'}, {NOW}, 3, TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', "
            f"TIMESTAMPTZ '2026-11-15 0{sp % 10}:00:00+00', {NOW if released else 'NULL'}, {repr('removed') if released else 'NULL'}, {NOW}, {NOW}, 1)")


def gil_cp():
    return (f"INSERT INTO club_players (id, club_id, player_id, display_name, added_at, revision, created_at, updated_at) VALUES "
            f"('{CP(50)}', '{CLUB1}', 'd4000000-0000-4000-8000-000000000006', 'Gil Gomez', {NOW}, 1, {NOW}, {NOW})")


SCEN['gil_on_s1'] = [gil_cp(), entry_sql(50, 1, 50, 'Gil Gomez')]
SCEN['s1_cancelled'] = [f"UPDATE queue_sessions SET state = 'cancelled', cancelled_at = {NOW}, cancel_reason = 'rain' WHERE id = '{S[1]}'"]
SCEN['s1_closed_to_requests'] = [f"UPDATE queue_sessions SET accept_join_requests = false WHERE id = '{S[1]}'"]
SCEN['s1_has_sixty_requests'] = [f"INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, created_at, updated_at, revision) "
                                 f"SELECT ('a3400000-0000-4000-8000-0000000' || lpad(i::text, 5, '0'))::uuid, '{CLUB1}', '{S[1]}', 'Waiting ' || i, 'unsure', 'slot', 'pending', {NOW}, {NOW}, {NOW}, 1 FROM generate_series(100, 159) AS i"]
ASSESS = (f"INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, skill_level_id, source_operation_id, assessed_at, received_at, accepted_revision, actor_club_id) VALUES "
          f"('a0300000-0000-4000-8000-000000000201', '{CLUB1}', '{CP(4)}', '{S[4]}', '{SP(60)}', 4, 'a0300000-0000-4000-8000-000000000301', TIMESTAMPTZ '2026-11-12 00:00:00+00', TIMESTAMPTZ '2026-11-12 00:00:00+00', 1, '{CLUB1}')")
BEN_MEMBER = [entry_sql(60, 4, 4, 'Ben Santos'), ASSESS]
SCEN['ben_is_a_member'] = BEN_MEMBER
SCEN['ben_is_a_member_s1_always_requires'] = BEN_MEMBER + [f"UPDATE queue_sessions SET always_require_request = true WHERE id = '{S[1]}'"]
SCEN['ben_is_a_member_and_on_s1'] = BEN_MEMBER + [entry_sql(61, 1, 4, 'Ben Santos')]
SCEN['ben_is_a_member_with_a_pending_request'] = BEN_MEMBER + [f"INSERT INTO session_join_requests (id, club_id, session_id, name, stated_band, placement, status, requested_at, club_player_id, player_id, created_at, updated_at, revision) VALUES "
                                                               f"('a3400000-0000-4000-8000-000000000060', '{CLUB1}', '{S[1]}', 'Ben Santos', 'unsure', 'slot', 'pending', {NOW}, NULL, 'd4000000-0000-4000-8000-000000000002', {NOW}, {NOW}, 1)"]
SCEN['ben_is_a_member_calculated_minimum'] = BEN_MEMBER + [f"UPDATE queue_sessions SET minimum_is_calculated = true, minimum_games = 99 WHERE id = '{S[1]}'"]
SCEN['ann_request_confirmed_but_removed'] = [f"UPDATE session_join_requests SET status = 'confirmed', decided_at = {NOW}, club_player_id = '{CP(3)}' WHERE id = 'a3400000-0000-4000-8000-000000000002'"]
SCEN['s2_ann_request_declined'] = ["UPDATE session_join_requests SET status = 'declined', decided_at = TIMESTAMPTZ '2026-11-19 02:00:00+00' WHERE id = 'a3400000-0000-4000-8000-000000000006'"]
RESTRICT = lambda n, sql: f"UPDATE queue_sessions SET {sql} WHERE id = '{S[n]}'"
BEGINNERS = RESTRICT(1, "level_restriction = 'beginners'")
SCEN['s1_beginners'] = [BEGINNERS]
SCEN['ben_member_s1_beginners'] = BEN_MEMBER + [BEGINNERS]
SCEN['ben_member_s1_beginners_always_requires'] = BEN_MEMBER + [BEGINNERS, f"UPDATE queue_sessions SET always_require_request = true WHERE id = '{S[1]}'"]
SCEN['ben_member_s1_beginners_intermediate'] = BEN_MEMBER + [RESTRICT(1, "level_restriction = 'beginners_intermediate'")]
# One court of two: Ben (intermediate) and Hal (intermediate, on Prep Open) against one intermediate slot: full; two intermediate slots: open.
SCEN['ben_member_s1_per_level_full'] = BEN_MEMBER + [RESTRICT(1, "level_restriction = 'slots_per_band', beginner_slots = 1, intermediate_slots = 1, advanced_slots = 0")]
SCEN['ben_member_s1_per_level_open'] = BEN_MEMBER + [RESTRICT(1, "level_restriction = 'slots_per_band', beginner_slots = 0, intermediate_slots = 2, advanced_slots = 0")]
SCEN['ben_member_on_s1_beginners'] = BEN_MEMBER + [entry_sql(61, 1, 4, 'Ben Santos'), BEGINNERS]
SCEN['s2_free_slot_ann_request_declined'] = SCEN['s2_free_slot'] + SCEN['s2_ann_request_declined']
SCEN['s2_free_slot_ann_request_declined_beginners'] = SCEN['s2_free_slot_ann_request_declined'] + [RESTRICT(2, "level_restriction = 'beginners'")]
SCEN['ann_request_declined'] = [f"UPDATE session_join_requests SET status = 'declined', decided_at = {NOW} WHERE id = 'a3400000-0000-4000-8000-000000000002'"]
SCEN['ann_on_s1'] = [entry_sql(40, 1, 3, 'Ann Reyes')]
SCEN['ann_on_s1_closed_to_requests'] = SCEN['ann_on_s1'] + SCEN['s1_closed_to_requests']
SCEN['ann_on_s1_notice_kept'] = SCEN['ann_on_s1'] + [f"INSERT INTO session_drop_out_notices (id, club_id, session_id, session_player_id, player_id, status, decision, created_at, closed_at) VALUES "
                                                     f"('a3800000-0000-4000-8000-000000000040', '{CLUB1}', '{S[1]}', '{SP(40)}', 'd4000000-0000-4000-8000-000000000001', 'closed', 'kept', {NOW}, {NOW})"]
SCEN['ben_on_s1'] = [entry_sql(62, 1, 4, 'Ben Santos')]
SCEN['ben_away_on_s3'] = [entry_sql(63, 3, 4, 'Ben Santos', present=False)]
SCEN['ben_present_on_s3'] = [entry_sql(63, 3, 4, 'Ben Santos', present=True)]
SCEN['ben_released_on_s3'] = [entry_sql(63, 3, 4, 'Ben Santos', released=True)]
SCEN['ben_away_on_s3_checkin_off'] = SCEN['ben_away_on_s3'] + [f"UPDATE clubs SET self_check_in_enabled = false WHERE id = '{CLUB1}'"]
SCEN['ben_present_on_s3_checkin_off'] = SCEN['ben_present_on_s3'] + [f"UPDATE clubs SET self_check_in_enabled = false WHERE id = '{CLUB1}'"]
SCEN['ben_present_on_s3_named_in_a_request'] = SCEN['ben_present_on_s3'] + [
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES "
    f"('a3700000-0000-4000-8000-000000000050', '{CLUB1}', '{S[3]}', '{SP(63)}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)",
    f"INSERT INTO session_match_request_spots (request_id, club_id, session_id, side, slot_no, session_player_id) VALUES ('a3700000-0000-4000-8000-000000000050', '{CLUB1}', '{S[3]}', 'opponent', 0, NULL)"]

SNAPSHOT = []
for s in BASE['snapshot']:
    s = dict(s)
    if s['name'] == 'session_players':
        s['sql'] = s['sql'].replace('no_show_at, revision::text', 'no_show_at, self_checked_in_at, left_at, revision::text')
    if s['name'] == 'session_join_requests':
        s['sql'] = s['sql'].replace('decided_by_device_id, club_player_id, player_id,', 'decided_by_device_id, club_player_id, player_id, invite_code_id, stated_band,')
    SNAPSHOT.append(s)
SNAPSHOT += [
    {'name': 'session_drop_out_notices', 'sql': "SELECT id, session_id, session_player_id, player_id, status, decision, created_at, closed_at FROM session_drop_out_notices ORDER BY id"},
    {'name': 'session_invite_codes', 'sql': "SELECT id, session_id, player_id, code, created_at FROM session_invite_codes ORDER BY id"},
]
doc = {'now': BASE['now'], 'app': 'player', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}
for c in cases:
    if c.get('redact') is None:
        c.pop('redact', None)
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
