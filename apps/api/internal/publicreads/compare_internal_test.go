package publicreads

import "testing"

func TestComparePercentageRoundsHalfUpAndIsNullWithoutGames(t *testing.T) {
	if percentage(0, 0) != nil {
		t.Fatal("no games, no rate")
	}
	for _, c := range []struct{ wins, games, want int }{{1, 2, 50}, {1, 3, 33}, {2, 3, 67}, {1, 8, 13}, {0, 4, 0}, {4, 4, 100}} {
		if got := percentage(c.wins, c.games); got == nil || *got != c.want {
			t.Errorf("%d of %d: %v, want %d", c.wins, c.games, got, c.want)
		}
	}
}

func TestCompareStatsOfOtherSide(t *testing.T) {
	s := compareStat(4, 3, 1)
	if s.Games != 4 || s.MyWins != 3 || s.OtherWins != 1 || *s.MyWinRate != 75 || *s.OtherWinRate != 25 {
		t.Fatalf("%+v", s)
	}
	if z := compareStat(0, 0, 0); z.MyWinRate != nil || z.OtherWinRate != nil {
		t.Fatalf("%+v", z)
	}
}

func TestValidCompareFilter(t *testing.T) {
	for _, f := range []string{"all", "h2h", "together"} {
		if !ValidCompareFilter(f) {
			t.Errorf("%s is a filter", f)
		}
	}
	for _, f := range []string{"", "ALL", "weekly"} {
		if ValidCompareFilter(f) {
			t.Errorf("%q is not a filter", f)
		}
	}
}

func TestPublicFirstNameAndLevel(t *testing.T) {
	if got := PublicFirstName("  Jose   Adrian "); got != "Jose" {
		t.Errorf("got %q", got)
	}
	if got := PublicFirstName("   "); got != "Player" {
		t.Errorf("got %q", got)
	}
	code := "advanced_mid"
	g, l := PublicLevel(&code)
	if g == nil || *g != "advanced" || l == nil || *l != "Advanced Mid" {
		t.Errorf("%v %v", g, l)
	}
	if g, l := PublicLevel(nil); g != nil || l != nil {
		t.Errorf("no level: %v %v", g, l)
	}
}
