package player

import (
	"math"
	"time"
)

// WindowDays is WINDOW_DAYS: the rolling window of the skill rank. Leaderboards use calendar periods.
const WindowDays = 90

const dayMS = int64(24 * time.Hour / time.Millisecond)

// Game is a game of a finished session as the rank window reads it.
type Game struct {
	// Format is singles, doubles, or a fun format; Counting is counted, fun or partial; Result is won or lost.
	Format, Counting, Result string
}

// Session is a finished session. FinishedAt is an ISO instant; a missing or unreadable one is never inside a window
// (Date.parse gives NaN, which no comparison accepts).
type Session struct {
	FinishedAt string
	Games      []Game
}

// instant is Date.parse of an ISO 8601 instant, in milliseconds.
func instant(s string) (int64, bool) {
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return 0, false
	}
	return t.UnixMilli(), true
}

// inWindow is `at >= start && at <= end` for a window of days ending at nowMS: both ends are inside.
func inWindow(finishedAt string, nowMS int64, days int) bool {
	at, ok := instant(finishedAt)
	return ok && at >= nowMS-int64(days)*dayMS && at <= nowMS
}

// CountRecentStandardMatches is countRecentStandardMatches: the counted singles and doubles games that finished inside the
// window ending at nowMS. Fun and partial games never count, and neither does a session in the future.
func CountRecentStandardMatches(sessions []Session, nowMS int64, windowDays int) int {
	n := 0
	for _, s := range sessions {
		if !inWindow(s.FinishedAt, nowMS, windowDays) {
			continue
		}
		for _, g := range s.Games {
			if g.Counting == "counted" && (g.Format == "singles" || g.Format == "doubles") {
				n++
			}
		}
	}
	return n
}

// Rank states and display statuses.
const (
	StateNeedsReassessment = "needs_reassessment"

	StatusNotCalculated     = "not-calculated"
	StatusNeedsReassessment = "needs-reassessment"
	StatusUpdating          = "updating"
	StatusOnLeaderboard     = "on-leaderboard"
	StatusQualifies         = "qualifies"
	StatusProvisional       = "provisional"
)

// RankInput is what rankDisplayStatus reads. A nil Level or Position is null.
type RankInput struct {
	Level         *int
	State         string
	UpdatePending bool
	Position      *int
	RecentCount   int
	// MatchRequirement is the leaderboard requirement (the ranking settings' recent standard match threshold).
	MatchRequirement int
}

// RankDisplayStatus is rankDisplayStatus. A missing level is never a beginner; reassessment takes precedence; a place on
// the leaderboard reads updating while an update is pending; enough recent matches qualify; anything else is provisional.
func RankDisplayStatus(in RankInput) string {
	switch {
	case in.Level == nil:
		return StatusNotCalculated
	case in.State == StateNeedsReassessment:
		return StatusNeedsReassessment
	case in.Position != nil && in.UpdatePending:
		return StatusUpdating
	case in.Position != nil:
		return StatusOnLeaderboard
	case in.RecentCount >= in.MatchRequirement:
		return StatusQualifies
	}
	return StatusProvisional
}

// StatGame is a game of the stats window: only the result matters.
type StatGame struct{ Result string }

// StatSession is a session of the stats window.
type StatSession struct {
	FinishedAt string
	Games      []StatGame
}

// GameStats is RecentGameStats: games, wins, losses and the win rate in whole percent.
type GameStats struct{ Games, Wins, Losses, WinRate int }

// RecentGameStats is recentGameStats: every game of the sessions that finished inside the window ending at nowMS, or nil
// when there is none ("No games yet"). The rate is rounded half up, as Math.round does.
func RecentGameStats(sessions []StatSession, nowMS int64, windowDays int) *GameStats {
	games, wins := 0, 0
	for _, s := range sessions {
		if !inWindow(s.FinishedAt, nowMS, windowDays) {
			continue
		}
		for _, g := range s.Games {
			games++
			if g.Result == "won" {
				wins++
			}
		}
	}
	if games == 0 {
		return nil
	}
	return &GameStats{Games: games, Wins: wins, Losses: games - wins, WinRate: int(math.Floor(float64(wins)/float64(games)*100 + 0.5))}
}
