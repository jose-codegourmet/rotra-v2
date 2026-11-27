// Package winchance is Win chance (D-2026-11-27-02 and -03; packages/data/src/match/winChance.rules.ts and
// player/gameWinChance.rules.ts): each pair's chance to win a match. Each player gets a form rating in level steps; a team is the average
// of its players; win chance = 1 / (1 + 10^((opponents - own team) / 2)), kept between 5% and 95%. A finished game is read from the
// lasting signals only (level, club win rate, best day, leaderboard place and direction), so an Upset mark never moves later.
//
// This file is the lasting part: what the Player app shows on a finished game. Tonight's signals and the handicap (the Queue Master's
// console and Generate matches' Even game) are in session.go.
package winchance

import "math"

// midLevel is the rating of a player with no level (or one who left the roster): a mid level.
const midLevel = 4

// Form is a player's lasting signals at a club (PlayerForm): the win rate over decided games (nil under 10), whether tonight is their best
// weekday, and the leaderboard place and direction (-1, 0 or 1; 0 until rank calculation is real).
type Form struct {
	ClubWinRate *float64 `json:"clubWinRate"`
	BestDay     bool     `json:"bestDay"`
	Place       int      `json:"place"`
	Trend       int      `json:"trend"`
}

// Face is one person on a side: their level in that game (the index in the nine levels, -1 for none) and, with a club record, their form.
type Face struct {
	Level int
	Form  *Form
}

// Chance is WinChance: team A's percent and team B's (they add up to 100), the stronger pair (or "" for an even game, 45% to 55%) and
// whether it is Favored (65% or more).
type Chance struct {
	A, B    int
	Favored string
	Strong  bool
}

func clamp(n, limit float64) float64 { return math.Max(-limit, math.Min(limit, n)) }

// jsRound is Math.round: halves go up.
func jsRound(f float64) float64 { return math.Floor(f + 0.5) }

// BaseRating is baseRating: level, club win rate (no record counts as 50%), best day, and club leaderboard place and direction.
func BaseRating(f Face) float64 {
	level := float64(midLevel)
	if f.Level >= 0 && f.Level <= 8 {
		level = float64(f.Level)
	}
	sum := level
	if f.Form == nil {
		return sum
	}
	if f.Form.ClubWinRate != nil {
		sum += clamp((*f.Form.ClubWinRate-0.5)*2, 1)
	}
	if f.Form.BestDay {
		sum += 0.25
	}
	if f.Form.Place != 0 {
		sum += 0.25 * float64(f.Form.Place)
	}
	if f.Form.Trend != 0 {
		sum += 0.25 * float64(f.Form.Trend)
	}
	return sum
}

func average(faces []Face) float64 {
	sum := 0.0
	for _, f := range faces {
		sum += BaseRating(f)
	}
	return sum / math.Max(1, float64(len(faces)))
}

// read is read(): the whole-number percents and who is Favored.
func read(chanceA float64) Chance {
	top := jsRound(math.Max(chanceA, 1-chanceA) * 100)
	a := jsRound(chanceA * 100)
	c := Chance{A: int(a), B: 100 - int(a), Strong: top >= 65}
	switch {
	case top <= 55:
	case chanceA > 0.5:
		c.Favored = "A"
	default:
		c.Favored = "B"
	}
	return c
}

// Lasting is lastingChance: each pair's chance from the lasting signals only.
func Lasting(left, right []Face) Chance {
	a, b := average(left), average(right)
	chance := 1 / (1 + math.Pow(10, (b-a)/2))
	return read(math.Max(0.05, math.Min(0.95, chance)))
}

// Game is what a drawn game court carries: the chance (the left side is A) and whether the Favored pair lost.
type Game struct {
	Chance Chance
	Upset  bool
}

// OfGame is gameWinChanceFields: nil without two sides. leftWon says whether the left side won the game; the Favored pair (65% or more)
// losing it is an Upset.
func OfGame(left, right []Face, leftWon bool) *Game {
	if len(left) == 0 || len(right) == 0 {
		return nil
	}
	chance := Lasting(left, right)
	winner := "B"
	if leftWon {
		winner = "A"
	}
	return &Game{Chance: chance, Upset: chance.Strong && chance.Favored != winner}
}

// SessionRecord is one finalized session of a player at a club: its weekday (Sunday 0, Manila time) and the player's wins and losses in it.
type SessionRecord struct {
	Weekday int `json:"weekday"`
	Wins    int `json:"wins"`
	Losses  int `json:"losses"`
}

// FormFromHistory is formFromHistory: a player's lasting signals from their finalized sessions at this club. Win rate needs 10 decided
// games; the best day is the weekday with the highest win rate and at least 3 games. Leaderboard place and direction stay 0.
func FormFromHistory(sessions []SessionRecord, tonightWeekday int) Form {
	var days [7]struct{ wins, losses int }
	wins, losses := 0, 0
	for _, s := range sessions {
		wins += s.Wins
		losses += s.Losses
		if s.Weekday >= 0 && s.Weekday < 7 {
			days[s.Weekday].wins += s.Wins
			days[s.Weekday].losses += s.Losses
		}
	}
	best, bestRate := -1, -1.0
	for i, d := range days {
		if n := d.wins + d.losses; n >= 3 && float64(d.wins)/float64(n) > bestRate {
			best, bestRate = i, float64(d.wins)/float64(n)
		}
	}
	form := Form{BestDay: best == tonightWeekday}
	if games := wins + losses; games >= 10 {
		rate := float64(wins) / float64(games)
		form.ClubWinRate = &rate
	}
	return form
}
