package adminwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/rankingsettings"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Ranking settings write: POST /api/ranking-settings (D-CONFIG, Save configuration). Port of
// apps/admin/src/app/api/ranking-settings/route.ts and saveRankingPolicy in packages/db/src/admin/configuration.ts.
// The list read is signedin's. Saving records configuration only: no rank is recalculated.

func (s *server) registerRanking(rt *signedin.Router) {
	rt.Handle("POST /api/ranking-settings", store.AudienceAdmin, s.admin(s.saveRanking))
}

// policyDTO is policyDto: a saved version. It is never evidence that any rank was recalculated (#247).
type policyDTO struct {
	ID                           string `json:"id"`
	Version                      int32  `json:"version"`
	EffectiveAt                  string `json:"effectiveAt"`
	AssessmentWeightBp           int16  `json:"assessmentWeightBp"`
	PerformanceWeightBp          int16  `json:"performanceWeightBp"`
	RecentStandardMatchThreshold int16  `json:"recentStandardMatchThreshold"`
	AlgorithmVersion             string `json:"algorithmVersion"`
	ChangeNote                   string `json:"changeNote"`
	CreatedByDisplayName         string `json:"createdByDisplayName"`
	CreatedAt                    string `json:"createdAt"`
}

func policyBody(p sqlcgen.GetAdminRankingPolicyByIDRow) struct {
	Version policyDTO `json:"version"`
} {
	return struct {
		Version policyDTO `json:"version"`
	}{policyDTO{
		ID: p.ID.String(), Version: p.Version, EffectiveAt: httpapi.ToIso(p.EffectiveAt.Time),
		AssessmentWeightBp: p.AssessmentWeightBp, PerformanceWeightBp: p.PerformanceWeightBp,
		RecentStandardMatchThreshold: p.RecentStandardMatchThreshold, AlgorithmVersion: p.AlgorithmVersion,
		ChangeNote: p.ChangeNote.String, CreatedByDisplayName: p.CreatedByName.String, CreatedAt: httpapi.ToIso(p.CreatedAt.Time),
	}}
}

// saveRanking is the POST handler and saveRankingPolicy. The order is the TypeScript's: the JSON body, the values
// checked with the form's rules (`invalid`, fields keyed like the form), then in one transaction the command lookup
// (a retried save answers the same version), the advisory lock, and the expected version, which must still be the
// newest (`conflict` otherwise; null is the newest of an empty table).
//
// The numbers are JavaScript numbers: a value that is not a number is NaN, which no rule accepts. The weight of
// performance is therefore required: a save that omits it is `invalid` on that field.
func (s *server) saveRanking(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	draft := rankingsettings.Draft{
		AssessmentWeightBp:           body.Number("assessmentWeightBp"),
		PerformanceWeightBp:          body.Number("performanceWeightBp"),
		RecentStandardMatchThreshold: body.Number("recentStandardMatchThreshold"),
		ChangeNote:                   body.Text("changeNote"),
	}
	if errs := rankingsettings.Validate(draft); len(errs) > 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, errs)
	}
	expected, hasExpected := body.NumberOrNull("expectedVersion")
	// The TypeScript sends a command id that is no UUID to Postgres, which refuses it: an unexpected 500. Go answers
	// `invalid` with no fields instead (a logged deviation).
	command, ok := pgUUID(body.Text("commandId"))
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var out any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		done, err := q.GetAdminAuditEventByCommand(ctx, command)
		switch {
		case err == nil:
			// findUniqueOrThrow: an event of another kind of target is a missing version, an unexpected 500.
			v, err := q.GetAdminRankingPolicyByID(ctx, done.TargetID)
			if err != nil {
				return err
			}
			out = policyBody(v)
			return nil
		case !errors.Is(err, pgx.ErrNoRows):
			return err
		}
		if err := q.LockRankingPolicyVersions(ctx); err != nil {
			return err
		}
		latest, err := q.GetLatestRankingPolicy(ctx)
		hasLatest := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		// (latest?.version ?? null) !== expectedVersion: NaN is never equal.
		if hasLatest != hasExpected || hasLatest && float64(latest.Version) != expected {
			return writes.Fail(httpapi.ErrConflict, nil)
		}
		version, algorithm := int32(1), "unapproved"
		if hasLatest {
			version, algorithm = latest.Version+1, latest.AlgorithmVersion
		}
		id, err := newUUID()
		if err != nil {
			return err
		}
		assessment := int16(draft.AssessmentWeightBp)
		note := fields.JSTrim(draft.ChangeNote)
		now := s.stamp()
		if err := q.InsertRankingPolicy(ctx, sqlcgen.InsertRankingPolicyParams{
			ID: id, Version: version, EffectiveAt: now, AssessmentWeightBp: assessment,
			PerformanceWeightBp:          rankingsettings.BasisPointsTotal - assessment,
			RecentStandardMatchThreshold: int16(draft.RecentStandardMatchThreshold), AlgorithmVersion: algorithm,
			CreatedByAdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, ChangeNote: pgtype.Text{String: note, Valid: note != ""},
		}); err != nil {
			return err
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "ranking.policy_saved", TargetType: "ranking_policy_version", TargetID: id.String(), SourceCommandID: command,
			Metadata: map[string]any{"version": version, "assessmentWeightBp": assessment, "threshold": int16(draft.RecentStandardMatchThreshold)},
		}); err != nil {
			return err
		}
		v, err := q.GetAdminRankingPolicyByID(ctx, id.String())
		if err != nil {
			return err
		}
		out = policyBody(v)
		return nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}
