#!/usr/bin/env python3
"""Writes the seed and the case list of the signed-in session page reads (Player app, GET):
  GET /api/public-sessions/{slug}/access  /my-night  /match-history  /match-request  /match-request/options
  GET /api/players/{playerId}/compare

  python3 apps/api/testdata/tools/gen-signedin-pubsession-fixtures.py

Output (apps/api/internal/signedin/testdata): pubsession.seed.sql and pubsession.cases.json. The golden answers are
never written here: capture-signedin-pubsession.test.mjs records them from the real Route Handlers. Everything is
fictional. The seed is loaded with foreign keys and triggers off, as the other signed-in seeds are.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '../../internal/signedin/testdata'))

NOW = '2026-11-19T04:00:00.000Z'
LOC = "(SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB')"


def uid(prefix, n):
    return f'{prefix}000000-0000-4000-8000-{n:012x}'


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def ts(v):
    return 'NULL' if v is None else f"TIMESTAMPTZ '{v}'"


def uuids(ids):
    return "'{" + ','.join(ids) + "}'::uuid[]" if ids else "'{}'::uuid[]"


stmts = []


def insert(table, cols, rows):
    if not rows:
        return
    lines = ',\n  '.join('(' + ', '.join(r) + ')' for r in rows)
    stmts.append(f'INSERT INTO {table} ({", ".join(cols)}) VALUES\n  {lines};')


# ---- clubs ----
C1, C2, C3 = uid('c1', 1), uid('c1', 2), uid('c1', 3)
insert('clubs', ['id', 'name', 'name_key', 'logo_ref', 'founding_location_code_id', 'founding_address', 'license_pricing', 'source_command_id', 'updated_at'], [
    [q(C1), q('Smash Club'), q('smash-club-pubsession'), q('https://example.test/smash.png'), LOC, q('Somewhere'), q('free'), q(uid('c2', 1)), 'now()'],
    [q(C2), q('Birdie Club'), q('birdie-club-pubsession'), 'NULL', LOC, q('Somewhere'), q('free'), q(uid('c2', 2)), 'now()'],
    [q(C3), q('Net Ninjas'), q('net-ninjas-pubsession'), 'NULL', LOC, q('Somewhere'), q('free'), q(uid('c2', 3)), 'now()'],
])

# ---- players ----
# (n, full name, nickname, visibility, state, account, allocation, banner)
PLAYERS = [
    (1, 'Alice Reyes', 'Ace', 'public', 'claimed', True, True, 'night'),
    (2, 'Ben Cruz', 'Benny', 'public', 'claimed', True, True, None),
    (3, 'Cara Dizon', 'CD', 'always_private', 'claimed', True, True, None),
    (4, 'Dan Evans', None, 'private', 'claimed', True, True, None),
    (5, 'Eli Fox', 'Eli', 'public', 'claimed', True, True, None),
    (6, 'Fay Go', None, 'public', 'claimed', True, True, None),
    (7, 'Gio Ha', 'Gee', 'public', 'unclaimed', False, True, None),
    (8, 'Nia Ko', None, 'public', 'claimed', True, False, None),
]
P = {n: uid('d1', n) for n, *_ in PLAYERS}
SUBJ = {n: uid('f1', n) for n, *_ in PLAYERS}
insert('players', ['id', 'full_name', 'nickname', 'avatar_ref', 'profile_visibility', 'profile_state', 'banner_id', 'updated_at'], [
    [q(P[n]), q(name), q(nick), q(f'https://example.test/p{n}.png'), q(vis), q(state), q(banner), 'now()']
    for n, name, nick, vis, state, _a, _l, banner in PLAYERS
])
insert('player_private_contacts', ['player_id', 'phone_e164', 'email', 'updated_at'], [
    [q(P[n]), q(f'+63917555{n:04d}'), q(f'p{n}@example.test'), 'now()'] for n, _n, _k, _v, _s, acct, *_ in PLAYERS if acct
])
insert('player_accounts', ['player_id', 'auth_provider', 'auth_subject', 'claimed_at', 'contact_sync_version', 'updated_at'], [
    [q(P[n]), q('supabase'), q(SUBJ[n]), ts('2026-10-01 00:00:00+00'), '1', 'now()'] for n, _n, _k, _v, _s, acct, *_ in PLAYERS if acct
])
insert('player_id_allocations', ['player_id', 'rtr_id', 'creating_club_id', 'location_code_id', 'country_code', 'city_code', 'sync_date', 'sequence'], [
    [q(P[n]), q(f'RTR-PH-CEB-102926-{n:04d}'), q(C1), LOC, q('PH'), q('CEB'), "DATE '2026-10-29'", str(n)] for n, _n, _k, _v, _s, _a, alloc, _b in PLAYERS if alloc
])

# ---- shared entries (D-2026-11-16-04): Gio's is open, Jay's was claimed, Kit's was retired ----
SE_OPEN, SE_CLAIMED, SE_RETIRED = uid('a5', 7), uid('a5', 9), uid('a5', 10)
insert('shared_player_entries', ['id', 'email', 'rtr_id', 'creating_club_id', 'location_code_id', 'country_code', 'city_code', 'sync_date', 'sequence', 'claimed_player_id', 'claimed_at', 'retired_at', 'updated_at'], [
    [q(SE_OPEN), q('gio@example.test'), q('RTR-PH-CEB-102926-0007'), q(C1), LOC, q('PH'), q('CEB'), "DATE '2026-10-29'", '7', 'NULL', 'NULL', 'NULL', 'now()'],
    [q(SE_CLAIMED), 'NULL', q('RTR-PH-CEB-102926-0009'), q(C1), LOC, q('PH'), q('CEB'), "DATE '2026-10-29'", '9', q(P[2]), ts('2026-11-01 00:00:00+00'), 'NULL', 'now()'],
    [q(SE_RETIRED), 'NULL', q('RTR-PH-CEB-102926-0010'), q(C1), LOC, q('PH'), q('CEB'), "DATE '2026-10-29'", '10', 'NULL', 'NULL', ts('2026-11-02 00:00:00+00'), 'now()'],
])

# ---- club players ----
CP = {}  # (club, key) -> id
cp_rows = []


def club_player(club, key, n, player=None, name=None, nick=None, shared=None):
    cid = uid('e1', n)
    CP[(club, key)] = cid
    cp_rows.append([q(cid), q(club), q(player), q(name), q(nick), q(shared), ts('2026-01-01 00:00:00+00'), 'now()'])
    return cid


n = 1
for key, p in (('A', 1), ('B', 2), ('C', 3), ('D', 4), ('E', 5), ('F', 6)):
    club_player(C1, key, n, P[p], dict((a, b) for a, b, *_ in PLAYERS)[p]); n += 1
club_player(C1, 'G', n, P[7], 'Gio Hizon', 'Gi', SE_OPEN); n += 1
club_player(C1, 'H', n, None, 'Hal Ibarra'); n += 1
club_player(C1, 'I', n, None, 'Ivy Jose'); n += 1
club_player(C1, 'J', n, None, 'Jay Kim', None, SE_CLAIMED); n += 1
club_player(C1, 'K', n, None, 'Kit Lo', None, SE_RETIRED); n += 1
club_player(C1, 'L', n, None, 'Liz Mar'); n += 1
club_player(C1, 'M', n, None, 'Max Ng'); n += 1
club_player(C1, 'Z', n, None, 'Zed Pua'); n += 1
for g in range(1, 15):
    club_player(C1, f'g{g}', n, None, f'Guest {g:02d} Person'); n += 1
for key, p in (('A', 1), ('B', 2), ('C', 3)):
    club_player(C2, key, n, P[p], dict((a, b) for a, b, *_ in PLAYERS)[p]); n += 1
club_player(C3, 'B', n, P[2], 'Ben Cruz'); n += 1
insert('club_players', ['id', 'club_id', 'player_id', 'display_name', 'nickname', 'shared_entry_id', 'added_at', 'updated_at'], cp_rows)
# Alice is a club member of Smash Club: a saved record with a club assessment. Ben is saved but has no level.
insert('club_assessments', ['id', 'club_id', 'club_player_id', 'session_id', 'session_player_id', 'skill_level_id', 'source_operation_id', 'assessed_at', 'accepted_revision', 'actor_club_id'], [
    [q(uid('a9', 1)), q(C1), q(CP[(C1, 'A')]), q(uid('a1', 99)), q(uid('b1', 9999)), '4', q(uid('a9', 101)), ts('2026-10-01 00:00:00+00'), '1', q(C1)],
])

# ---- sessions ----
S = {}
sess_rows = []
pub_rows = []


def session(key, n, club, state, title, slug, *, start, end, started=None, finalized=None, cancelled=None, record=True,
            accept=True, formats=None, minimum=0, reason=None):
    sid = uid('a1', n)
    S[key] = sid
    fmts = 'ARRAY[' + ','.join(f"'{f}'::match_format" for f in formats) + ']' if formats else 'DEFAULT'
    sess_rows.append([q(sid), q(club), q(title), f"{q(state)}::queue_session_state", ts(started), ts(finalized), ts(cancelled), ts(start), ts(end),
                      '8', q(slug), q(uid('a2', n)), q(record), q(accept), str(minimum), fmts, q(reason), 'now()'])
    return sid


session('live', 1, C1, 'active', 'Live Now', 'live-now', start='2026-11-19 03:00:00+00', end='2026-11-19 06:00:00+00', started='2026-11-19 03:00:00+00',
        formats=['doubles', 'singles', 'fun_1v2'], minimum=4)
session('free', 2, C2, 'active', 'Free Courts', 'free-courts', start='2026-11-19 03:00:00+00', end='2026-11-19 06:00:00+00', started='2026-11-19 03:00:00+00')
session('wrap', 3, C3, 'finalizing', 'Wrapping Up', 'wrapping-up', start='2026-11-19 02:00:00+00', end='2026-11-19 05:00:00+00', started='2026-11-19 02:00:00+00')
session('big', 4, C1, 'prepared', 'Big Night', 'big-night', start='2026-11-21 10:00:00+00', end='2026-11-21 13:00:00+00')
session('wait', 5, C1, 'prepared', 'Waitlist Night', 'waitlist-night', start='2026-11-22 10:00:00+00', end='2026-11-22 13:00:00+00')
session('closed', 6, C1, 'prepared', 'Closed Night', 'closed-night', start='2026-11-23 10:00:00+00', end='2026-11-23 13:00:00+00', accept=False)
session('cancelled', 7, C1, 'cancelled', 'Cancelled Night', 'cancelled-night', start='2026-11-24 10:00:00+00', end='2026-11-24 13:00:00+00', cancelled='2026-11-01 00:00:00+00')
session('removed', 8, C1, 'prepared', 'Removed Page', 'removed-page', start='2026-11-25 10:00:00+00', end='2026-11-25 13:00:00+00')
session('f1', 11, C1, 'completed', 'Done Shared', 'done-shared', start='2026-11-18 09:00:00+00', end='2026-11-18 15:00:00+00', started='2026-11-18 09:30:00+00', finalized='2026-11-18 16:00:00+00')
session('f2', 12, C2, 'completed', 'Done Unshared', 'done-unshared', start='2026-11-17 09:00:00+00', end='2026-11-17 15:00:00+00', started='2026-11-17 09:00:00+00', finalized='2026-11-17 16:00:00+00')
session('f3', 13, C1, 'completed', 'Done Unrecorded', 'done-unrecorded', start='2026-11-16 09:00:00+00', end='2026-11-16 15:00:00+00', started='2026-11-16 09:00:00+00', finalized='2026-11-16 16:00:00+00', record=False)
session('inv', 14, C1, 'invalid', 'Invalid Night', 'invalid-night', start='2026-11-15 09:00:00+00', end='2026-11-15 15:00:00+00', reason='Wrong date')
insert('queue_sessions', ['id', 'club_id', 'title', 'state', 'started_at', 'finalized_at', 'cancelled_at', 'scheduled_start_at', 'scheduled_end_at',
                          'players_per_court', 'public_slug', 'source_command_id', 'record_games', 'accept_join_requests', 'minimum_games', 'request_formats', 'invalid_reason', 'updated_at'],
       sess_rows)

# publications: the removed page, a shared one (published copy), an unshared one (details only), an unrecorded one that was published
insert('session_result_snapshots', ['id', 'club_id', 'session_id', 'version', 'calculation_version', 'standings', 'awards', 'generated_at'], [
    [q(uid('c7', 11)), q(C1), q(S['f1']), '1', q('v1'), "'[]'::jsonb", "'{}'::jsonb", ts('2026-11-18 16:30:00+00')],
    [q(uid('c7', 13)), q(C1), q(S['f3']), '1', q('v1'), "'[]'::jsonb", "'{}'::jsonb", ts('2026-11-16 16:30:00+00')],
])
insert('session_publications', ['id', 'club_id', 'session_id', 'public_key', 'state', 'published_snapshot_id', 'public_results', 'published_slides', 'published_at', 'details_projection', 'participants_projection', 'deleted_at', 'last_synced_at', 'updated_at'], [
    [q(uid('c3', 8)), q(C1), q(S['removed']), q('pk-removed-0123456789'), "'deleted'::publication_state", 'NULL', 'NULL', 'ARRAY[]::result_slide[]', 'NULL', "'{}'::jsonb", "'[]'::jsonb", ts('2026-11-12 00:00:00+00'), 'now()', 'now()'],
    [q(uid('c3', 11)), q(C1), q(S['f1']), q('pk-shared-0123456789a'), "'published'::publication_state", q(uid('c7', 11)), "'{\"standings\":[]}'::jsonb", "ARRAY['standings']::result_slide[]", ts('2026-11-18 17:00:00+00'), "'{}'::jsonb", "'[]'::jsonb", 'NULL', 'now()', 'now()'],
    [q(uid('c3', 12)), q(C2), q(S['f2']), q('pk-unshared-0123456789'), "'details'::publication_state", 'NULL', 'NULL', 'ARRAY[]::result_slide[]', 'NULL', "'{}'::jsonb", "'[]'::jsonb", 'NULL', 'now()', 'now()'],
    [q(uid('c3', 13)), q(C1), q(S['f3']), q('pk-unrecorded-012345678'), "'published'::publication_state", q(uid('c7', 13)), "'{\"standings\":[]}'::jsonb", "ARRAY['standings']::result_slide[]", ts('2026-11-16 17:00:00+00'), "'{}'::jsonb", "'[]'::jsonb", 'NULL', 'now()', 'now()'],
])
# finalizations of the finished sessions (Compare reads committed ones only)
insert('session_finalizations', ['session_id', 'club_id', 'command_id', 'state', 'stream_manifest', 'manifest_digest', 'accepted_session_revision', 'policy_version_id', 'started_at', 'committed_at', 'facts_digest', 'updated_at'], [
    [q(S[k]), q(c), q(uid('c4', i)), "'committed'", "'[]'::jsonb", "decode(repeat('00', 32), 'hex')", '1', q(uid('c5', 1)), ts('2026-11-15 09:00:00+00'), ts('2026-11-18 16:00:00+00'), "decode(repeat('01', 32), 'hex')", 'now()']
    for i, (k, c) in enumerate((('f1', C1), ('f2', C2), ('f3', C1)), 1)
])

# ---- courts ----
COURT = {}
court_rows = []


def court(sess, key, n, label, created, removed=None):
    cid = uid('a6', n)
    COURT[(sess, key)] = cid
    club = C1 if sess in ('live', 'f1', 'f3') else C2
    court_rows.append([q(cid), q(club), q(S[sess]), q(label), ts(created), ts(removed), 'now()'])


for i, label in enumerate(('Court 1', 'Court 2', 'Court 3', 'Court 4'), 1):
    court('live', f'K{i}', i, label, f'2026-11-18 0{i}:00:00+00')
court('free', 'F1', 10, 'Court A', '2026-11-18 01:00:00+00')
court('free', 'F2', 11, 'Court B', '2026-11-18 02:00:00+00')
court('f1', 'X1', 20, 'Court X1', '2026-11-18 01:00:00+00')
court('f1', 'X2', 21, 'Court X2', '2026-11-18 02:00:00+00')
court('f1', 'X3', 22, 'Court X3', '2026-11-18 03:00:00+00', removed='2026-11-18 14:00:00+00')
court('f1', 'X4', 23, 'Court X4', '2026-11-18 04:00:00+00', removed='2026-11-18 14:00:00+00')
court('f2', 'Y1', 30, 'Court Y1', '2026-11-17 01:00:00+00')
court('f3', 'Z1', 40, 'Court Z1', '2026-11-16 01:00:00+00')
insert('session_courts', ['id', 'club_id', 'session_id', 'label', 'created_at', 'removed_at', 'updated_at'], court_rows)

# ---- roster entries ----
E = {}  # (session, key) -> id
entry_rows = []
_en = [0]


def entry(sess, key, club, cp_key, name, order, *, present=False, changed=None, level=None, checked=None, left=None, released=None, no_show=None):
    _en[0] += 1
    eid = uid('b1', _en[0])
    E[(sess, key)] = eid
    base = f'2026-11-0{1 + order // 60} 0{order % 60 // 10}:0{order % 10}:00+00'
    changed = changed or '2026-11-19 03:00:00+00'
    cp_id = CP[(club, cp_key)]
    entry_rows.append([q(eid), q(club), q(S[sess]), q(cp_id), 'NULL', q(name), q(present), ts(changed), q(level), ts(base), ts(base),
                       ts(released), "'removed'::roster_release_reason" if released else 'NULL', ts(no_show), ts(checked), ts(left), 'now()'])


# L1: the live night
L = 'live'
entry(L, 'A', C1, 'A', 'Alice Reyes', 1, present=True, changed='2026-11-19 03:05:00+00', level=4, checked='2026-11-19 03:05:00+00')
entry(L, 'B', C1, 'B', 'Ben Cruz', 2, present=True, level=3)
entry(L, 'C', C1, 'C', 'Cara Dizon', 3, present=True, level=7)
entry(L, 'D', C1, 'D', 'Dan Evans', 4, present=False, changed='2026-11-19 03:40:00+00', level=0, left='2026-11-19 03:40:00+00')
entry(L, 'E', C1, 'E', 'Eli Fox', 5, present=True, changed='2026-11-19 03:10:00+00', checked='2026-11-19 03:00:00+00')
entry(L, 'F', C1, 'F', 'Fay Go', 6, present=True, level=8)
entry(L, 'G', C1, 'G', 'Gio Hizon', 7, present=True, level=2)
entry(L, 'H', C1, 'H', 'Hal Ibarra Sr', 8, present=False)
entry(L, 'I', C1, 'I', 'Ivy Jose', 9, present=True, level=5)
entry(L, 'J', C1, 'J', 'Jay Kim', 10, present=True, level=99)
entry(L, 'K', C1, 'K', 'Kit Lo', 11, present=True, level=1)
entry(L, 'L', C1, 'L', 'Liz Mar', 12, present=True, released='2026-11-19 03:30:00+00')
entry(L, 'M', C1, 'M', 'Max Ng', 13, present=False, no_show='2026-11-19 03:35:00+00')
# L2: free courts; L3: finalizing
entry('free', 'A', C2, 'A', 'Alice Reyes', 1, present=True, level=4)
entry('free', 'B', C2, 'B', 'Ben Cruz', 2, present=True, level=3)
entry('wrap', 'B', C3, 'B', 'Ben Cruz', 1, present=False, level=3)
# prepared sessions
entry('big', 'A', C1, 'A', 'Alice Reyes', 13, level=4)
for g in range(1, 15):
    entry('big', f'g{g}', C1, f'g{g}', f'Guest {g:02d} Person', g if g <= 12 else g + 1, level=g % 9)
entry('wait', 'B', C1, 'B', 'Ben Cruz', 1, level=3)
entry('closed', 'A', C1, 'A', 'Alice Reyes', 1)
entry('cancelled', 'A', C1, 'A', 'Alice Reyes', 1)
entry('removed', 'A', C1, 'A', 'Alice Reyes', 1)
# F1: the finished night
F = 'f1'
for key, name, o, lv in (('A', 'Alice Reyes', 1, 4), ('B', 'Ben Cruz', 2, 3), ('D', 'Dan Evans', 3, 4), ('E', 'Eli Fox', 4, 5), ('F', 'Fay Go', 5, 5), ('H', 'Hal Ibarra Sr', 6, 2)):
    entry(F, key, C1, key, name, o, present=True, level=lv)
entry(F, 'Z', C1, 'Z', 'Zed Pua', 7, present=True, level=2, released='2026-11-18 13:00:00+00')
# F2: the unshared finished night in the other club
for key, name, o in (('A', 'Alice Reyes', 1), ('B', 'Ben Cruz', 2), ('C', 'Cara Dizon', 3)):
    entry('f2', key, C2, key, name, o, present=True, level=4)
# F3: the night that did not record games
for key, name, o in (('A', 'Alice Reyes', 1), ('B', 'Ben Cruz', 2)):
    entry('f3', key, C1, key, name, o, present=True, level=4)
insert('session_players', ['id', 'club_id', 'session_id', 'club_player_id', 'player_id_at_entry', 'name_snapshot', 'present', 'present_changed_at', 'skill_level_id',
                           'confirmed_at', 'joined_at', 'released_at', 'release_reason', 'no_show_at', 'self_checked_in_at', 'left_at', 'updated_at'], entry_rows)

# ---- waitlist, join requests, notices, invites ----
insert('session_waitlist', ['id', 'club_id', 'session_id', 'club_player_id', 'skill_level_id', 'added_at', 'demoted_at', 'demoted_confirmed_at', 'updated_at'], [
    [q(uid('ba', 1)), q(C1), q(S['wait']), q(CP[(C1, 'D')]), '1', ts('2026-11-02 10:00:00+00'), 'NULL', 'NULL', 'now()'],
    [q(uid('ba', 2)), q(C1), q(S['wait']), q(CP[(C1, 'A')]), '1', ts('2026-11-02 09:00:00+00'), 'NULL', 'NULL', 'now()'],
    [q(uid('ba', 3)), q(C1), q(S['wait']), q(CP[(C1, 'C')]), '1', ts('2026-11-02 12:00:00+00'), ts('2026-11-03 11:00:00+00'), ts('2026-11-01 08:00:00+00'), 'now()'],
])
insert('session_join_requests', ['id', 'club_id', 'session_id', 'name', 'stated_band', 'placement', 'status', 'requested_at', 'decided_at', 'club_player_id', 'player_id', 'updated_at'], [
    [q(uid('bb', 1)), q(C1), q(S['wait']), q('Alice Reyes'), "'unsure'", "'from_waitlist'::join_request_placement", "'confirmed'", ts('2026-11-05 00:00:00+00'), ts('2026-11-05 01:00:00+00'), q(CP[(C1, 'A')]), q(P[1]), 'now()'],
    [q(uid('bb', 2)), q(C1), q(S['wait']), q('Dan Evans'), "'unsure'", "'waitlist'::join_request_placement", "'pending'", ts('2026-11-05 00:00:00+00'), 'NULL', 'NULL', q(P[4]), 'now()'],
    [q(uid('bb', 3)), q(C1), q(S['wait']), q('Fay Go'), "'unsure'", "'slot'::join_request_placement", "'confirmed'", ts('2026-11-05 00:00:00+00'), ts('2026-11-05 01:00:00+00'), q(CP[(C1, 'F')]), q(P[6]), 'now()'],
    [q(uid('bb', 4)), q(C1), q(S['wait']), q('Eli Fox'), "'unsure'", "'slot'::join_request_placement", "'pending'", ts('2026-11-05 00:00:00+00'), 'NULL', 'NULL', q(P[5]), 'now()'],
    [q(uid('bb', 5)), q(C1), q(S['wait']), q('Eli Fox'), "'unsure'", "'slot'::join_request_placement", "'declined'", ts('2026-11-04 00:00:00+00'), ts('2026-11-05 01:00:00+00'), 'NULL', q(P[5]), 'now()'],
])
insert('session_drop_out_notices', ['id', 'club_id', 'session_id', 'session_player_id', 'player_id', 'status', 'created_at', 'closed_at'], [
    [q(uid('bd', 1)), q(C1), q(S['big']), q(E[('big', 'A')]), q(P[1]), "'open'::drop_out_notice_status", ts('2026-11-10 00:00:00+00'), 'NULL'],
    [q(uid('bd', 2)), q(C1), q(S['live']), q(E[('live', 'B')]), q(P[2]), "'closed'::drop_out_notice_status", ts('2026-11-10 00:00:00+00'), ts('2026-11-10 01:00:00+00')],
])
insert('session_invite_codes', ['id', 'club_id', 'session_id', 'player_id', 'code'], [
    [q(uid('bc', 1)), q(C1), q(S['big']), q(P[1]), q('alice0001')],
    [q(uid('bc', 2)), q(C1), q(S['wait']), q(P[2]), q('benny0001')],
])

# ---- matches ----
MATCH = {}
match_rows, part_rows, hold_rows, usage_rows, dec_rows = [], [], [], [], []
_mn = [0]
_op = [0]


def op():
    _op[0] += 1
    return uid('c6', _op[0])


def match(sess, no, state, fmt, a, b, *, qp=None, started=None, ended=None, placed=None, courts=(), decision=None, removed=None,
          held_at=None, subs=(), finished_with=None):
    """a, b: entry keys. decision: (kind, winner, scoreA, scoreB, confirmedAt). subs: (outKey, inKey, team, at, credit)."""
    _mn[0] += 1
    mid = uid('a3', _mn[0])
    MATCH[(sess, no)] = mid
    club = C1 if sess in ('live', 'f1', 'f3', 'inv', 'big') else C2
    match_rows.append([q(mid), q(club), q(S[sess]), str(no), f"{q(state)}::match_state", f"{q(fmt)}::match_format", 'NULL' if qp is None else str(qp), "'manual'::match_origin",
                       q(op()), ts(placed), ts(started), ts(ended), ts(removed), 'now()'])
    done = state in ('completed', 'invalid')
    seg = {}
    sub_in = {s[1] for s in subs}
    sub_out = {s[0] for s in subs}
    sub_ops = {}
    for sub in subs:
        sub_ops[sub[0]] = op()
    for team, keys in (('A', a), ('B', b)):
        for k in keys:
            joined_at = started or placed or '2026-11-19 03:00:00+00'
            left = None
            lop = None
            if k in sub_out:
                s = next(s for s in subs if s[0] == k)
                left, lop = s[3], sub_ops[k]
            fin = done and k not in sub_out
            part_rows.append([q(uid('a4', len(part_rows) + 1)), q(club), q(S[sess]), q(mid), q(E[(sess, k)]), f"{q(team)}::team_side", '1',
                              q(op()), 'NULL' if lop is None else q(lop), ts(joined_at), ts(left), q(fin), "'none'::substitution_credit", 'now()'])
    for out_k, in_k, team, at, credit in subs:
        part_rows.append([q(uid('a4', len(part_rows) + 1)), q(club), q(S[sess]), q(mid), q(E[(sess, in_k)]), f"{q(team)}::team_side", '1',
                          q(sub_ops[out_k]), 'NULL', ts(at), 'NULL', q(done), f"{q(credit)}::substitution_credit", 'now()'])
    dop = None
    if decision:
        kind, winner, sa, sb, conf = decision
        dop = op()
        dec_rows.append([q(mid), q(club), q(S[sess]), f"{q(kind)}::match_decision_kind", 'NULL' if winner is None else f"{q(winner)}::team_side",
                         'NULL' if sa is None else str(sa), 'NULL' if sb is None else str(sb), q(dop), ts(conf), q(club)])
    for c in courts:
        cid = COURT[(sess, c)]
        if state in ('on_court', 'active'):
            hold_rows.append([q(cid), q(club), q(S[sess]), q(mid), ts(held_at or started or placed)])
        usage_rows.append([q(uid('a7', len(usage_rows) + 1)), q(club), q(S[sess]), q(mid), q(cid), ts(started or placed), 'NULL' if done is False else ts(ended),
                           'NULL' if not done else q(dop), q(op())])
    return mid


# L1 matches
match('live', 1, 'active', 'doubles', ['A', 'B'], ['D', 'F'], started='2026-11-19 03:30:00+00', placed='2026-11-19 03:29:00+00', courts=['K1'])
match('live', 2, 'on_court', 'doubles', ['G', 'H'], ['I', 'J'], placed='2026-11-19 03:45:00+00', courts=['K2'])
match('live', 3, 'active', 'singles', ['C'], ['K'], started='2026-11-19 03:35:00+00', placed='2026-11-19 03:34:00+00', courts=['K3', 'K4'])
match('live', 4, 'waiting', 'doubles', ['E', 'I'], ['B', 'H'], qp=2)
match('live', 5, 'waiting', 'doubles', ['E', 'A'], ['F', 'D'], qp=None)
match('live', 6, 'waiting', 'doubles', ['A', 'C'], ['E', 'J'], qp=1)
match('live', 7, 'completed', 'doubles', ['A', 'D'], ['B', 'L'], started='2026-11-19 03:05:00+00', ended='2026-11-19 03:25:00+00',
      courts=['K1'], decision=('completed', 'A', 21, 17, '2026-11-19 03:25:00+00'), subs=[('D', 'E', 'A', '2026-11-19 03:15:00+00', 'incoming')])
match('live', 8, 'invalid', 'singles', ['F'], ['M'], started='2026-11-19 03:00:00+00', ended='2026-11-19 03:03:00+00', courts=['K2'],
      decision=('invalid', None, None, None, '2026-11-19 03:03:00+00'))
match('live', 9, 'completed', 'singles', ['B'], ['A'], started='2026-11-19 03:26:00+00', ended='2026-11-19 03:40:00+00', courts=['K2'],
      decision=('completed', 'B', None, None, '2026-11-19 03:40:00+00'))
# L2: a free court with a match behind it, and one never used
match('free', 1, 'completed', 'singles', ['A'], ['B'], started='2026-11-19 03:10:00+00', ended='2026-11-19 03:40:00+00', courts=['F1'],
      decision=('completed', 'A', 21, 10, '2026-11-19 03:40:00+00'))
# a big night's pre-drawn queue
match('big', 1, 'waiting', 'singles', ['g1'], ['g13'], qp=1)
match('big', 2, 'waiting', 'doubles', ['g12', 'A'], ['g2', 'g14'], qp=2)
# F1: the finished night. The five compare matches, then the odd ones for the record.
D1 = '2026-11-18'
fin = lambda t: f'{D1} {t}+00'
match(F, 1, 'completed', 'doubles', ['A', 'B'], ['D', 'E'], started=fin('10:00:00'), ended=fin('10:20:00'), courts=['X1'], decision=('completed', 'A', 21, 15, fin('10:20:00')))
match(F, 2, 'completed', 'doubles', ['A', 'B'], ['D', 'E'], started=fin('10:30:00'), ended=fin('10:50:00'), courts=['X2'], decision=('completed', 'B', 15, 21, fin('10:50:00')))
match(F, 3, 'completed', 'doubles', ['A', 'D'], ['B', 'E'], started=fin('11:00:00'), ended=fin('11:20:00'), courts=['X1'], decision=('completed', 'A', 21, 19, fin('11:20:00')))
# a court the match moved off before it finished: released by another operation, so it is not one of the match's courts
usage_rows.append([q(uid('a7', 900)), q(C1), q(S[F]), q(MATCH[(F, 3)]), q(COURT[(F, 'X3')]), ts(fin('11:00:00')), ts(fin('11:05:00')), q(uid('c6', 9000)), q(uid('c6', 9001))])
match(F, 4, 'completed', 'doubles', ['B', 'D'], ['A', 'E'], started=fin('11:30:00'), ended=fin('11:50:00'), courts=['X2'], decision=('completed', 'A', 21, 18, fin('11:50:00')))
match(F, 5, 'completed', 'singles', ['A'], ['B'], started=fin('12:00:00'), ended=fin('12:15:00'), courts=['X1'], decision=('completed', 'A', 21, 18, fin('12:15:00')))
match(F, 6, 'completed', 'singles', ['H'], ['Z'], started=fin('12:30:00'), ended=fin('12:45:00'), courts=['X3'], decision=('completed', 'A', 21, 3, fin('12:45:00')))
match(F, 7, 'invalid', 'doubles', ['A', 'F'], ['B', 'H'], started=fin('13:00:00'), ended=fin('13:02:00'), courts=['X2'], decision=('invalid', None, None, None, fin('13:02:00')))
match(F, 8, 'completed', 'doubles', ['E', 'F'], ['H', 'Z'], started=fin('13:05:00'), ended=fin('16:35:00'), courts=['X4'], decision=('completed', 'B', 15, 21, fin('16:35:00')))
match(F, 9, 'completed', 'singles', ['F'], ['H'], started=fin('13:45:00'), ended=fin('13:55:00'), courts=['X4'], decision=('completed', 'A', 21, 12, fin('13:55:00')))
match(F, 10, 'completed', 'singles', ['E'], ['F'], started=fin('13:30:00'), ended=fin('13:40:00'), courts=[], decision=('completed', 'B', None, None, fin('13:40:00')))
match(F, 11, 'waiting', 'singles', ['A'], ['B'], qp=1, removed=fin('09:50:00'))
# F2 (other club): Alice vs Ben singles (a compare match), and one without Alice
match('f2', 1, 'completed', 'singles', ['A'], ['B'], started='2026-11-17 10:00:00+00', ended='2026-11-17 10:15:00+00', courts=['Y1'], decision=('completed', 'A', 21, 9, '2026-11-17 10:15:00+00'))
match('f2', 2, 'completed', 'singles', ['B'], ['C'], started='2026-11-17 11:00:00+00', ended='2026-11-17 11:15:00+00', courts=['Y1'], decision=('completed', 'B', 9, 21, '2026-11-17 11:15:00+00'))
# F3: record games off
match('f3', 1, 'completed', 'singles', ['A'], ['B'], started='2026-11-16 10:00:00+00', ended='2026-11-16 10:15:00+00', courts=['Z1'], decision=('completed', None, None, None, '2026-11-16 10:15:00+00'))

insert('matches', ['id', 'club_id', 'session_id', 'match_no', 'state', 'format', 'queue_position', 'origin', 'source_operation_id', 'placed_at', 'started_at', 'ended_at', 'removed_at', 'updated_at'], match_rows)
insert('match_participations', ['id', 'club_id', 'session_id', 'match_id', 'session_player_id', 'team', 'segment_no', 'joined_operation_id', 'left_operation_id', 'joined_at', 'left_at', 'finished_with_match', 'credit_to', 'updated_at'], part_rows)
insert('match_decisions', ['match_id', 'club_id', 'session_id', 'kind', 'winning_team', 'team_a_score', 'team_b_score', 'source_operation_id', 'confirmed_at', 'actor_club_id'], dec_rows)
insert('active_court_holds', ['court_id', 'club_id', 'session_id', 'match_id', 'held_at'], hold_rows)
insert('match_court_usage', ['id', 'club_id', 'session_id', 'match_id', 'court_id', 'acquired_at', 'released_at', 'release_operation_id', 'acquire_operation_id'], usage_rows)

# ---- match requests (L1) ----
REQ = {}
req_rows, spot_rows = [], []


def request(n, key, who, fmt, requested, partners, opponents, status='open'):
    rid = uid('b4', n)
    REQ[key] = rid
    req_rows.append([q(rid), q(C1), q(S['live']), q(E[('live', who)]), f"{q(fmt)}::match_format", f"{q(status)}::match_request_status", ts(requested),
                     'NULL' if status == 'open' else ts(requested), 'now()'])
    for side, items in (('partner', partners), ('opponent', opponents)):
        for slot, k in enumerate(items):
            spot_rows.append([q(rid), q(C1), q(S['live']), f"{q(side)}::match_request_side", str(slot), 'NULL' if k is None else q(E[('live', k)])])


request(1, 'alice', 'A', 'doubles', '2026-11-19 03:50:00+00', ['B'], ['I', None])
request(2, 'fay_stale', 'F', 'singles', '2026-11-19 03:51:00+00', [], ['H'])
request(3, 'ben', 'B', 'doubles', '2026-11-19 03:52:00+00', ['A'], [None, None])
request(4, 'eli_old', 'E', 'singles', '2026-11-19 03:20:00+00', [], ['D'], status='closed')
request(5, 'eli', 'E', 'doubles', '2026-11-19 03:30:00+00', ['F'], [None, None])
request(6, 'cara_closed', 'C', 'singles', '2026-11-19 03:40:00+00', [], [None], status='closed')
insert('session_match_requests', ['id', 'club_id', 'session_id', 'session_player_id', 'format', 'status', 'requested_at', 'decided_at', 'updated_at'], req_rows)
insert('session_match_request_spots', ['request_id', 'club_id', 'session_id', 'side', 'slot_no', 'session_player_id'], spot_rows)

# ---- the facts behind Compare and the leaderboards (F1 matches 1-5 and F2 match 1) ----
fact_rows, sum_rows = [], []
_fc = [0]
games = {}


def facts(sess, no, fmt, a, b, winner, sa, sb, played, club):
    mid = MATCH[(sess, no)]
    teams = (('A', a, b), ('B', b, a))
    for team, mine, theirs in teams:
        for k in mine:
            _fc[0] += 1
            partners = [E[(sess, x)] for x in mine if x != k]
            opps = [E[(sess, x)] for x in theirs]
            pl = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6}.get(k)
            fact_rows.append([q(uid('b7', _fc[0])), q(club), q(S[sess]), q(mid), q(E[(sess, k)]), q(CP[(club, k)]), q(P[pl]) if pl else 'NULL',
                              ts(played), f"{q(fmt)}::match_format", f"{q(team)}::team_side", f"{q(winner)}::team_side", 'true', 'true', '4', uuids(partners), uuids(opps),
                              str(sa), str(sb), '1'])
            g = games.setdefault((sess, k), [0, 0])
            g[0] += 1
            g[1] += 1 if team == winner else 0


facts(F, 1, 'doubles', ['A', 'B'], ['D', 'E'], 'A', 21, 15, fin('10:20:00'), C1)
facts(F, 2, 'doubles', ['A', 'B'], ['D', 'E'], 'B', 15, 21, fin('10:50:00'), C1)
facts(F, 3, 'doubles', ['A', 'D'], ['B', 'E'], 'A', 21, 19, fin('11:20:00'), C1)
facts(F, 4, 'doubles', ['B', 'D'], ['A', 'E'], 'A', 21, 18, fin('11:50:00'), C1)
facts(F, 5, 'singles', ['A'], ['B'], 'A', 21, 18, fin('12:15:00'), C1)
facts('f2', 1, 'singles', ['A'], ['B'], 'A', 21, 9, '2026-11-17 10:15:00+00', C2)
insert('player_match_facts', ['id', 'club_id', 'session_id', 'match_id', 'session_player_id', 'club_player_id', 'player_id_at_finalization', 'played_at', 'format', 'team',
                              'winning_team', 'full_participation', 'standard_match', 'skill_level_snapshot_id', 'partner_entry_ids', 'opponent_entry_ids', 'team_a_score', 'team_b_score', 'fact_version'], fact_rows)
insert('club_session_player_summaries', ['id', 'club_id', 'session_id', 'club_player_id', 'session_player_id', 'full_games', 'standard_games', 'fun_games', 'wins', 'losses', 'summary_version', 'projected_at'], [
    [q(uid('b8', i)), q(C1 if sess == 'f1' else C2), q(S[sess]), q(CP[(C1 if sess == 'f1' else C2, k)]), q(E[(sess, k)]), str(n), str(n), '0', str(w), str(n - w), '1', ts('2026-11-18 16:00:00+00')]
    for i, ((sess, k), (n, w)) in enumerate(sorted(games.items()), 1)
])
# a stored rank for Alice and Ben, written by an algorithm the approved case lets through (#247)
stmts.append(f"""INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, input_counts, policy_version_id, algorithm_version, window_start, window_end, calculated_at, input_watermark, next_recheck_at, recent_standard_match_count, leaderboard_eligible, updated_at)
SELECT v.player_id::uuid, v.skill_level_id, v.numeric_rank, v.state::rank_state, '{{}}'::jsonb, (SELECT id FROM ranking_policy_versions ORDER BY version LIMIT 1), 'rank-test-v1',
       TIMESTAMPTZ '2026-01-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', TIMESTAMPTZ '2026-11-01 00:00:00+00', 1, TIMESTAMPTZ '2027-01-01 00:00:00+00', v.recent, true, now()
FROM (VALUES ({q(P[1])}, 4::smallint, 61.5::numeric, 'established', 3), ({q(P[2])}, 2::smallint, 40.0::numeric, 'provisional', 2)) AS v(player_id, skill_level_id, numeric_rank, state, recent);""")

# ---- the seed file ----
header = """-- Fictional clubs, players, sessions, matches and facts for the signed-in Player session page reads characterization
-- (access, my-night, match-history, match-request, match-request/options, players/{id}/compare). Generated by
-- apps/api/testdata/tools/gen-signedin-pubsession-fixtures.py: edit the generator, not this file. Applied on top of the
-- Prisma migrations. Accounts are linked with auth_provider 'supabase' (the TypeScript side); the Go test relinks them.
-- Foreign key checks and triggers are off for this load.
BEGIN;
SET LOCAL session_replication_role = replica;
"""
with open(os.path.join(OUT, 'pubsession.seed.sql'), 'w') as f:
    f.write(header + '\n' + '\n\n'.join(stmts) + '\n\nCOMMIT;\n')

# ---- cases ----
ORIGIN = 'http://localhost:9000'
cases = []
subjects = {n: SUBJ[n] for n in (1, 2, 3, 4, 5, 6, 8)}
who = {'alice': 1, 'ben': 2, 'cara': 3, 'dan': 4, 'eli': 5, 'fay': 6, 'nia': 8}


def case(name, path, player=None, origin=ORIGIN, scenario='base', now=None, approved=False):
    c = {'name': name, 'path': path, 'player': SUBJ[who[player]] if player else None, 'scenario': scenario}
    if origin:
        c['origin'] = origin
    if now:
        c['now'] = now
    if approved:
        c['approved'] = True
    cases.append(c)


SLUGS = {'live': 'live-now', 'free': 'free-courts', 'wrap': 'wrapping-up', 'big': 'big-night', 'wait': 'waitlist-night', 'closed': 'closed-night',
         'cancelled': 'cancelled-night', 'removed': 'removed-page', 'f1': 'done-shared', 'f2': 'done-unshared', 'f3': 'done-unrecorded', 'inv': 'invalid-night'}


def pub(sess, tail=''):
    return f'/api/public-sessions/{SLUGS[sess]}{tail}'


for sess, people in (
    ('live', ('alice', 'ben', 'cara', 'dan', 'eli', 'fay', 'nia')),
    ('free', ('alice', 'nia')), ('wrap', ('ben',)), ('big', ('alice', 'ben', 'nia')), ('wait', ('alice', 'dan', 'eli', 'fay', 'ben')),
    ('closed', ('alice',)), ('cancelled', ('alice',)), ('removed', ('alice',)), ('f1', ('alice', 'nia')), ('f3', ('alice',)), ('inv', ('alice',)),
):
    for p in people:
        case(f'access_{p}_{sess}', pub(sess, '/access'), p)
for sess, people in (
    ('live', ('alice', 'ben', 'cara', 'dan', 'eli', 'fay', 'nia')),
    ('free', ('alice',)), ('wrap', ('ben',)), ('big', ('alice', 'ben')), ('wait', ('alice', 'dan', 'eli', 'fay', 'ben')),
    ('closed', ('alice',)), ('cancelled', ('alice',)), ('removed', ('alice',)), ('f1', ('alice', 'nia')), ('f3', ('alice',)), ('inv', ('alice',)),
):
    for p in people:
        case(f'night_{p}_{sess}', pub(sess, '/my-night'), p)
for sess, people in (
    ('f1', ('alice', 'ben', 'nia')), ('f2', ('alice', 'ben', 'nia')), ('f3', ('alice',)), ('live', ('alice',)), ('big', ('alice',)),
    ('removed', ('alice',)), ('inv', ('alice',)),
):
    for p in people:
        case(f'history_{p}_{sess}', pub(sess, '/match-history'), p)
for sess, people in (('live', ('alice', 'ben', 'eli', 'fay', 'dan', 'nia')), ('big', ('alice',)), ('removed', ('alice',))):
    for p in people:
        case(f'request_{p}_{sess}', pub(sess, '/match-request'), p)
for sess, people in (('live', ('alice', 'ben', 'nia')), ('big', ('alice',)), ('f1', ('alice',)), ('removed', ('alice',))):
    for p in people:
        case(f'options_{p}_{sess}', pub(sess, '/match-request/options'), p)
# the origin, the sign-in and the slug
for tail in ('/access', '/my-night', '/match-history', '/match-request', '/match-request/options'):
    t = tail.strip('/').replace('/', '_')
    case(f'{t}_visitor', pub('live', tail), None)
    case(f'{t}_no_origin', pub('live', tail), 'alice', origin=None)
    case(f'{t}_other_origin', pub('live', tail), 'alice', origin='http://localhost:9001')
    case(f'{t}_evil_origin', pub('live', tail), 'alice', origin='https://evil.example')
    case(f'{t}_unknown_slug', '/api/public-sessions/no-such-session' + tail, 'alice')
# Restrictions (D-2026-11-19-12, task 2.2): "Not open to your level" on the Player's session page, by the pick; Big Night is a prepared session.
for scen in ('big_beginners', 'big_beginners_intermediate', 'big_per_level', 'big_per_level_no_slots', 'wait_beginners', 'live_beginners'):
    sess = scen.split('_')[0]
    for p in (('alice', 'ben', 'dan', 'eli', 'nia') if sess != 'live' else ('alice', 'ben')):
        case(f'access_{p}_{scen}', pub(sess, '/access'), p, scenario=scen)
        case(f'night_{p}_{scen}', pub(sess, '/my-night'), p, scenario=scen)
# Slot transfers (task 5.5): the Player's own pending transfer on Big Night (a prepared session) in the my-night read, in the MySlotTransfer shape.
for scen, people in (('big_transfer_rtr', ('alice', 'ben')), ('big_transfer_link', ('alice',)), ('big_transfer_link_claimed', ('alice',)),
                     ('big_transfer_rejected', ('alice',)), ('big_transfer_other_entry', ('alice',))):
    for p in people:
        case(f'night_{p}_{scen}', pub('big', '/my-night'), p, scenario=scen)
case('access_google_gate', pub('live', '/access'), 'alice', scenario='google_gate', now='2027-01-01T04:00:00.000Z')
case('night_google_gate', pub('live', '/my-night'), 'alice', scenario='google_gate', now='2027-01-01T04:00:00.000Z')
case('compare_google_gate', f'/api/players/{P[2]}/compare', 'alice', origin=None, scenario='google_gate', now='2027-01-01T04:00:00.000Z')

# compare
cmp = lambda name, other, who_='alice', query='', **kw: case(name, f'/api/players/{other}/compare{query}', who_, origin=None, **kw)
cmp('compare_alice_ben', P[2])
cmp('compare_alice_ben_all_page0', P[2], query='?filter=all&page=0')
cmp('compare_alice_ben_all_page1', P[2], query='?page=1')
cmp('compare_alice_ben_all_page5', P[2], query='?page=5')
cmp('compare_alice_ben_h2h', P[2], query='?filter=h2h')
cmp('compare_alice_ben_h2h_page1', P[2], query='?filter=h2h&page=1')
cmp('compare_alice_ben_together', P[2], query='?filter=together')
cmp('compare_alice_ben_together_page3', P[2], query='?filter=together&page=3')
cmp('compare_alice_ben_approved', P[2], approved=True)
cmp('compare_ben_alice', P[1], 'ben')
cmp('compare_alice_dan', P[4])
cmp('compare_alice_eli', P[5], query='?filter=together')
cmp('compare_dan_alice', P[1], 'dan')
cmp('compare_alice_self', P[1])
cmp('compare_alice_self_upper', P[1].upper())
cmp('compare_alice_cara_forbidden', P[3])
cmp('compare_cara_alice', P[1], 'cara')
cmp('compare_cara_self', P[3], 'cara')
cmp('compare_alice_nia_no_rtr', P[8])
cmp('compare_nia_alice', P[1], 'nia')
cmp('compare_alice_gio_unclaimed', P[7])
cmp('compare_alice_unknown', uid('d1', 99))
cmp('compare_alice_not_a_uuid', 'not-a-uuid')
cmp('compare_alice_ben_upper', P[2].upper())
cmp('compare_alice_ben_filter_bad', P[2], query='?filter=weekly')
cmp('compare_alice_ben_filter_empty', P[2], query='?filter=')
cmp('compare_alice_ben_page_empty', P[2], query='?page=')
cmp('compare_alice_ben_page_negative', P[2], query='?page=-1')
cmp('compare_alice_ben_page_text', P[2], query='?page=abc')
cmp('compare_alice_ben_page_fraction', P[2], query='?page=1.5')
cmp('compare_alice_ben_page_zeros', P[2], query='?page=0001')
cmp('compare_alice_ben_page_safe_max', P[2], query='?page=9007199254740991')
cmp('compare_alice_ben_page_unsafe', P[2], query='?page=9007199254740992')
cmp('compare_alice_ben_page_huge', P[2], query='?page=' + '9' * 400)
cmp('compare_alice_ben_filter_twice', P[2], query='?filter=h2h&filter=together')
cmp('compare_alice_bad_uuid_bad_filter', 'not-a-uuid', query='?filter=weekly')
cmp('compare_alice_self_bad_filter', P[1], query='?filter=weekly')
case('compare_visitor', f'/api/players/{P[2]}/compare', None, origin=None)
case('compare_other_app_origin', f'/api/players/{P[2]}/compare', 'alice', origin='https://evil.example')

# The Player's level at the club (clubLevelIdOf): Ben intermediate, Dan advanced, Eli beginner; Alice has her own assessment.
LEVELS = [f"UPDATE club_players SET saved_skill_level_id = {lvl}, saved_level_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE id = '{uid('e1', cp)}'" for cp, lvl in ((2, 3), (4, 6), (5, 0))]
reset = [
    "INSERT INTO feature_flags (key, name, description, value, updated_at) VALUES ('player_google_sign_in', 'Google sign-in for players', 'x', false, now()) ON CONFLICT DO NOTHING",
    "UPDATE feature_flags SET value = false WHERE key = 'player_google_sign_in'",
    "DELETE FROM session_slot_transfers",  # the slot transfer scenarios add rows of their own
]
def transfer_row(n, sender_entry, sender_cp, sender_player, recipient, status='pending', link=False, claimed=False):
    """A session_slot_transfers row on Big Night; a link carries a digest (never read) and a claimed one has its claimant."""
    digest = "decode('%s', 'hex')" % ('0b' * 32) if link else 'NULL'
    who = q(recipient) if recipient else 'NULL'
    decided = "TIMESTAMPTZ '2026-11-19 02:30:00+00'" if status != 'pending' else 'NULL'
    claimed_at = "TIMESTAMPTZ '2026-11-19 01:40:00+00'" if claimed else 'NULL'
    return ("INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id, "
            "link_token_digest, claimed_at, status, requested_at, decided_at) VALUES "
            f"({q(uid('f1', n))}, {q(C1)}, {q(S['big'])}, {q(sender_entry)}, {q(sender_cp)}, {q(sender_player)}, {who}, {digest}, "
            f"{claimed_at}, '{status}', TIMESTAMPTZ '2026-11-19 01:30:00+00', {decided})")


_A = (E[('big', 'A')], CP[(C1, 'A')], P[1])
_G = (E[('big', 'g1')], CP[(C1, 'g1')], P[3])
TRANSFER_SCENARIOS = {
    'big_transfer_rtr': [transfer_row(1, *_A, P[2])],
    'big_transfer_link': [transfer_row(1, *_A, None, link=True)],
    'big_transfer_link_claimed': [transfer_row(1, *_A, P[2], link=True, claimed=True)],
    'big_transfer_rejected': [transfer_row(1, *_A, P[2], status='rejected')],
    'big_transfer_other_entry': [transfer_row(1, *_G, P[2])],
}
out = {
    'now': NOW,
    'subjects': {k: v for k, v in ((name, SUBJ[n]) for name, n in who.items())},
    'passwordless': [],
    'reset': reset,
    'scenarios': {'base': [], 'google_gate': ["UPDATE feature_flags SET value = true WHERE key = 'player_google_sign_in'"],
                  'big_beginners': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'beginners' WHERE id = '{S['big']}'"],
                  'big_beginners_intermediate': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'beginners_intermediate' WHERE id = '{S['big']}'"],
                  'big_per_level': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'slots_per_band', beginner_slots = 2, intermediate_slots = 1, advanced_slots = 1 WHERE id = '{S['big']}'"],
                  'big_per_level_no_slots': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'slots_per_band', beginner_slots = 4, intermediate_slots = 0, advanced_slots = 0 WHERE id = '{S['big']}'"],
                  'wait_beginners': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'beginners' WHERE id = '{S['wait']}'"],
                  'live_beginners': [*LEVELS, f"UPDATE queue_sessions SET level_restriction = 'beginners' WHERE id = '{S['live']}'"],
                  **TRANSFER_SCENARIOS},
    'approved': ['rank-test-v1'],
    'cases': cases,
}
with open(os.path.join(OUT, 'pubsession.cases.json'), 'w') as f:
    json.dump(out, f, indent=2)
    f.write('\n')
print(f'{len(cases)} cases, {len(stmts)} statements')
