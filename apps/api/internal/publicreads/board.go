package publicreads

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/text/collate"
	"golang.org/x/text/language"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The period leaderboards (D-2026-11-25-04, amending D-2026-11-16-05): Top annual, quarterly, monthly and weekly, ordered by wins in standard
// matches from the recorded match facts. A port of readPeriodLeaderboard in packages/db/src/player/leaderboard.ts and
// of leaderboardStandings and ownPeriodPosition in packages/data/src/leaderboard/leaderboard.rules.ts. Nothing here
// calculates a rank.

type period string

const (
	periodYear    period = "year"
	periodQuarter period = "quarter"
	periodMonth   period = "month"
	periodWeek    period = "week"
)

// allPeriods is LEADERBOARD_PERIODS: the display and tab order.
var allPeriods = []period{periodYear, periodQuarter, periodMonth, periodWeek}

// boardLimit is LEADERBOARD_LIMIT: each list shows the top 50.
const boardLimit = 50

// manilaOffsetMs is Asia/Manila, UTC+8 with no daylight saving: every period boundary is at 00:00 there.
const manilaOffsetMs = 8 * 3_600_000

// parsePeriod is parseLeaderboardPeriod: a missing parameter is the year, anything but the four names is invalid.
func parsePeriod(value string, present bool) (period, bool) {
	if !present {
		return periodYear, true
	}
	switch p := period(value); p {
	case periodYear, periodQuarter, periodMonth, periodWeek:
		return p, true
	}
	return "", false
}

// periodStart is leaderboardPeriodStart: the instant (Unix milliseconds) the period that contains now began. The
// year starts on January 1, the quarter on January 1, April 1, July 1 or October 1, the month on its first day and the week on Monday.
func periodStart(p period, nowMs int64) int64 {
	local := time.UnixMilli(nowMs + manilaOffsetMs).UTC()
	switch p {
	case periodWeek:
		sinceMonday := (int(local.Weekday()) + 6) % 7
		return time.Date(local.Year(), local.Month(), local.Day()-sinceMonday, 0, 0, 0, 0, time.UTC).UnixMilli() - manilaOffsetMs
	case periodYear:
		return time.Date(local.Year(), time.January, 1, 0, 0, 0, 0, time.UTC).UnixMilli() - manilaOffsetMs
	case periodQuarter:
		month := local.Month() - (local.Month()-1)%3
		return time.Date(local.Year(), month, 1, 0, 0, 0, 0, time.UTC).UnixMilli() - manilaOffsetMs
	}
	return time.Date(local.Year(), local.Month(), 1, 0, 0, 0, 0, time.UTC).UnixMilli() - manilaOffsetMs
}

// newBoardNameComparer is new Intl.Collator('en-PH', { sensitivity: 'base' }).compare: case and accents do not
// count, so names that differ only by them compare equal. A Collator is not safe to share between goroutines.
func newBoardNameComparer() func(a, b string) int {
	return collate.New(language.MustParse("en-PH"), collate.Loose).CompareString
}

// boardPlayer is a leaderboard candidate: a player with a permanent RTR ID that appears in the facts. An
// unclaimed player saved by exactly one club stands in under that club's own name and nickname.
type boardPlayer struct {
	id           pgtype.UUID
	fullName     string
	nickname     *string
	avatarRef    pgtype.Text
	visibility   sqlcgen.ProfileVisibility
	bannerID     pgtype.Text
	bannerImage  pgtype.Text
	skillLevelID int16 // -1 when there is no rank row
	unclaimed    bool  // saved by exactly one club (the only unclaimed player a leaderboard lists)
	qualifies    bool
}

type boardFact struct {
	player string
	at     int64
	won    bool
}

// standing is one ranked row. previous is 0 when the player was not in the previous period's top 50 (New).
type standing struct {
	id       string
	wins     int
	losses   int
	position int
	previous int
}

// recordOf is the wins and losses of one player in one period.
type recordOf struct{ wins, losses int }

// compareWinRate compares the fractions before rounding; a loss-only record has a win rate of zero. Negative means
// a has the better win rate.
func compareWinRate(a, b recordOf) int {
	return b.wins*(a.wins+a.losses) - a.wins*(b.wins+b.losses)
}

// board is one load of the facts of a period and the one before it.
type board struct {
	p         period
	nowMs     int64
	start     int64
	players   map[string]*boardPlayer
	facts     []boardFact
	compare   func(a, b string) int
	standings []standing // the full standings of p
}

// readBoard loads the facts of the period and the one before it, and the players they belong to.
func readBoard(ctx context.Context, q *sqlcgen.Queries, p period, nowMs int64) (*board, error) {
	return readClubBoard(ctx, q, p, nowMs, pgtype.UUID{})
}

// readClubBoard is readPeriodLeaderboard with a club: only the facts of that club's own sessions (D-2026-11-25-04). A zero club is the
// ROTRA leaderboard.
func readClubBoard(ctx context.Context, q *sqlcgen.Queries, p period, nowMs int64, club pgtype.UUID) (*board, error) {
	start := periodStart(p, nowMs)
	previousStart := periodStart(p, start-1)
	rows, err := q.ListBoardFacts(ctx, sqlcgen.ListBoardFactsParams{
		FromAt: pgtype.Timestamptz{Time: time.UnixMilli(previousStart), Valid: true},
		ToAt:   pgtype.Timestamptz{Time: time.UnixMilli(nowMs), Valid: true},
		ClubID: club,
	})
	if err != nil {
		return nil, fmt.Errorf("listing match facts: %w", err)
	}
	b := &board{p: p, nowMs: nowMs, start: start, players: map[string]*boardPlayer{}, compare: newBoardNameComparer()}
	idOf := map[string]pgtype.UUID{}
	for _, row := range rows {
		// A reviewed link can refer to the identity already recorded at finalization.
		owners := map[string]pgtype.UUID{}
		for _, id := range row.Attributed {
			owners[id.String()] = id
		}
		if row.PlayerIDAtFinalization.Valid {
			owners[row.PlayerIDAtFinalization.String()] = row.PlayerIDAtFinalization
		}
		for key, id := range owners {
			idOf[key] = id
			b.facts = append(b.facts, boardFact{player: key, at: row.PlayedAt.Time.UnixMilli(), won: row.Team == row.WinningTeam})
		}
	}
	ids := make([]pgtype.UUID, 0, len(idOf))
	for _, id := range idOf {
		ids = append(ids, id)
	}
	players, err := q.ListBoardPlayers(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("listing players: %w", err)
	}
	for _, pl := range players {
		bp := &boardPlayer{
			id: pl.ID, fullName: pl.FullName, nickname: textPtr(pl.Nickname), avatarRef: pl.AvatarRef,
			visibility: pl.ProfileVisibility, bannerID: pl.BannerID, bannerImage: pl.BannerImage, skillLevelID: -1,
			qualifies: !pl.IsUnclaimed || pl.SavingClubs == 1,
			unclaimed: pl.IsUnclaimed && pl.SavingClubs == 1,
		}
		if pl.SkillLevelID.Valid {
			bp.skillLevelID = pl.SkillLevelID.Int16
		}
		if bp.unclaimed {
			bp.fullName, bp.nickname = pl.ClubDisplayName, textPtr(pl.ClubNickname)
		}
		b.players[pl.ID.String()] = bp
	}
	b.standings = b.standingsOf(p)
	return b, nil
}

// standingsOf is leaderboardStandings: every qualifying player with a record in the period, best first. Ties on
// wins go to the better win rate, then the name (the nickname, else the full name; case and accents ignored),
// then the player ID.
func (b *board) standingsOf(p period) []standing {
	start := periodStart(p, b.nowMs)
	previousStart := periodStart(p, start-1)
	names := map[string]string{}
	for id, pl := range b.players {
		if !pl.qualifies {
			continue
		}
		name := pl.fullName
		if pl.nickname != nil {
			if n := jsTrim(*pl.nickname); n != "" {
				name = n
			}
		}
		names[id] = name
	}
	current, previous := map[string]*recordOf{}, map[string]*recordOf{}
	for _, f := range b.facts {
		if _, ok := names[f.player]; !ok {
			continue
		}
		if f.at < previousStart || f.at > b.nowMs {
			continue
		}
		totals := previous
		if f.at >= start {
			totals = current
		}
		rec := totals[f.player]
		if rec == nil {
			rec = &recordOf{}
			totals[f.player] = rec
		}
		if f.won {
			rec.wins++
		} else {
			rec.losses++
		}
	}
	prevPositions := map[string]int{}
	for _, row := range topOf(b.order(previous, names)) {
		prevPositions[row.id] = row.position
	}
	out := b.order(current, names)
	for i := range out {
		out[i].previous = prevPositions[out[i].id]
	}
	return out
}

func (b *board) order(records map[string]*recordOf, names map[string]string) []standing {
	out := make([]standing, 0, len(records))
	for id, rec := range records {
		out = append(out, standing{id: id, wins: rec.wins, losses: rec.losses})
	}
	sort.Slice(out, func(i, j int) bool {
		a, c := out[i], out[j]
		if a.wins != c.wins {
			return a.wins > c.wins
		}
		if w := compareWinRate(recordOf{a.wins, a.losses}, recordOf{c.wins, c.losses}); w != 0 {
			return w < 0
		}
		if n := b.compare(names[a.id], names[c.id]); n != 0 {
			return n < 0
		}
		return a.id < c.id
	})
	// Shared places: the same wins and the same win rate share one, numbered without gaps (1, 1, 2). Inside a shared place the order
	// is the name, then the ID, and never changes the place.
	for i := range out {
		switch {
		case i == 0:
			out[i].position = 1
		case samePlace(out[i-1], out[i]):
			out[i].position = out[i-1].position
		default:
			out[i].position = out[i-1].position + 1
		}
	}
	return out
}

// samePlace is the same wins and the same win rate.
func samePlace(a, b standing) bool {
	return a.wins == b.wins && compareWinRate(recordOf{a.wins, a.losses}, recordOf{b.wins, b.losses}) == 0
}

// topOf is leaderboardTop: the first 50 rows in standings order, plus anyone who shares the 50th row's place, so a list can run a
// little over 50.
func topOf(standings []standing) []standing {
	if len(standings) < boardLimit {
		return standings
	}
	cutoff := standings[boardLimit-1].position
	n := boardLimit
	for n < len(standings) && standings[n].position == cutoff {
		n++
	}
	return standings[:n]
}

// top is the board's own list: the first 50 plus anyone sharing the 50th place.
func (b *board) top() []standing { return topOf(b.standings) }

// place is one box of a profile: the place and the wins in a list the player is in the top 50 of.
type place struct {
	Period   period `json:"period"`
	Position int    `json:"position"`
	Wins     int    `json:"wins"`
}

// places is board.places: for each player, the lists of the three periods they are in the top 50 of. Load the board
// on the annual window so all three periods have their complete history.
func (b *board) places(ids ...pgtype.UUID) map[string][]place {
	out := make(map[string][]place, len(ids))
	for _, id := range ids {
		out[id.String()] = []place{}
	}
	for _, p := range allPeriods {
		list := b.top()
		if p != b.p {
			list = topOf(b.standingsOf(p))
		}
		for _, row := range list {
			if _, ok := out[row.id]; ok {
				out[row.id] = append(out[row.id], place{Period: p, Position: row.position, Wins: row.wins})
			}
		}
	}
	return out
}

// ownPosition is ownPeriodPosition: where one player stands, with the previous place when they are in the top 50 and
// the cutoff to beat when they are not. A key left out of the map is a key the TypeScript left out.
func (b *board) ownPosition(id pgtype.UUID) map[string]any {
	var row *standing
	for i := range b.standings {
		if b.standings[i].id == id.String() {
			row = &b.standings[i]
			break
		}
	}
	out := map[string]any{"position": nil, "wins": 0, "losses": 0}
	if row != nil {
		out["position"], out["wins"], out["losses"] = row.position, row.wins, row.losses
		if slices.ContainsFunc(b.top(), func(s standing) bool { return s.id == row.id }) {
			out["previousPosition"] = previousOrNil(row.previous)
			return out
		}
	}
	if len(b.standings) < boardLimit {
		return out
	}
	cutoff := b.standings[boardLimit-1]
	out["cutoffWins"] = cutoff.wins
	out["cutoffHasBetterWinRate"] = row != nil && row.wins == cutoff.wins &&
		compareWinRate(recordOf{cutoff.wins, cutoff.losses}, recordOf{row.wins, row.losses}) < 0
	return out
}

func previousOrNil(previous int) any {
	if previous == 0 {
		return nil
	}
	return previous
}

// boardRow is a LeaderboardRow on the wire. A leaderboard never masks a name, nickname or picture (D-2026-11-25-04). A masked row (the
// rule of ./masking.go: the viewer may not open this profile) carries no player ID, the key being its place in the list; an always private
// player's level is hidden from everyone else.
type boardRow struct {
	ID               string  `json:"id"`
	Wins             int     `json:"wins"`
	Losses           int     `json:"losses"`
	Position         int     `json:"position"`
	PreviousPosition any     `json:"previousPosition"`
	FullName         string  `json:"fullName"`
	Nickname         *string `json:"nickname"`
	PlayingLevel     *string `json:"playingLevel"`
	PictureURL       *string `json:"pictureUrl"`
	BannerKey        string  `json:"bannerKey"`
	BannerImageURL   *string `json:"bannerImageUrl"`
	Masked           bool    `json:"masked"`
	LevelHidden      bool    `json:"levelHidden"`
	Unclaimed        bool    `json:"unclaimed"`
}

// rows shapes standings into rows for a viewer. The shown banners are read only when some player has not chosen a
// banner and so needs the default. A standing with no player is left out.
func (b *board) rows(ctx context.Context, q *sqlcgen.Queries, list []standing, v viewerRef) ([]boardRow, error) {
	out := make([]boardRow, 0, len(list))
	if len(list) == 0 {
		return out, nil
	}
	var shown []sqlcgen.ListShownProfileBannersRow
	for _, s := range list {
		if pl := b.players[s.id]; pl != nil && !pl.bannerID.Valid {
			var err error
			if shown, err = q.ListShownProfileBanners(ctx); err != nil {
				return nil, fmt.Errorf("reading shown banners: %w", err)
			}
			break
		}
	}
	for _, s := range list {
		pl := b.players[s.id]
		if pl == nil {
			continue
		}
		masked := !pl.unclaimed && isMasked(pl.visibility, v, pl.id)
		levelHidden := !pl.unclaimed && pl.visibility == sqlcgen.ProfileVisibilityAlwaysPrivate && (!v.ok || v.id != pl.id)
		row := boardRow{
			ID: s.id, Wins: s.wins, Losses: s.losses, Position: s.position, PreviousPosition: previousOrNil(s.previous),
			FullName: pl.fullName, Nickname: pl.nickname, PlayingLevel: levelCode(pl.skillLevelID),
			PictureURL: textPtr(pl.avatarRef), Masked: masked, LevelHidden: levelHidden, Unclaimed: pl.unclaimed,
		}
		if masked {
			// A masked row carries no player ID that opens a profile; the key is its place in the list.
			row.ID = fmt.Sprintf("masked-%d", s.position)
		}
		if levelHidden {
			row.PlayingLevel = nil
		}
		row.BannerKey, row.BannerImageURL = resolveBanner(pl.bannerID, pl.bannerImage, shown)
		out = append(out, row)
	}
	return out, nil
}

// pageOf is board.page: a slice of the top 50, its size, and when the period began.
func (b *board) pageOf(ctx context.Context, q *sqlcgen.Queries, offset int64, limit int, v viewerRef) (pageBody, error) {
	top := b.top()
	from := min(offset, int64(len(top)))
	to := min(offset+int64(limit), int64(len(top)))
	entries, err := b.rows(ctx, q, top[from:to], v)
	return pageBody{Entries: entries, Total: len(top), PeriodStart: httpapi.ToIso(time.UnixMilli(b.start))}, err
}

// searchOf is board.search: the rows of the list whose name or nickname holds the query, case folded the way JavaScript
// does. Full names are visible on a leaderboard, so it finds these players too (D-2026-11-25-04).
func (b *board) searchOf(ctx context.Context, q *sqlcgen.Queries, query string, v viewerRef) (searchBody, error) {
	needle := jsToLower(jsTrim(query))
	hits := []boardRow{}
	if needle != "" {
		rows, err := b.rows(ctx, q, b.top(), v)
		if err != nil {
			return searchBody{}, err
		}
		for _, row := range rows {
			if strings.Contains(jsToLower(row.FullName), needle) ||
				(row.Nickname != nil && strings.Contains(jsToLower(*row.Nickname), needle)) {
				hits = append(hits, row)
			}
		}
	}
	return searchBody{Hits: hits, Total: len(hits)}, nil
}
