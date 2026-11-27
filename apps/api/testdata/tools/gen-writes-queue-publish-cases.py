#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/publish.cases.json: Publish results (POST /api/sessions/{id}/results/publication) of the Queue app.
The result snapshot it reads is written by the finalization drive (see the finalize group), so these cases seed one (a scenario).

Run it, then the capture (capture-writes-queue.test.mjs -t publish), which writes publish.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-publish-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/publish.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/match.cases.json')))
SCEN = dict(BASE['scenarios'])
SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
CLUB1 = 'c9000000-0000-4000-8000-000000000001'
S = {n: f'a3000000-0000-4000-8000-0000000000{n:02d}' for n in range(1, 10)}
SP = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'
CMD = lambda n: f'b6000000-0000-4000-8000-{n:012d}'
UNKNOWN = 'a3000000-0000-4000-8000-0000000000ff'
NOW = "TIMESTAMPTZ '2026-11-19 02:00:00+00'"
cases = []


def req(sid, body, who=SMASH, **kw):
    return {'method': 'POST', 'path': f'/api/sessions/{sid}/results/publication', 'who': who, 'body': body, **kw}


def case(name, steps, scenario='snapshot', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    cases.append({'name': name, 'scenario': scenario, 'steps': steps, **kw})


def pub(n=1, slides=('standings', 'awards'), off=None, sid=S[4], **kw):
    body = {'commandId': CMD(n), 'slides': list(slides)}
    if off is not None:
        body['includeOffDay'] = off
    return req(sid, body, **kw)


STANDINGS = json.dumps([{'position': 1, 'name': 'Hal', 'wins': 3, 'losses': 1, 'games': 4, 'playerId': 'd4000000-0000-4000-8000-000000000001', 'rtrId': 'RTR-X'}, {'position': 2, 'name': 'Ann', 'wins': 1, 'losses': 3, 'games': 4, 'sessionPlayerId': SP(7)}])
AWARDS = json.dumps({'mvp': {'name': 'Hal', 'evidence': {'games': 4}}, 'mostImproved': {'name': 'Ann', 'priorSessions': 2, 'delta': 5}, 'baseline': 'prototype-reference'})
OFFDAY = json.dumps([{'name': 'Jo', 'priorSessions': 2, 'note': 'private'}])


def snapshot_sql(session, version=1, awards=AWARDS, off=OFFDAY, n=1):
    offsql = 'NULL' if off is None else f"'{off}'::jsonb"
    return (f"INSERT INTO session_result_snapshots (id, club_id, session_id, version, calculation_version, standings, awards, off_day, baseline_session_ids, generated_at) VALUES "
            f"('a8000000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{session}', {version}, 'prototype-reference', '{STANDINGS}'::jsonb, '{awards}'::jsonb, {offsql}, '{{}}', {NOW})")


def summary_sql(n, entry, club_player, player, games):
    return (f"INSERT INTO club_session_player_summaries (id, club_id, session_id, session_player_id, club_player_id, player_id_snapshot, full_games, standard_games, fun_games, wins, losses, skill_level_snapshot_id, summary_version, projected_at) VALUES "
            f"('a8300000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S[4]}', '{SP(entry)}', '{club_player}', {repr(player) if player else 'NULL'}, {games}, {games}, 0, 1, {games - 1}, 3, 1, {NOW})")


ANN_P, BEN_P = 'd4000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002'
ANN_CP, BEN_CP = 'c6000000-0000-4000-8000-000000000003', 'c6000000-0000-4000-8000-000000000004'
roster = lambda n, cp, name, player: (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, created_at, updated_at, revision) VALUES "
                                      f"('{SP(n)}', '{CLUB1}', '{S[4]}', '{cp}', {repr(player) if player else 'NULL'}, '{name}', true, {NOW}, 3, {NOW}, {NOW}, {NOW}, {NOW}, 1)")
SCEN['snapshot'] = [snapshot_sql(S[4])]
SCEN['snapshot_no_off_day'] = [snapshot_sql(S[4], off=None)]
SCEN['snapshot_two_versions'] = [snapshot_sql(S[4], 1, n=1), snapshot_sql(S[4], 2, awards=json.dumps({'mvp': None, 'mostImproved': None}), n=2)]
SCEN['snapshot_no_awards_winners'] = [snapshot_sql(S[4], awards=json.dumps({'mvp': None, 'mostImproved': None}))]
SCEN['snapshot_with_players'] = SCEN['snapshot'] + [roster(50, ANN_CP, 'Ann Reyes', ANN_P), roster(51, BEN_CP, 'Ben Santos', BEN_P),
                                                      summary_sql(1, 7, 'c6000000-0000-4000-8000-000000000007', None, 4), summary_sql(2, 50, ANN_CP, ANN_P, 1), summary_sql(3, 51, BEN_CP, BEN_P, 3)]
SCEN['snapshot_with_an_attribution'] = SCEN['snapshot_with_players'] + [
    f"INSERT INTO player_history_attributions (id, club_id, club_player_id, player_id, confirmed_at, confirmation_evidence, source_command_id) VALUES ('a8100000-0000-4000-8000-000000000001', '{CLUB1}', 'c6000000-0000-4000-8000-000000000007', '{BEN_P}', {NOW}, '{{}}', 'a8200000-0000-4000-8000-000000000001')",
    f"INSERT INTO player_history_attributions (id, club_id, club_player_id, player_id, confirmed_at, confirmation_evidence, source_command_id, revoked_at, revoke_reason) VALUES ('a8100000-0000-4000-8000-000000000002', '{CLUB1}', 'c6000000-0000-4000-8000-000000000007', '{ANN_P}', {NOW}, '{{}}', 'a8200000-0000-4000-8000-000000000002', {NOW}, 'mistake')"]
SCEN['snapshot_record_off'] = SCEN['snapshot'] + [f"UPDATE queue_sessions SET record_games = false WHERE id = '{S[4]}'"]
SCEN['snapshot_publication_deleted'] = SCEN['snapshot'] + [
    f"INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, deleted_at, last_synced_at, created_at, updated_at) VALUES ('a3900000-0000-4000-8000-000000000004', '{CLUB1}', '{S[4]}', 'goneGoneGoneGone04', 'deleted', '{{}}', '[]', {NOW}, {NOW}, {NOW}, {NOW})"]
SCEN['snapshot_details_publication'] = SCEN['snapshot'] + [
    f"INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, last_synced_at, created_at, updated_at) VALUES ('a3900000-0000-4000-8000-000000000005', '{CLUB1}', '{S[4]}', 'detailsDetailsDetails5', 'details', '{{\"title\": \"old\"}}', '[]', {NOW}, {NOW}, {NOW})"]
SCEN['snapshot_cycle'] = SCEN['snapshot']
SCEN['snapshot_on_live'] = [snapshot_sql(S[3])]
SCEN['snapshot_venue_address'] = SCEN['snapshot'] + [f"UPDATE queue_sessions SET venue_name = 'Smash Hall', venue_address = 'Cebu City' WHERE id = '{S[4]}'"]
SCEN['snapshot_lapsed'] = [snapshot_sql(S[4])]
RED = {'session_publications': ['id', 'public_key'], 'session_publication_events': ['id', 'publication_id'], 'player_notifications': ['source_id', 'created_at']}

case('publish_signed_out', pub(who=None))
case('publish_body_not_json', {'method': 'POST', 'path': f'/api/sessions/{S[4]}/results/publication', 'who': SMASH, 'rawBody': 'nope'})
case('publish_both_slides', pub(), redact=RED)
case('publish_standings_only', pub(slides=['standings']), redact=RED)
case('publish_awards_only', pub(slides=['awards']), redact=RED)
case('publish_with_off_day', pub(slides=['awards'], off=True), redact=RED)
case('publish_with_off_day_and_both_slides', pub(off=True), redact=RED)
case('publish_off_day_without_the_awards_slide', pub(slides=['standings'], off=True))
case('publish_off_day_not_true_is_excluded', pub(off='yes'), redact=RED)
case('publish_with_off_day_and_no_stored_off_day', pub(slides=['awards'], off=True), 'snapshot_no_off_day', redact=RED)
case('publish_no_slides', pub(slides=[]))
case('publish_slides_not_a_list', req(S[4], {'commandId': CMD(1), 'slides': 'standings'}))
case('publish_an_unknown_slide', pub(slides=['standings', 'photos']))
case('publish_slides_that_are_not_text_are_dropped', req(S[4], {'commandId': CMD(1), 'slides': ['standings', 5, None]}), redact=RED)
case('publish_a_slide_twice_is_kept_once', pub(slides=['awards', 'awards', 'standings']), redact=RED)
case('publish_the_slides_are_checked_before_the_session_lookup', pub(slides=['x'], sid=UNKNOWN))
case('publish_without_a_command_id', req(S[4], {'slides': ['standings']}))
case('publish_a_malformed_command_id', req(S[4], {'commandId': 'x', 'slides': ['standings']}))
case('publish_twice_same_command_returns_the_first_answer', [pub(1), pub(1, slides=['awards'], off=True)], redact=RED)
case('publish_again_replaces_the_selection', [pub(1, off=True), pub(2, slides=['standings'])], redact=RED)
case('publish_again_never_carries_off_day_over', [pub(1, slides=['awards'], off=True), pub(2, slides=['awards'])], redact=RED)
case('publish_after_a_second_snapshot_version_uses_the_latest', pub(), 'snapshot_two_versions', redact=RED)
case('publish_with_no_winners', pub(), 'snapshot_no_awards_winners', redact=RED)
case('publish_a_command_id_used_for_another_session', pub(1, sid=S[3]), 'command_used_elsewhere', redact=RED)
SCEN['command_used_elsewhere'] = SCEN['snapshot'] + [
    f"INSERT INTO session_publications (id, club_id, session_id, public_key, state, details_projection, participants_projection, last_synced_at, created_at, updated_at) VALUES ('a3900000-0000-4000-8000-000000000006', '{CLUB1}', '{S[4]}', 'elsewhereElsewhere06', 'details', '{{}}', '[]', {NOW}, {NOW}, {NOW})",
    f"INSERT INTO session_publication_events (id, club_id, session_id, publication_id, snapshot_id, slides, include_off_day, actor_club_id, source_command_id, occurred_at) VALUES ('a3a00000-0000-4000-8000-000000000001', '{CLUB1}', '{S[4]}', 'a3900000-0000-4000-8000-000000000006', 'a8000000-0000-4000-8000-000000000001', '{{standings}}', false, '{CLUB1}', '{CMD(1)}', {NOW})"]
case('publish_a_session_that_is_not_finished', pub(1, sid=S[3]), 'snapshot_on_live')
case('publish_a_prepared_session', pub(1, sid=S[1]))
case('publish_with_record_games_off', pub(), 'snapshot_record_off', redact=RED)
case('publish_before_the_results_are_ready', pub(), 'base')
case('publish_a_removed_public_page', pub(), 'snapshot_publication_deleted')
case('publish_over_a_details_publication', pub(), 'snapshot_details_publication', redact=RED)
case('publish_a_venue_address_in_the_details', pub(), 'snapshot_venue_address', redact=RED)
case('publish_notifies_the_players_who_played', pub(), 'snapshot_with_players', redact=RED)
case('publish_notifies_the_linked_players_of_a_guest', pub(), 'snapshot_with_an_attribution', redact=RED)
case('publish_again_notifies_again', [pub(1), pub(2, slides=['standings'])], 'snapshot_with_players', redact=RED)
case('publish_unknown_session', pub(sid=UNKNOWN))
case('publish_malformed_session_id', pub(sid='m'), allow500=True, goExpects={'status': 404, 'code': 'not_found'})
case('publish_another_clubs_session', pub(sid=S[9]))
case('publish_a_session_of_a_lapsed_club', pub(sid=S[7], who=LAPSED))
case('publish_two_at_once_same_command', {'parallel': [pub(1)] * 2}, redact=RED)

SNAPSHOT = list(BASE['snapshot']) + [
    {'name': 'session_publications', 'sql': "SELECT id, session_id, public_key, state, details_projection::text AS details_projection, participants_projection::text AS participants_projection, published_snapshot_id, published_slides::text AS published_slides, include_off_day, public_results::text AS public_results, published_at, expiry_cycle_id, last_synced_at, deleted_at, revision::text AS revision, created_at, updated_at FROM session_publications ORDER BY session_id"},
    {'name': 'session_publication_events', 'sql': "SELECT id, session_id, publication_id, snapshot_id, slides::text AS slides, include_off_day, actor_club_id, device_id, source_command_id, occurred_at FROM session_publication_events ORDER BY source_command_id"},
]
doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}
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
