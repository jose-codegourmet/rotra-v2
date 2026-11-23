package queuewrites

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The projection jobs a committed Session done starts (packages/db/src/player/projections.ts driveFinalizationJobs, runProjectionJobs, runJob,
// releaseStaleJobs and packages/db/src/queue/finalization.ts settleFinalization). Every job is unique per source + kind + version (partial
// uniques in SQL), claimed with SKIP LOCKED and run in its own transaction, so concurrent or repeated drives never run a job twice.

const (
	// maxJobAttempts is MAX_JOB_ATTEMPTS: a job that used them up stays failed.
	maxJobAttempts = 8
	// inRequestRounds is IN_REQUEST_ROUNDS: how many claim rounds one request may run.
	inRequestRounds = 3
	// jobBatch is the jobs one claim round takes.
	jobBatch = 10
	// jobLease is how long a job may stay running before another request releases it.
	jobLease = 10 * time.Minute
)

// backoff is backoff: 30 seconds doubling with each attempt made, at most an hour.
func backoff(attempts int32) time.Duration {
	d := 30 * time.Second
	for i := int32(0); i < attempts && d < time.Hour; i++ {
		d *= 2
	}
	return min(d, time.Hour)
}

// driveQuietly is driveFinalizationJobs with its error swallowed, as the Route Handler does: the commit (or the read) stands, the jobs keep their
// own status and the next read runs them again.
func (s *server) driveQuietly(ctx context.Context, club, session pgtype.UUID, retryFailed bool) {
	// GET finalization drives the jobs outside any write route's scope: their events still go out (B-26).
	ctx = liveupdates.EnsureScope(ctx, liveupdates.KindFinalization)
	if err := s.driveFinalizationJobs(ctx, club, session, retryFailed); err != nil {
		s.log.Error("finalization: in-request jobs", "error", err.Error())
	}
}

// DriveFinalization is the drive GET finalization runs before it reads (no retry of failed jobs).
func (s *server) DriveFinalization(ctx context.Context, club, session pgtype.UUID) {
	s.driveQuietly(ctx, club, session, false)
}

// driveFinalizationJobs is driveFinalizationJobs: it drives one committed finalization's own jobs as far as they go now, a few claim rounds, only
// this session's due jobs. retryFailed makes the session's failed jobs with attempts left due now. No finalization, another club's, or one already
// done is a no-op.
func (s *server) driveFinalizationJobs(ctx context.Context, club, session pgtype.UUID, retryFailed bool) error {
	q := sqlcgen.New(s.pool)
	f, err := q.GetSessionFinalization(ctx, session)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if !f.CommittedAt.Valid || f.ClubID != club || f.State == sqlcgen.FinalizationStateDone {
		return nil
	}
	if retryFailed {
		if err := q.RetryFailedProjectionJobs(ctx, sqlcgen.RetryFailedProjectionJobsParams{Now: s.stamp(), SessionID: session, MaxAttempts: maxJobAttempts}); err != nil {
			return err
		}
	}
	now := s.at()
	if err := q.ReleaseStaleProjectionJobs(ctx, sqlcgen.ReleaseStaleProjectionJobsParams{
		Now: s.stamp(), Cutoff: pgtype.Timestamptz{Time: now.Add(-jobLease), Valid: true}, SessionID: session,
	}); err != nil {
		return err
	}
	for round := 0; round < inRequestRounds; round++ {
		results, err := s.runProjectionJobs(ctx, session)
		if err != nil {
			return err
		}
		if len(results) == 0 || !slices.Contains(results, true) {
			break
		}
	}
	return nil
}

// runProjectionJobs is runProjectionJobs scoped to a session: claim the due jobs (SKIP LOCKED), run each in its own transaction, and on failure
// record a redacted error code and a backoff. It reports, per job it ran, whether it was done.
func (s *server) runProjectionJobs(ctx context.Context, session pgtype.UUID) ([]bool, error) {
	var claimed []sqlcgen.ClaimProjectionJobsRow
	now := s.at()
	stamp := pgtype.Timestamptz{Time: now, Valid: true}
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		ids, err := q.ListDueProjectionJobIDs(ctx, sqlcgen.ListDueProjectionJobIDsParams{Now: stamp, MaxAttempts: maxJobAttempts, SessionID: session, Batch: jobBatch})
		if err != nil || len(ids) == 0 {
			return err
		}
		rows, err := q.ClaimProjectionJobs(ctx, sqlcgen.ClaimProjectionJobsParams{Now: stamp, Ids: ids})
		if err != nil {
			return err
		}
		// The TypeScript reads the claimed jobs back with no order; they run in the order they were claimed.
		slices.SortStableFunc(rows, func(a, b sqlcgen.ClaimProjectionJobsRow) int {
			return slices.Index(ids, a.ID) - slices.Index(ids, b.ID)
		})
		claimed = rows
		return nil
	})
	if err != nil {
		return nil, err
	}
	var results []bool
	for _, job := range claimed {
		runErr := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error { return s.runJob(ctx, q, job, now) })
		if runErr == nil {
			results = append(results, true)
			continue
		}
		code := jobErrorCode(runErr)
		failErr := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
			if err := q.FailProjectionJob(ctx, sqlcgen.FailProjectionJobParams{
				Now: stamp, ID: job.ID, LastErrorCode: pgtype.Text{String: code, Valid: true},
				NextAttemptAt: pgtype.Timestamptz{Time: now.Add(backoff(job.Attempts)), Valid: true},
			}); err != nil {
				return err
			}
			if job.SourceFinalizationID.Valid {
				return s.settleFinalization(ctx, q, job.SourceFinalizationID)
			}
			return nil
		})
		if failErr != nil {
			return results, failErr
		}
		results = append(results, false)
	}
	return results, nil
}

// jobErrorCode is the redacted code a failed job keeps: a service error's code; otherwise the kind of error, as the TypeScript keeps the error
// name (Prisma's names, which Go answers with the same one for a database error).
func jobErrorCode(err error) string {
	var se *writes.Error
	if errors.As(err, &se) {
		return string(se.Code)
	}
	var pg *pgconn.PgError
	if errors.As(err, &pg) || errors.Is(err, pgx.ErrNoRows) {
		return "PrismaClientKnownRequestError"
	}
	return "Error"
}

// runJob is runJob: one claimed job's work, then the job done and the finalization settled, in one transaction.
func (s *server) runJob(ctx context.Context, q *sqlcgen.Queries, job sqlcgen.ClaimProjectionJobsRow, now time.Time) error {
	stamp := pgtype.Timestamptz{Time: now, Valid: true}
	switch job.Kind {
	case sqlcgen.ProjectionKindResultSnapshot:
		if job.SourceFinalizationID.Valid {
			if err := s.writeResultSnapshot(ctx, q, job.SourceFinalizationID, now); err != nil {
				return err
			}
		}
	case sqlcgen.ProjectionKindPlayerHistory:
		// History is read straight from facts; this stage only confirms they are committed.
		if job.SourceFinalizationID.Valid {
			if _, err := q.GetSessionFinalization(ctx, job.SourceFinalizationID); err != nil {
				return err
			}
		}
	case sqlcgen.ProjectionKindPlayerRank:
		var targets []pgtype.UUID
		switch {
		case job.TargetPlayerID.Valid:
			targets = []pgtype.UUID{job.TargetPlayerID}
		case job.SourceFinalizationID.Valid:
			ids, err := q.ListFinalizationPlayerIDs(ctx, job.SourceFinalizationID)
			if err != nil {
				return err
			}
			targets = ids
		}
		for _, player := range targets {
			if err := s.recomputeRank(ctx, q, player, now, job.ID); err != nil {
				return err
			}
		}
	}
	if err := q.FinishProjectionJob(ctx, sqlcgen.FinishProjectionJobParams{Now: stamp, ID: job.ID}); err != nil {
		return err
	}
	if job.SourceFinalizationID.Valid {
		if err := s.settleFinalization(ctx, q, job.SourceFinalizationID); err != nil {
			return err
		}
		// The projection changed what the session's results and its players' own records show (B-50).
		f, err := q.GetSessionFinalization(ctx, job.SourceFinalizationID)
		if err != nil {
			return err
		}
		players, err := q.ListFinalizationPlayerIDs(ctx, job.SourceFinalizationID)
		if err != nil {
			return err
		}
		liveupdates.Note(ctx, f.ClubID, job.SourceFinalizationID, players...)
	}
	return nil
}

// settleFinalization is settleFinalization: it marks the finalization done once every downstream job is done, or records the failed stage when a
// job has failed. Canonical columns are frozen; only state and stage move. The first failed job (in creation order) names the failed stage.
func (s *server) settleFinalization(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) error {
	f, err := q.GetSessionFinalization(ctx, session)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if !f.CommittedAt.Valid || f.State == sqlcgen.FinalizationStateDone {
		return nil
	}
	jobs, err := q.ListFinalizationJobStates(ctx, session)
	if err != nil {
		return err
	}
	for _, j := range jobs {
		if j.Status != sqlcgen.ProjectionJobStatusFailed {
			continue
		}
		stage := sqlcgen.FinalizationStagePlayerRecords
		if j.Kind == sqlcgen.ProjectionKindResultSnapshot {
			stage = sqlcgen.FinalizationStageSlides
		}
		code := "projection_failed"
		if j.LastErrorCode.Valid {
			code = j.LastErrorCode.String
		}
		return q.SettleFinalizationFailed(ctx, sqlcgen.SettleFinalizationFailedParams{FailedStage: stage, FailureCode: pgtype.Text{String: code, Valid: true}, Now: s.stamp(), SessionID: session})
	}
	allDone, snapshotDone := true, false
	for _, j := range jobs {
		if j.Status != sqlcgen.ProjectionJobStatusDone {
			allDone = false
		}
		if j.Kind == sqlcgen.ProjectionKindResultSnapshot && j.Status == sqlcgen.ProjectionJobStatusDone {
			snapshotDone = true
		}
	}
	if allDone {
		return q.SettleFinalizationDone(ctx, sqlcgen.SettleFinalizationDoneParams{Now: s.stamp(), SessionID: session})
	}
	stage := sqlcgen.FinalizationStagePlayerRecords
	if snapshotDone {
		stage = sqlcgen.FinalizationStageSlides
	}
	return q.SettleFinalizationCommitted(ctx, sqlcgen.SettleFinalizationCommittedParams{Stage: stage, Now: s.stamp(), SessionID: session})
}
