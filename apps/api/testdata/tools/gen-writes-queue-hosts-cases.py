#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/hosts.cases.json: the club's trusted hosts and a Queue Session's hosts (D-2026-11-22-01):
GET/POST /api/club/trusted-hosts, DELETE /api/club/trusted-hosts/{clubPlayerId}, GET/POST /api/sessions/{id}/hosts and
DELETE /api/sessions/{id}/hosts/{clubPlayerId}.

Run it, then the capture (capture-writes-queue.test.mjs -t hosts), which writes hosts.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-hosts-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/hosts.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/roster.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
PLAYER_SUBJECT = 'f4000000-0000-4000-8000-000000000001'
CLUB1, CLUB2, CLUB3 = (f'c9000000-0000-4000-8000-00000000000{n}' for n in (1, 2, 3))
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
TH = lambda n: f'a5100000-0000-4000-8000-0000000000{n:02d}'
SH = lambda n: f'a5200000-0000-4000-8000-0000000000{n:02d}'
UNKNOWN_CP = 'c6000000-0000-4000-8000-0000000000ff'
UNKNOWN_S = 'a3000000-0000-4000-8000-0000000000ff'
# Saved players of Smash Club: 1 Gus (guest, no level), 3 Ann (registered), 4 Ben (registered, not trusted), 6 Rex (deleted), 7 Hal (level 3, on S1..S4),
# 8 Ivy (level 4, on S2 and S3), 11 Kai (waiting on S3), 12 Lee (guest), 30 Olga (Other Club).
GUS, ANN, BEN, REX, HAL, IVY, KAI, LEE, OLGA = 1, 3, 4, 6, 7, 8, 11, 12, 30


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


cases = []


def case(name, steps, scenario='base', **kw):
    """A case. allow500 and goExpects given here belong to the last step."""
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


NOSUBJECT = {'goExpects': {'status': 401, 'code': 'unauthenticated'}}
# The ids a host's registration makes come from a random operation id (the route sends none): the case hides them.
RAND = {'session_hosts': ['id'], 'session_players': ['id', 'assessment_operation_id'], 'club_assessments': ['source_operation_id', 'session_player_id'],
        'session_waitlist': ['id'], 'player_notifications': ['source_id']}
TRUSTED_ID = {'club_trusted_hosts': ['id']}

# ---------------------------------------------------------------- scenarios
SCEN = {'base': []}
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"


def ts(day, hour=0):
    return f"TIMESTAMPTZ '2026-11-{day:02d} {hour:02d}:00:00+00'"


def trusted_sql(n, club, cp, added, removed=None):
    return (f"INSERT INTO club_trusted_hosts (id, club_id, club_player_id, added_at, removed_at, created_at, updated_at, revision) VALUES "
            f"('{TH(n)}', '{club}', '{CP(cp)}', {ts(added)}, {ts(removed) if removed else 'NULL'}, {ts(added)}, {ts(removed or added)}, 1)")


def host_sql(n, session, cp, name, assigned=15, removed=None, frozen=None, club=CLUB1):
    return (f"INSERT INTO session_hosts (id, club_id, session_id, club_player_id, assigned_at, removed_at, name_snapshot, frozen_at, created_at, updated_at, revision) VALUES "
            f"('{SH(n)}', '{club}', '{S[session]}', '{CP(cp)}', {ts(assigned)}, {ts(removed) if removed else 'NULL'}, '{name}', {ts(frozen) if frozen else 'NULL'}, {ts(assigned)}, {ts(removed or assigned)}, 1)")


# Hal, Ann, Gus, Ivy and Kai are trusted; Ivy's earlier row ended and Rex (deleted) and Olga (Other Club) have rows too.
TRUSTED = [trusted_sql(1, CLUB1, HAL, 10), trusted_sql(2, CLUB1, ANN, 11), trusted_sql(3, CLUB1, GUS, 12), trusted_sql(4, CLUB1, IVY, 13),
           trusted_sql(5, CLUB1, KAI, 14), trusted_sql(6, CLUB1, IVY, 8, 9), trusted_sql(7, CLUB1, REX, 9), trusted_sql(8, CLUB3, OLGA, 9)]
# S1 has Hal as a host (and Ivy, ended); S4 (done) has Hal frozen, Ann removed before it ended and Ben still unfrozen.
HOSTS = [host_sql(1, 1, HAL, 'Hal Guest'), host_sql(2, 1, IVY, 'Ivy Guest', 14, 16), host_sql(3, 4, HAL, 'Hal Guest', 12, None, 13),
         host_sql(4, 4, ANN, 'Ann Reyes', 12, 13), host_sql(5, 4, BEN, 'Ben Santos', 12)]
SCEN['trusted'] = TRUSTED
SCEN['hosts'] = TRUSTED + HOSTS
SCEN['trusted_only_hal'] = [trusted_sql(1, CLUB1, HAL, 10)]
SCEN['trusted_s2_free_slot'] = TRUSTED + [BASE['scenarios']['s2_free_slot'][0]]
SCEN['trusted_hal_released'] = TRUSTED + BASE['scenarios']['hal_released']
SCEN['trusted_hal_no_show'] = TRUSTED + BASE['scenarios']['hal_no_show']
SCEN['trusted_ann_full_name'] = TRUSTED + ["UPDATE players SET full_name = 'Ann Marie Reyes' WHERE id = 'd4000000-0000-4000-8000-000000000001'"]
SCEN['trusted_s1_with_hosts_ivy_not_registered'] = TRUSTED + HOSTS
SCEN['hosts_rex'] = TRUSTED + [host_sql(6, 1, REX, 'Rex Removed')]
SCEN['hosts_lapsed'] = [trusted_sql(9, CLUB2, 20, 10), host_sql(7, 7, 20, 'Larry Lapsed', club=CLUB2), host_sql(8, 8, 20, 'Larry Lapsed', club=CLUB2)]
SCEN['hosts_lapsed_trusted_larry'] = SCEN['hosts_lapsed']
# S2 is full and has Hal and Ivy; with Gus and Ben trusted the waitlist gets null-level rows.
SCEN['hosts_s3_with_hal'] = TRUSTED + [host_sql(1, 3, HAL, 'Hal Guest')]

# ---------------------------------------------------------------- GET /api/club/trusted-hosts
def get_trusted(**kw):
    return req('GET', '/api/club/trusted-hosts', **kw)


def add_trusted(cp, **kw):
    return req('POST', '/api/club/trusted-hosts', {'clubPlayerId': cp}, redact=['trustedHost.id'], redactOptional=True, **kw)


def remove_trusted(cp, **kw):
    return req('DELETE', f'/api/club/trusted-hosts/{cp}', **kw)


case('trusted_list_signed_out', get_trusted(who=None))
case('trusted_list_a_player_subject_is_not_a_club', get_trusted(who=PLAYER_SUBJECT, **NOSUBJECT))
case('trusted_list_empty', get_trusted())
case('trusted_list_current_rows_oldest_first_without_history_deleted_or_other_clubs', get_trusted(), scenario='trusted')
case('trusted_list_needs_no_entitlement', get_trusted(who=LAPSED), scenario='hosts_lapsed')
case('trusted_list_leaves_out_a_player_moved_into_another', get_trusted(), scenario='trusted_moved_out')
case('trusted_list_two_with_one_instant_are_ordered_by_id', get_trusted(), scenario='trusted_same_instant')

# ---------------------------------------------------------------- POST /api/club/trusted-hosts
case('trusted_add_signed_out', add_trusted(CP(GUS), who=None))
case('trusted_add_a_player_subject_is_not_a_club', add_trusted(CP(GUS), who=PLAYER_SUBJECT, **NOSUBJECT))
case('trusted_add_a_guest', add_trusted(CP(GUS)), redact=TRUSTED_ID)
case('trusted_add_a_registered_player_uses_the_full_name', add_trusted(CP(ANN)), scenario='trusted_ann_full_name_only', redact=TRUSTED_ID)
case('trusted_add_again_after_removal_makes_a_new_row', add_trusted(CP(IVY)), scenario='trusted_ivy_ended', redact=TRUSTED_ID)
case('trusted_add_already_trusted', add_trusted(CP(HAL)), scenario='trusted')
case('trusted_add_twice', [add_trusted(CP(GUS)), add_trusted(CP(GUS))], redact=TRUSTED_ID)
case('trusted_add_a_deleted_player', add_trusted(CP(REX)))
case('trusted_add_unknown_player', add_trusted(UNKNOWN_CP))
case('trusted_add_other_clubs_player', add_trusted(CP(OLGA)))
case('trusted_add_malformed_id', add_trusted('m'))
case('trusted_add_missing_id', req('POST', '/api/club/trusted-hosts', {}))
case('trusted_add_id_that_is_not_text', req('POST', '/api/club/trusted-hosts', {'clubPlayerId': 7}))
case('trusted_add_body_not_json', req('POST', '/api/club/trusted-hosts', rawBody='nope'))
case('trusted_add_without_a_body', req('POST', '/api/club/trusted-hosts'))
case('trusted_add_unknown_fields_are_ignored', req('POST', '/api/club/trusted-hosts', {'clubPlayerId': CP(GUS), 'role': 'admin'}, redact=['trustedHost.id']), redact=TRUSTED_ID)
case('trusted_add_needs_an_entitlement', add_trusted(CP(20), who=LAPSED))
case('trusted_add_entitlement_is_checked_before_the_id', add_trusted('m', who=LAPSED))
case('trusted_add_body_is_read_before_the_entitlement', req('POST', '/api/club/trusted-hosts', rawBody='nope', who=LAPSED))

# ---------------------------------------------------------------- DELETE /api/club/trusted-hosts/{clubPlayerId}
case('trusted_remove_signed_out', remove_trusted(CP(HAL), who=None), scenario='trusted')
case('trusted_remove_a_player_subject_is_not_a_club', remove_trusted(CP(HAL), who=PLAYER_SUBJECT, **NOSUBJECT), scenario='trusted')
case('trusted_remove', remove_trusted(CP(HAL)), scenario='trusted')
case('trusted_remove_uses_the_full_name', remove_trusted(CP(ANN)), scenario='trusted_ann_full_name')
case('trusted_remove_keeps_the_session_hosts', remove_trusted(CP(HAL)), scenario='hosts')
case('trusted_remove_twice', [remove_trusted(CP(HAL)), remove_trusted(CP(HAL))], scenario='trusted')
case('trusted_remove_one_that_is_not_trusted', remove_trusted(CP(BEN)), scenario='trusted')
case('trusted_remove_one_whose_trust_ended', remove_trusted(CP(IVY)), scenario='trusted_ivy_ended')
case('trusted_remove_a_deleted_player', remove_trusted(CP(REX)), scenario='trusted')
case('trusted_remove_unknown_player', remove_trusted(UNKNOWN_CP), scenario='trusted')
case('trusted_remove_other_clubs_player', remove_trusted(CP(OLGA)), scenario='trusted')
case('trusted_remove_malformed_id', remove_trusted('m'), scenario='trusted')
case('trusted_remove_needs_an_entitlement', remove_trusted(CP(20), who=LAPSED), scenario='hosts_lapsed')
case('trusted_remove_entitlement_is_checked_before_the_id', remove_trusted('m', who=LAPSED), scenario='hosts_lapsed')
case('trusted_remove_then_add_again', [remove_trusted(CP(HAL)), add_trusted(CP(HAL))], scenario='trusted', redact=TRUSTED_ID)


# ---------------------------------------------------------------- GET /api/sessions/{id}/hosts
def get_hosts(session, **kw):
    return req('GET', f'/api/sessions/{session}/hosts', **kw)


def add_host(session, cp, **kw):
    return req('POST', f'/api/sessions/{session}/hosts', {'clubPlayerId': cp}, **kw)


def remove_host(session, cp, **kw):
    return req('DELETE', f'/api/sessions/{session}/hosts/{cp}', **kw)


case('hosts_list_signed_out', get_hosts(S[1], who=None))
case('hosts_list_a_player_subject_is_not_a_club', get_hosts(S[1], who=PLAYER_SUBJECT, **NOSUBJECT))
case('hosts_list_current_rows_by_their_snapshot_name', get_hosts(S[1]), scenario='hosts')
case('hosts_list_none', get_hosts(S[2]), scenario='hosts')
case('hosts_list_of_a_finished_session_is_the_frozen_rows', get_hosts(S[4]), scenario='hosts')
case('hosts_list_unknown_session', get_hosts(UNKNOWN_S), scenario='hosts')
case('hosts_list_malformed_session_id', get_hosts('m'), scenario='hosts')
case('hosts_list_other_clubs_session', get_hosts(S[9]), scenario='hosts')
case('hosts_list_needs_no_entitlement', get_hosts(S[7], who=LAPSED), scenario='hosts_lapsed')

# ---------------------------------------------------------------- POST /api/sessions/{id}/hosts
case('host_add_signed_out', add_host(S[1], CP(HAL), who=None), scenario='trusted')
case('host_add_a_player_subject_is_not_a_club', add_host(S[1], CP(HAL), who=PLAYER_SUBJECT, **NOSUBJECT), scenario='trusted')
case('host_add_with_a_level_takes_an_open_slot', add_host(S[1], CP(IVY)), scenario='trusted', redact=RAND)
case('host_add_with_a_level_to_a_full_prepared_session_waits', add_host(S[6], CP(IVY)), scenario='trusted_s6_full', redact=RAND)
case('host_add_with_no_level_takes_an_open_slot_with_no_assessment', add_host(S[1], CP(GUS)), scenario='trusted', redact=RAND)
case('host_add_with_no_level_to_a_full_session_waits_with_no_level', add_host(S[2], CP(GUS)), scenario='trusted', redact=RAND)
case('host_add_a_registered_player_with_no_level_to_a_full_session_waits', add_host(S[6], CP(ANN)), scenario='trusted_s6_full', redact=RAND)
case('host_add_on_an_open_slot_after_one_frees', add_host(S[2], CP(GUS)), scenario='trusted_s2_free_slot', redact=RAND)
case('host_add_already_on_the_roster_makes_no_second_registration', add_host(S[1], CP(HAL)), scenario='trusted', redact=RAND)
case('host_add_already_on_the_waitlist_makes_no_second_registration', add_host(S[2], CP(ANN)), scenario='trusted', redact=RAND)
case('host_add_released_player_takes_the_slot_back', add_host(S[1], CP(HAL)), scenario='trusted_hal_released', redact=RAND)
case('host_add_a_no_show_entry_counts_as_not_registered', add_host(S[3], CP(HAL)), scenario='trusted_hal_no_show', redact=RAND)
case('host_add_on_a_live_session_to_a_player_on_the_roster', add_host(S[3], CP(HAL)), scenario='trusted', redact=RAND)
case('host_add_on_a_live_session_to_a_player_who_waits', add_host(S[3], CP(KAI)), scenario='trusted', redact=RAND)
case('host_add_on_a_live_session_needs_a_level', add_host(S[3], CP(GUS)), scenario='trusted')
case('host_add_on_a_live_session_with_a_level_not_yet_registered', add_host(S[3], CP(ANN)), scenario='trusted_ann_level', redact=RAND)
case('host_add_on_a_live_session_does_not_close_match_requests', add_host(S[3], CP(HAL)), scenario='trusted', redact=RAND)
case('host_add_not_trusted', add_host(S[1], CP(BEN)), scenario='trusted')
case('host_add_not_trusted_names_the_saved_name_not_the_full_name', add_host(S[1], CP(ANN)), scenario='trusted_ann_full_name_untrusted')
case('host_add_whose_trust_ended', add_host(S[1], CP(IVY)), scenario='trusted_ivy_ended')
case('host_add_a_deleted_player_is_no_longer_a_saved_player', add_host(S[1], CP(REX)), scenario='trusted')
case('host_add_already_a_host', add_host(S[1], CP(HAL)), scenario='hosts')
case('host_add_twice', [add_host(S[1], CP(IVY)), add_host(S[1], CP(IVY))], scenario='trusted', redact=RAND)
case('host_add_after_removal_makes_a_new_row', add_host(S[1], CP(IVY)), scenario='hosts', redact=RAND)
case('host_add_unknown_player', add_host(S[1], UNKNOWN_CP), scenario='trusted')
case('host_add_other_clubs_player', add_host(S[1], CP(OLGA)), scenario='trusted')
case('host_add_malformed_player_id', add_host(S[1], 'm'), scenario='trusted')
case('host_add_missing_player_id', req('POST', f'/api/sessions/{S[1]}/hosts', {}), scenario='trusted')
case('host_add_body_not_json', req('POST', f'/api/sessions/{S[1]}/hosts', rawBody='nope'), scenario='trusted')
case('host_add_on_a_finished_session', add_host(S[4], CP(IVY)), scenario='trusted')
case('host_add_unknown_session', add_host(UNKNOWN_S, CP(IVY)), scenario='trusted')
case('host_add_malformed_session_id', add_host('m', CP(IVY)), scenario='trusted')
case('host_add_other_clubs_session', add_host(S[9], CP(IVY)), scenario='trusted')
case('host_add_on_a_lapsed_prepared_session', add_host(S[7], CP(20), who=LAPSED), scenario='hosts_lapsed')
case('host_add_on_a_lapsed_live_session_started_under_a_term', add_host(S[8], CP(20), who=LAPSED), scenario='hosts_lapsed_no_hosts', redact=RAND)
case('host_add_recomputes_a_calculated_minimum', add_host(S[1], CP(IVY)), scenario='trusted', redact=RAND)

# ---------------------------------------------------------------- DELETE /api/sessions/{id}/hosts/{clubPlayerId}
case('host_remove_signed_out', remove_host(S[1], CP(HAL), who=None), scenario='hosts')
case('host_remove_a_player_subject_is_not_a_club', remove_host(S[1], CP(HAL), who=PLAYER_SUBJECT, **NOSUBJECT), scenario='hosts')
case('host_remove_keeps_the_players_place_and_trust', remove_host(S[1], CP(HAL)), scenario='hosts')
case('host_remove_uses_the_full_name', remove_host(S[1], CP(ANN)), scenario='hosts_ann_full_name')
case('host_remove_twice', [remove_host(S[1], CP(HAL)), remove_host(S[1], CP(HAL))], scenario='hosts')
case('host_remove_one_who_is_not_a_host', remove_host(S[1], CP(ANN)), scenario='hosts')
case('host_remove_one_whose_hosting_ended', remove_host(S[1], CP(IVY)), scenario='hosts')
case('host_remove_a_deleted_player_is_still_removable', remove_host(S[1], CP(REX)), scenario='hosts_rex')
case('host_remove_a_player_who_is_no_host_of_this_session', remove_host(S[2], CP(HAL)), scenario='hosts')
case('host_remove_unknown_player', remove_host(S[1], UNKNOWN_CP), scenario='hosts')
case('host_remove_other_clubs_player', remove_host(S[1], CP(OLGA)), scenario='hosts')
case('host_remove_malformed_player_id', remove_host(S[1], 'm'), scenario='hosts')
case('host_remove_on_a_finished_session', remove_host(S[4], CP(HAL)), scenario='hosts')
case('host_remove_unknown_session', remove_host(UNKNOWN_S, CP(HAL)), scenario='hosts')
case('host_remove_malformed_session_id', remove_host('m', CP(HAL)), scenario='hosts')
case('host_remove_other_clubs_session', remove_host(S[9], CP(HAL)), scenario='hosts')
case('host_remove_on_a_lapsed_prepared_session', remove_host(S[7], CP(20), who=LAPSED), scenario='hosts_lapsed')
case('host_remove_on_a_lapsed_live_session_started_under_a_term', remove_host(S[8], CP(20), who=LAPSED), scenario='hosts_lapsed')
case('host_remove_on_a_live_session', remove_host(S[3], CP(HAL)), scenario='hosts_s3_with_hal')
case('host_remove_recomputes_a_calculated_minimum', remove_host(S[1], CP(HAL)), scenario='hosts')

# More scenarios the cases above name.
SCEN['trusted_moved_out'] = TRUSTED + ["UPDATE club_players SET removed_at = TIMESTAMPTZ '2026-11-18 00:00:00+00', linked_to_club_player_id = '" + CP(ANN) + "' WHERE id = '" + CP(KAI) + "'"]
SCEN['trusted_same_instant'] = [trusted_sql(2, CLUB1, ANN, 11), trusted_sql(1, CLUB1, HAL, 11)]
SCEN['trusted_ann_full_name_only'] = ["UPDATE players SET full_name = 'Ann Marie Reyes' WHERE id = 'd4000000-0000-4000-8000-000000000001'"]
SCEN['trusted_ivy_ended'] = [trusted_sql(6, CLUB1, IVY, 8, 9)]
SCEN['trusted_ann_full_name_untrusted'] = ["UPDATE players SET full_name = 'Ann Marie Reyes' WHERE id = 'd4000000-0000-4000-8000-000000000001'"]
SCEN['hosts_ann_full_name'] = TRUSTED + [host_sql(9, 1, ANN, 'Ann Reyes'), "UPDATE players SET full_name = 'Ann Marie Reyes' WHERE id = 'd4000000-0000-4000-8000-000000000001'"]
SCEN['hosts_lapsed_no_hosts'] = [trusted_sql(9, CLUB2, 20, 10)]
# Ann has a saved level (from another night): a host on a live session needs one to take a place.
SCEN['trusted_ann_level'] = TRUSTED + [
    "INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, skill_level_id, source_operation_id, assessed_at, received_at, accepted_revision, actor_club_id) "
    f"VALUES ('a0300000-0000-4000-8000-000000000201', '{CLUB1}', '{CP(ANN)}', '{S[4]}', 'a7000000-0000-4000-8000-000000000007', 4, 'a0300000-0000-4000-8000-000000000301', {ts(12)}, {ts(12)}, 1, '{CLUB1}')"]
# S6 holds four per court on one court: with four live entries it is full.
SCEN['trusted_s6_full'] = TRUSTED + [
    f"INSERT INTO session_players (id, club_id, session_id, club_player_id, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) "
    f"VALUES ('a7000000-0000-4000-8000-00000000006{n}', '{CLUB1}', '{S[6]}', '{CP(c)}', '{name}', false, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)"
    for n, c, name in ((1, GUS + 1, 'Gail Guest'), (2, HAL, 'Hal Guest'), (3, LEE, 'Lee Guest'), (4, 9, 'Jo Guest'))]

# ---------------------------------------------------------------- snapshot
SNAPSHOT = [dict(s) for s in BASE['snapshot'] if s['name'] in
            ('queue_sessions', 'session_players', 'club_assessments', 'session_waitlist', 'session_match_requests', 'player_notifications')]
SNAPSHOT += [
    {'name': 'club_trusted_hosts', 'sql': "SELECT id, club_id, club_player_id, added_at, removed_at, created_at, updated_at, revision::text AS revision FROM club_trusted_hosts ORDER BY club_player_id, added_at, id"},
    {'name': 'session_hosts', 'sql': "SELECT id, club_id, session_id, club_player_id, assigned_at, removed_at, name_snapshot, frozen_at, created_at, updated_at, revision::text AS revision FROM session_hosts ORDER BY session_id, club_player_id, assigned_at, id"},
]
for s in SNAPSHOT:
    if s['name'] == 'session_match_requests':
        s['sql'] = "SELECT id, session_id, session_player_id, format, status, requested_at, decided_at, match_id, revision::text AS revision, updated_at FROM session_match_requests ORDER BY id"

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
