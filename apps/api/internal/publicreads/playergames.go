package publicreads

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/winchance"
)

// P-MATCH-HISTORY: GET /api/players/{playerId}/games, readPublicMatchHistory(playerId, viewerId): the games of a
// masked player are not sent, and a masked face on a court has the masked name and no player ID (B-54). The
// Admin-only unmasked form is not reachable here: no query string changes it.

// courtPlayerDTO is one person on a game court: the entry's name snapshot, the player's picture reference and
// player ID. A guest or a record with no RTR ID has no picture and no player ID.
type courtPlayerDTO struct {
	Name              string  `json:"name"`
	Picture           *string `json:"picture"`
	PlayerID          *string `json:"playerId"`
	SessionGameNumber *int32  `json:"sessionGameNumber,omitempty"`
}

type gameDTO struct {
	ID                string           `json:"id"`
	Format            string           `json:"format"`
	SessionGameNumber *int32           `json:"sessionGameNumber,omitempty"`
	Partners          []string         `json:"partners"`
	Opponents         []string         `json:"opponents"`
	PartnerPlayers    []courtPlayerDTO `json:"partnerPlayers"`
	OpponentPlayers   []courtPlayerDTO `json:"opponentPlayers"`
	Counting          string           `json:"counting"`
	Result            string           `json:"result"`
	Score             *string          `json:"score"`
	// WinChance and Upset are only on the Player app's games read (D-2026-11-27-03): the pair chance of a finished game from the lasting
	// signals, and whether the Favored pair lost. Never on a partial game.
	WinChance *winChanceDTO `json:"winChance,omitempty"`
	Upset     *bool         `json:"upset,omitempty"`
}

type winChanceDTO struct {
	A       int     `json:"a"`
	B       int     `json:"b"`
	Favored *string `json:"favored"`
	Strong  bool    `json:"strong"`
}

type historySession struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	ClubName       string  `json:"clubName"`
	FinishedAt     *string `json:"finishedAt"`
	SessionPageURL *string `json:"sessionPageUrl"`
	// Ranked is false for a session run with Record games off: its games read not_ranked.
	Ranked bool      `json:"ranked"`
	Games  []gameDTO `json:"games"`
}

type gamesBody struct {
	Games []historySession `json:"games"`
}

// gamesPageBody is the paged answer: a page of sessions and where the next page starts (null after the last).
type gamesPageBody struct {
	Games      []historySession `json:"games"`
	NextOffset *int             `json:"nextOffset"`
}

// gamesPageMax is the most sessions one page holds (GAMES_PAGE_MAX in projections.ts).
const gamesPageMax = 50

// gamesPage is parseGamesPage: ?limit= (1 to 50 sessions) and ?offset= page the history, newest first. No usable
// limit means no paging. A value that is not a whole number is ignored; an offset is never below 0.
func gamesPage(r *http.Request) (limit, offset int, paged bool) {
	whole := func(name string) (int, bool) {
		v := r.URL.Query().Get(name)
		if v == "" {
			return 0, false
		}
		for _, c := range v {
			if c < '0' || c > '9' {
				return 0, false
			}
		}
		n, err := strconv.ParseUint(v, 10, 31)
		if err != nil {
			return int(^uint32(0) >> 1), true // too big for an int: as large as it gets
		}
		return int(n), true
	}
	limit, ok := whole("limit")
	if !ok || limit < 1 {
		return 0, 0, false
	}
	offset, _ = whole("offset")
	return min(limit, gamesPageMax), offset, true
}

// pageHistory is pageGames: the slice of sessions for the page and the offset of the next one.
func pageHistory(sessions []historySession, limit, offset int) gamesPageBody {
	end := offset + limit
	if offset > len(sessions) {
		offset = len(sessions)
	}
	if end > len(sessions) || end < offset { // the second test guards an overflow
		end = len(sessions)
	}
	body := gamesPageBody{Games: sessions[offset:end]}
	if next := offset + limit; next > offset && next < len(sessions) {
		body.NextOffset = &next
	}
	return body
}

// writeGames sends the history whole, or one page of it when the request asked for paging.
func writeGames(w http.ResponseWriter, r *http.Request, sessions []historySession) {
	if limit, offset, paged := gamesPage(r); paged {
		httpapi.WriteJSON(w, http.StatusOK, pageHistory(sessions, limit, offset), httpapi.Private)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, gamesBody{Games: sessions}, httpapi.Private)
}

func (p *players) games(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		writeGames(w, r, []historySession{})
		return
	}
	v := viewerOf(r)
	sessions := []historySession{}
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		visibility, err := q.GetPlayerVisibility(r.Context(), id)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("reading visibility: %w", err)
		}
		if err == nil && isMasked(visibility, v, id) {
			return nil // a masked player has no game history
		}
		facts, err := q.ListPlayerFacts(r.Context(), id)
		if err != nil {
			return fmt.Errorf("listing facts: %w", err)
		}
		sessions, err = readHistory(r.Context(), q, historyFactsOf(facts), v, true, true)
		return err
	})
	if err != nil {
		p.fail(w, r, err)
		return
	}
	writeGames(w, r, sessions)
}

// historyFact is one fact of a history: the columns ListPlayerFacts and ListClubPlayerFacts share.
type historyFact = sqlcgen.ListPlayerFactsRow

func historyFactsOf(rows []sqlcgen.ListPlayerFactsRow) []historyFact { return rows }

func clubHistoryFactsOf(rows []sqlcgen.ListClubPlayerFactsRow) []historyFact {
	out := make([]historyFact, len(rows))
	for i, r := range rows {
		out[i] = historyFact(r)
	}
	return out
}

type entryKey struct{ session, entry, match pgtype.UUID }

// readHistory is historyFromFacts: valid finalized sessions only, grouped by session, newest first.
// Games keep the order of the facts (newest played first). Two sessions finalized in the same millisecond
// have no order in the TypeScript (the database's); here they keep the order of their newest game.
func readHistory(ctx context.Context, q *sqlcgen.Queries, facts []historyFact, v viewerRef, maskFaces, withWinChance bool) ([]historySession, error) {
	var sessionIDs []pgtype.UUID
	seen := map[pgtype.UUID]bool{}
	for _, f := range facts {
		if !seen[f.SessionID] {
			seen[f.SessionID] = true
			sessionIDs = append(sessionIDs, f.SessionID)
		}
	}
	if len(sessionIDs) == 0 {
		return []historySession{}, nil
	}
	completed, err := q.ListCompletedSessions(ctx, sessionIDs)
	if err != nil {
		return nil, fmt.Errorf("listing sessions: %w", err)
	}
	if len(completed) == 0 {
		return []historySession{}, nil
	}
	done := make([]pgtype.UUID, len(completed))
	bySession := map[pgtype.UUID]sqlcgen.ListCompletedSessionsRow{}
	for i, s := range completed {
		done[i] = s.ID
		bySession[s.ID] = s
	}
	entryRows, err := q.ListSessionEntries(ctx, done)
	if err != nil {
		return nil, fmt.Errorf("listing session entries: %w", err)
	}
	entries := make(map[pgtype.UUID]sqlcgen.ListSessionEntriesRow, len(entryRows))
	for _, e := range entryRows {
		entries[e.ID] = e
	}
	numberRows, err := q.ListSessionGameNumbers(ctx, done)
	if err != nil {
		return nil, fmt.Errorf("numbering games: %w", err)
	}
	numbers := make(map[entryKey]int32, len(numberRows))
	for _, n := range numberRows {
		numbers[entryKey{n.SessionID, n.SessionPlayerID, n.MatchID}] = n.GameNumber
	}

	var chanceOf func(f historyFact, s sqlcgen.ListCompletedSessionsRow) *winchance.Game
	if withWinChance {
		var err error
		if chanceOf, err = winChanceReader(ctx, q, completed, done, entryRows); err != nil {
			return nil, err
		}
	}
	gamesOf := map[pgtype.UUID][]gameDTO{}
	for _, f := range facts {
		if _, ok := bySession[f.SessionID]; !ok {
			continue
		}
		number := func(entry pgtype.UUID) *int32 {
			if n, ok := numbers[entryKey{f.SessionID, entry, f.MatchID}]; ok {
				return &n
			}
			return nil
		}
		people := func(ids []pgtype.UUID) ([]string, []courtPlayerDTO) {
			names, faces := make([]string, len(ids)), make([]courtPlayerDTO, len(ids))
			for i, eid := range ids {
				faces[i] = courtPlayer(entries, eid, v, maskFaces)
				faces[i].SessionGameNumber = number(eid)
				names[i] = faces[i].Name
			}
			return names, faces
		}
		partners, partnerPlayers := people(f.PartnerEntryIds)
		opponents, opponentPlayers := people(f.OpponentEntryIds)
		game := gameDTO{
			ID: f.MatchID.String(), Format: string(f.Format), SessionGameNumber: number(f.SessionPlayerID),
			Partners: partners, Opponents: opponents, PartnerPlayers: partnerPlayers, OpponentPlayers: opponentPlayers,
			Counting: counting(f.FullParticipation, f.StandardMatch, bySession[f.SessionID].RecordGames), Result: result(f.Team, f.WinningTeam),
			Score: score(f.Team, f.TeamAScore, f.TeamBScore),
		}
		if chanceOf != nil && game.Counting != "partial" {
			if g := chanceOf(f, bySession[f.SessionID]); g != nil {
				game.WinChance, game.Upset = &winChanceDTO{A: g.Chance.A, B: g.Chance.B, Strong: g.Chance.Strong}, &g.Upset
				if g.Chance.Favored != "" {
					game.WinChance.Favored = &g.Chance.Favored
				}
			}
		}
		gamesOf[f.SessionID] = append(gamesOf[f.SessionID], game)
	}

	out := make([]historySession, 0, len(sessionIDs))
	for _, sid := range sessionIDs {
		s, ok := bySession[sid]
		if !ok {
			continue
		}
		hs := historySession{ID: s.ID.String(), Title: s.Title, ClubName: s.ClubName, Ranked: s.RecordGames, Games: gamesOf[sid]}
		if s.FinalizedAt.Valid {
			iso := httpapi.ToIso(s.FinalizedAt.Time)
			hs.FinishedAt = &iso
		}
		if s.PublishedAt.Valid {
			url := "/s/" + s.PublicSlug
			hs.SessionPageURL = &url
		}
		out = append(out, hs)
	}
	// newest first by the ISO instant (millisecond precision, as the wire shows it); never finalized sorts last
	sort.SliceStable(out, func(i, j int) bool { return deref(out[i].FinishedAt) > deref(out[j].FinishedAt) })
	return out, nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// courtPlayer is courtPlayer() in projections.ts: a face the masking rule hides (when maskFaces is on) has the
// masked name and no player ID; the picture stays.
func courtPlayer(entries map[pgtype.UUID]sqlcgen.ListSessionEntriesRow, id pgtype.UUID, v viewerRef, maskFaces bool) courtPlayerDTO {
	e, ok := entries[id]
	if !ok {
		return courtPlayerDTO{}
	}
	if !e.PlayerID.Valid || !e.HasRtrID {
		return courtPlayerDTO{Name: e.NameSnapshot}
	}
	c := courtPlayerDTO{Name: e.NameSnapshot, Picture: textPtr(e.AvatarRef)}
	if maskFaces && e.ProfileVisibility.Valid && isMasked(e.ProfileVisibility.ProfileVisibility, v, e.PlayerID) {
		c.Name = maskPublicName(e.NameSnapshot)
		return c
	}
	pid := e.PlayerID.String()
	c.PlayerID = &pid
	return c
}

// counting is the game's `counting`: a full standard game of a session run with Record games off is not_ranked (D-2026-11-20-02): it
// shows with its win or loss but stays out of every count that reads counted.
func counting(fullParticipation, standard, recordGames bool) string {
	switch {
	case !fullParticipation:
		return "partial"
	case !standard:
		return "fun"
	case recordGames:
		return "counted"
	}
	return "not_ranked"
}

func result(team, winner sqlcgen.TeamSide) string {
	if team == winner {
		return "won"
	}
	return "lost"
}

// score is the result from the player's side: their own points first. The separator is an en dash.
func score(team sqlcgen.TeamSide, a, b pgtype.Int4) *string {
	if !a.Valid || !b.Valid {
		return nil
	}
	s := fmt.Sprintf("%d–%d", a.Int32, b.Int32)
	if team != sqlcgen.TeamSideA {
		s = fmt.Sprintf("%d–%d", b.Int32, a.Int32)
	}
	return &s
}

// winChanceReader is readClubForms with the levels: it reads, in two queries, the level each entry played its session at and the lasting
// form of every saved player on these courts, and answers the win chance of one finished game. A face with no finalized session before
// the game's session at that club counts as its level only.
func winChanceReader(ctx context.Context, q *sqlcgen.Queries, sessions []sqlcgen.ListCompletedSessionsRow, sessionIDs []pgtype.UUID,
	entryRows []sqlcgen.ListSessionEntriesRow) (func(f historyFact, s sqlcgen.ListCompletedSessionsRow) *winchance.Game, error) {

	levelRows, err := q.ListSessionEntryLevels(ctx, sessionIDs)
	if err != nil {
		return nil, fmt.Errorf("reading levels: %w", err)
	}
	level := make(map[pgtype.UUID]int, len(levelRows))
	for _, l := range levelRows {
		level[l.SessionPlayerID] = int(l.SkillLevelSnapshotID)
	}
	clubOf := map[pgtype.UUID]pgtype.UUID{}
	clubs, players := []pgtype.UUID{}, []pgtype.UUID{}
	for _, s := range sessions {
		clubs = append(clubs, s.ClubID)
	}
	for _, e := range entryRows {
		if e.ClubPlayerID.Valid {
			clubOf[e.ID] = e.ClubPlayerID
			players = append(players, e.ClubPlayerID)
		}
	}
	history := map[pgtype.UUID][]sqlcgen.ListClubFormRowsRow{}
	if len(players) > 0 {
		rows, err := q.ListClubFormRows(ctx, sqlcgen.ListClubFormRowsParams{ClubIds: clubs, ClubPlayerIds: players})
		if err != nil {
			return nil, fmt.Errorf("reading club forms: %w", err)
		}
		for _, r := range rows {
			history[r.ClubPlayerID] = append(history[r.ClubPlayerID], r)
		}
	}
	weekday := func(t time.Time) int { return int(t.Add(8 * time.Hour).UTC().Weekday()) } // Manila, Sunday 0
	formOf := func(entry pgtype.UUID, s sqlcgen.ListCompletedSessionsRow) *winchance.Form {
		clubPlayer, ok := clubOf[entry]
		if !ok {
			return nil
		}
		before := time.Now()
		if s.FinalizedAt.Valid {
			before = s.FinalizedAt.Time
		}
		var prior []winchance.SessionRecord
		for _, r := range history[clubPlayer] {
			if r.SessionID != s.ID && r.CommittedAt.Valid && r.CommittedAt.Time.Before(before) {
				prior = append(prior, winchance.SessionRecord{Weekday: weekday(r.ScheduledStartAt.Time), Wins: int(r.Wins), Losses: int(r.Losses)})
			}
		}
		if len(prior) == 0 {
			return nil
		}
		form := winchance.FormFromHistory(prior, weekday(s.ScheduledStartAt.Time))
		return &form
	}
	face := func(entry pgtype.UUID, s sqlcgen.ListCompletedSessionsRow) winchance.Face {
		lv, ok := level[entry]
		if !ok {
			lv = -1
		}
		return winchance.Face{Level: lv, Form: formOf(entry, s)}
	}
	return func(f historyFact, s sqlcgen.ListCompletedSessionsRow) *winchance.Game {
		left := []winchance.Face{face(f.SessionPlayerID, s)}
		for _, id := range f.PartnerEntryIds {
			left = append(left, face(id, s))
		}
		right := make([]winchance.Face, 0, len(f.OpponentEntryIds))
		for _, id := range f.OpponentEntryIds {
			right = append(right, face(id, s))
		}
		return winchance.OfGame(left, right, result(f.Team, f.WinningTeam) == "won")
	}, nil
}
