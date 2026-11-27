package signedin

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionresult"
)

// GET /api/sessions/{sessionId}/results: the private snapshot, the current publication and the exports (Q-RESULTS).
// Port of readSessionResults in packages/db/src/queue/results.ts. The snapshot is what the finalization stored: its
// standings already carry the shared positions (D-2026-11-18-05), so nothing is ranked here. An invalid session has no
// results, nor has one with Record games off (D-2026-11-18-06): both read null before the access check.

type finalizationProgress struct {
	State string `json:"state"`
	Stage string `json:"stage"`
}

type snapshotDTO struct {
	ID                 string          `json:"id"`
	Version            int32           `json:"version"`
	CalculationVersion string          `json:"calculationVersion"`
	Standings          json.RawMessage `json:"standings"`
	Awards             json.RawMessage `json:"awards"`
	OffDay             json.RawMessage `json:"offDay"`
	GeneratedAt        string          `json:"generatedAt"`
}

type publicationDTO struct {
	State           string   `json:"state"`
	PublishedSlides []string `json:"publishedSlides"`
	IncludeOffDay   bool     `json:"includeOffDay"`
	PublishedAt     *string  `json:"publishedAt"`
}

type resultExportDTO struct {
	ID            string   `json:"id"`
	Format        string   `json:"format"`
	Slides        []string `json:"slides"`
	IncludeOffDay bool     `json:"includeOffDay"`
	FrameCount    int32    `json:"frameCount"`
	Ready         bool     `json:"ready"`
	CreatedAt     string   `json:"createdAt"`
}

// sharePositions shows saved standings with shared positions without gaps (owner, November 20, 2026); the saved rows never change.
func sharePositions(b []byte) json.RawMessage { return jsonOrNull(sessionresult.SharePositions(b)) }

func jsonOrNull(b []byte) json.RawMessage {
	if len(b) == 0 {
		return json.RawMessage("null")
	}
	return b
}

func (s *server) queueResults(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	sess, err := ownSession(ctx, q, club, r.PathValue("sessionId"))
	if err != nil {
		return nil, err
	}
	if sess.State == sqlcgen.QueueSessionStateInvalid {
		return nil, nil // a null body
	}
	if err := s.requireSessionAccess(ctx, q, club, sess); err != nil {
		return nil, err
	}
	out := struct {
		Finalization *finalizationProgress `json:"finalization"`
		Snapshot     *snapshotDTO          `json:"snapshot"`
		Publication  *publicationDTO       `json:"publication"`
		Exports      []resultExportDTO     `json:"exports"`
	}{Exports: []resultExportDTO{}}
	fin, err := q.GetQueueFinalizationProgress(ctx, sess.ID)
	if err == nil {
		out.Finalization = &finalizationProgress{State: fin.State, Stage: fin.Stage}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	snap, err := q.GetQueueLatestSnapshot(ctx, sess.ID)
	if err == nil {
		out.Snapshot = &snapshotDTO{
			ID: snap.ID.String(), Version: snap.Version, CalculationVersion: snap.CalculationVersion, Standings: sharePositions(snap.Standings),
			Awards: jsonOrNull(snap.Awards), OffDay: jsonOrNull(snap.OffDay), GeneratedAt: httpapi.ToIso(snap.GeneratedAt.Time),
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	pub, err := q.GetQueuePublication(ctx, sess.ID)
	if err == nil {
		out.Publication = &publicationDTO{State: pub.State, PublishedSlides: stringsOrEmpty(pub.PublishedSlides), IncludeOffDay: pub.IncludeOffDay, PublishedAt: isoPtr(pub.PublishedAt)}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	exports, err := q.ListQueueResultExports(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	for _, e := range exports {
		out.Exports = append(out.Exports, resultExportDTO{
			ID: e.ID.String(), Format: e.Format, Slides: stringsOrEmpty(e.Slides), IncludeOffDay: e.IncludeOffDay, FrameCount: e.FrameCount,
			Ready: e.Ready, CreatedAt: httpapi.ToIso(e.CreatedAt.Time),
		})
	}
	return out, nil
}
