package publicreads

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// P-LEADERBOARD public reads: GET /api/leaderboard and GET /api/leaderboard/search. Port of
// apps/player/src/app/api/leaderboard/{route,search/route}.ts and packages/db/src/player/leaderboard.ts.
// Stored data only: nothing here calculates a rank.

const (
	defaultLimit = 25
	maxLimit     = 50
	maxQueryLen  = 100 // UTF-16 units, as the search route's slice(0, 100)
	// Prisma rejects a skip beyond a signed 64-bit integer, which the Route Handler answers as a 500.
	int64Bound = float64(1 << 63)
)

type leaderboard struct {
	pool     *pgxpool.Pool
	log      *slog.Logger
	approved []string
}

// entry is a LeaderboardRow on the wire: public fields only. An always-private player is masked for
// everyone (this read is cached for every viewer): the picture, banner and position stay, the level is hidden.
type entry struct {
	ID             string  `json:"id"`
	FullName       string  `json:"fullName"`
	Nickname       *string `json:"nickname"`
	PlayingLevel   string  `json:"playingLevel"`
	PictureURL     *string `json:"pictureUrl"`
	BannerKey      string  `json:"bannerKey"`
	BannerImageURL *string `json:"bannerImageUrl"`
	Position       int64   `json:"position"`
	Masked         bool    `json:"masked,omitempty"`
	LevelHidden    bool    `json:"levelHidden,omitempty"`
}

type pageBody struct {
	Entries []entry `json:"entries"`
	Total   int64   `json:"total"`
}

type searchBody struct {
	Hits  []entry `json:"hits"`
	Total int64   `json:"total"`
}

// listedRow is the part of a list or search row that builds an entry.
type listedRow struct {
	playerID              pgtype.UUID
	levelCode, fullName   string
	nickname, avatarRef   pgtype.Text
	visibility            sqlcgen.ProfileVisibility
	bannerID, bannerImage pgtype.Text
}

// page answers GET /api/leaderboard?offset=&limit=. Parameters are checked before the service runs
// (422 invalid), then the empty state applies while no rank algorithm is approved.
func (l *leaderboard) page(w http.ResponseWriter, r *http.Request) {
	offset, limit, ok := pageParams(r.URL.RawQuery)
	if !ok {
		httpapi.WriteError(w, httpapi.ErrInvalid, nil)
		return
	}
	if len(l.approved) == 0 {
		httpapi.WriteJSON(w, http.StatusOK, pageBody{Entries: []entry{}}, httpapi.Public)
		return
	}
	if offset >= int64Bound {
		l.fail(w, r, fmt.Errorf("offset %v does not fit a 64-bit integer", offset))
		return
	}
	body, err := l.readPage(r.Context(), int64(offset), int32(limit))
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Public)
}

// pageParams is the route's own check: offset a non-negative integer (default 0), limit an integer from
// 1 to 50 (default 25), both read the way JavaScript's Number() reads them.
func pageParams(rawQuery string) (offset float64, limit int, ok bool) {
	offset, limitN := 0.0, float64(defaultLimit)
	if v, found := queryValue(rawQuery, "offset"); found {
		offset = jsToNumber(v)
	}
	if v, found := queryValue(rawQuery, "limit"); found {
		limitN = jsToNumber(v)
	}
	if !isInteger(offset) || offset < 0 || !isInteger(limitN) || limitN < 1 || limitN > maxLimit {
		return 0, 0, false
	}
	return offset, int(limitN), true
}

func isInteger(f float64) bool { return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) }

func (l *leaderboard) readPage(ctx context.Context, offset int64, limit int32) (pageBody, error) {
	body := pageBody{Entries: []entry{}}
	err := l.readTx(ctx, func(q *sqlcgen.Queries) error {
		rows, err := q.ListLeaderboardPage(ctx, sqlcgen.ListLeaderboardPageParams{
			Algorithms: l.approved, RowOffset: offset, RowLimit: limit,
		})
		if err != nil {
			return fmt.Errorf("listing leaderboard: %w", err)
		}
		if body.Total, err = q.CountLeaderboard(ctx, l.approved); err != nil {
			return fmt.Errorf("counting leaderboard: %w", err)
		}
		listed := make([]listedRow, len(rows))
		for i, row := range rows {
			listed[i] = listedRow{row.PlayerID, row.LevelCode, row.FullName, row.Nickname, row.AvatarRef,
				row.ProfileVisibility, row.BannerID, row.BannerImage}
		}
		entries, err := entriesOf(ctx, q, listed, func(i int) int64 { return offset + int64(i) + 1 })
		body.Entries = append(body.Entries, entries...)
		return err
	})
	return body, err
}

// search answers GET /api/leaderboard/search?q=: name or nickname search over listed players, the
// first 50 hits (each with its overall position) and the full count. A blank query is the empty state.
func (l *leaderboard) search(w http.ResponseWriter, r *http.Request) {
	q, _ := queryValue(r.URL.RawQuery, "q")
	q = jsTrim(truncateUTF16(q, maxQueryLen))
	if q == "" || len(l.approved) == 0 {
		httpapi.WriteJSON(w, http.StatusOK, searchBody{Hits: []entry{}}, httpapi.Public)
		return
	}
	body := searchBody{Hits: []entry{}}
	err := l.readTx(r.Context(), func(qs *sqlcgen.Queries) error {
		ctx := r.Context()
		rows, err := qs.SearchLeaderboard(ctx, sqlcgen.SearchLeaderboardParams{Algorithms: l.approved, Query: q})
		if err != nil {
			return fmt.Errorf("searching leaderboard: %w", err)
		}
		if body.Total, err = qs.CountLeaderboardSearch(ctx, sqlcgen.CountLeaderboardSearchParams{Algorithms: l.approved, Query: q}); err != nil {
			return fmt.Errorf("counting leaderboard search: %w", err)
		}
		listed := make([]listedRow, len(rows))
		for i, row := range rows {
			listed[i] = listedRow{row.PlayerID, row.LevelCode, row.FullName, row.Nickname, row.AvatarRef,
				row.ProfileVisibility, row.BannerID, row.BannerImage}
		}
		entries, err := entriesOf(ctx, qs, listed, func(i int) int64 { return rows[i].Position })
		body.Hits = append(body.Hits, entries...)
		return err
	})
	if err != nil {
		l.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Public)
}

func (l *leaderboard) readTx(ctx context.Context, fn func(*sqlcgen.Queries) error) error {
	return readTx(ctx, l.pool, fn)
}

func (l *leaderboard) fail(w http.ResponseWriter, r *http.Request, err error) {
	failRead(w, r, l.log, "leaderboard read failed", err)
}

// entriesOf shapes rows into entries. The shown banners are read only when some player has not chosen
// a banner and so needs the default.
func entriesOf(ctx context.Context, q *sqlcgen.Queries, rows []listedRow, position func(i int) int64) ([]entry, error) {
	var shown []sqlcgen.ListShownProfileBannersRow
	for _, row := range rows {
		if !row.bannerID.Valid {
			var err error
			if shown, err = q.ListShownProfileBanners(ctx); err != nil {
				return nil, fmt.Errorf("reading shown banners: %w", err)
			}
			break
		}
	}
	out := make([]entry, len(rows))
	for i, row := range rows {
		masked := row.visibility == sqlcgen.ProfileVisibilityAlwaysPrivate
		e := entry{
			ID:           row.playerID.String(),
			FullName:     row.fullName,
			Nickname:     textPtr(row.nickname),
			PlayingLevel: row.levelCode,
			PictureURL:   textPtr(row.avatarRef),
			Position:     position(i),
		}
		if masked {
			e.FullName, e.Nickname, e.Masked, e.LevelHidden = maskPublicName(row.fullName), nil, true, true
		}
		e.BannerKey, e.BannerImageURL = resolveBanner(row.bannerID, row.bannerImage, shown)
		out[i] = e
	}
	return out, nil
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
