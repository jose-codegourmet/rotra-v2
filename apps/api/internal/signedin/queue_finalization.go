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
// packages/db/src/queue/finalization.ts, and only of that read.
//
// The Route Handler also runs driveFinalizationJobs before it reads. That drive claims this session's projection jobs
// and runs them: it writes the result snapshot, the player history and the player ranks, and it moves the jobs and the
// finalization row on (pending to running to done or failed). Those are permanent results and ranking, so this port does
// not run it. The answer here is therefore the stored state, exactly as the TypeScript read answers it once the drive has
// had nothing to do. While jobs are still due, the Route Handler answers a later state than this one does. The route is
// registered but not yet moved to Go: it waits for the write track that owns the drive.

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
		Jobs        []finalizationJobDTO `json:"jobs"`
	}{
		SessionID: f.SessionID.String(), CommandID: f.CommandID.String(), State: string(f.State), Stage: string(f.Stage),
		Accepted: f.CommittedAt.Valid, CommittedAt: isoPtr(f.CommittedAt), CompletedAt: isoPtr(f.CompletedAt),
		FailedStage: failedStage, FailureCode: textPtr(f.FailureCode), Jobs: jobs,
	}, nil
}
