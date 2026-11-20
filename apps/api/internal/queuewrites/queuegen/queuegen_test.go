package queuegen_test

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/queuewrites/queuegen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// The golden file is captured from the real TypeScript (testdata/tools/capture-queuegen.test.mjs): generation has no Vitest case that
// pins it, so a grid of sessions, rosters, matches and seeds is run through the real functions.
type fixtureMatch struct {
	ID            string   `json:"id"`
	State         string   `json:"state"`
	TeamA         []string `json:"teamA"`
	TeamB         []string `json:"teamB"`
	Substitutions []any    `json:"substitutions"`
	Decision      *struct {
		Kind string `json:"kind"`
	} `json:"decision"`
}

type fixturePlayer struct {
	ID               string  `json:"id"`
	Present          bool    `json:"present"`
	Level            *string `json:"level"`
	GamesAdjustment  *int64  `json:"gamesAdjustment"`
	NameSnapshot     string  `json:"nameSnapshot"`
	NicknameSnapshot *string `json:"nicknameSnapshot"`
	ClubNickname     *string `json:"clubNickname"`
}

type session struct {
	ID           string `json:"id"`
	SessionMode  string `json:"sessionMode"`
	AllowSingles bool   `json:"allowSingles"`
	AllowDoubles bool   `json:"allowDoubles"`
}

type lineup struct {
	Format string   `json:"format"`
	TeamA  []string `json:"teamA"`
	TeamB  []string `json:"teamB"`
}

type golden struct {
	Rosters map[string][]fixturePlayer `json:"rosters"`
	Matches map[string][]fixtureMatch  `json:"matches"`
	Draws   []struct {
		Seed string    `json:"seed"`
		Out  []float64 `json:"out"`
	} `json:"draws"`
	Generate []struct {
		Session session `json:"session"`
		Roster  string  `json:"roster"`
		Matches string  `json:"matches"`
		N       int     `json:"n"`
		Seed    string  `json:"seed"`
		Out     struct {
			Matches []lineup `json:"matches"`
			Error   *string  `json:"error"`
		} `json:"out"`
	} `json:"generate"`
	Formats []struct {
		AllowSingles bool `json:"allowSingles"`
		AllowDoubles bool `json:"allowDoubles"`
		Count        int  `json:"count"`
		Out          struct {
			Format *string `json:"format"`
			Reason *string `json:"reason"`
		} `json:"out"`
	} `json:"formats"`
	Balance []struct {
		Roster string `json:"roster"`
		Format string `json:"format"`
		Shift  int    `json:"shift"`
		Out    lineup `json:"out"`
	} `json:"balance"`
	Conflicts []struct {
		Session string  `json:"session"`
		Lineup  string  `json:"lineup"`
		Mode    string  `json:"mode"`
		Roster  string  `json:"roster"`
		Matches string  `json:"matches"`
		Out     *string `json:"out"`
	} `json:"conflicts"`
	Modes []string `json:"modes"`
}

func readGolden(t *testing.T) golden {
	t.Helper()
	raw, err := os.ReadFile("testdata/generation.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g golden
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	return g
}

func players(in []fixturePlayer) []model.Player {
	out := make([]model.Player, len(in))
	for i, p := range in {
		out[i] = model.Player{ID: p.ID, SessionID: "s", Present: p.Present, Level: p.Level, NicknameSnapshot: p.NicknameSnapshot, NameSnapshot: p.NameSnapshot}
		if p.GamesAdjustment != nil {
			out[i].GamesAdjustment = model.Some(*p.GamesAdjustment)
		}
	}
	return out
}

func matches(in []fixtureMatch) []model.Match {
	out := make([]model.Match, len(in))
	for i, m := range in {
		out[i] = model.Match{ID: m.ID, SessionID: "s", State: m.State, TeamA: m.TeamA, TeamB: m.TeamB, Substitutions: []model.Substitution{}}
		if m.Decision != nil {
			out[i].Decision = &model.Decision{Kind: m.Decision.Kind}
		}
	}
	return out
}

func TestSeededRngDraws(t *testing.T) {
	for _, d := range readGolden(t).Draws {
		rng := queuegen.SeededRng(d.Seed)
		for i, want := range d.Out {
			if got := rng(); got != want {
				t.Fatalf("seed %q draw %d: %v, want %v", d.Seed, i, got, want)
			}
		}
	}
}

func TestGenerateMatches(t *testing.T) {
	g := readGolden(t)
	for _, c := range g.Generate {
		sess := queuegen.Session{ID: c.Session.ID, Mode: c.Session.SessionMode, AllowSingles: c.Session.AllowSingles, AllowDoubles: c.Session.AllowDoubles}
		got := queuegen.GenerateMatches(sess, players(g.Rosters[c.Roster]), matches(g.Matches[c.Matches]), c.N, queuegen.SeededRng(c.Seed))
		if c.Out.Error != nil {
			if got.Error == nil || *got.Error != *c.Out.Error {
				t.Fatalf("%+v %s %s n=%d seed %q: error %v, want %q", c.Session, c.Roster, c.Matches, c.N, c.Seed, got.Error, *c.Out.Error)
			}
			continue
		}
		if got.Error != nil {
			t.Fatalf("%+v %s %s n=%d seed %q: unexpected error %q", c.Session, c.Roster, c.Matches, c.N, c.Seed, *got.Error)
		}
		want := make([]model.Lineup, len(c.Out.Matches))
		for i, l := range c.Out.Matches {
			want[i] = model.Lineup{Format: model.Format(l.Format), TeamA: l.TeamA, TeamB: l.TeamB}
		}
		if !reflect.DeepEqual(got.Matches, want) {
			t.Fatalf("%+v %s %s n=%d seed %q:\n got %+v\nwant %+v", c.Session, c.Roster, c.Matches, c.N, c.Seed, got.Matches, want)
		}
	}
}

func TestFormatForSelection(t *testing.T) {
	for _, c := range readGolden(t).Formats {
		format, reason := queuegen.FormatForSelection(c.Count, c.AllowSingles, c.AllowDoubles)
		switch {
		case c.Out.Format != nil && (format == nil || string(*format) != *c.Out.Format):
			t.Fatalf("count %d %v/%v: format %v, want %q", c.Count, c.AllowSingles, c.AllowDoubles, format, *c.Out.Format)
		case c.Out.Format == nil && format != nil:
			t.Fatalf("count %d: format %v, want none", c.Count, *format)
		case c.Out.Reason != nil && reason != *c.Out.Reason:
			t.Fatalf("count %d %v/%v: reason %q, want %q", c.Count, c.AllowSingles, c.AllowDoubles, reason, *c.Out.Reason)
		}
	}
}

func TestBalanceTeams(t *testing.T) {
	g := readGolden(t)
	for _, c := range g.Balance {
		roster := players(g.Rosters[c.Roster])
		size := map[string]int{"singles": 2, "fun_1v2": 3, "doubles": 4, "fun_3v3": 6, "fun_4v4": 8, "fun_5v5": 10}[c.Format]
		picks := make([]model.Player, size)
		for i := range picks {
			picks[i] = roster[(i+c.Shift)%len(roster)]
		}
		got := queuegen.BalanceTeams(picks, model.Format(c.Format))
		want := model.Lineup{Format: model.Format(c.Out.Format), TeamA: c.Out.TeamA, TeamB: c.Out.TeamB}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("%s %s shift %d: got %+v, want %+v", c.Roster, c.Format, c.Shift, got, want)
		}
	}
}

// The lineups of the capture's conflict grid.
var conflictLineups = map[string]model.Lineup{
	"ok_singles":     {Format: "singles", TeamA: []string{"p0"}, TeamB: []string{"p1"}},
	"ok_doubles":     {Format: "doubles", TeamA: []string{"p0", "p1"}, TeamB: []string{"p2", "p3"}},
	"incomplete":     {Format: "doubles", TeamA: []string{"p0", "p1"}, TeamB: []string{"p2"}},
	"repeats":        {Format: "doubles", TeamA: []string{"p0", "p1"}, TeamB: []string{"p1", "p3"}},
	"fun":            {Format: "fun_3v3", TeamA: []string{"p0", "p1", "p2"}, TeamB: []string{"p3", "p4", "p5"}},
	"away":           {Format: "doubles", TeamA: []string{"p0", "p1"}, TeamB: []string{"p2", "p5"}},
	"stranger":       {Format: "singles", TeamA: []string{"p0"}, TeamB: []string{"nobody"}},
	"busy":           {Format: "doubles", TeamA: []string{"p6", "p1"}, TeamB: []string{"p2", "p3"}},
	"unleveled_away": {Format: "singles", TeamA: []string{"p0"}, TeamB: []string{"p3"}},
}

func TestDraftConflict(t *testing.T) {
	g := readGolden(t)
	if len(g.Modes) != len(queuegen.AutoQueueModes) {
		t.Fatalf("modes %v, want %v", queuegen.AutoQueueModes, g.Modes)
	}
	for _, c := range g.Conflicts {
		sess := queuegen.Session{ID: "s", AllowSingles: true, AllowDoubles: true}
		switch c.Session {
		case "no_singles":
			sess.AllowSingles = false
		case "no_doubles":
			sess.AllowDoubles = false
		}
		roster := players(g.Rosters[c.Roster])
		// The capture gives the third player a club nickname (with spaces round it) and the fourth an account nickname.
		club := " Club Two "
		nick := "Nick"
		roster[3].NicknameSnapshot = &nick
		got := queuegen.DraftConflict(conflictLineups[c.Lineup], c.Mode, sess, roster, matches(g.Matches[c.Matches]), func(p model.Player) string {
			if p.ID == "p2" {
				return queuegen.QueueMasterName(&club, p)
			}
			return queuegen.QueueMasterName(nil, p)
		})
		switch {
		case c.Out == nil && got != nil:
			t.Fatalf("%+v: conflict %q, want none", c, *got)
		case c.Out != nil && (got == nil || *got != *c.Out):
			t.Fatalf("%+v: conflict %v, want %q", c, got, *c.Out)
		}
	}
}
