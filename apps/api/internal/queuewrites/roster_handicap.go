package queuewrites

import (
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// handicapSpotCodes are the spots on the figure, in figure order (HANDICAP_SPOTS in handicap.rules.ts; the codes the
// session_players_handicap_spots_check constraint allows).
var handicapSpotCodes = []string{
	"left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist",
	"lower_back", "left_knee", "right_knee", "left_ankle", "right_ankle",
}

// handicapSpotsOf is handicapSpotsOf: known spots only, each once, in figure order.
func handicapSpotsOf(values []string) []string {
	out := []string{}
	for _, code := range handicapSpotCodes {
		if slices.Contains(values, code) {
			out = append(out, code)
		}
	}
	return out
}

// setHandicap is PATCH roster/handicap (Handicap · tonight, D-2026-11-25-03): `{ operationId, rosterId, spots }` saves the whole
// set of marked spots on one live entry; an empty list clears it. Prepared or active sessions (mockup change 2026-11-27).
// Repeat-safe: the same set writes nothing.
func (s *server) setHandicap(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	// The route reads `spots` as an array or as []; an entry that is no known spot (a number, null, a typo) is refused.
	raw, _ := body["spots"].([]any)
	spots := make([]string, 0, len(raw))
	known := true
	for _, v := range raw {
		str, ok := v.(string)
		if !ok || !slices.Contains(handicapSpotCodes, str) {
			known = false
			break
		}
		spots = append(spots, str)
	}
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "This session has ended.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		if !known {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"spots": "Choose spots on the figure."})
		}
		entry, err := t.liveEntry(body.Text("rosterId"))
		if err != nil {
			return nil, err
		}
		set := handicapSpotsOf(spots)
		if !slices.Equal(handicapSpotsOf(entry.HandicapSpots), set) {
			if err := t.q.SetSessionPlayerHandicap(t.ctx, sqlcgen.SetSessionPlayerHandicapParams{HandicapSpots: set, Now: t.stamp(), ID: entry.ID}); err != nil {
				return nil, err
			}
		}
		return map[string]any{"rosterId": entry.ID.String(), "name": entry.NameSnapshot, "spots": set}, nil
	})
	return writes.Result{Body: out}, err
}
