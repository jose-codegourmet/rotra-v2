package publicreads

import (
	"fmt"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// P-MATCH-HISTORY: GET /api/players/{playerId}/games, readPlayerMatchHistory(playerId) with its default
// maskAlwaysPrivate = true. The Admin-only unmasked form is not reachable here: no query string changes it.

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
}

type historySession struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	ClubName       string    `json:"clubName"`
	FinishedAt     *string   `json:"finishedAt"`
	SessionPageURL *string   `json:"sessionPageUrl"`
	Games          []gameDTO `json:"games"`
}

type gamesBody struct {
	Games []historySession `json:"games"`
}

func (p *players) games(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		httpapi.WriteJSON(w, http.StatusOK, gamesBody{Games: []historySession{}}, httpapi.Public)
		return
	}
	body := gamesBody{Games: []historySession{}}
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		var err error
		body.Games, err = readHistory(r, q, id)
		return err
	})
	if err != nil {
		p.fail(w, r, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Public)
}

type entryKey struct{ session, entry, match pgtype.UUID }

// readHistory is historyFromFacts: valid finalized sessions only, grouped by session, newest first.
// Games keep the order of the facts (newest played first). Two sessions finalized in the same millisecond
// have no order in the TypeScript (the database's); here they keep the order of their newest game.
func readHistory(r *http.Request, q *sqlcgen.Queries, id pgtype.UUID) ([]historySession, error) {
	ctx := r.Context()
	facts, err := q.ListPlayerFacts(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("listing facts: %w", err)
	}
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
				faces[i] = courtPlayer(entries, eid)
				faces[i].SessionGameNumber = number(eid)
				names[i] = faces[i].Name
			}
			return names, faces
		}
		partners, partnerPlayers := people(f.PartnerEntryIds)
		opponents, opponentPlayers := people(f.OpponentEntryIds)
		gamesOf[f.SessionID] = append(gamesOf[f.SessionID], gameDTO{
			ID: f.MatchID.String(), Format: string(f.Format), SessionGameNumber: number(f.SessionPlayerID),
			Partners: partners, Opponents: opponents, PartnerPlayers: partnerPlayers, OpponentPlayers: opponentPlayers,
			Counting: counting(f.FullParticipation, f.StandardMatch), Result: result(f.Team, f.WinningTeam),
			Score: score(f.Team, f.TeamAScore, f.TeamBScore),
		})
	}

	out := make([]historySession, 0, len(sessionIDs))
	for _, sid := range sessionIDs {
		s, ok := bySession[sid]
		if !ok {
			continue
		}
		hs := historySession{ID: s.ID.String(), Title: s.Title, ClubName: s.ClubName, Games: gamesOf[sid]}
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

// courtPlayer is courtPlayer() in projections.ts with maskAlwaysPrivate on: an always-private player's name
// is masked; their picture and player ID stay, as on the leaderboard.
func courtPlayer(entries map[pgtype.UUID]sqlcgen.ListSessionEntriesRow, id pgtype.UUID) courtPlayerDTO {
	e, ok := entries[id]
	if !ok {
		return courtPlayerDTO{}
	}
	if !e.PlayerID.Valid || !e.HasRtrID {
		return courtPlayerDTO{Name: e.NameSnapshot}
	}
	c := courtPlayerDTO{Name: e.NameSnapshot, Picture: textPtr(e.AvatarRef)}
	if e.ProfileVisibility.Valid && e.ProfileVisibility.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate {
		c.Name = maskPublicName(e.NameSnapshot)
	}
	pid := e.PlayerID.String()
	c.PlayerID = &pid
	return c
}

func counting(fullParticipation, standard bool) string {
	switch {
	case !fullParticipation:
		return "partial"
	case standard:
		return "counted"
	}
	return "fun"
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
