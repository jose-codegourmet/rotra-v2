package sessionresult_test

import (
	"math"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionresult"
)

// These cases are the Vitest cases of packages/data/src/session-result/sessionResult.rules.test.ts (sessionStandings,
// computeAwards, substitution credit and awardBaseline), same names and same data. The export frame cases of that file
// (paginateStandings, buildExportFrames) belong to the Download images screen, not to Session done.

func strp(s string) *string { return &s }

func player(name string, level *string) model.Player {
	return model.Player{ID: name, SessionID: "s", ClubPlayerID: "club-" + name, NameSnapshot: name, Present: true, Level: level}
}

func mid() *string { return strp("intermediate_mid") }

func defaultRoster() []model.Player {
	var out []model.Player
	for _, n := range []string{"Zoe", "Amy", "Ben", "Dan", "Eve"} {
		out = append(out, player(n, mid()))
	}
	return out
}

func game(a, b []string, winner ...string) model.Match {
	w := "A"
	if len(winner) > 0 {
		w = winner[0]
	}
	return model.Match{
		ID: "m", SessionID: "s", MatchNo: 1, State: model.StateCompleted, Format: "doubles", TeamA: a, TeamB: b, Substitutions: []model.Substitution{},
		Decision: &model.Decision{Kind: "completed", WinningTeam: &w, ConfirmedAt: 1},
	}
}

func invalidMatch(m model.Match) model.Match {
	m.State = model.StateInvalid
	m.Decision = &model.Decision{Kind: "invalid", ConfirmedAt: 1}
	return m
}

func names(rows []sessionresult.StandingRow) []string {
	var out []string
	for _, r := range rows {
		out = append(out, r.Name)
	}
	return out
}

func positions(t *testing.T, rows []sessionresult.StandingRow, want [][2]any) {
	t.Helper()
	if len(rows) != len(want) {
		t.Fatalf("rows = %d, want %d: %+v", len(rows), len(want), rows)
	}
	for i, r := range rows {
		if r.Position != want[i][0].(int) || r.Name != want[i][1].(string) {
			t.Errorf("row %d = [%d %s], want %v", i, r.Position, r.Name, want[i])
		}
	}
}

func history(rows ...any) []sessionresult.PlayerAwardHistory {
	var out []sessionresult.PlayerAwardHistory
	for i := 0; i < len(rows); i += 3 {
		h := sessionresult.PlayerAwardHistory{ClubPlayerID: "club-" + rows[i].(string), PriorSessions: rows[i+1].(int)}
		if rows[i+2] != nil {
			rate := rows[i+2].(float64)
			h.BaselineWinRate = &rate
		}
		out = append(out, h)
	}
	return out
}

func close6(a, b float64) bool { return math.Abs(a-b) < 5e-7 }

func TestSessionStandings(t *testing.T) {
	roster := defaultRoster()
	g := func(a, b string) model.Match { return game([]string{a}, []string{b}) }
	t.Run("shares a position between players on the same wins and losses (1, 2, 2, 3)", func(t *testing.T) {
		rows := sessionresult.SessionStandings(roster, []model.Match{g("Zoe", "Amy"), g("Amy", "Ben"), g("Dan", "Zoe")})
		positions(t, rows, [][2]any{{1, "Dan"}, {2, "Amy"}, {2, "Zoe"}, {3, "Ben"}})
		if r := rows[2]; r.ClubPlayerID != "club-Zoe" || r.Wins != 1 || r.Losses != 1 || r.Games != 2 {
			t.Errorf("row = %+v", r)
		}
	})
	t.Run("shares one position three ways and numbers the next player right after (1, 2, 2, 2, 3)", func(t *testing.T) {
		rows := sessionresult.SessionStandings(roster, []model.Match{g("Zoe", "Amy"), g("Amy", "Ben"), g("Ben", "Zoe"), g("Dan", "Eve")})
		positions(t, rows, [][2]any{{1, "Dan"}, {2, "Amy"}, {2, "Ben"}, {2, "Zoe"}, {3, "Eve"}})
	})
	t.Run("puts two players on 4-2 at position 1 and the next player at 2", func(t *testing.T) {
		var ms []model.Match
		wins := func(winner string, losers ...string) {
			for _, l := range losers {
				ms = append(ms, g(winner, l))
			}
		}
		wins("Ben", "Amy", "Amy", "Zoe", "Dan")
		wins("Amy", "Zoe", "Dan", "Eve", "Eve")
		wins("Zoe", "Ben")
		wins("Dan", "Ben")
		positions(t, sessionresult.SessionStandings(roster, ms), [][2]any{{1, "Amy"}, {1, "Ben"}, {2, "Dan"}, {2, "Zoe"}, {3, "Eve"}})
	})
	t.Run("leaves out players without a counted game, partials and invalid matches", func(t *testing.T) {
		partial := game([]string{"Zoe", "Amy"}, []string{"Ben", "Dan"})
		partial.Substitutions = []model.Substitution{{OutID: "Eve", InID: "Zoe", Team: "A"}}
		inv := invalidMatch(game([]string{"Eve"}, []string{"Amy"}))
		got := names(sessionresult.SessionStandings(roster, []model.Match{partial, inv}))
		if len(got) != 3 || got[0] != "Amy" || got[1] != "Ben" || got[2] != "Dan" {
			t.Errorf("names = %v", got)
		}
	})
}

func TestPrototypeReferenceAwards(t *testing.T) {
	roster := defaultRoster()
	g := func(a, b string, w ...string) model.Match { return game([]string{a}, []string{b}, w...) }
	g2 := func(a1, a2, b1, b2 string, w ...string) model.Match {
		return game([]string{a1, a2}, []string{b1, b2}, w...)
	}
	t.Run("uses the level-index expected win chance and needs two counted games for MVP", func(t *testing.T) {
		r := []model.Player{player("Zoe", strp("beginner_low")), player("Amy", strp("advanced_high")), player("Ben", mid())}
		a := sessionresult.ComputeAwards([]model.Match{g("Zoe", "Amy"), g("Zoe", "Amy")}, r, nil, nil)
		if a.MVP == nil || a.MVP.Name != "Zoe" || !close6(a.MVP.Score, 2-2/(1+math.Pow(10, 4))) {
			t.Errorf("mvp = %+v", a.MVP)
		}
		if one := sessionresult.ComputeAwards([]model.Match{g("Zoe", "Amy")}, r, nil, nil); one.MVP != nil {
			t.Errorf("one counted game gave mvp %+v", one.MVP)
		}
	})
	t.Run("lets a guest win MVP without a profile link; club players carry theirs", func(t *testing.T) {
		games := []model.Match{g("Zoe", "Amy"), g("Zoe", "Amy")}
		guest := sessionresult.ComputeAwards(games, roster, nil, []sessionresult.ClubPlayerRef{{ID: "club-Zoe"}})
		if guest.MVP == nil || guest.MVP.Name != "Zoe" || guest.MVP.PlayerID != nil {
			t.Errorf("guest mvp = %+v", guest.MVP)
		}
		linked := sessionresult.ComputeAwards(games, roster, nil, []sessionresult.ClubPlayerRef{{ID: "club-Zoe", PlayerID: strp("player-zoe")}})
		if linked.MVP == nil || linked.MVP.PlayerID == nil || *linked.MVP.PlayerID != "player-zoe" {
			t.Errorf("linked mvp = %+v", linked.MVP)
		}
	})
	t.Run("never fills Most Improved or Off Day without a five-session baseline", func(t *testing.T) {
		games := []model.Match{g("Zoe", "Amy"), g("Zoe", "Amy"), g("Zoe", "Amy"), g("Zoe", "Amy")}
		none := sessionresult.ComputeAwards(games, roster, history("Zoe", 4, 0.5, "Amy", 9, nil), nil)
		if none.MostImproved != nil || len(none.OffDay) != 0 {
			t.Errorf("awards = %+v", none)
		}
	})
	t.Run("names Most Improved at a rise of at least +0.15 and lists Off Day at drops of 0.30 or more", func(t *testing.T) {
		games := []model.Match{
			g2("Zoe", "Ben", "Amy", "Dan"), g2("Zoe", "Dan", "Amy", "Ben"),
			g2("Zoe", "Amy", "Ben", "Dan", "B"), g2("Zoe", "Amy", "Ben", "Dan", "B"),
		}
		// Rates tonight: Zoe 0.5, Amy 0, Ben 0.75, Dan 0.75.
		a := sessionresult.ComputeAwards(games, roster, history("Zoe", 5, 0.4, "Amy", 6, 0.35, "Ben", 7, 0.5, "Dan", 5, 0.61), nil)
		if a.MostImproved == nil || a.MostImproved.Name != "Ben" || a.MostImproved.PriorSessions != 7 || !close6(a.MostImproved.Delta, 0.25) {
			t.Errorf("mostImproved = %+v", a.MostImproved)
		}
		if len(a.OffDay) != 1 || a.OffDay[0].Name != "Amy" || !close6(a.OffDay[0].Delta, -0.35) {
			t.Errorf("offDay = %+v", a.OffDay)
		}
	})
	t.Run("orders Off Day by the biggest drop first", func(t *testing.T) {
		games := []model.Match{g2("Zoe", "Amy", "Ben", "Dan", "B"), g2("Zoe", "Amy", "Ben", "Dan", "B")}
		a := sessionresult.ComputeAwards(games, roster, history("Zoe", 5, 0.4, "Amy", 5, 0.7), nil)
		if len(a.OffDay) != 2 || a.OffDay[0].Name != "Amy" || a.OffDay[1].Name != "Zoe" {
			t.Errorf("offDay = %+v", a.OffDay)
		}
	})
}

func TestSubstitutionGameCredit(t *testing.T) {
	roster := defaultRoster()
	// Eve started Team A and went off; Zoe came in and Team A beat Amy.
	subbed := func(credit string) model.Match {
		m := game([]string{"Zoe"}, []string{"Amy"})
		m.Format = "singles"
		sub := model.Substitution{OutID: "Eve", InID: "Zoe", Team: "A"}
		if credit != "" {
			sub.CreditTo = model.Some(credit)
		}
		m.Substitutions = []model.Substitution{sub}
		return m
	}
	find := func(rows []sessionresult.StandingRow, name string) *sessionresult.StandingRow {
		for i := range rows {
			if rows[i].Name == name {
				return &rows[i]
			}
		}
		return nil
	}
	plain := func() model.Match { return game([]string{"Zoe"}, []string{"Amy"}) }
	t.Run("counts nobody when nobody got the game", func(t *testing.T) {
		rows := sessionresult.SessionStandings(roster, []model.Match{plain(), subbed("none")})
		if z := find(rows, "Zoe"); z == nil || z.Wins != 1 || z.Games != 1 {
			t.Errorf("zoe = %+v", z)
		}
		if find(rows, "Eve") != nil {
			t.Error("Eve is listed")
		}
		// Zoe has one counted game, so Amy (two losses) is the only MVP candidate.
		if a := sessionresult.ComputeAwards([]model.Match{plain(), subbed("none")}, roster, nil, nil); a.MVP == nil || a.MVP.Name != "Amy" {
			t.Errorf("mvp = %+v", a.MVP)
		}
	})
	t.Run("gives the incoming player the game in standings and MVP", func(t *testing.T) {
		games := []model.Match{plain(), subbed("incoming")}
		if z := find(sessionresult.SessionStandings(roster, games), "Zoe"); z == nil || z.Wins != 2 || z.Losses != 0 || z.Games != 2 {
			t.Errorf("zoe = %+v", z)
		}
		if a := sessionresult.ComputeAwards(games, roster, nil, nil); a.MVP == nil || a.MVP.Name != "Zoe" || a.MVP.Games != 2 {
			t.Errorf("mvp = %+v", a.MVP)
		}
	})
	t.Run("gives the outgoing player the game and the result of their side", func(t *testing.T) {
		rows := sessionresult.SessionStandings(roster, []model.Match{subbed("outgoing")})
		if e := find(rows, "Eve"); e == nil || e.Wins != 1 || e.Losses != 0 || e.Games != 1 {
			t.Errorf("eve = %+v", e)
		}
		if find(rows, "Zoe") != nil {
			t.Error("Zoe is listed")
		}
	})
	t.Run("keeps the latest choice for a slot", func(t *testing.T) {
		m := subbed("incoming")
		m.TeamA = []string{"Ben"}
		m.Substitutions[0].CreditTo = model.Some("none")
		m.Substitutions = append(m.Substitutions, model.Substitution{OutID: "Zoe", InID: "Ben", Team: "A", At: 1, CreditTo: model.Some("outgoing")})
		rows := sessionresult.SessionStandings(roster, []model.Match{m})
		if z := find(rows, "Zoe"); z == nil || z.Games != 1 || z.Wins != 1 {
			t.Errorf("zoe = %+v", z)
		}
		if find(rows, "Ben") != nil || find(rows, "Eve") != nil {
			t.Errorf("rows = %+v", rows)
		}
	})
	t.Run("never feeds Off Day with a credited game", func(t *testing.T) {
		creditedLoss := func() model.Match {
			m := game([]string{"Eve"}, []string{"Dan"}, "B")
			m.Format = "singles"
			m.Substitutions = []model.Substitution{{OutID: "Amy", InID: "Eve", Team: "A", CreditTo: model.Some("outgoing")}}
			return m
		}
		win := func() model.Match { return game([]string{"Amy"}, []string{"Ben"}) }
		games := []model.Match{win(), win(), creditedLoss(), creditedLoss()}
		if a := find(sessionresult.SessionStandings(roster, games), "Amy"); a == nil || a.Wins != 2 || a.Losses != 2 || a.Games != 4 {
			t.Errorf("amy = %+v", a)
		}
		// With the credited losses Amy's rate would be 0.5 against 0.9; on full games it is 1.0.
		if a := sessionresult.ComputeAwards(games, roster, history("Amy", 5, 0.9), nil); len(a.OffDay) != 0 {
			t.Errorf("offDay = %+v", a.OffDay)
		}
	})
	t.Run("gives nobody anything from an invalid match", func(t *testing.T) {
		inv := invalidMatch(subbed("incoming"))
		if rows := sessionresult.SessionStandings(roster, []model.Match{inv}); len(rows) != 0 {
			t.Errorf("rows = %+v", rows)
		}
		if a := sessionresult.ComputeAwards([]model.Match{inv, inv}, roster, nil, nil); a.MVP != nil {
			t.Errorf("mvp = %+v", a.MVP)
		}
	})
}

func TestAwardBaseline(t *testing.T) {
	var sessions []sessionresult.PriorSession
	for _, s := range []string{"s1", "s2", "s3", "s4", "s5"} {
		sessions = append(sessions, sessionresult.PriorSession{ClubPlayerID: "club-Amy", SessionID: s})
	}
	fact := func(session string, won bool, full ...bool) sessionresult.PriorFact {
		f := sessionresult.PriorFact{ClubPlayerID: "club-Amy", SessionID: session, FullParticipation: len(full) == 0 || full[0], Team: "A", WinningTeam: "B"}
		if won {
			f.WinningTeam = "A"
		}
		return f
	}
	t.Run("uses full games only: a credited substitute game never changes it", func(t *testing.T) {
		full := []sessionresult.PriorFact{fact("s1", true), fact("s2", true), fact("s3", false), fact("s4", true)}
		withCredited := append(append([]sessionresult.PriorFact{}, full...), fact("s5", false, false), fact("s5", false, false))
		plain := sessionresult.AwardBaseline([]string{"club-Amy"}, sessions, full)
		credited := sessionresult.AwardBaseline([]string{"club-Amy"}, sessions, withCredited)
		if len(plain) != 1 || plain[0].PriorSessions != 5 || plain[0].BaselineWinRate == nil || *plain[0].BaselineWinRate != 0.75 {
			t.Errorf("plain = %+v", plain)
		}
		if *credited[0].BaselineWinRate != *plain[0].BaselineWinRate || credited[0].PriorSessions != 5 {
			t.Errorf("credited = %+v", credited)
		}
	})
	t.Run("has no rate without a full game and ignores sessions not in the player history", func(t *testing.T) {
		got := sessionresult.AwardBaseline([]string{"club-Amy"}, sessions, []sessionresult.PriorFact{fact("s9", true)})
		if len(got) != 1 || got[0].PriorSessions != 5 || got[0].BaselineWinRate != nil {
			t.Errorf("got = %+v", got)
		}
	})
}
