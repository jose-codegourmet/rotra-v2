# Cases of the Session done status: GET /api/sessions/{id}/finalization. Included by gen-signedin-queue-cases.py (it runs
# this file with its names in scope, after the sync cases). The seed has one finalization: session 4 (Smash, committed,
# no jobs). The Route Handler runs driveFinalizationJobs before it reads; Go does not (it writes results and ranking).
#   * a case with "noDrive" is captured with the drive switched off: it is what Go answers, and Go must match it;
#   * a case with "goGolden" is captured with the real drive: its golden is what the TypeScript answers once the jobs
#     ran, Go must match the golden of the case it names instead, and "differs" says the two must not be equal.
FIN = lambda sid: f"/api/sessions/{SESSION(sid)}/finalization"
POLICY = "fa000000-0000-4000-8000-000000000001"
JOB = lambda n: "a8400000-0000-4000-8000-0000000000%02d" % n
CMD = lambda n: "a3100000-0000-4000-8000-0000000000%02d" % n
DUE = "TIMESTAMPTZ '2026-11-19 03:00:00+00'"


def fin(sid, club, n, state="committed", stage="player_records", failed_stage=None, failure_code=None, committed="TIMESTAMPTZ '2026-11-13 14:00:00.5+00'", completed="NULL"):
    fs = "NULL" if failed_stage is None else "'%s'" % failed_stage
    fc = "NULL" if failure_code is None else "'%s'" % failure_code
    return ("INSERT INTO session_finalizations (session_id, club_id, command_id, state, stage, failed_stage, failure_code, stream_manifest, manifest_digest, accepted_session_revision, "
            "policy_version_id, started_at, committed_at, completed_at, facts_digest, updated_at) VALUES ('%s', '%s', '%s', '%s', '%s', %s, %s, '[]'::jsonb, decode(repeat('00', 32), 'hex'), 1, '%s', "
            "TIMESTAMPTZ '2026-11-13 14:00:00+00', %s, %s, decode(repeat('01', 32), 'hex'), now())" % (SESSION(sid), club, CMD(n), state, stage, fs, fc, POLICY, committed, completed))


def job(n, sid, kind, status="pending", attempts=0, error=None, due=DUE):
    err = "NULL" if error is None else "'%s'" % error
    done = "TIMESTAMPTZ '2026-11-13 14:01:00+00'" if status == "done" else "NULL"
    return ("INSERT INTO projection_jobs (id, kind, kind_version, source_type, source_finalization_id, status, attempts, next_attempt_at, last_error_code, completed_at, created_at, updated_at) "
            "VALUES ('%s', '%s', 1, 'finalization', '%s', '%s', %d, %s, %s, %s, TIMESTAMPTZ '2026-11-13 14:00:00+00', now())" % (JOB(n), kind, SESSION(sid), status, attempts, due, err, done))


UPD4 = lambda sets: "UPDATE session_finalizations SET %s WHERE session_id = '%s'" % (sets, SESSION(4))

# ---- who may read it, and what is not there ----
case("finalization-signed-out", FIN(4))
for n in ALL:
    case(f"finalization-club{n}-s4", FIN(4), club=n)             # only club 1 owns it
case("finalization-disabled", FIN(4), club=6, go=(401, "unauthenticated"))
case("finalization-unprovisioned", FIN(4), club=7, go=(401, "unauthenticated"))
for sid in SIDS:
    if sid != 4:
        case(f"finalization-club1-s{sid}-none-yet", FIN(sid), club=1)
case("finalization-club1-unknown", "/api/sessions/a3000000-0000-4000-8000-0000000000ff/finalization", club=1)
case("finalization-club1-not-a-uuid", "/api/sessions/nope/finalization", club=1, go=(404, "not_found"))
case("finalization-club1-s4-expired-still-answers", FIN(4), club=1, scenario=expired)
case("finalization-club1-s4-later", FIN(4), club=1, now="2027-03-01T04:00:00.000Z")

# ---- the stored states the drive leaves alone: the Route Handler and Go answer the same ----
done_jobs = scenario("fin_done", UPD4("state = 'done', stage = 'slides', completed_at = TIMESTAMPTZ '2026-11-13 14:05:00.25+00'"),
                     job(1, 4, "club_session_summaries", "done", due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                     job(2, 4, "result_snapshot", "done", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                     job(3, 4, "player_history", "done", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                     job(4, 4, "player_rank", "done", 2, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"))
case("finalization-club1-s4-done", FIN(4), club=1, scenario=done_jobs)
case("finalization-club2-s4-done-is-not-theirs", FIN(4), club=2, scenario=done_jobs)
case("finalization-club1-s4-done-with-error-text-kept", FIN(4), club=1, scenario=scenario("fin_done_error",
     UPD4("state = 'done', stage = 'slides', completed_at = TIMESTAMPTZ '2026-11-13 14:05:00+00'"),
     job(1, 4, "result_snapshot", "done", 3, error="projection_failed", due="TIMESTAMPTZ '2026-11-13 14:00:00+00'")))
case("finalization-club1-s4-unrecorded-done-no-jobs", FIN(4), club=1, scenario=scenario("fin_unrecorded",
     UPD4("state = 'done', stage = 'finishing', completed_at = TIMESTAMPTZ '2026-11-13 14:00:00.5+00'")))
case("finalization-club1-s4-not-committed-yet", FIN(4), club=1, scenario=scenario("fin_running",
     UPD4("state = 'running', stage = 'checking', committed_at = NULL, facts_digest = NULL")))
case("finalization-club1-s4-micros-cut-to-milliseconds", FIN(4), club=1, scenario=scenario("fin_micros",
     UPD4("committed_at = TIMESTAMPTZ '2026-11-13 14:00:00.123987+00', completed_at = TIMESTAMPTZ '2026-11-13 14:00:01.9999+00', state = 'done'")))
case("finalization-club1-s4-attempts-used-up-stays-failed", FIN(4), club=1, scenario=scenario("fin_exhausted",
     UPD4("state = 'failed', stage = 'player_records', failed_stage = 'slides', failure_code = 'snapshot_error'"),
     job(1, 4, "club_session_summaries", "done", due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
     job(2, 4, "result_snapshot", "failed", 8, error="invalid", due=DUE),
     job(3, 4, "player_history", "done", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
     job(4, 4, "player_rank", "pending", 0, due="TIMESTAMPTZ '2026-11-19 05:00:00+00'")))   # not due yet: the drive leaves it
case("finalization-club1-s4-jobs-not-due-yet", FIN(4), club=1, scenario=scenario("fin_not_due",
     job(1, 4, "result_snapshot", due="TIMESTAMPTZ '2026-11-19 05:00:00+00'"),
     job(2, 4, "player_history", due="TIMESTAMPTZ '2026-11-19 05:00:00+00'")))
case("finalization-club1-s4-job-running-within-lease", FIN(4), club=1, scenario=scenario("fin_running_job",
     job(1, 4, "result_snapshot", "running", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
     "UPDATE projection_jobs SET locked_at = TIMESTAMPTZ '2026-11-19 03:59:00+00' WHERE id = '%s'" % JOB(1)))
other = scenario("fin_other_clubs", fin(2, CLUB[2], 2, "done", "slides", completed="TIMESTAMPTZ '2026-11-13 14:05:00+00'"), fin(5, CLUB[2], 5), job(1, 2, "player_rank", "done"))
case("finalization-club2-s2-own-lapsed-still-answers", FIN(2), club=2, scenario=other)
case("finalization-club1-s2-another-clubs-is-not-found", FIN(2), club=1, scenario=other)
case("finalization-club2-s5-own", FIN(5), club=2, scenario=other)

# ---- a pending or lost-response finalization: the drive would run its jobs, Go does not ----
pending = scenario("fin_pending", UPD4("state = 'committed', stage = 'player_records'"),
                   job(1, 4, "club_session_summaries", "done", due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                   job(2, 4, "result_snapshot"), job(3, 4, "player_history"), job(4, 4, "player_rank"))
case("finalization-club1-s4-pending-jobs-no-drive", FIN(4), club=1, scenario=pending, noDrive=True)
case("finalization-club1-s4-pending-jobs-as-typescript-serves-it", FIN(4), club=1, scenario=pending, goGolden="finalization-club1-s4-pending-jobs-no-drive", differs=True)
lost = scenario("fin_lost_response", UPD4("state = 'committed', stage = 'player_records'"),
                job(1, 4, "result_snapshot", "done", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                job(2, 4, "player_history", "pending", 0), job(3, 4, "player_rank", "pending", 0))
case("finalization-club1-s4-half-done-no-drive", FIN(4), club=1, scenario=lost, noDrive=True)
case("finalization-club1-s4-half-done-as-typescript-serves-it", FIN(4), club=1, scenario=lost, goGolden="finalization-club1-s4-half-done-no-drive", differs=True)
retry = scenario("fin_failed_retry", UPD4("state = 'failed', stage = 'player_records', failed_stage = 'slides', failure_code = 'snapshot_error'"),
                 job(1, 4, "result_snapshot", "failed", 2, error="snapshot_error", due=DUE), job(2, 4, "player_history", "done", 1, due="TIMESTAMPTZ '2026-11-13 14:00:00+00'"),
                 job(3, 4, "player_rank", "pending", 0))
case("finalization-club1-s4-failed-due-no-drive", FIN(4), club=1, scenario=retry, noDrive=True)
case("finalization-club1-s4-failed-due-as-typescript-serves-it", FIN(4), club=1, scenario=retry, goGolden="finalization-club1-s4-failed-due-no-drive", differs=True)
case("finalization-club1-s4-pending-expired-no-drive", FIN(4), club=1, scenario=scenario("fin_pending_expired", UPD4("state = 'committed'"), job(1, 4, "result_snapshot"),
     "UPDATE club_entitlements SET effective_access_ends_at = TIMESTAMPTZ '2026-11-01 00:00:00+00' WHERE club_id = '%s'" % CLUB[1]), noDrive=True)
