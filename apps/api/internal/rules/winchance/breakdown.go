package winchance

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
)

// The rows behind a rating (WinChanceBreakdown): what the Win chance dialog of the Player app's match page draws. Lasting signals only.

// levelCodes are the nine playing levels, ordered from Beginner Low to Advanced High.
var levelCodes = []string{
	"beginner_low", "beginner_mid", "beginner_high", "intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

// levelLabel is levelLabel: "intermediate_mid" reads "Intermediate Mid".
func levelLabel(level int) string {
	words := strings.Split(levelCodes[level], "_")
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}

// MarshalJSON writes the chance as WinChance: `favored` is null for an even game.
func (c Chance) MarshalJSON() ([]byte, error) {
	var favored *string
	if c.Favored != "" {
		favored = &c.Favored
	}
	return json.Marshal(struct {
		A       int     `json:"a"`
		B       int     `json:"b"`
		Favored *string `json:"favored"`
		Strong  bool    `json:"strong"`
	}{c.A, c.B, favored, c.Strong})
}

// Row is one line of a player's rating, in level steps, signed.
type Row struct {
	Key    string  `json:"key"`
	Label  string  `json:"label"`
	Detail string  `json:"detail"`
	Value  float64 `json:"value"`
}

// PlayerBreakdown is one face of a game: its id (`a0`, `b1`: the side as drawn and the place on it, never a player ID), its rows and
// their sum.
type PlayerBreakdown struct {
	ID     string  `json:"id"`
	Rows   []Row   `json:"rows"`
	Rating float64 `json:"rating"`
}

// TeamBreakdown is a side: its faces and the average rating.
type TeamBreakdown struct {
	Players []PlayerBreakdown `json:"players"`
	Average float64           `json:"average"`
}

// Breakdown is WinChanceBreakdown of a finished game: the chance, each side, and whether the Favored pair lost.
type Breakdown struct {
	Chance  Chance        `json:"chance"`
	TeamA   TeamBreakdown `json:"teamA"`
	TeamB   TeamBreakdown `json:"teamB"`
	Lasting bool          `json:"lasting"`
	Upset   bool          `json:"upset"`
}

// baseRows are the lasting rows of a rating: level, club win rate (no record counts as 50%), best day, and the club leaderboard place and
// direction. Nothing from tonight.
func baseRows(f Face) []Row {
	level := Row{Key: "level", Label: "Level", Detail: "No level · counts as mid", Value: midLevel}
	if f.Level >= 0 && f.Level <= 8 {
		level.Detail, level.Value = levelLabel(f.Level), float64(f.Level)
	}
	rows := []Row{level}
	if f.Form != nil && f.Form.ClubWinRate != nil {
		rate := *f.Form.ClubWinRate
		rows = append(rows, Row{Key: "club_win_rate", Label: "Club win rate", Detail: fmt.Sprintf("%d%%", int(jsRound(rate*100))), Value: clamp((rate-0.5)*2, 1)})
	} else {
		rows = append(rows, Row{Key: "club_win_rate", Label: "Club win rate", Detail: "No record · counts as 50%", Value: 0})
	}
	if f.Form == nil {
		return rows
	}
	if f.Form.BestDay {
		rows = append(rows, Row{Key: "best_day", Label: "Best day", Detail: "Plays best on this weekday", Value: 0.25})
	}
	if f.Form.Place != 0 {
		detail := "Bottom quarter"
		if f.Form.Place > 0 {
			detail = "Top quarter"
		}
		rows = append(rows, Row{Key: "leaderboard_place", Label: "Club leaderboard", Detail: detail, Value: 0.25 * float64(f.Form.Place)})
	}
	if f.Form.Trend != 0 {
		detail := "Falling"
		if f.Form.Trend > 0 {
			detail = "Rising"
		}
		rows = append(rows, Row{Key: "leaderboard_trend", Label: "Leaderboard direction", Detail: detail, Value: 0.25 * float64(f.Form.Trend)})
	}
	return rows
}

func team(side string, faces []Face) TeamBreakdown {
	out := TeamBreakdown{Players: make([]PlayerBreakdown, len(faces))}
	sum := 0.0
	for i, f := range faces {
		rows := baseRows(f)
		rating := 0.0
		for _, r := range rows {
			rating += r.Value
		}
		out.Players[i] = PlayerBreakdown{ID: fmt.Sprintf("%s%d", side, i), Rows: rows, Rating: rating}
		sum += rating
	}
	out.Average = sum / math.Max(1, float64(len(faces)))
	return out
}

// GameBreakdown is gameWinChanceBreakdown: Team A is the left side in the order given. Nil without two sides.
func GameBreakdown(left, right []Face, leftWon bool) *Breakdown {
	if len(left) == 0 || len(right) == 0 {
		return nil
	}
	a, b := team("a", left), team("b", right)
	chance := read(math.Max(0.05, math.Min(0.95, 1/(1+math.Pow(10, (b.Average-a.Average)/2)))))
	winner := "B"
	if leftWon {
		winner = "A"
	}
	return &Breakdown{Chance: chance, TeamA: a, TeamB: b, Lasting: true, Upset: chance.Strong && chance.Favored != winner}
}
