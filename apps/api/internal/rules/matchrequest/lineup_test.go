package matchrequest_test

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/matchrequest"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// The golden file is captured from the real TypeScript (testdata/tools/capture-matchrequest-lineup.test.mjs): no Vitest case
// pins these functions, so a grid of rosters, matches and requests is run through the real ones.
type golden struct {
	Lineups []struct {
		Fixture string `json:"fixture"`
		Spots   string `json:"spots"`
		Format  string `json:"format"`
		Roster  []struct {
			ID      string `json:"id"`
			Present bool   `json:"present"`
			Adj     *int64 `json:"adj"`
		} `json:"roster"`
		Matches []struct {
			State string   `json:"state"`
			TeamA []string `json:"teamA"`
			TeamB []string `json:"teamB"`
		} `json:"matches"`
		Partners  []*string `json:"partners"`
		Opponents []*string `json:"opponents"`
		Out       *struct {
			Format string   `json:"format"`
			TeamA  []string `json:"teamA"`
			TeamB  []string `json:"teamB"`
		} `json:"out"`
	} `json:"lineups"`
	Spots []struct {
		Format string `json:"format"`
		Out    struct{ Partners, Opponents int }
	} `json:"spots"`
	Labels  []struct{ Format, Text string } `json:"labels"`
	Allowed []struct {
		AllowSingles   bool            `json:"allowSingles"`
		AllowDoubles   bool            `json:"allowDoubles"`
		RequestFormats map[string]bool `json:"requestFormats"`
		Out            []string        `json:"out"`
	} `json:"allowed"`
	Texts struct{ None, Format string } `json:"texts"`
}

func readGolden(t *testing.T) golden {
	t.Helper()
	raw, err := os.ReadFile("testdata/lineup.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g golden
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	return g
}

func TestLineupMatchesTheTypeScript(t *testing.T) {
	g := readGolden(t)
	if len(g.Lineups) == 0 {
		t.Fatal("no cases")
	}
	for _, c := range g.Lineups {
		var roster []model.Player
		for _, r := range c.Roster {
			p := model.Player{ID: r.ID, Present: r.Present}
			if r.Adj != nil {
				p.GamesAdjustment = model.Some(*r.Adj)
			}
			roster = append(roster, p)
		}
		var matches []model.Match
		for _, m := range c.Matches {
			matches = append(matches, model.Match{State: m.State, TeamA: m.TeamA, TeamB: m.TeamB})
		}
		got, ok := matchrequest.Lineup(matchrequest.Request{PID: "p0", Format: model.Format(c.Format), Partners: c.Partners, Opponents: c.Opponents}, roster, matches)
		name := c.Fixture + "/" + c.Spots + "/" + c.Format
		if c.Out == nil {
			if ok {
				t.Errorf("%s: got a lineup %v, want none", name, got)
			}
			continue
		}
		if !ok || string(got.Format) != c.Out.Format || !reflect.DeepEqual(got.TeamA, c.Out.TeamA) || !reflect.DeepEqual(got.TeamB, c.Out.TeamB) {
			t.Errorf("%s: got %v (%v), want %v", name, got, ok, *c.Out)
		}
	}
}

func TestSpotsLabelsAndAllowedFormats(t *testing.T) {
	g := readGolden(t)
	for _, s := range g.Spots {
		p, o := matchrequest.Spots(model.Format(s.Format))
		if p != s.Out.Partners || o != s.Out.Opponents {
			t.Errorf("%s: spots %d, %d, want %d, %d", s.Format, p, o, s.Out.Partners, s.Out.Opponents)
		}
	}
	for _, l := range g.Labels {
		if got := matchrequest.NotEnoughToFillText(matchrequest.FormatLabel(model.Format(l.Format))); got != l.Text {
			t.Errorf("%s: %q, want %q", l.Format, got, l.Text)
		}
	}
	for _, a := range g.Allowed {
		got := matchrequest.AllowedFormats(a.AllowSingles, a.RequestFormats)
		var gotText []string
		for _, f := range got {
			gotText = append(gotText, string(f))
		}
		if len(gotText) != len(a.Out) || (len(a.Out) > 0 && !reflect.DeepEqual(gotText, a.Out)) {
			t.Errorf("%+v: got %v, want %v", a, gotText, a.Out)
		}
	}
	if matchrequest.NoMatchRequestsText != g.Texts.None || matchrequest.FormatNotAllowedText != g.Texts.Format {
		t.Errorf("texts differ: %q, %q", matchrequest.NoMatchRequestsText, matchrequest.FormatNotAllowedText)
	}
}
