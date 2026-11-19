package signedin

import (
	"math"
	"net/http"
	"regexp"
	"strconv"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// GET /api/players/{playerId}/compare: P-COMPARE, account-only even though its numbers are public on profiles. A port
// of apps/player/src/app/api/players/[playerId]/compare/route.ts and readPlayerCompare. Always private: an
// always-private player answers 403 to everyone but themself, and comparing a player with themself is a null compare.

var digits = regexp.MustCompile(`^\d+$`)

func (s *server) playerCompare() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		filter, present := publicreads.QueryValue(r.URL.RawQuery, "filter")
		if !present {
			filter = "all"
		}
		rawPage, present := publicreads.QueryValue(r.URL.RawQuery, "page")
		if !present {
			rawPage = "0"
		}
		if !publicreads.ValidCompareFilter(filter) || !digits.MatchString(rawPage) {
			return nil, &serviceError{code: httpapi.ErrInvalid}
		}
		// Number.isSafeInteger: a digit string past 2^53-1 is not a page.
		n, err := strconv.ParseFloat(rawPage, 64)
		if err != nil || n > math.Pow(2, 53)-1 {
			return nil, &serviceError{code: httpapi.ErrInvalid}
		}
		body, err := publicreads.ReadCompare(r.Context(), q, who.ID, r.PathValue("playerId"), filter, int64(n), s.now(), s.approved)
		return body, asServiceError(err)
	})
}
