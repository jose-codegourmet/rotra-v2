package sessionsetup_test

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionsetup"
)

// The golden file is captured from the real TypeScript (testdata/tools/capture-sessionsetup-minimum.test.mjs): no Vitest
// case pins these two functions, so every input of a grid is run through them.
type golden struct {
	Minutes []struct {
		Start, End int64
		Minutes    float64
	} `json:"minutes"`
	Estimates []struct {
		In struct {
			Courts, Players int64
			Minutes         float64
			AllowSingles    bool
			AllowDoubles    bool
		} `json:"in"`
		Out struct {
			Low, High, Usable int64
		} `json:"out"`
	} `json:"estimates"`
}

func readGolden(t *testing.T) golden {
	t.Helper()
	raw, err := os.ReadFile("testdata/minimum.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g golden
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	return g
}

func TestMinutesMatchesTheTypeScript(t *testing.T) {
	g := readGolden(t)
	if len(g.Minutes) == 0 {
		t.Fatal("no golden minutes")
	}
	for _, c := range g.Minutes {
		if got := sessionsetup.Minutes(c.Start, c.End); got != c.Minutes {
			t.Errorf("Minutes(%d, %d) = %v, want %v", c.Start, c.End, got, c.Minutes)
		}
	}
}

func TestEstimateMinimumMatchesTheTypeScript(t *testing.T) {
	g := readGolden(t)
	if len(g.Estimates) < 1000 {
		t.Fatalf("only %d golden estimates", len(g.Estimates))
	}
	for _, c := range g.Estimates {
		got := sessionsetup.EstimateMinimum(sessionsetup.MinimumInput{
			Courts: c.In.Courts, Minutes: c.In.Minutes, Players: c.In.Players, AllowSingles: c.In.AllowSingles, AllowDoubles: c.In.AllowDoubles,
		})
		if got.Low != c.Out.Low || got.High != c.Out.High || got.Usable != c.Out.Usable {
			t.Errorf("EstimateMinimum(%+v) = %+v, want %+v", c.In, got, c.Out)
		}
	}
}
