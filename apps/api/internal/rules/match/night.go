package match

import (
	"math"
	"slices"
	"sort"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// startOf is startOf in matchMaking.rules.ts: when the match started, else when it was placed, else 0.
func startOf(m model.Match) int64 {
	if m.StartedAt != nil {
		return *m.StartedAt
	}
	if v, ok := m.PlacedAt.Value(); ok {
		return v
	}
	return 0
}

// NightGames is nightGames: a player's games tonight in start order: completed, On court and Playing (invalid never counts).
func NightGames(id string, matches []model.Match) []model.Match {
	var out []model.Match
	for _, m := range matches {
		switch m.State {
		case model.StateCompleted, model.StateOnCourt, model.StateActive:
			if slices.Contains(m.AllPlayers(), id) {
				out = append(out, m)
			}
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return startOf(out[i]) < startOf(out[j]) })
	return out
}

// StreakOf is streakOf: games in a row. The player's latest games with no started match in between that they sat out. A match that
// started after one of their games ended and before the next began, without them, resets the streak. On court and Playing games count
// (they have not ended).
func StreakOf(id string, matches []model.Match) int {
	games := NightGames(id, matches)
	n, to := 0, math.Inf(1)
	for i := len(games) - 1; i >= 0; i-- {
		g := games[i]
		from := math.Inf(1)
		if g.State == model.StateCompleted {
			if g.EndedAt != nil {
				from = float64(*g.EndedAt)
			} else {
				from = float64(startOf(g))
			}
		}
		for _, m := range matches {
			if m.StartedAt != nil && float64(*m.StartedAt) > from && float64(*m.StartedAt) < to && !slices.Contains(m.AllPlayers(), id) {
				return n
			}
		}
		n++
		to = float64(startOf(g))
	}
	return n
}
