package winchance

import "testing"

func rate(r float64) *float64 { return &r }

func TestLasting(t *testing.T) {
	cases := []struct {
		name        string
		left, right []Face
		want        Chance
	}{
		{"even levels", []Face{{Level: 4}}, []Face{{Level: 4}}, Chance{A: 50, B: 50}},
		{"no level counts as mid", []Face{{Level: -1}}, []Face{{Level: 4}}, Chance{A: 50, B: 50}},
		{"two levels up", []Face{{Level: 6}}, []Face{{Level: 4}}, Chance{A: 91, B: 9, Favored: "A", Strong: true}},
		{"one level up", []Face{{Level: 5}}, []Face{{Level: 4}}, Chance{A: 76, B: 24, Favored: "A", Strong: true}},
		{"half a level up is not favored", []Face{{Level: 4, Form: &Form{ClubWinRate: rate(0.75)}}}, []Face{{Level: 4}}, Chance{A: 64, B: 36, Favored: "A"}},
		{"capped at 95", []Face{{Level: 8}}, []Face{{Level: 0}}, Chance{A: 95, B: 5, Favored: "A", Strong: true}},
		{"win rate lifts one step", []Face{{Level: 4, Form: &Form{ClubWinRate: rate(1)}}}, []Face{{Level: 4}}, Chance{A: 76, B: 24, Favored: "A", Strong: true}},
		{"a pair is an average", []Face{{Level: 6}, {Level: 2}}, []Face{{Level: 4}, {Level: 4}}, Chance{A: 50, B: 50}},
	}
	for _, c := range cases {
		if got := Lasting(c.left, c.right); got != c.want {
			t.Errorf("%s: %+v, want %+v", c.name, got, c.want)
		}
	}
}

func TestOfGame(t *testing.T) {
	strong, weak := []Face{{Level: 6}}, []Face{{Level: 4}}
	if g := OfGame(strong, weak, false); g == nil || !g.Upset {
		t.Errorf("the favored side lost: %+v", g)
	}
	if g := OfGame(strong, weak, true); g == nil || g.Upset {
		t.Errorf("the favored side won: %+v", g)
	}
	if g := OfGame(weak, strong, true); g == nil || !g.Upset || g.Chance.Favored != "B" {
		t.Errorf("the underdog on the left won: %+v", g)
	}
	if OfGame(nil, weak, true) != nil {
		t.Error("one side is no game")
	}
}

func TestFormFromHistory(t *testing.T) {
	short := FormFromHistory([]SessionRecord{{Weekday: 2, Wins: 3, Losses: 1}}, 2)
	if short.ClubWinRate != nil || !short.BestDay {
		t.Errorf("under 10 games: %+v", short)
	}
	long := FormFromHistory([]SessionRecord{{Weekday: 2, Wins: 6, Losses: 2}, {Weekday: 5, Wins: 1, Losses: 3}}, 5)
	if long.ClubWinRate == nil || *long.ClubWinRate != 7.0/12 || long.BestDay {
		t.Errorf("12 games: %+v", long)
	}
}
