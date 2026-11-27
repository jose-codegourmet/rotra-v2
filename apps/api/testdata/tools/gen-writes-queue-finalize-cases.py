#!/usr/bin/env python3
"""Writes apps/api/internal/queuewrites/testdata/finalize.cases.json: Session done (POST /api/sessions/{id}/finalization) and the
projection jobs it drives (result snapshot, player history, player rank), plus the GET that drives them too.

Run it, then the capture (capture-writes-queue.test.mjs -t finalize), which writes finalize.golden.json from the real TypeScript.
Usage: python3 apps/api/testdata/tools/gen-writes-queue-finalize-cases.py
"""
import json
import os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../internal/queuewrites/testdata/finalize.cases.json')
BASE = json.load(open(os.path.join(HERE, '../../internal/queuewrites/testdata/match.cases.json')))

SMASH, LAPSED = 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000002'
CLUB1, CLUB2 = 'c9000000-0000-4000-8000-000000000001', 'c9000000-0000-4000-8000-000000000002'
POLICY = 'fa000000-0000-4000-8000-000000000001'
S3 = 'a3000000-0000-4000-8000-000000000003'
S4 = 'a3000000-0000-4000-8000-000000000004'
S1 = 'a3000000-0000-4000-8000-000000000001'
S8 = 'a3000000-0000-4000-8000-000000000008'
S9 = 'a3000000-0000-4000-8000-000000000009'
CMD = 'b1000000-0000-4000-8000-000000000001'
CMD2 = 'b1000000-0000-4000-8000-000000000002'
UNKNOWN = 'a3000000-0000-4000-8000-0000000000ff'
CP = lambda n: f'c6000000-0000-4000-8000-0000000000{n:02d}'
E = lambda n: f'a7000000-0000-4000-8000-0000000000{n:02d}'      # roster entries: 4 Hal, 5 Ivy (away), 6 Jo are in the seed; 20.. added here
M = lambda n: f'a4000000-0000-4000-8000-0000000000{n:02d}'
PL = lambda n: f'd4000000-0000-4000-8000-0000000000{n:02d}'
T = lambda text: f"TIMESTAMPTZ '{text}+00'"
AT = lambda minute: T(f'2026-11-19 02:{minute:02d}:00')
NOW = T('2026-11-19 04:00:00')
# Entries: name, club player, entry id, level id, saved player's profile
GUS, GAIL, ANN, BEN, HAL, IVY, JO = E(20), E(21), E(22), E(23), E(4), E(5), E(6)

SCEN = {}
stmts = []


def sql(*s):
    return list(s)


def entry(eid, cp, name, level, player=None, session=S3, released=False, no_show=False):
    rel = f"{NOW}, 'removed'" if released else 'NULL, NULL'
    ns = NOW if no_show else 'NULL'
    pl = f"'{player}'" if player else 'NULL'
    lv = 'NULL' if level is None else str(level)
    return (f"INSERT INTO session_players (id, club_id, session_id, club_player_id, player_id_at_entry, name_snapshot, present, present_changed_at, skill_level_id, confirmed_at, joined_at, "
            f"released_at, release_reason, no_show_at, created_at, updated_at, revision) VALUES ('{eid}', '{CLUB1}', '{session}', '{cp}', {pl}, '{name}', true, {NOW}, {lv}, {T('2026-11-15 00:00:00')}, "
            f"{T('2026-11-15 00:00:00')}, {rel}, {ns}, {NOW}, {NOW}, 1)")


def match(n, no, fmt, state, a, b, winner=None, scores=(None, None), minute=None, session=S3, kind='completed', queue_position=None, extra=None, segs=None):
    """A match with one segment per player (segs overrides: (entry, team, seg_no, started, finished, credit, joined_op, left_op))."""
    minute = minute if minute is not None else n
    placed = AT(minute) if state in ('completed', 'active', 'on_court') else 'NULL'
    started = AT(minute) if state in ('completed', 'active') else 'NULL'
    ended = AT(minute + 1) if state == 'completed' else 'NULL'
    qp = 'NULL' if queue_position is None else str(queue_position)
    out = [f"INSERT INTO matches (id, club_id, session_id, match_no, state, format, queue_position, origin, manual_protected, generation_id, source_operation_id, placed_at, started_at, ended_at, created_at, updated_at, revision) "
           f"VALUES ('{M(n)}', '{CLUB1}', '{session}', {no}, '{state}', '{fmt}', {qp}, 'manual', false, NULL, 'a4100000-0000-4000-8000-0000000000{n:02d}', {placed}, {started}, {ended}, {AT(minute)}, {AT(minute)}, 1)"]
    if segs is None:
        segs = [(p, 'A', 1, True, state == 'completed', 'none', None, None) for p in a] + [(p, 'B', 1, True, state == 'completed', 'none', None, None) for p in b]
    for i, (p, team, seg, st, fin, credit, jop, lop) in enumerate(segs):
        jop = jop or f'a4300000-0000-4000-8000-0000000000{n:02d}'
        left_at = AT(minute) if lop else 'NULL'
        lop = f"'{lop}'" if lop else 'NULL'
        out.append(f"INSERT INTO match_participations (id, club_id, session_id, match_id, session_player_id, team, segment_no, joined_operation_id, left_operation_id, joined_at, left_at, started_with_match, finished_with_match, credit_to, created_at, updated_at) "
                   f"VALUES ('a4200000-0000-4000-8000-0000000{n:02d}{i:03d}', '{CLUB1}', '{session}', '{M(n)}', '{p}', '{team}', {seg}, '{jop}', {lop}, {AT(minute)}, {left_at}, {str(st).lower()}, {str(fin).lower()}, '{credit}', {AT(minute)}, {AT(minute)})")
    if state == 'completed':
        w = f"'{winner}'" if winner else 'NULL'
        sa = 'NULL' if scores[0] is None else scores[0]
        sb = 'NULL' if scores[1] is None else scores[1]
        out.append(f"INSERT INTO match_decisions (match_id, club_id, session_id, kind, winning_team, team_a_score, team_b_score, source_operation_id, confirmed_at, accepted_at, actor_club_id) "
                   f"VALUES ('{M(n)}', '{CLUB1}', '{session}', '{kind}', {w}, {sa}, {sb}, 'a4300000-0000-4000-8000-0000000000{n:02d}', {AT(minute + 1)}, {AT(minute + 1)}, '{CLUB1}')")
    return out


def on_court_holds(n, court, players):
    out = [f"INSERT INTO match_court_usage (id, club_id, session_id, match_id, court_id, acquired_at, acquire_operation_id) VALUES ('a4400000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{S3}', '{M(n)}', '{court}', {AT(n)}, 'a4300000-0000-4000-8000-0000000000{n:02d}')",
           f"INSERT INTO active_court_holds (court_id, club_id, session_id, match_id, held_at) VALUES ('{court}', '{CLUB1}', '{S3}', '{M(n)}', {AT(n)})"]
    for p in players:
        out.append(f"INSERT INTO active_player_holds (session_player_id, club_id, session_id, match_id, held_at) VALUES ('{p}', '{CLUB1}', '{S3}', '{M(n)}', {AT(n)})")
    return out


COURT3, COURT4 = 'a2c00000-0000-4000-8000-000000000003', 'a2c00000-0000-4000-8000-000000000004'

# What every case starts from: the seed, a fixed ranking policy, and the tables the seed does not clear.
SCEN['base'] = [
    'DELETE FROM player_rank_current', 'DELETE FROM sync_operations', 'DELETE FROM device_session_streams',
    "DELETE FROM ranking_policy_versions WHERE version > 1",
    f"UPDATE ranking_policy_versions SET id = '{POLICY}', effective_at = {T('2026-10-01 00:00:00')}, created_at = {T('2026-10-01 00:00:00')}",
]
roster = [entry(GUS, CP(1), 'Gus Guest', 3), entry(GAIL, CP(2), 'Gail Guest', 4), entry(ANN, CP(3), 'Ann Reyes', 5, PL(1)), entry(BEN, CP(4), 'Ben Santos', 6, PL(2))]
SCEN['roster'] = roster
played = (match(1, 1, 'singles', 'completed', [GUS], [GAIL], 'A', (21, 15)) + match(2, 2, 'doubles', 'completed', [ANN, BEN], [GUS, GAIL], 'B', (15, 21))
          + match(3, 3, 'singles', 'completed', [ANN], [HAL], 'A', (21, 10)) + match(4, 4, 'singles', 'completed', [BEN], [JO], None, kind='invalid')
          + match(7, 7, 'fun_1v2', 'completed', [GUS], [ANN, BEN], 'A', (21, 12)))
SCEN['played'] = roster + played
NIGHT_TAIL = [
    f"INSERT INTO club_session_reservations (club_id, session_id, acquired_at, created_at) VALUES ('{CLUB1}', '{S3}', {NOW}, {NOW})",
    f"INSERT INTO session_match_requests (id, club_id, session_id, session_player_id, format, status, requested_at, created_at, updated_at, revision) VALUES ('a3700000-0000-4000-8000-000000000051', '{CLUB1}', '{S3}', '{GUS}', 'singles', 'open', {NOW}, {NOW}, {NOW}, 1)",
]
SCEN['night'] = roster + played + match(5, 5, 'singles', 'waiting', [HAL], [JO], queue_position=1) + NIGHT_TAIL
# A placed match holds its court with a usage row, and the database refuses to close a usage with no release operation (a CHECK), which is what the
# TypeScript does here: Session done fails with a 500 and nothing changes. A placed match with no usage row (a state the commands never leave)
# gets through, so the holds and the reset are pinned there.
SCEN['night_on_court'] = SCEN['night'] + match(6, 6, 'singles', 'on_court', [GAIL], [BEN], minute=6) + on_court_holds(6, COURT3, [GAIL, BEN])
SCEN['night_on_court_without_usage'] = SCEN['night'] + match(6, 6, 'singles', 'on_court', [GAIL], [BEN], minute=6) + on_court_holds(6, COURT3, [GAIL, BEN])[1:]
# A substitution: the incoming player's segment carries the credit choice, the outgoing one is cut short.
OP = lambda n: f'a4300000-0000-4000-8000-00000000f{n:03d}'


def subbed(n, no, credit, winner='A'):
    return match(n, no, 'doubles', 'completed', None, None, winner, (21, 18), segs=[
        (GUS, 'A', 1, True, True, 'none', None, None), (GAIL, 'A', 1, True, True, 'none', None, None),
        (ANN, 'B', 1, True, False, 'none', None, OP(n)), (BEN, 'B', 1, True, True, 'none', None, None),
        (JO, 'B', 2, False, True, credit, OP(n), None)])


SCEN['subs_incoming'] = roster + [entry(JO, CP(9), 'Jo Guest', 5)][:0] + subbed(1, 1, 'incoming') + match(2, 2, 'singles', 'completed', [GUS], [BEN], 'B', (10, 21))
SCEN['subs_outgoing'] = roster + subbed(1, 1, 'outgoing') + match(2, 2, 'singles', 'completed', [GUS], [BEN], 'A')
SCEN['subs_none'] = roster + subbed(1, 1, 'none')
SCEN['hal_no_level'] = roster + [entry(HAL, CP(7), 'Hal Guest', None, session=S3)][:0] + match(1, 1, 'singles', 'completed', [GUS], [HAL], 'A') + ["UPDATE session_players SET skill_level_id = NULL, level_locked_at = NULL, assessment_id = NULL WHERE id = '%s'" % HAL]
SCEN['released_player_played'] = roster + [entry(E(24), CP(5), 'Una Alonzo', 3, released=True)] + match(1, 1, 'singles', 'completed', [GUS], [E(24)], 'B')
SCEN['record_off'] = [f"UPDATE queue_sessions SET record_games = false WHERE id = '{S3}'"] + SCEN['night']
SCEN['no_matches'] = roster

# Barriers.
SCEN['b_active'] = roster + match(1, 1, 'singles', 'active', [GUS], [GAIL])
STREAM = 'a5100000-0000-4000-8000-000000000001'
DEV = 'a5000000-0000-4000-8000-000000000001'
def stream(state, cont, final, digest, sid=STREAM, dev=DEV, gen=1):
    return (f"INSERT INTO device_session_streams (id, club_id, session_id, device_id, generation_no, downloaded_revision, contiguous_sequence, highest_received_sequence, sealed_final_sequence, sealed_digest, sealed_at, state, enrolled_at, created_at, updated_at, revision) "
            f"VALUES ('{sid}', '{CLUB1}', '{S3}', '{dev}', {gen}, 12, {cont}, {cont}, {final}, {digest}, {NOW if state == 'sealed' else 'NULL'}, '{state}', {NOW}, {NOW}, {NOW}, 1)")


SCEN['b_stream_open'] = roster + [stream('open', 0, 'NULL', 'NULL')]
SCEN['b_stream_gap'] = roster + [stream('sealed', 3, 5, "decode(repeat('ab', 32), 'hex')")]
SCEN['stream_sealed'] = played + roster + [stream('sealed', 5, 5, "decode(repeat('0a', 32), 'hex')"), stream('sealed', 7, 7, "decode(repeat('cd', 32), 'hex')", 'a5100000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000002', 2)]
SCEN['b_conflict'] = roster + [f"INSERT INTO sync_conflicts (id, club_id, session_id, category, state, detected_at, created_at, updated_at, revision) VALUES ('a5200000-0000-4000-8000-000000000001', '{CLUB1}', '{S3}', 'revision_mismatch', 'open', {NOW}, {NOW}, {NOW}, 1)"]
SCEN['b_pending'] = roster + [stream('sealed', 1, 1, "decode(repeat('ab', 32), 'hex')"), f"INSERT INTO sync_operations (id, club_id, session_id, stream_id, sequence, entity_type, entity_id, command_kind, payload_version, payload, payload_digest, occurred_at, received_at, state, updated_at) VALUES ('a5300000-0000-4000-8000-000000000001', '{CLUB1}', '{S3}', '{STREAM}', 1, 'match', '{M(1)}', 'x', 1, '{{}}', decode(repeat('00', 32), 'hex'), {NOW}, {NOW}, 'received', {NOW})"]
SCEN['b_no_policy'] = roster + [f"UPDATE ranking_policy_versions SET effective_at = {T('2099-01-01 00:00:00')}"]
SCEN['b_everything'] = SCEN['b_active'] + [stream('open', 0, 'NULL', 'NULL')][:1] + SCEN['b_conflict'][-1:] + SCEN['b_no_policy'][-1:]
SCEN['s3_prepared'] = [f"UPDATE queue_sessions SET state = 'prepared' WHERE id = '{S3}'"]
SCEN['s3_finalizing'] = [f"UPDATE queue_sessions SET state = 'finalizing' WHERE id = '{S3}'"]
SCEN['s3_cancelled'] = [f"UPDATE queue_sessions SET state = 'cancelled', started_at = NULL, cancelled_at = {NOW} WHERE id = '{S3}'"]
SCEN['s3_invalid'] = [f"UPDATE queue_sessions SET state = 'invalid', invalid_reason = 'Wrong night' WHERE id = '{S3}'"]
SCEN['s3_minimum_3'] = [f"UPDATE queue_sessions SET minimum_games = 3 WHERE id = '{S3}'"] + SCEN['played']
SCEN['s3_minimum_0'] = [f"UPDATE queue_sessions SET minimum_games = 0 WHERE id = '{S3}'"] + SCEN['played']


def finalization(session, state, stage, cmd, committed='2026-11-19 03:00:00', club=CLUB1, failed_stage=None, failure=None, completed=None, revision=1):
    fs = f"'{failed_stage}'" if failed_stage else 'NULL'
    fc = f"'{failure}'" if failure else 'NULL'
    cm = T(completed) if completed else 'NULL'
    return (f"INSERT INTO session_finalizations (session_id, club_id, command_id, state, stage, failed_stage, failure_code, stream_manifest, manifest_digest, accepted_session_revision, policy_version_id, started_at, committed_at, completed_at, facts_digest, updated_at, revision) "
            f"VALUES ('{session}', '{club}', '{cmd}', '{state}', '{stage}', {fs}, {fc}, '[]'::jsonb, decode(repeat('00', 32), 'hex'), 1, '{POLICY}', {T(committed)}, {T(committed)}, {cm}, decode(repeat('01', 32), 'hex'), {T(committed)}, {revision})")


JOB = lambda n: f'a8000000-0000-4000-8000-0000000000{n:02d}'


def job(n, kind, status, session=S4, attempts=0, next_at='2026-11-19 03:00:00', locked=None, error=None, done=None):
    lk = T(locked) if locked else 'NULL'
    er = f"'{error}'" if error else 'NULL'
    dn = T(done) if done else 'NULL'
    return (f"INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, status, attempts, next_attempt_at, locked_at, last_error_code, completed_at, created_at, updated_at) "
            f"VALUES ('{JOB(n)}', '{kind}', 1, 'finalization', '{session}', '{status}', {attempts}, {T(next_at)}, {lk}, {er}, {dn}, {T('2026-11-19 03:00:00')}, {T('2026-11-19 03:00:00')})")


def committed(*jobs, state='committed', stage='player_records', failed_stage=None, failure=None):
    return [finalization(S4, state, stage, CMD, failed_stage=failed_stage, failure=failure, completed='2026-11-19 03:00:01' if state == 'done' else None)] + list(jobs)


done_job = lambda n, kind: job(n, kind, 'done', attempts=1, done='2026-11-19 03:00:01')
SCEN['d_history_pending'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'pending'), done_job(4, 'player_rank'))
SCEN['d_history_pending_stage_default'] = committed(done_job(1, 'club_session_summaries'), job(2, 'result_snapshot', 'pending', next_at='2026-11-19 05:00:00'), job(3, 'player_history', 'pending'))
SCEN['d_history_failed_waiting'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'failed', attempts=3, next_at='2026-11-19 05:00:00', error='unavailable'), done_job(4, 'player_rank'), state='failed', failed_stage='player_records', failure='unavailable')
SCEN['d_history_failed_max'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'failed', attempts=8, error='unavailable'), done_job(4, 'player_rank'), state='failed', failed_stage='player_records', failure='unavailable')
SCEN['d_history_stale_running'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'running', attempts=1, locked='2026-11-19 03:49:00'), done_job(4, 'player_rank'))
SCEN['d_history_fresh_running'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'running', attempts=1, locked='2026-11-19 03:55:00'), done_job(4, 'player_rank'))
SCEN['d_already_done'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'pending'), state='done', stage='slides')
SCEN['d_snapshot_failed_settle'] = committed(done_job(1, 'club_session_summaries'), job(2, 'result_snapshot', 'failed', attempts=8, error='invalid'), job(3, 'player_history', 'pending'), done_job(4, 'player_rank'))
SCEN['d_rank_failed_settle'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'pending'), job(4, 'player_rank', 'failed', attempts=8))
SCEN['d_failed_both_settle'] = committed(done_job(1, 'club_session_summaries'), job(2, 'result_snapshot', 'failed', attempts=8, error='snap'), job(3, 'player_history', 'pending'), job(4, 'player_rank', 'failed', attempts=8, error='rank'))
SCEN['d_failed_fixed'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'pending'), job(4, 'player_rank', 'failed', attempts=8, error='x'), state='failed', failed_stage='player_records', failure='x')
SCEN['d_rank_waiting'] = committed(done_job(1, 'club_session_summaries'), done_job(2, 'result_snapshot'), job(3, 'player_history', 'pending'), job(4, 'player_rank', 'pending', next_at='2026-11-19 05:00:00'))
SCEN['d_other_club'] = [finalization(S8, 'committed', 'player_records', CMD, club=CLUB2), job(3, 'player_history', 'pending', session=S8)]
# A finished session of another command, to show a command id is unique.
SCEN['cmd_used_elsewhere'] = [finalization(S4, 'done', 'slides', CMD, completed='2026-11-19 03:00:01')]
SCEN['cmd_used_elsewhere_same_session'] = SCEN['played'] + []
SCEN['finalized_already'] = SCEN['played'] + [f"UPDATE queue_sessions SET state = 'completed', finalized_at = {T('2026-11-19 03:00:00')} WHERE id = '{S3}'", finalization(S3, 'done', 'slides', CMD, completed='2026-11-19 03:00:01'), job(5, 'player_history', 'done', session=S3, attempts=1, done='2026-11-19 03:00:01')]
SCEN['finalized_already_lapsed'] = [finalization(S8, 'done', 'slides', CMD, club=CLUB2, completed='2026-11-19 03:00:01')]

# Award baselines: five finished sessions at the club with a win rate per saved player, finalized before tonight.
PRIOR = [f'a3000000-0000-4000-8000-0000000001{n:02d}' for n in range(1, 6)]
def make_prior(first_day='2026-11-01'):
    prior = []
    for i, ps in enumerate(PRIOR):
        day = first_day if i == 0 else f'2026-11-{i + 1:02d}'
        prior.append(f"INSERT INTO queue_sessions (id, club_id, title, state, started_at, finalized_at, scheduled_start_at, scheduled_end_at, players_per_court, minimum_games, minimum_is_calculated, public_slug, source_command_id, created_at, updated_at, revision) "
                     f"VALUES ('{ps}', '{CLUB1}', 'Earlier {i + 1}', 'completed', {T(day + ' 09:00:00')}, {T(day + ' 14:00:00')}, {T(day + ' 09:00:00')}, {T(day + ' 15:00:00')}, 2, 0, true, 'earlier-{i + 1}', 'e3000000-0000-4000-8000-0000000001{i + 1:02d}', {T(day + ' 00:00:00')}, {T(day + ' 14:00:00')}, 5)")
        prior.append(finalization(ps, 'done', 'slides', f'b1000000-0000-4000-8000-0000000001{i + 1:02d}', committed=day + ' 14:00:00', completed=day + ' 14:00:01'))
        # Gus wins one of two each time (0.5), Gail never wins (0.0: an Off Day when she wins tonight), Ann wins two of two (1.0), Ben: partial games only.
        for who, cp, plid, wins, partial in ((1, CP(1), None, 1, False), (2, CP(2), None, 0, False), (3, CP(3), PL(1), 2, False), (4, CP(4), PL(2), 1, True)):
            eid = f'a7000000-0000-4000-8000-000000{i + 1:02d}{who:02d}00'
            prior.append(f"INSERT INTO club_session_player_summaries (id, club_id, session_id, session_player_id, club_player_id, player_id_snapshot, full_games, standard_games, fun_games, wins, losses, skill_level_snapshot_id, summary_version, projected_at) "
                         f"VALUES (gen_random_uuid(), '{CLUB1}', '{ps}', '{eid}', '{cp}', {'NULL' if not plid else repr(plid)}, 2, 2, 0, {wins}, {2 - wins}, 3, 1, {T(day + ' 14:00:00')})")
            for g in range(2):
                won = g < wins
                prior.append(f"INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization, played_at, format, team, winning_team, full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, fact_version, created_at) "
                             f"VALUES (gen_random_uuid(), '{CLUB1}', '{ps}', 'a4000000-0000-4000-8000-000000{i + 1:02d}{who:02d}{g:02d}'::uuid, '{eid}', '{cp}', {'NULL' if not plid else repr(plid)}, {T(day + ' 10:00:00')}, 'singles', 'A', '{'A' if won else 'B'}', {str(not (partial and g == 1)).lower()}, true, 3, '{{}}', '{{}}', 1, {T(day + ' 14:00:00')})")

    return prior


prior = make_prior()
SCEN['baseline'] = SCEN['played'] + prior
SCEN['baseline_one_session_months_ago'] = SCEN['played'] + make_prior('2026-07-01')
SCEN['played_handicapped'] = SCEN['played'] + [f"UPDATE session_players SET handicap_spots = '{{lower_back,left_knee}}' WHERE id IN ('{GUS}', '{HAL}')"]
SCEN['adjusted_games'] = SCEN['played'] + [f"UPDATE session_players SET games_adjustment = 2 WHERE id = '{GUS}'"]
SCEN['baseline_ann_only_off_day'] = SCEN['baseline'] + match(8, 8, 'singles', 'completed', [GAIL], [BEN], 'A') + match(9, 9, 'singles', 'completed', [GAIL], [GUS], 'A')
# Gus and Ann also won rank evidence elsewhere; Ann has an assessment of her own at the club.
ASSESS = f"INSERT INTO club_assessments (id, club_id, club_player_id, session_id, session_player_id, player_id_at_assessment, skill_level_id, source_operation_id, assessed_at, received_at, accepted_revision, actor_club_id) VALUES ('a0300000-0000-4000-8000-000000000a01', '{CLUB1}', '{CP(3)}', '{S4}', '{E(7)}', '{PL(1)}', 5, 'a0300000-0000-4000-8000-000000000b01', {T('2026-11-12 00:00:00')}, {T('2026-11-12 00:00:00')}, 1, '{CLUB1}')"
RANK = lambda player, watermark, revision=3: (f"INSERT INTO player_rank_current (player_id, skill_level_id, numeric_rank, state, explanation_code, input_counts, policy_version_id, algorithm_version, window_start, window_end, calculated_at, input_watermark, next_recheck_at, recent_standard_match_count, leaderboard_eligible, updated_at, revision) "
                                               f"VALUES ('{player}', 4, 4.5, 'established', 'x', '{{}}'::jsonb, '{POLICY}', 'old', {T('2026-08-01 00:00:00')}, {T('2026-11-01 00:00:00')}, {T('2026-11-01 00:00:00')}, {watermark}, {T('2026-12-01 00:00:00')}, 0, true, {T('2026-11-01 00:00:00')}, {revision})")
SCEN['rank_with_history'] = SCEN['baseline'] + [ASSESS]
SCEN['rank_old_row_replaced'] = SCEN['baseline'] + [RANK(PL(1), 1000), RANK(PL(2), 1000, 7)]
SCEN['rank_newer_row_kept'] = SCEN['baseline'] + [RANK(PL(1), 9999999999999), RANK(PL(2), 1000)]
SCEN['rank_old_games_only'] = roster + match(7, 1, 'fun_1v2', 'completed', [GUS], [ANN, BEN], 'A') + [
    f"INSERT INTO player_match_facts (id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization, played_at, format, team, winning_team, full_participation, standard_match, skill_level_snapshot_id, partner_entry_ids, opponent_entry_ids, fact_version, created_at) "
    f"VALUES (gen_random_uuid(), '{CLUB1}', '{PRIOR[0]}', 'a4000000-0000-4000-8000-000000009901'::uuid, '{E(7)}', '{CP(3)}', '{PL(1)}', {T('2026-04-01 10:00:00')}, 'singles', 'A', 'A', true, true, 3, '{{}}', '{{}}', 1, {T('2026-04-01 11:00:00')})"]
ATTR = lambda n, revoked: (f"INSERT INTO player_history_attributions (id, club_id, club_player_id, player_id, confirmed_at, confirmation_evidence, source_command_id, revoked_at, revoke_reason, created_at) "
                           f"VALUES ('a9000000-0000-4000-8000-0000000000{n:02d}', '{CLUB1}', '{CP(1)}', '{PL(4)}', {T('2026-11-01 00:00:00')}, '{{}}'::jsonb, 'a9100000-0000-4000-8000-0000000000{n:02d}', {T('2026-11-02 00:00:00') if revoked else 'NULL'}, {repr('mistake') if revoked else 'NULL'}, {T('2026-11-01 00:00:00')})")
SCEN['attributed_guest'] = SCEN['baseline'] + [ATTR(1, False), ATTR(2, True).replace(PL(4), PL(6))]
# The rank job fails once (the policy takes effect after the commit) and succeeds on a later read.
SCEN['policy_arrives_late'] = SCEN['played'] + [
    "DROP TRIGGER IF EXISTS ranking_policy_versions_append_only ON ranking_policy_versions",
    "CREATE OR REPLACE FUNCTION capture_policy_arrives_late() RETURNS trigger AS $$ BEGIN IF NEW.kind = 'player_rank' THEN UPDATE ranking_policy_versions SET effective_at = TIMESTAMPTZ '2026-11-19 04:00:30+00'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql",
    "DROP TRIGGER IF EXISTS capture_policy_arrives_late ON projection_jobs",
    "CREATE TRIGGER capture_policy_arrives_late AFTER INSERT ON projection_jobs FOR EACH ROW EXECUTE FUNCTION capture_policy_arrives_late()",
]
CLEAN_TRIGGER = ["DROP TRIGGER IF EXISTS capture_policy_arrives_late ON projection_jobs"]
SCEN['base'] = SCEN['base'] + CLEAN_TRIGGER

cases = []


def req(method, path, body=None, who=SMASH, **kw):
    s = {'method': method, 'path': path, 'who': who}
    if body is not None:
        s['body'] = body
    s.update(kw)
    return s


def fin(session=S3, cmd=CMD, who=SMASH, **kw):
    kw.setdefault('unordered', ['status.jobs', 'warnings.belowMinimum'])
    return req('POST', f'/api/sessions/{session}/finalization', {'commandId': cmd}, who=who, **kw)


def status(session=S3, who=SMASH, **kw):
    kw.setdefault('unordered', ['jobs'])
    return req('GET', f'/api/sessions/{session}/finalization', None, who=who, **kw)


def case(name, steps, scenario='base', **kw):
    steps = steps if isinstance(steps, list) else [steps]
    for key in ('allow500', 'goExpects'):
        if key in kw:
            steps[-1][key] = kw.pop(key)
    c = {'name': name, 'scenario': scenario, 'steps': steps}
    c.update(kw)
    cases.append(c)


def at(minute, second=0):
    return f'2026-11-19T04:{minute:02d}:{second:02d}.000Z'


MALFORMED = {'allow500': True, 'goExpects': {'status': 404, 'code': 'not_found'}}
case('post_clears_the_handicap_tonight', fin(), 'played_handicapped')
case('post_signed_out', fin(who=None), 'played')
case('post_body_not_json', req('POST', f'/api/sessions/{S3}/finalization', rawBody='nope'), 'played')
case('post_without_a_body', req('POST', f'/api/sessions/{S3}/finalization'), 'played')
case('post_without_a_command_id', req('POST', f'/api/sessions/{S3}/finalization', {}), 'played')
case('post_a_command_id_that_is_not_a_uuid', req('POST', f'/api/sessions/{S3}/finalization', {'commandId': 'nope'}), 'played')
case('post_a_command_id_that_is_not_text', req('POST', f'/api/sessions/{S3}/finalization', {'commandId': 5}), 'played')
case('post_an_upper_case_command_id', fin(cmd=CMD.upper()), 'played')
case('post_unknown_session', fin(UNKNOWN), 'played')
case('post_malformed_session_id', fin('m'), 'played', **MALFORMED)
case('post_another_clubs_session', fin(S9), 'played')
case('post_a_lapsed_clubs_live_session', fin(S8, who=LAPSED), 'played')
case('post_a_session_with_no_matches', fin(), 'no_matches')
case('post_a_played_session', fin(), 'played')
case('post_a_full_night_closes_everything_that_never_started', fin(), 'night')
case('post_a_placed_match_fails_the_commit_with_a_500', fin(), 'night_on_court', allow500=True)
case('post_a_placed_match_with_no_court_usage_is_reset_and_removed', fin(), 'night_on_court_without_usage')
case('post_a_night_with_a_substitution_credited_to_the_incoming_player', fin(), 'subs_incoming')
case('post_a_night_with_a_substitution_credited_to_the_outgoing_player', fin(), 'subs_outgoing')
case('post_a_night_with_a_substitution_credited_to_nobody', fin(), 'subs_none')
case('post_a_player_with_no_level_fails_the_commit', fin(), 'hal_no_level')
case('post_a_released_player_who_played_has_facts_but_no_summary', fin(), 'released_player_played')
case('post_with_record_games_off_writes_no_facts_and_no_jobs', fin(), 'record_off')
case('post_below_the_minimum_warns', fin(), 's3_minimum_3')
case('post_with_no_minimum_warns_nobody', fin(), 's3_minimum_0')
case('post_sealed_streams_are_listed_in_the_manifest', fin(), 'stream_sealed')
case('post_an_active_match_blocks', fin(), 'b_active')
case('post_an_open_stream_blocks', fin(), 'b_stream_open')
case('post_a_sealed_stream_with_a_gap_blocks', fin(), 'b_stream_gap')
case('post_an_open_conflict_blocks', fin(), 'b_conflict')
case('post_a_pending_operation_blocks', fin(), 'b_pending')
case('post_no_ranking_policy_blocks', fin(), 'b_no_policy')
case('post_every_barrier_at_once', fin(), 'b_everything')
case('post_a_prepared_session', fin(), 's3_prepared')
case('post_a_finalizing_session', fin(), 's3_finalizing')
case('post_a_cancelled_session', fin(), 's3_cancelled')
case('post_an_invalid_session', fin(), 's3_invalid')
case('post_a_completed_session_without_a_finalization', fin(S4))
case('post_again_with_the_same_command_returns_the_committed_status', [fin(), fin()], 'played')
case('post_again_with_another_command_returns_the_first_status', [fin(), fin(cmd=CMD2)], 'played')
case('post_a_finalized_session_returns_its_status_before_any_check', fin(), 'finalized_already')
case('post_a_finalized_session_of_a_lapsed_club_returns_its_status', fin(S8, who=LAPSED), 'finalized_already_lapsed')
case('post_a_command_used_by_another_session_is_not_found', fin(), 'played')
cases[-1]['scenario'] = 'cmd_used_elsewhere_plus_played'
SCEN['cmd_used_elsewhere_plus_played'] = SCEN['played'] + SCEN['cmd_used_elsewhere']
case('post_the_baseline_names_most_improved_and_off_day', fin(), 'baseline')
case('post_the_baseline_has_no_window_a_session_months_ago_still_counts', fin(), 'baseline_one_session_months_ago')
case('post_a_set_games_played_adjustment_never_reaches_the_snapshot', fin(), 'adjusted_games')
case('post_an_off_day_for_every_drop', fin(), 'baseline_ann_only_off_day')
case('post_rank_with_an_assessment_in_the_window', fin(), 'rank_with_history')
case('post_an_older_rank_row_is_replaced_and_its_revision_moves', fin(), 'rank_old_row_replaced')
case('post_a_newer_rank_row_is_kept_and_nobody_is_told', fin(), 'rank_newer_row_kept')
case('post_old_games_ask_for_a_new_assessment', fin(), 'rank_old_games_only')
case('post_a_guest_whose_history_is_attributed_counts_for_the_player', fin(), 'attributed_guest')
case('post_a_rank_job_that_fails_is_retried_on_a_later_read', [fin(), status(now=at(0, 30)), status(now=at(1, 30))], 'policy_arrives_late')
case('post_a_failed_rank_job_is_retried_by_the_next_post', [fin(), fin(now=at(0, 5), cmd=CMD2)], 'policy_arrives_late')
SCEN['policy_arrives_late'] = SCEN['policy_arrives_late']

# GET and POST on a finalization that is already committed (the drive).
for name, scenario in [('history_pending', 'd_history_pending'), ('history_stage_default', 'd_history_pending_stage_default'), ('history_failed_waiting', 'd_history_failed_waiting'),
                       ('history_failed_max', 'd_history_failed_max'), ('history_stale_running', 'd_history_stale_running'), ('history_fresh_running', 'd_history_fresh_running'),
                       ('already_done', 'd_already_done'), ('snapshot_failed_settle', 'd_snapshot_failed_settle'), ('rank_failed_settle', 'd_rank_failed_settle'),
                       ('both_failed_settle', 'd_failed_both_settle'), ('failed_then_fixed', 'd_failed_fixed'), ('rank_waiting', 'd_rank_waiting')]:
    case(f'get_{name}', status(S4), scenario)
    case(f'post_{name}', fin(S4), scenario)
case('get_signed_out', status(S4, who=None), 'd_history_pending')
case('get_no_finalization', status(S4), 'base')
case('get_malformed_session_id', status('m'), 'base', allow500=True, goExpects={'status': 404, 'code': 'not_found'})
case('get_another_clubs_finalization', status(S8), 'd_other_club')
case('post_another_clubs_finalization_is_not_driven', fin(S8), 'd_other_club')
case('get_a_stale_running_job_after_the_lease', [status(S4, now=at(0)), status(S4, now=at(30))], 'd_history_fresh_running')
case('get_a_failed_job_after_its_backoff', status(S4, now='2026-11-19T05:30:00.000Z'), 'd_history_failed_waiting')
case('post_a_failed_job_before_its_backoff_is_retried_at_once', fin(S4, now=at(0)), 'd_history_failed_waiting')

SNAPSHOT = [s for s in BASE['snapshot'] if s['name'] in ('matches', 'match_court_usage', 'active_court_holds', 'active_player_holds', 'session_match_requests', 'session_drop_out_notices')]
SNAPSHOT += [
    {'name': 'session_players_handicap', 'sql': "SELECT id, handicap_spots, revision::text AS revision FROM session_players WHERE session_id = 'a3000000-0000-4000-8000-000000000003' ORDER BY id"},
    {'name': 'queue_sessions', 'sql': "SELECT id, state, revision::text AS revision, queue_revision::text AS queue_revision, finalized_at, record_games, updated_at FROM queue_sessions ORDER BY id"},
    {'name': 'club_session_reservations', 'sql': "SELECT club_id, session_id, acquired_at FROM club_session_reservations ORDER BY session_id"},
    {'name': 'session_finalizations', 'sql': "SELECT session_id, club_id, command_id, state, stage, failed_stage, failure_code, stream_manifest, encode(manifest_digest, 'hex') AS manifest_digest, accepted_session_revision::text AS accepted_session_revision, policy_version_id, started_at, committed_at, completed_at, encode(facts_digest, 'hex') AS facts_digest, updated_at, revision::text AS revision FROM session_finalizations ORDER BY session_id"},
    {'name': 'player_match_facts', 'redact': ['id'], 'sql': "SELECT id, club_id, session_id, match_id, session_player_id, club_player_id, player_id_at_finalization, played_at, format, team, winning_team, full_participation, standard_match, skill_level_snapshot_id, ARRAY(SELECT x FROM unnest(partner_entry_ids) x ORDER BY x) AS partner_entry_ids, ARRAY(SELECT x FROM unnest(opponent_entry_ids) x ORDER BY x) AS opponent_entry_ids, team_a_score, team_b_score, fact_version, created_at FROM player_match_facts ORDER BY session_id, match_id, session_player_id"},
    {'name': 'club_session_player_summaries', 'redact': ['id'], 'sql': "SELECT id, club_id, session_id, session_player_id, club_player_id, player_id_snapshot, full_games, standard_games, fun_games, wins, losses, skill_level_snapshot_id, summary_version, projected_at FROM club_session_player_summaries ORDER BY session_id, session_player_id"},
    {'name': 'session_result_snapshots', 'redact': ['id'], 'sql': "SELECT id, club_id, session_id, version, calculation_version, standings, awards, off_day, ARRAY(SELECT x FROM unnest(baseline_session_ids) x ORDER BY x) AS baseline_session_ids, generated_at FROM session_result_snapshots ORDER BY session_id, version"},
    {'name': 'projection_jobs', 'redact': ['id'], 'sql': "SELECT id, kind, kind_version, source_type, source_finalization_id, target_player_id, status, attempts, next_attempt_at, locked_at, last_error_code, completed_at, created_at, updated_at FROM projection_jobs ORDER BY source_finalization_id, kind"},
    {'name': 'player_rank_current', 'sql': "SELECT player_id, skill_level_id, numeric_rank::text AS numeric_rank, state, explanation_code, assessment_component::text AS assessment_component, performance_component::text AS performance_component, input_counts, policy_version_id, algorithm_version, window_start, window_end, calculated_at, input_watermark::text AS input_watermark, next_recheck_at, recent_standard_match_count, last_valid_played_at, leaderboard_eligible, updated_at, revision::text AS revision FROM player_rank_current ORDER BY player_id"},
    {'name': 'rank_notifications', 'redact': ['source_id'], 'sql': "SELECT n.player_id, n.kind, n.title, n.body, n.target, n.source_type, n.source_id, (SELECT j.kind FROM projection_jobs j WHERE j.id = n.source_id) AS source_job_kind, n.created_at, n.read_at FROM player_notifications n WHERE n.kind = 'rank' ORDER BY n.player_id, n.source_id"},
]
for c in cases:
    for s in c['steps']:
        for k in [k for k, v in s.items() if v is None and k != 'who']:
            del s[k]
names = [c['name'] for c in cases]
assert len(set(names)) == len(names), [n for n in names if names.count(n) > 1]
assert {c['scenario'] for c in cases} <= set(SCEN), {c['scenario'] for c in cases} - set(SCEN)
BASE_STMTS = SCEN.pop('base')
SCEN = {k: BASE_STMTS + v for k, v in SCEN.items()}
SCEN['base'] = BASE_STMTS
doc = {'now': BASE['now'], 'app': 'club', 'snapshotDiff': True, 'seed': 'queue.seed.sql', 'scenarios': SCEN, 'snapshot': SNAPSHOT, 'cases': cases}
with open(OUT, 'w') as f:
    json.dump(doc, f, indent=1)
    f.write('\n')
print(len(cases), 'cases')
