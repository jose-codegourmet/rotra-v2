package publicreads

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// P-COMPARE: the body of GET /api/players/{playerId}/compare. A port of readPlayerCompare in
// packages/db/src/player/compare.ts. It sits here because it reads the profile, the leaderboard places, the rank and the
// game history with the rules of the public reads.

// compareProfile is the allowlisted part of a profile a Compare half shows.
type compareProfile struct {
	PlayerID          string  `json:"playerId"`
	FullName          string  `json:"fullName"`
	Nickname          *string `json:"nickname"`
	Picture           *string `json:"picture"`
	LeaderboardPlaces []place `json:"leaderboardPlaces"`
}

// comparePlayer is ComparePlayer: one half of the screen.
type comparePlayer struct {
	Profile        compareProfile `json:"profile"`
	Rank           *rankDTO       `json:"rank"`
	OverallWinRate *int           `json:"overallWinRate"`
}

type compareCounts struct {
	All      int32 `json:"all"`
	H2H      int32 `json:"h2h"`
	Together int32 `json:"together"`
}

// compareStats is PlayerCompareStats: games, wins of each side and their win rates (null without games).
type compareStats struct {
	Games        int32 `json:"games"`
	MyWins       int32 `json:"myWins"`
	OtherWins    int32 `json:"otherWins"`
	MyWinRate    *int  `json:"myWinRate"`
	OtherWinRate *int  `json:"otherWinRate"`
}

type compareAllStats struct {
	All      compareStats `json:"all"`
	H2H      compareStats `json:"h2h"`
	Together compareStats `json:"together"`
}

type compareBody struct {
	Viewer   comparePlayer   `json:"viewer"`
	Other    comparePlayer   `json:"other"`
	Counts   compareCounts   `json:"counts"`
	Stats    compareAllStats `json:"stats"`
	Filter   string          `json:"filter"`
	Page     int32           `json:"page"`
	PageSize int             `json:"pageSize"`
	Total    int32           `json:"total"`
	Games    json.RawMessage `json:"games"`
}

// compareResult is the wire body: { compare }, null for the player themself.
type compareResult struct {
	Compare *compareBody `json:"compare"`
}

// compareFilters are the filters Compare takes; the route and the read both refuse anything else.
var compareFilters = map[string]bool{"all": true, "h2h": true, "together": true}

// ValidCompareFilter reports whether the filter is one of all, h2h or together.
func ValidCompareFilter(filter string) bool { return compareFilters[filter] }

// percentage is Math.round(wins / games * 100), or nil without games.
func percentage(wins, games int) *int {
	if games == 0 {
		return nil
	}
	p := int(math.Round(float64(wins) / float64(games) * 100))
	return &p
}

func compareStat(games, myWins, otherWins int32) compareStats {
	return compareStats{
		Games: games, MyWins: myWins, OtherWins: otherWins,
		MyWinRate: percentage(int(myWins), int(games)), OtherWinRate: percentage(int(otherWins), int(games)),
	}
}

// ReadCompare is readPlayerCompare for a signed-in player and the other player as the caller wrote the ID. It returns
// nil (a null compare) for the player themself, ErrProfileNotFound for an ID that names no profile and
// ErrProfileForbidden for an always-private player. The viewer is never used to unmask anyone: rank and history are
// read as a visitor reads them, as the TypeScript does.
func ReadCompare(ctx context.Context, q *sqlcgen.Queries, viewer pgtype.UUID, otherRaw, filter string, page int64,
	now time.Time, approved []string) (any, error) {

	otherBytes, ok := parseUUID(otherRaw)
	if !ok {
		return nil, ErrProfileNotFound
	}
	if otherRaw == viewer.String() {
		return compareResult{}, nil
	}
	other := pgtype.UUID{Bytes: otherBytes, Valid: true}
	p := &players{now: func() time.Time { return now }}
	viewerProfile, err := p.loadProfile(ctx, q, viewer, viewer.String(), viewerRef{id: viewer, ok: true}, refuseAlwaysPrivate)
	if err != nil {
		return nil, err
	}
	// Prisma batches the two profile reads of one tick into one query and hands each caller the row whose ID equals its
	// own string, so an ID written in any other case than the stored one finds no profile (pinned by the
	// compare_*_upper cases).
	if otherRaw != other.String() {
		return nil, ErrProfileNotFound
	}
	otherProfile, err := p.loadProfile(ctx, q, other, otherRaw, viewerRef{id: viewer, ok: true}, refuseAlwaysPrivate)
	if err != nil {
		return nil, err
	}
	b, err := readBoard(ctx, q, periodYear, now.UnixMilli())
	if err != nil {
		return nil, err
	}
	places := b.places(viewer, other)
	half := func(profile profileDTO, id pgtype.UUID, places []place) (comparePlayer, error) {
		rank, err := readRank(ctx, q, id, viewerRef{}, approved)
		if err != nil {
			return comparePlayer{}, err
		}
		facts, err := q.ListPlayerFacts(ctx, id)
		if err != nil {
			return comparePlayer{}, fmt.Errorf("listing facts: %w", err)
		}
		history, err := readHistory(ctx, q, historyFactsOf(facts), viewerRef{}, true, false)
		if err != nil {
			return comparePlayer{}, err
		}
		games, won := 0, 0
		for _, s := range history {
			for _, g := range s.Games {
				if g.Counting == "counted" && (g.Format == "singles" || g.Format == "doubles") {
					games++
					if g.Result == "won" {
						won++
					}
				}
			}
		}
		return comparePlayer{
			Profile: compareProfile{
				PlayerID: profile.PlayerID, FullName: profile.FullName, Nickname: profile.Nickname, Picture: profile.Picture,
				LeaderboardPlaces: places,
			},
			Rank: rank, OverallWinRate: percentage(won, games),
		}, nil
	}
	pid := func(s string) pgtype.UUID { bs, _ := parseUUID(s); return pgtype.UUID{Bytes: bs, Valid: true} }
	vh, err := half(viewerProfile, pid(viewerProfile.PlayerID), places[viewer.String()])
	if err != nil {
		return nil, err
	}
	oh, err := half(otherProfile, pid(otherProfile.PlayerID), places[other.String()])
	if err != nil {
		return nil, err
	}
	row, err := q.ReadPlayerCompare(ctx, sqlcgen.ReadPlayerCompareParams{
		ViewerID: viewer, OtherID: other, Filter: filter, Requested: page,
	})
	if err != nil {
		return nil, fmt.Errorf("reading shared games: %w", err)
	}
	return compareResult{&compareBody{
		Viewer: vh, Other: oh,
		Counts: compareCounts{All: row.AllCount, H2H: row.H2hCount, Together: row.TogetherCount},
		Stats: compareAllStats{
			All:      compareStat(row.AllCount, row.AllMyWins, row.H2hCount-row.H2hMyWins+row.TogetherMyWins),
			H2H:      compareStat(row.H2hCount, row.H2hMyWins, row.H2hCount-row.H2hMyWins),
			Together: compareStat(row.TogetherCount, row.TogetherMyWins, row.TogetherMyWins),
		},
		Filter: filter, Page: row.Page, PageSize: 3, Total: row.Total, Games: json.RawMessage(row.Games),
	}}, nil
}
