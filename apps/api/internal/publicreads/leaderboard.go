package publicreads

import (
	"log/slog"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// P-LEADERBOARD reads: GET /api/leaderboard and GET /api/leaderboard/search, for a visitor or a signed-in Player
// (the viewer decides who is masked). Ports of apps/player/src/app/api/leaderboard/{route,search/route}.ts. The
// standings are in board.go.

const (
	defaultLimit = 25
	maxLimit     = 50
	maxQueryLen  = 100 // UTF-16 units, as the search route's slice(0, 100)
	// maxSafeInteger is Number.MAX_SAFE_INTEGER, the largest offset the route accepts.
	maxSafeInteger = 1<<53 - 1
)

type leaderboard struct {
	pool *pgxpool.Pool
	log  *slog.Logger
	now  func() int64 // Unix milliseconds
}

type pageBody struct {
	Entries     []boardRow `json:"entries"`
	Total       int        `json:"total"`
	PeriodStart string     `json:"periodStart"`
}

type searchBody struct {
	Hits  []boardRow `json:"hits"`
	Total int        `json:"total"`
}

// page answers GET /api/leaderboard?offset=&limit=&period=: the parameters are checked before the board is read
// (422 invalid), the offset first.
func (l *leaderboard) page(w http.ResponseWriter, r *http.Request) {
	offset, limit, ok := pageParams(r.URL.RawQuery)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	value, present := queryValue(r.URL.RawQuery, "period")
	p, ok := parsePeriod(value, present)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	var body pageBody
	err := readTx(r.Context(), l.pool, func(q *sqlcgen.Queries) error {
		b, err := readBoard(r.Context(), q, p, l.now())
		if err != nil {
			return err
		}
		body, err = b.pageOf(r.Context(), q, int64(offset), limit, viewerOf(r))
		return err
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
}

// pageParams is the route's own check: offset a non-negative safe integer (default 0), limit an integer from 1 to 50
// (default 25), both read the way JavaScript's Number() reads them.
func pageParams(rawQuery string) (offset float64, limit int, ok bool) {
	offset, limitN := 0.0, float64(defaultLimit)
	if v, found := queryValue(rawQuery, "offset"); found {
		offset = jsToNumber(v)
	}
	if v, found := queryValue(rawQuery, "limit"); found {
		limitN = jsToNumber(v)
	}
	if !isInteger(offset) || offset < 0 || offset > maxSafeInteger || !isInteger(limitN) || limitN < 1 || limitN > maxLimit {
		return 0, 0, false
	}
	return offset, int(limitN), true
}

func isInteger(f float64) bool { return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) }

// search answers GET /api/leaderboard/search?q=&period=: name or nickname search over the unmasked rows of the
// top 50 for this viewer. The period is checked before a blank query is answered with the empty state.
func (l *leaderboard) search(w http.ResponseWriter, r *http.Request) {
	q, _ := queryValue(r.URL.RawQuery, "q")
	q = truncateUTF16(q, maxQueryLen)
	value, present := queryValue(r.URL.RawQuery, "period")
	p, ok := parsePeriod(value, present)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	if jsTrim(q) == "" {
		httpapi.WriteJSON(w, http.StatusOK, searchBody{Hits: []boardRow{}}, httpapi.Private)
		return
	}
	var body searchBody
	err := readTx(r.Context(), l.pool, func(qs *sqlcgen.Queries) error {
		b, err := readBoard(r.Context(), qs, p, l.now())
		if err != nil {
			return err
		}
		body, err = b.searchOf(r.Context(), qs, q, viewerOf(r))
		return err
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
}

func (l *leaderboard) fail(w http.ResponseWriter, r *http.Request, err error) {
	failRead(w, r, l.log, "leaderboard read failed", err)
}

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

// defaultBannerID is DEFAULT_PROFILE_BANNER_ID in profileBanner.rules.ts.
const defaultBannerID = "court"

// resolveBanner is resolveProfileBanner. A banner the player chose is kept even if it was hidden or
// deleted since. With none chosen, the default is the shown banner marked Default, else Court while it
// is shown, else the first shown banner in upload order, else Court. An empty image means a seeded
// banner the apps draw from theme tokens, so it is null.
func resolveBanner(chosenID, chosenImage pgtype.Text, shown []sqlcgen.ListShownProfileBannersRow) (key string, image *string) {
	if chosenID.Valid {
		return chosenID.String, nonEmpty(chosenImage.String)
	}
	for _, b := range shown {
		if b.IsDefault {
			return b.ID, nonEmpty(b.Image)
		}
	}
	for _, b := range shown {
		if b.ID == defaultBannerID {
			return b.ID, nonEmpty(b.Image)
		}
	}
	if len(shown) > 0 {
		return shown[0].ID, nonEmpty(shown[0].Image)
	}
	return defaultBannerID, nil
}

func nonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
