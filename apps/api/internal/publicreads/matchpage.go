package publicreads

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/winchance"
)

// GET /api/matches/{matchId}: the public match page (P-MATCH-PAGE, public match page rules of November 25, 2026). Port of readMatchPage in
// packages/db/src/player/match-page.ts and of the match page rules (matchPage.rules.ts). One match of a valid finalized session, the same for
// every player in it. Anyone may read it, but faces are masked per viewer on the server, so the response is private.

type matchSession struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	ClubName       string  `json:"clubName"`
	FinishedAt     *string `json:"finishedAt"`
	SessionPageURL *string `json:"sessionPageUrl"`
	Ranked         bool    `json:"ranked"`
}

type beforeGameDTO struct {
	Played  int  `json:"played"`
	Wins    int  `json:"wins"`
	Losses  int  `json:"losses"`
	WinRate *int `json:"winRate"`
}

type matchPlayerDTO struct {
	PlayerID          *string        `json:"playerId"`
	Name              string         `json:"name"`
	Picture           *string        `json:"picture"`
	SkillGroup        *string        `json:"skillGroup"`
	SessionGameNumber int            `json:"sessionGameNumber"`
	Counting          string         `json:"counting"`
	EarlierGames      []gameDTO      `json:"earlierGames"`
	BeforeGame        *beforeGameDTO `json:"beforeGame"`
	YearWinRate       *int           `json:"yearWinRate"`
}

type matchPageDTO struct {
	MatchID        string               `json:"matchId"`
	Format         string               `json:"format"`
	Counting       string               `json:"counting"`
	Score          *string              `json:"score"`
	Winner         string               `json:"winner"`
	Session        matchSession         `json:"session"`
	TeamA          []matchPlayerDTO     `json:"teamA"`
	TeamB          []matchPlayerDTO     `json:"teamB"`
	ViewerPlayerID *string              `json:"viewerPlayerId"`
	WinChance      *winchance.Breakdown `json:"winChance,omitempty"`
}

// matchFaceAccess is matchFaceAccess: what this viewer may see of one face. A guest (no ROTRA profile) is masked for visitors and has no
// level; a Private player is masked for visitors, an Always private one for everyone but themselves, with their level and games hidden too.
func matchFaceAccess(guest bool, visibility sqlcgen.ProfileVisibility, playerID pgtype.UUID, v viewerRef) (nameMasked, levelHidden, gamesHidden bool) {
	if guest {
		return !v.ok, true, false
	}
	nameMasked = isMasked(visibility, v, playerID)
	return nameMasked, visibility == sqlcgen.ProfileVisibilityAlwaysPrivate && (!v.ok || v.id != playerID), nameMasked
}

// matchCounting is matchCounting: the match-level counting.
func matchCounting(standard, ranked bool) string {
	switch {
	case !standard:
		return "fun"
	case ranked:
		return "counted"
	}
	return "not_ranked"
}

func (p *players) matchPage(w http.ResponseWriter, r *http.Request) {
	text := r.PathValue("matchId")
	id, ok := parseUUID(text)
	if !ok {
		notFound(w)
		return
	}
	matchID := pgtype.UUID{Bytes: id, Valid: true}
	v := viewerOf(r)
	var page matchPageDTO
	var yearIDs []pgtype.UUID
	found := false
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) (err error) {
		page, yearIDs, found, err = readMatchPage(r.Context(), q, matchID, text, v)
		return err
	})
	if err != nil {
		p.fail(w, r, err)
		return
	}
	if !found {
		notFound(w)
		return
	}
	// Official history includes confirmed guest attributions: each registered player's counted games this year, on their own reads.
	rates := map[pgtype.UUID]*int{}
	for _, pid := range yearIDs {
		var rate *int
		err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
			facts, err := q.ListPlayerFacts(r.Context(), pid)
			if err != nil {
				return err
			}
			sessions, err := readHistory(r.Context(), q, historyFactsOf(facts), viewerRef{}, true, false)
			if err != nil {
				return err
			}
			rate = yearCountedRate(sessions, p.now().UnixMilli())
			return nil
		})
		if err != nil {
			p.fail(w, r, err)
			return
		}
		rates[pid] = rate
	}
	for _, team := range [][]matchPlayerDTO{page.TeamA, page.TeamB} {
		for i := range team {
			if team[i].PlayerID == nil || team[i].BeforeGame == nil {
				continue
			}
			if uid, ok := parseUUID(*team[i].PlayerID); ok {
				team[i].YearWinRate = rates[pgtype.UUID{Bytes: uid, Valid: true}]
			}
		}
	}
	httpapi.WriteJSON(w, http.StatusOK, struct {
		Match matchPageDTO `json:"match"`
	}{page}, httpapi.Private)
}

// yearCountedRate is countYearCountedWins: the share of counted games won this calendar year (Asia/Manila), rounded; nil without any.
func yearCountedRate(sessions []historySession, nowMs int64) *int {
	start := periodStart(periodYear, nowMs)
	games, wins := 0, 0
	for _, s := range sessions {
		if s.FinishedAt == nil {
			continue
		}
		at, err := time.Parse(time.RFC3339Nano, *s.FinishedAt)
		if err != nil || at.UnixMilli() < start || at.UnixMilli() > nowMs {
			continue
		}
		for _, g := range s.Games {
			if g.Counting == "counted" {
				games++
				if g.Result == "won" {
					wins++
				}
			}
		}
	}
	if games == 0 {
		return nil
	}
	rate := int(math.Floor(float64(wins)/float64(games)*100 + 0.5))
	return &rate
}

// readMatchPage reads the court of a match: the facts of its session in play order, the entries behind them, and each face's form. It
// answers false when there is no such match, or it is not one of a completed, finalized session.
func readMatchPage(ctx context.Context, q *sqlcgen.Queries, matchID pgtype.UUID, matchText string, v viewerRef) (matchPageDTO, []pgtype.UUID, bool, error) {
	none := matchPageDTO{}
	sess, err := q.GetMatchSession(ctx, matchID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !sess.FinalizedAt.Valid) {
		return none, nil, false, nil
	}
	if err != nil {
		return none, nil, false, fmt.Errorf("reading the match's session: %w", err)
	}
	facts, err := q.ListSessionMatchFacts(ctx, sqlcgen.ListSessionMatchFactsParams{ClubID: sess.ClubID, SessionID: sess.SessionID})
	if err != nil {
		return none, nil, false, fmt.Errorf("reading facts: %w", err)
	}
	entryRows, err := q.ListMatchPageEntries(ctx, sqlcgen.ListMatchPageEntriesParams{ClubID: sess.ClubID, SessionID: sess.SessionID})
	if err != nil {
		return none, nil, false, fmt.Errorf("reading entries: %w", err)
	}
	ranked := sess.RecordGames
	byEntry := make(map[pgtype.UUID]sqlcgen.ListMatchPageEntriesRow, len(entryRows))
	for _, e := range entryRows {
		byEntry[e.ID] = e
	}
	factsOf := map[pgtype.UUID][]sqlcgen.ListSessionMatchFactsRow{}
	for _, f := range facts {
		factsOf[f.SessionPlayerID] = append(factsOf[f.SessionPlayerID], f)
	}
	// That entry's games in the session up to and including the match (the games badge).
	gameNumber := func(entry, ofMatch pgtype.UUID) int {
		return slices.IndexFunc(factsOf[entry], func(f sqlcgen.ListSessionMatchFactsRow) bool { return f.MatchID == ofMatch }) + 1
	}
	// Win chance inputs: the level an entry played the session at (its first fact) and its club form before this session.
	var clubPlayers []pgtype.UUID
	for _, e := range entryRows {
		if _, played := factsOf[e.ID]; played && e.ClubPlayerID.Valid {
			clubPlayers = append(clubPlayers, e.ClubPlayerID)
		}
	}
	formFor, err := clubForms(ctx, q, []pgtype.UUID{sess.ClubID}, clubPlayers)
	if err != nil {
		return none, nil, false, err
	}
	chanceFace := func(entry pgtype.UUID) winchance.Face {
		f := winchance.Face{Level: -1}
		if first := factsOf[entry]; len(first) > 0 {
			f.Level = int(first[0].SkillLevelSnapshotID)
		}
		if e, ok := byEntry[entry]; ok {
			f.Form = formFor(e.ClubPlayerID, sess.SessionID, sess.ScheduledStartAt.Time, sess.FinalizedAt)
		}
		return f
	}
	faces := func(ids []pgtype.UUID) []winchance.Face {
		out := make([]winchance.Face, len(ids))
		for i, id := range ids {
			out[i] = chanceFace(id)
		}
		return out
	}

	// As profile games: a ROTRA player has a profile with an RTR ID, anyone else is a guest. An unclaimed player is public until they
	// register (D-2026-11-16-04); Always private is kept.
	type identity struct {
		guest      bool
		playerID   pgtype.UUID
		visibility sqlcgen.ProfileVisibility
	}
	identityOf := func(entry pgtype.UUID) identity {
		e, ok := byEntry[entry]
		if !ok || !e.PlayerID.Valid || !e.HasRtrID {
			return identity{guest: true}
		}
		visibility := sqlcgen.ProfileVisibilityPublic
		if e.ProfileVisibility.Valid && (e.ProfileVisibility.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate ||
			(e.ProfileState.Valid && e.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed)) {
			visibility = e.ProfileVisibility.ProfileVisibility
		}
		return identity{playerID: e.PlayerID, visibility: visibility}
	}
	// face is projectMatchFace: the name masked per matchFaceAccess; a guest has no picture or id.
	face := func(entry pgtype.UUID) courtPlayerDTO {
		e := byEntry[entry]
		who := identityOf(entry)
		masked, _, _ := matchFaceAccess(who.guest, who.visibility, who.playerID, v)
		name := e.NameSnapshot
		if masked {
			name = maskPublicName(name)
		}
		if who.guest {
			return courtPlayerDTO{Name: name}
		}
		pid := who.playerID.String()
		return courtPlayerDTO{Name: name, Picture: textPtr(e.AvatarRef), PlayerID: &pid}
	}
	courtFace := func(entry, ofMatch pgtype.UUID) courtPlayerDTO {
		f := face(entry)
		n := int32(gameNumber(entry, ofMatch))
		f.SessionGameNumber = &n
		return f
	}
	countingOf := func(f sqlcgen.ListSessionMatchFactsRow) string {
		if f.FullParticipation {
			return matchCounting(f.StandardMatch, ranked)
		}
		return "partial"
	}
	gameOf := func(f sqlcgen.ListSessionMatchFactsRow) gameDTO {
		partnerPlayers := make([]courtPlayerDTO, len(f.PartnerEntryIds))
		partners := make([]string, len(f.PartnerEntryIds))
		for i, id := range f.PartnerEntryIds {
			partnerPlayers[i] = courtFace(id, f.MatchID)
			partners[i] = partnerPlayers[i].Name
		}
		opponentPlayers := make([]courtPlayerDTO, len(f.OpponentEntryIds))
		opponents := make([]string, len(f.OpponentEntryIds))
		for i, id := range f.OpponentEntryIds {
			opponentPlayers[i] = courtFace(id, f.MatchID)
			opponents[i] = opponentPlayers[i].Name
		}
		n := int32(gameNumber(f.SessionPlayerID, f.MatchID))
		g := gameDTO{
			ID: f.MatchID.String(), Format: string(f.Format), SessionGameNumber: &n, Partners: partners, Opponents: opponents,
			PartnerPlayers: partnerPlayers, OpponentPlayers: opponentPlayers, Counting: countingOf(f), Result: result(f.Team, f.WinningTeam),
			Score: score(f.Team, f.TeamAScore, f.TeamBScore),
		}
		if g.Counting != "partial" {
			left := append([]pgtype.UUID{f.SessionPlayerID}, f.PartnerEntryIds...)
			if wc := winchance.OfGame(faces(left), faces(f.OpponentEntryIds), g.Result == "won"); wc != nil {
				g.WinChance, g.Upset = &winChanceDTO{A: wc.Chance.A, B: wc.Chance.B, Strong: wc.Chance.Strong}, &wc.Upset
				if wc.Chance.Favored != "" {
					g.WinChance.Favored = &wc.Chance.Favored
				}
			}
		}
		return g
	}

	var matchFacts []sqlcgen.ListSessionMatchFactsRow
	for _, f := range facts {
		if f.MatchID == matchID && f.MatchID.String() == matchText {
			matchFacts = append(matchFacts, f)
		}
	}
	if len(matchFacts) == 0 {
		return none, nil, false, nil
	}
	first := matchFacts[0]
	// Who was on court when the match ended, in Queue's order: every fact lists the finishers of the other team as opponents, so a fact of
	// the other team names this side. Someone who left mid-game has a fact of their own but is not on the court.
	side := func(team sqlcgen.TeamSide) []pgtype.UUID {
		for _, f := range matchFacts {
			if f.Team != team {
				return f.OpponentEntryIds
			}
		}
		var own []pgtype.UUID
		for _, f := range matchFacts {
			if f.Team == team {
				own = append(own, f.SessionPlayerID)
			}
		}
		return own
	}
	var yearIDs []pgtype.UUID
	player := func(entry pgtype.UUID) matchPlayerDTO {
		who := identityOf(entry)
		_, levelHidden, gamesHidden := matchFaceAccess(who.guest, who.visibility, who.playerID, v)
		e := byEntry[entry]
		if !gamesHidden && !who.guest && e.ProfileState.Valid && e.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed {
			if !slices.Contains(yearIDs, who.playerID) {
				yearIDs = append(yearIDs, who.playerID)
			}
		}
		var own *sqlcgen.ListSessionMatchFactsRow
		for i := range matchFacts {
			if matchFacts[i].SessionPlayerID == entry {
				own = &matchFacts[i]
				break
			}
		}
		all := factsOf[entry]
		at := slices.IndexFunc(all, func(f sqlcgen.ListSessionMatchFactsRow) bool { return f.MatchID == matchID })
		fc := face(entry)
		out := matchPlayerDTO{PlayerID: fc.PlayerID, Name: fc.Name, Picture: fc.Picture, SessionGameNumber: at + 1, EarlierGames: []gameDTO{}}
		if !levelHidden && own != nil {
			out.SkillGroup, _ = PublicLevel(levelCode(own.SkillLevelSnapshotID))
		}
		out.Counting = matchCounting(first.StandardMatch, ranked)
		if own != nil {
			out.Counting = countingOf(*own)
		}
		if !gamesHidden && at >= 0 {
			for _, f := range all[:at] {
				out.EarlierGames = append(out.EarlierGames, gameOf(f))
			}
		}
		if !gamesHidden {
			out.BeforeGame = beforeGameRecord(out.EarlierGames)
		}
		return out
	}
	teamA, teamB := side(sqlcgen.TeamSideA), side(sqlcgen.TeamSideB)
	page := matchPageDTO{
		MatchID: matchText, Format: string(first.Format), Counting: matchCounting(first.StandardMatch, ranked),
		Score: score(sqlcgen.TeamSideA, first.TeamAScore, first.TeamBScore), Winner: strings.ToLower(string(first.WinningTeam)),
		Session: matchSession{
			ID: sess.SessionID.String(), Title: sess.Title, ClubName: sess.ClubName, FinishedAt: isoPtrOf(sess.FinalizedAt), Ranked: ranked,
		},
		TeamA: make([]matchPlayerDTO, 0, len(teamA)), TeamB: make([]matchPlayerDTO, 0, len(teamB)),
		WinChance: winchance.GameBreakdown(faces(teamA), faces(teamB), first.WinningTeam == sqlcgen.TeamSideA),
	}
	if sess.PublishedAt.Valid {
		url := "/s/" + sess.PublicSlug
		page.Session.SessionPageURL = &url
	}
	if v.ok {
		id := v.id.String()
		page.ViewerPlayerID = &id
	}
	for _, id := range teamA {
		page.TeamA = append(page.TeamA, player(id))
	}
	for _, id := range teamB {
		page.TeamB = append(page.TeamB, player(id))
	}
	return page, yearIDs, true, nil
}

// beforeGameRecord is beforeGameRecord: every earlier game is played; only full games have a win or loss in this session record.
func beforeGameRecord(games []gameDTO) *beforeGameDTO {
	rec := &beforeGameDTO{Played: len(games)}
	for _, g := range games {
		if g.Counting == "partial" {
			continue
		}
		if g.Result == "won" {
			rec.Wins++
		} else {
			rec.Losses++
		}
	}
	if decided := rec.Wins + rec.Losses; decided > 0 {
		rate := int(math.Floor(float64(rec.Wins)/float64(decided)*100 + 0.5))
		rec.WinRate = &rate
	}
	return rec
}

// isoPtrOf is a nullable instant as the ISO text the wire shows, or null.
func isoPtrOf(t pgtype.Timestamptz) *string {
	if !t.Valid {
		return nil
	}
	s := httpapi.ToIso(t.Time)
	return &s
}
