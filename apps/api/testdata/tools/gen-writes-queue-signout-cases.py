#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/signout.cases.json: the Player's sign-out called from the Queue session page
(POST /api/public-sessions/{slug}/sign-out and its OPTIONS preflight). The app is player.

Run it, then the capture (capture-writes-queue.test.mjs -t signout), which writes signout.golden.json from the real TypeScript.
The capture cannot reach Supabase, so its signOut is a stand-in that clears nothing: the Set-Cookie of the Go answer (it clears its own
two cookies) is not compared (ignoreHeaders) and has its own Go test (signout_test.go).
Usage: python3 apps/api/testdata/tools/gen-writes-queue-signout-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/signout.cases.json')
PUB = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/pubmr.cases.json')))
ANN = 'f4000000-0000-4000-8000-000000000001'
ORIGIN = 'http://localhost:9000'
PATH = '/api/public-sessions/live-now/sign-out'
IGN = ['set-cookie']
cases = []


def case(name, step, who=ANN, **kw):
    s = {'method': 'POST', 'path': PATH, 'who': who, 'headers': {'Origin': ORIGIN}, 'ignoreHeaders': IGN}
    s.update(step)
    s.update(kw)
    cases.append({'name': name, 'scenario': 'base', 'steps': [s]})


case('sign_out_signed_in', {'body': {}})
case('sign_out_signed_in_with_no_body', {'headers': {'Origin': ORIGIN, 'Content-Type': 'application/json'}})
case('sign_out_with_a_json_charset', {'body': {}, 'headers': {'Origin': ORIGIN, 'Content-Type': 'application/json; charset=utf-8'}})
case('sign_out_ignores_the_body', {'body': {'sessionEnded': True}})
case('sign_out_signed_out', {'body': {}}, who=None)
case('sign_out_without_an_origin', {'body': {}, 'headers': {}})
case('sign_out_from_another_origin', {'body': {}, 'headers': {'Origin': 'http://localhost:9999'}})
case('sign_out_not_json_is_forbidden', {'body': {}, 'headers': {'Origin': ORIGIN, 'Content-Type': 'text/plain'}})
case('sign_out_without_a_content_type', {'rawBody': '{}', 'headers': {'Origin': ORIGIN, 'Content-Type': ''}})
case('sign_out_from_another_origin_signed_out', {'body': {}, 'headers': {'Origin': 'http://localhost:9999'}}, who=None)
case('preflight_sign_out', {'method': 'OPTIONS'}, who=None)
case('preflight_sign_out_from_another_origin', {'method': 'OPTIONS', 'headers': {'Origin': 'http://localhost:9999'}}, who=None)
case('preflight_sign_out_without_an_origin', {'method': 'OPTIONS', 'headers': {}}, who=None)

snapshot = [{'name': 'queue_sessions', 'sql': 'SELECT id, state, revision::text AS revision FROM queue_sessions ORDER BY id'}]
doc = {'now': PUB['now'], 'app': 'player', 'snapshotDiff': True, 'seed': 'queue.seed.sql',
       'scenarios': {'base': PUB['scenarios']['base']}, 'snapshot': snapshot, 'cases': cases}
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
