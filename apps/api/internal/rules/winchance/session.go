package winchance

import (
	"fmt"
	"math"
	"slices"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// Win chance on the Queue Master's console and in Generate matches' Even game (D-2026-11-27-02; packages/data/src/match/winChance.rules.ts):
// the lasting rows of a rating plus what tonight adds (wins and losses, upsets, games in a row, a handicap).

// SessionPlayer is the part of a roster row the rating reads: the level (a code, nil for none), the handicap spots tonight and the form.
type SessionPlayer struct {
	ID            string   `json:"id"`
	Level         *string  `json:"level"`
	HandicapSpots []string `json:"handicapSpots"`
	Form          *Form    `json:"form"`
}

// handicapSpots are the known spots in figure order with their labels (handicap.rules.ts).
var handicapSpots = []struct{ code, label string }{
	{"left_shoulder", "Left shoulder"}, {"right_shoulder", "Right shoulder"}, {"left_elbow", "Left elbow"}, {"right_elbow", "Right elbow"},
	{"left_wrist", "Left wrist"}, {"right_wrist", "Right wrist"}, {"lower_back", "Lower back"}, {"left_knee", "Left knee"},
	{"right_knee", "Right knee"}, {"left_ankle", "Left ankle"}, {"right_ankle", "Right ankle"},
}

type roster map[string]*SessionPlayer

func rosterOf(players []SessionPlayer) roster {
	r := roster{}
	for i := range players {
		r[players[i].ID] = &players[i] // a later row with the same id wins, as Map does
	}
	return r
}

func faceOf(p *SessionPlayer) Face {
	if p == nil {
		return Face{Level: -1}
	}
	f := Face{Level: -1, Form: p.Form}
	if p.Level != nil {
		f.Level = slices.Index(levelCodes, *p.Level)
	}
	return f
}

func sum(rows []Row) float64 {
	t := 0.0
	for _, r := range rows {
		t += r.Value
	}
	return t
}

func winnerOf(m model.Match) string {
	if m.Decision != nil && m.Decision.Kind == "completed" && m.Decision.WinningTeam != nil {
		return *m.Decision.WinningTeam
	}
	return ""
}

func ratings(ids []string, r roster) float64 {
	t := 0.0
	for _, id := range ids {
		t += sum(baseRows(faceOf(r[id])))
	}
	return t / math.Max(1, float64(len(ids)))
}

func curve(a, b float64) float64 {
	return math.Max(0.05, math.Min(0.95, 1/(1+math.Pow(10, (b-a)/2))))
}

// lastingChance is lastingChance: a finished match is read from the lasting signals only, so its Upset mark never moves later.
func lastingChance(m model.Match, r roster) Chance {
	return read(curve(ratings(m.TeamA, r), ratings(m.TeamB, r)))
}

// upsetIn is upsetIn: a completed match the Favored pair (65% or more) lost.
func upsetIn(m model.Match, r roster) bool {
	winner := winnerOf(m)
	if m.State != model.StateCompleted || winner == "" {
		return false
	}
	c := lastingChance(m, r)
	return c.Strong && c.Favored != winner
}

// tonightRows are the form rows tonight: the lasting rows, plus 0.25 x (wins - losses) tonight (+-1), plus 0.25 per Upset win and minus
// 0.25 per Upset loss tonight (+-0.5), minus 0.25 per game in a row before this match (2 at most), minus 0.5 with a handicap tonight.
// playing: the match being read is On court or Playing, so it is not one of the games before it.
func tonightRows(p *SessionPlayer, id string, matches []model.Match, r roster, playing bool) []Row {
	rows := baseRows(faceOf(p))
	wins, losses, upsetWins, upsetLosses := 0, 0, 0, 0
	for _, m := range matches {
		winner := winnerOf(m)
		if winner == "" {
			continue
		}
		side := match.CountedTeam(m, id)
		if side == "" {
			continue
		}
		if side == winner {
			wins++
		} else {
			losses++
		}
		if upsetIn(m, r) {
			if side == winner {
				upsetWins++
			} else {
				upsetLosses++
			}
		}
	}
	if tonight := clamp(0.25*float64(wins-losses), 1); tonight != 0 {
		rows = append(rows, Row{Key: "tonight", Label: "Tonight", Detail: fmt.Sprintf("%d won · %d lost", wins, losses), Value: tonight})
	}
	if upsets := clamp(0.25*float64(upsetWins)-0.25*float64(upsetLosses), 0.5); upsets != 0 {
		var parts []string
		if upsetWins > 0 {
			parts = append(parts, fmt.Sprintf("%d upset win%s", upsetWins, plural(upsetWins, "", "s")))
		}
		if upsetLosses > 0 {
			parts = append(parts, fmt.Sprintf("%d upset loss%s", upsetLosses, plural(upsetLosses, "", "es")))
		}
		rows = append(rows, Row{Key: "upsets", Label: "Upsets tonight", Detail: strings.Join(parts, " · "), Value: upsets})
	}
	streak := max(0, match.StreakOf(id, matches))
	if playing {
		streak = max(0, streak-1)
	}
	if inRow := min(2, streak); inRow > 0 {
		rows = append(rows, Row{Key: "in_row", Label: "Games in a row", Detail: fmt.Sprintf("%d before this match", streak), Value: -0.25 * float64(inRow)})
	}
	if p != nil && len(p.HandicapSpots) > 0 {
		var labels []string
		for _, s := range handicapSpots {
			if slices.Contains(p.HandicapSpots, s.code) {
				labels = append(labels, strings.ToLower(s.label))
			}
		}
		rows = append(rows, Row{Key: "handicap", Label: "Handicap tonight", Detail: strings.Join(labels, ", "), Value: -0.5})
	}
	return rows
}

func plural(n int, one, many string) string {
	if n == 1 {
		return one
	}
	return many
}

// FormRating is formRating: a player's form rating before a waiting match or a draft (Generate matches' Even game).
func FormRating(p SessionPlayer, players []SessionPlayer, matches []model.Match) float64 {
	return sum(tonightRows(&p, p.ID, matches, rosterOf(players), false))
}

// SessionBreakdown is WinChanceBreakdown: the chance, each pair's rows and ratings (by player id), and whether the Favored pair lost.
func SessionBreakdown(m model.Match, players []SessionPlayer, matches []model.Match) Breakdown {
	r := rosterOf(players)
	lasting := m.State == "completed" || m.State == "invalid"
	playing := m.State == model.StateOnCourt || m.State == model.StateActive
	team := func(ids []string) TeamBreakdown {
		out := TeamBreakdown{Players: make([]PlayerBreakdown, len(ids))}
		total := 0.0
		for i, id := range ids {
			var rows []Row
			if lasting {
				rows = baseRows(faceOf(r[id]))
			} else {
				rows = tonightRows(r[id], id, matches, r, playing)
			}
			rating := sum(rows)
			out.Players[i] = PlayerBreakdown{ID: id, Rows: rows, Rating: rating}
			total += rating
		}
		out.Average = total / math.Max(1, float64(len(ids)))
		return out
	}
	a, b := team(m.TeamA), team(m.TeamB)
	return Breakdown{Chance: read(curve(a.Average, b.Average)), TeamA: a, TeamB: b, Lasting: lasting, Upset: upsetIn(m, r)}
}

// IsUpset is isUpset: the Favored pair lost this completed match.
func IsUpset(m model.Match, players []SessionPlayer) bool { return upsetIn(m, rosterOf(players)) }
