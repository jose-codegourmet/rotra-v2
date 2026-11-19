package signedin

import (
	"errors"
	"net/http"
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The signed-in reads that sit beside the public profile and leaderboard (their reading is in internal/publicreads):
// GET /api/me/profile, GET /api/leaderboard/me and GET /api/rtr-ids/{rtrId}/stats.

// asServiceError maps what the shared reads return to the service errors the routes answer with.
func asServiceError(err error) error {
	switch {
	case errors.Is(err, publicreads.ErrInvalidPeriod):
		return &serviceError{code: httpapi.ErrInvalid}
	case errors.Is(err, publicreads.ErrProfileNotFound), errors.Is(err, publicreads.ErrStatsNotFound):
		return errNotFound
	}
	return err
}

// myProfile is the signed-in player's own profile: the public one, unmasked, plus the Admin change note. Private, no-store.
func (s *server) myProfile() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		profile, err := publicreads.ReadMyProfile(r.Context(), q, who.ID, s.now())
		if err != nil {
			return nil, asServiceError(err)
		}
		return struct {
			Profile any `json:"profile"`
		}{profile}, nil
	})
}

// myLeaderboard is where the signed-in player stands: the full standing for a period, or only the place inside the top
// 50 with no period. Open after the Google deadline too: the leaderboard stays reachable for every player.
func (s *server) myLeaderboard() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		period, present := publicreads.QueryValue(r.URL.RawQuery, "period")
		body, err := publicreads.ReadMyLeaderboard(r.Context(), q, period, present, s.now(), who.ID)
		return body, asServiceError(err)
	}, withoutGoogle)
}

// rtrStats is the Latest stats for the Queue session page's participant profile card (#731): a credentialed read from
// the paired Queue origin by a signed-in Player. The Origin is checked first, and every answer carries the CORS headers
// of an allowed origin. The Go API cannot check that the Queue origin is paired with the Player origin it was
// called on (the TypeScript compares the two); it allows the configured Queue origins.
func (s *server) rtrStats() http.Handler {
	inner := s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		body, err := publicreads.ReadStatsByRTR(r.Context(), q, r.PathValue("rtrId"), who.ID, s.now())
		return body, asServiceError(err)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := origin != "" && slices.Contains(s.queueOrigins, origin)
		cw := &corsWriter{ResponseWriter: w, origin: origin, allowed: allowed}
		if !allowed {
			h := cw.Header()
			h.Set("Cache-Control", "private, no-store")
			h.Set("Content-Type", "application/json")
			cw.WriteHeader(http.StatusForbidden)
			_, _ = cw.Write([]byte(`{"error":{"code":"forbidden"}}`))
			return
		}
		inner.ServeHTTP(cw, r)
	})
}

// corsWriter adds the CORS headers of the paired Queue origin to every response, whatever writes it, and makes the
// answer vary by Origin as well as by the cookie.
type corsWriter struct {
	http.ResponseWriter
	origin  string
	allowed bool
}

func (c *corsWriter) WriteHeader(status int) {
	h := c.ResponseWriter.Header()
	h.Set("Vary", "Origin, Cookie")
	if c.allowed {
		h.Set("Access-Control-Allow-Origin", c.origin)
		h.Set("Access-Control-Allow-Credentials", "true")
	}
	c.ResponseWriter.WriteHeader(status)
}
