package signedin

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The Session done status: GET /api/sessions/{sessionId}/finalization. A port of readFinalizationStatus in
// packages/db/src/queue/finalization.ts, and of the drive the Route Handler runs before it: driveFinalizationJobs claims this
// session's projection jobs and runs them (result snapshot, player history, player rank), which moves the jobs and the
// finalization row on. That drive writes, so it is not here: Deps.DriveFinalization is the queuewrites package's port of it
// (main wires it). Without it this read answers the stored state.

func (s *server) registerQueueFinalization(rt *Router) {
	rt.Handle("GET /api/sessions/{sessionId}/finalization", store.AudienceClub, s.club(s.queueFinalization))
}

type finalizationJobDTO struct {
	Kind          string  `json:"kind"`
	Status        string  `json:"status"`
	Attempts      int32   `json:"attempts"`
	LastErrorCode *string `json:"lastErrorCode"`
}

// queueFinalization is readFinalizationStatus. No finalization, another club's and a malformed id are all not found. The
// TypeScript makes no entitlement check here, so none is made.
func (s *server) queueFinalization(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	id, ok := parseUUIDString(r.PathValue("sessionId"))
	if !ok {
		return nil, errNotFound
	}
	// The Route Handler drives this session's jobs first and never lets that fail the read.
	if s.driveFinalization != nil {
		s.driveFinalization(ctx, club, id)
	}
	f, err := q.GetQueueFinalization(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	if f.ClubID != club {
		return nil, errNotFound
	}
	rows, err := q.ListQueueFinalizationJobs(ctx, id)
	if err != nil {
		return nil, err
	}
	jobs := make([]finalizationJobDTO, 0, len(rows))
	for _, j := range rows {
		jobs = append(jobs, finalizationJobDTO{Kind: string(j.Kind), Status: string(j.Status), Attempts: j.Attempts, LastErrorCode: textPtr(j.LastErrorCode)})
	}
	var failedStage *string
	if f.FailedStage.Valid {
		v := string(f.FailedStage.FinalizationStage)
		failedStage = &v
	}
	recordGames, err := q.GetSessionRecordGames(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		recordGames, err = true, nil
	}
	if err != nil {
		return nil, err
	}
	return struct {
		SessionID   string               `json:"sessionId"`
		CommandID   string               `json:"commandId"`
		State       string               `json:"state"`
		Stage       string               `json:"stage"`
		Accepted    bool                 `json:"accepted"`
		CommittedAt *string              `json:"committedAt"`
		CompletedAt *string              `json:"completedAt"`
		FailedStage *string              `json:"failedStage"`
		FailureCode *string              `json:"failureCode"`
		RecordGames bool                 `json:"recordGames"`
		Jobs        []finalizationJobDTO `json:"jobs"`
	}{
		RecordGames: recordGames,
		SessionID:   f.SessionID.String(), CommandID: f.CommandID.String(), State: string(f.State), Stage: string(f.Stage),
		Accepted: f.CommittedAt.Valid, CommittedAt: isoPtr(f.CommittedAt), CompletedAt: isoPtr(f.CompletedAt),
		FailedStage: failedStage, FailureCode: textPtr(f.FailureCode), Jobs: jobs,
	}, nil
}
