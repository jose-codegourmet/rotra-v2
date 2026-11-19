package publicreads

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

// The tie-break of the period leaderboards is new Intl.Collator('en-PH', { sensitivity: 'base' }): case and accents
// do not count. testdata/collation-base.golden.json is what Node answered for every name of a corpus (names that
// compare equal share a class), captured by apps/api/testdata/tools/capture-collation-base.mjs.
func TestBoardNameCompareMatchesNodeCollator(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "collation-base.golden.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g struct {
		Inputs  []string       `json:"inputs"`
		ClassOf map[string]int `json:"classOf"`
	}
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	compare := newBoardNameComparer()
	sign := func(n int) int {
		switch {
		case n < 0:
			return -1
		case n > 0:
			return 1
		}
		return 0
	}
	bad := 0
	for _, a := range g.Inputs {
		for _, b := range g.Inputs {
			want := sign(g.ClassOf[a] - g.ClassOf[b])
			if got := sign(compare(a, b)); got != want {
				bad++
				if bad <= 15 {
					t.Errorf("compare(%q, %q) = %d, Node says %d", a, b, got, want)
				}
			}
		}
	}
	if bad > 0 {
		t.Errorf("%d of %d pairs differ", bad, len(g.Inputs)*len(g.Inputs))
	}
}

func TestPeriodStartIsMidnightInManila(t *testing.T) {
	at := func(s string) int64 {
		tm, err := time.Parse(time.RFC3339, s)
		if err != nil {
			t.Fatal(err)
		}
		return tm.UnixMilli()
	}
	for _, c := range []struct {
		p        period
		now, was string
	}{
		{periodWeek, "2026-11-15T15:59:59Z", "2026-11-08T16:00:00Z"}, // Sunday evening in Manila: the week began last Monday
		{periodWeek, "2026-11-15T16:00:00Z", "2026-11-15T16:00:00Z"}, // Monday 00:00 in Manila
		{periodWeek, "2026-11-19T04:00:00Z", "2026-11-15T16:00:00Z"},
		{periodMonth, "2026-11-30T15:59:59Z", "2026-10-31T16:00:00Z"},
		{periodMonth, "2026-11-30T16:00:00Z", "2026-11-30T16:00:00Z"},
		{periodYear, "2026-12-31T15:59:59Z", "2025-12-31T16:00:00Z"},
		{periodYear, "2026-12-31T16:00:00Z", "2026-12-31T16:00:00Z"},
	} {
		if got := periodStart(c.p, at(c.now)); got != at(c.was) {
			t.Errorf("%s at %s began %s, want %s", c.p, c.now, time.UnixMilli(got).UTC().Format(time.RFC3339), c.was)
		}
	}
}

func TestParsePeriod(t *testing.T) {
	if p, ok := parsePeriod("", false); !ok || p != periodYear {
		t.Errorf("no parameter is the year: %q %v", p, ok)
	}
	for _, v := range []string{"year", "month", "week"} {
		if p, ok := parsePeriod(v, true); !ok || string(p) != v {
			t.Errorf("%s: %q %v", v, p, ok)
		}
	}
	for _, v := range []string{"", "day", "YEAR", " year", "annual"} {
		if _, ok := parsePeriod(v, true); ok {
			t.Errorf("%q must be invalid", v)
		}
	}
}

// Ties go to the better win rate (compared as fractions), then the name, then the player ID.
func TestStandingsOrderTiesByWinRateThenNameThenID(t *testing.T) {
	b := &board{compare: newBoardNameComparer()}
	names := map[string]string{"a": "Zoe", "b": "zoë", "c": "Ann", "d": "Bo", "e": "Cy"}
	records := map[string]*recordOf{
		"a": {wins: 2, losses: 1}, "b": {wins: 2, losses: 1}, // same record, names equal under base: the ID decides
		"c": {wins: 2, losses: 3}, // fewer wins than the rate leader below
		"d": {wins: 2, losses: 0}, // the best win rate at two wins
		"e": {wins: 3, losses: 9}, // most wins, worst rate: still first
	}
	var got []string
	for _, s := range b.order(records, names) {
		got = append(got, s.id)
	}
	if want := []string{"e", "d", "a", "b", "c"}; !reflect.DeepEqual(got, want) {
		t.Errorf("order %v, want %v", got, want)
	}
}

func TestJSToLowerFoldsLikeJavaScript(t *testing.T) {
	for in, want := range map[string]string{
		"ALICE": "alice", "Zoë": "zoë", "İ": "i̇", "ΟΔΥΣΣΕΥΣ": "οδυσσευς", "Σ": "σ", "AΣ": "aς", "ΑΣ Α": "ας α", "": "",
	} {
		if got := jsToLower(in); got != want {
			t.Errorf("jsToLower(%q) = %q, want %q", in, got, want)
		}
	}
}
