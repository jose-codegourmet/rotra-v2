#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/visitor.cases.json and visitor-nosecret.cases.json: the Queue visitor routes,
POST /api/public-sessions/{slug}/join-request and GET /api/public-sessions/{slug}/my-request, which keep the visitor's receipt in an httpOnly cookie.

Run it, then the capture (capture-writes-queue.test.mjs -t visitor), which writes the golden files from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-visitor-cases.py
"""
import base64
import hashlib
import hmac
import json
import os

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, '../../internal/queuewrites/testdata')
BASE = json.load(open(os.path.join(DATA, 'pubjoin.cases.json')))
SECRET = 'capture-visitor-receipt-secret'
S = {1: 'prep-open', 2: 'prep-full', 3: 'live-now', 4: 'last-week', 9: 'other-prepared'}
REQ = lambda n: f'a3400000-0000-4000-8000-0000000000{n:02d}'
NEW = lambda n: f'a3400000-0000-4000-8000-0000000001{n:02d}'


def receipt(request_id):
    digest = hmac.new(SECRET.encode(), f'join-request:{request_id}'.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip('=')


def cookie(request_id, slug=None):
    return f'rotra_join_request={request_id}.{receipt(request_id)}'


SCEN = {k: BASE['scenarios'][k] for k in ('base', 's1_cancelled', 's1_closed_to_requests', 's1_has_sixty_requests', 's2_free_slot')}
SCEN['s1_confirmed_on_the_waitlist'] = [
    "INSERT INTO session_waitlist (id, club_id, session_id, club_player_id, skill_level_id, added_at, created_at, updated_at) VALUES ('a3300000-0000-4000-8000-000000000011', 'c9000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'c6000000-0000-4000-8000-000000000012', 2, TIMESTAMPTZ '2026-11-19 00:30:00+00', TIMESTAMPTZ '2026-11-19 00:30:00+00', TIMESTAMPTZ '2026-11-19 00:30:00+00')"]
cases = []


def case(name, steps, scenario='base'):
    cases.append({'name': name, 'scenario': scenario, 'steps': steps if isinstance(steps, list) else [steps]})


def join(slug='prep-open', body=None, raw=None, **kw):
    s = {'method': 'POST', 'path': f'/api/public-sessions/{slug}/join-request', 'who': None}
    if raw is not None:
        s['rawBody'] = raw
    elif body is not None:
        s['body'] = body
    s.update(kw)
    return s


def mine(slug='prep-open', cookie_header=None, **kw):
    s = {'method': 'GET', 'path': f'/api/public-sessions/{slug}/my-request', 'who': None}
    if cookie_header is not None:
        s['cookie'] = cookie_header
    s.update(kw)
    return s


def ok(**kw):
    body = {'requestId': NEW(1), 'name': 'Visitor Vic', 'statedBand': 'intermediate'}
    body.update(kw)
    return {k: v for k, v in body.items() if v is not None or k in kw and kw[k] is None}


case('join_body_not_json', join(raw='nope'))
case('join_without_a_body', join())
case('join_without_a_request_id', join(body={'name': 'Vic', 'statedBand': 'beginner'}))
case('join_a_request_id_that_is_not_a_uuid', join(body=ok(requestId='nope')))
case('join_an_upper_case_request_id', join(body=ok(requestId=NEW(1).upper())))
case('join_a_placement_that_is_not_offered', join(body=ok(placement='from_waitlist')))
case('join_an_unknown_placement', join(body=ok(placement='front')))
case('join_a_placement_that_is_not_text_reads_slot', join(body=ok(placement=5)))
case('join_a_null_placement_reads_slot', join(body=ok(placement=None)))
case('join_without_a_name', join(body={'requestId': NEW(1), 'statedBand': 'beginner'}))
case('join_a_blank_name', join(body=ok(name='   ')))
case('join_a_name_that_is_not_text', join(body=ok(name=5)))
case('join_the_name_is_trimmed', join(body=ok(name='  Vic Tor  ')))
case('join_without_a_level', join(body={'requestId': NEW(1), 'name': 'Vic'}))
case('join_a_level_that_is_not_offered', join(body=ok(statedBand='Beginner')))
case('join_every_level_is_taken', [join(body=ok(requestId=NEW(i + 1), name=f'Vic {b}', statedBand=b)) for i, b in enumerate(['beginner', 'intermediate', 'advanced', 'unsure'])])
case('join_a_slot', join(body=ok()))
case('join_a_waitlist_place', join(body=ok(placement='waitlist')))
case('join_the_nickname_is_trimmed', join(body=ok(nickname='  Vicky  ')))
case('join_a_blank_nickname_is_none', join(body=ok(nickname='   ')))
case('join_a_nickname_that_is_not_text_is_none', join(body=ok(nickname=7)))
case('join_a_body_with_more_fields_ignores_them', join(body=ok(phone='+639175550999', clubPlayerId='x', status='confirmed')))
case('join_unknown_slug', join('no-such-session', ok()))
case('join_a_slug_in_capitals_is_not_found', join('PREP-OPEN', ok()))
case('join_validation_comes_before_the_slug', join('no-such-session', ok(name='')))
case('join_a_prepared_session_of_another_club', join('other-prepared', ok()))
case('join_a_session_that_has_started', join('live-now', ok()))
case('join_a_session_that_ended', join('last-week', ok()))
case('join_a_cancelled_session', join(body=ok()), 's1_cancelled')
case('join_a_session_closed_to_requests', join(body=ok()), 's1_closed_to_requests')
case('join_a_full_session_takes_no_slot', join('prep-full', ok()))
case('join_a_full_session_takes_a_waitlist_place', join('prep-full', ok(placement='waitlist')))
case('join_a_full_session_with_a_free_slot', join('prep-full', ok()), 's2_free_slot')
case('join_sixty_pending_requests_is_the_limit', join(body=ok()), 's1_has_sixty_requests')
case('join_a_waitlist_place_is_not_a_slot_so_the_limit_still_holds', join(body=ok(placement='waitlist')), 's1_has_sixty_requests')
case('join_a_retry_returns_the_same_request', [join(body=ok()), join(body=ok())])
case('join_a_retry_with_the_name_trimmed_the_same_way', [join(body=ok(name='Vic')), join(body=ok(name='  Vic  '))])
case('join_a_retry_with_another_name_conflicts', [join(body=ok()), join(body=ok(name='Someone Else'))])
case('join_the_id_of_an_existing_request_of_another_session_conflicts', join(body=ok(requestId=REQ(7), name='Second Sam')))
case('join_the_id_of_an_existing_request_in_this_session_with_its_name_answers', join(body=ok(requestId=REQ(1), name='Walk In Wendy')))
case('join_the_id_of_an_existing_request_with_another_name_conflicts', join(body=ok(requestId=REQ(1), name='Walk In Wally')))
case('join_the_existing_request_of_a_started_session_answers_before_any_state_check', join('live-now', ok(requestId=REQ(8), name='Kai Guest')))
case('join_a_confirmed_request_answers_its_waitlist_place', join(body=ok(requestId=REQ(5), name='Done Dina')), 's1_confirmed_on_the_waitlist')
case('join_a_declined_request_answers_its_status', join(body=ok(requestId=REQ(4), name='Declined Dave')))

# My request: the receipt is the cookie of the join before it, or built here with the same secret.
case('mine_without_a_cookie', mine())
case('mine_a_cookie_that_is_not_ours', mine(cookie_header='other=1'))
for name, value in [('no_dot', 'abc'), ('three_parts', 'a.b.c'), ('empty_receipt', f'{NEW(1)}.'), ('empty_id', '.abc'), ('only_a_dot', '.')]:
    case(f'mine_a_malformed_cookie_{name}', mine(cookie_header=f'rotra_join_request={value}'))
case('mine_the_join_before_it', [join(body=ok()), mine(cookie_header=cookie(NEW(1)))])
case('mine_a_pending_request', mine(cookie_header=cookie(REQ(1))))
case('mine_a_declined_request', mine(cookie_header=cookie(REQ(4))))
case('mine_a_confirmed_request_on_the_waitlist', mine(cookie_header=cookie(REQ(5))), 's1_confirmed_on_the_waitlist')
case('mine_a_confirmed_request_not_on_the_waitlist', mine(cookie_header=cookie(REQ(5))))
case('mine_a_waitlist_request', mine(cookie_header=cookie(REQ(3))))
case('mine_a_player_request', mine(cookie_header=cookie(REQ(2))))
case('mine_the_receipt_of_another_request', mine(cookie_header=f'rotra_join_request={REQ(1)}.{receipt(REQ(3))}'))
case('mine_a_wrong_receipt', mine(cookie_header=f'rotra_join_request={REQ(1)}.{receipt(REQ(1))[:-1]}x'))
case('mine_a_receipt_of_the_wrong_length', mine(cookie_header=f'rotra_join_request={REQ(1)}.{receipt(REQ(1))}x'))
case('mine_an_unknown_request', mine(cookie_header=cookie(NEW(9))))
case('mine_another_sessions_slug', mine('prep-full', cookie_header=cookie(REQ(1))))
case('mine_unknown_slug', mine('no-such-session', cookie_header=cookie(REQ(1))))
case('mine_a_request_id_that_is_not_a_uuid_with_a_valid_receipt', mine(cookie_header=cookie('nope'), allow500=True, goExpects={'status': 200, 'code': ''}))
case('mine_the_cookie_among_others', mine(cookie_header=f'a=1; rotra_join_request={REQ(1)}.{receipt(REQ(1))}; b=2'))

SNAPSHOT = [s for s in BASE['snapshot'] if s['name'] in ('session_join_requests', 'session_waitlist', 'queue_sessions', 'session_players')]


def write(name, cases_, extra=None):
    steps_ok = {c['name'] for c in cases_}
    assert len(steps_ok) == len(cases_)
    for c in cases_:
        for s in c['steps']:
            for k in [k for k, v in s.items() if v is None and k != 'who']:
                del s[k]
    doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases_}
    with open(os.path.join(DATA, name), 'w') as f:
        json.dump(doc, f, indent=1)
        f.write('\n')
    print(name, len(cases_), 'cases')


write('visitor.cases.json', cases)
# Without the receipt secret the TypeScript answers 503 from receiptFor, after the body and the slug are checked.
nosecret = []
for name, steps in [
    ('join_with_no_secret_is_unavailable', join(body=ok())),
    ('join_with_no_secret_checks_the_body_first', join(body=ok(name=''))),
    ('join_with_no_secret_checks_the_slug_first', join('no-such-session', ok())),
    ('join_with_no_secret_answers_an_existing_request_too', join(body=ok(requestId=REQ(1), name='Walk In Wendy'))),
    ('mine_with_no_secret_and_a_cookie_is_unavailable', mine(cookie_header=cookie(REQ(1)))),
    ('mine_with_no_secret_and_no_cookie_is_null', mine()),
    ('mine_with_no_secret_and_a_malformed_cookie_is_null', mine(cookie_header='rotra_join_request=abc')),
]:
    nosecret.append({'name': name, 'scenario': 'base', 'steps': [steps]})
write('visitor-nosecret.cases.json', nosecret)
