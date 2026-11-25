package sessionresult

import (
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// Award thresholds of the prototype reference formula.
const (
	// MVPMinGames is the counted games MVP needs.
	MVPMinGames = 2
	// AwardMinPriorSessions is the earlier club sessions a Most Improved or Off Day entry needs.
	AwardMinPriorSessions = 5
	// MostImprovedMinDelta is the smallest rise in win rate that names Most Improved.
	MostImprovedMinDelta = 0.15
	// OffDayMaxDelta is the largest drop in win rate that lists Off Day.
	OffDayMaxDelta = -0.3
	// CalculationVersion labels the snapshot: no final formula is approved.
	CalculationVersion = "prototype-reference"

	defaultLevelIndex = 4
)

// playingLevels is PLAYING_LEVELS: the nine levels, Beginner Low = 0 to Advanced High = 8.
var playingLevels = []string{
	"beginner_low", "beginner_mid", "beginner_high",
	"intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

// StandingRow is one ordered standings row of the snapshot. Players on the same wins and losses share a position and the next one follows without a gap (1, 1, 2).
type StandingRow struct {
	Position        int    `json:"position"`
	SessionPlayerID string `json:"sessionPlayerId"`
	ClubPlayerID    string `json:"clubPlayerId"`
	Name            string `json:"name"`
	Wins            int    `json:"wins"`
	Losses          int    `json:"losses"`
	Games           int64  `json:"games"`
}

// PlayerAwardHistory is the award baseline of one club player. BaselineWinRate is nil when no full game gives one.
type PlayerAwardHistory struct {
	ClubPlayerID    string   `json:"clubPlayerId"`
	PriorSessions   int      `json:"priorSessions"`
	BaselineWinRate *float64 `json:"baselineWinRate"`
}

// AwardRow is an award line. PlayerID is nil for a guest.
type AwardRow struct {
	SessionPlayerID string  `json:"sessionPlayerId"`
	ClubPlayerID    string  `json:"clubPlayerId"`
	PlayerID        *string `json:"playerId"`
	Name            string  `json:"name"`
	Games           int     `json:"games"`
	Score           float64 `json:"score"`
}

// ImprovementRow is a Most Improved or Off Day line: tonight's win rate against the club baseline.
type ImprovementRow struct {
	AwardRow
	PriorSessions   int     `json:"priorSessions"`
	BaselineWinRate float64 `json:"baselineWinRate"`
	WinRate         float64 `json:"winRate"`
	Delta           float64 `json:"delta"`
}

// Awards is SessionAwards: MVP, Most Improved and every Off Day entry (never nil).
type Awards struct {
	MVP          *AwardRow        `json:"mvp"`
	MostImproved *ImprovementRow  `json:"mostImproved"`
	OffDay       []ImprovementRow `json:"offDay"`
}

// ClubPlayerRef is the part of a saved player the awards read: the profile a row links to.
type ClubPlayerRef struct {
	ID       string
	PlayerID *string
}

// PriorSession is a finalized earlier session of a club player (a session summary row).
type PriorSession struct {
	ClubPlayerID string
	SessionID    string
}

// PriorFact is the part of an earlier fact the baseline reads.
type PriorFact struct {
	ClubPlayerID      string
	SessionID         string
	FullParticipation bool
	Team              string
	WinningTeam       string
}

// Snapshot is SessionResultSnapshot, the private snapshot the finalization slides stage stores.
type Snapshot struct {
	SessionID          string
	Standings          []StandingRow
	Awards             Awards
	CalculationVersion string
	PriorSessionCounts map[string]int
	GeneratedAt        int64
}

// SessionStandings is sessionStandings: the live leaderboard's order and positions, plus each row's club player.
func SessionStandings(roster []model.Player, matches []model.Match) []StandingRow {
	rows := match.ComputeStandings(roster, matches)
	out := make([]StandingRow, 0, len(rows))
	for _, r := range rows {
		club := r.PlayerID
		for _, p := range roster {
			if p.ID == r.PlayerID {
				club = p.ClubPlayerID
				break
			}
		}
		out = append(out, StandingRow{
			Position: r.Position, SessionPlayerID: r.PlayerID, ClubPlayerID: club, Name: r.Name,
			Wins: r.Wins, Losses: r.Losses, Games: r.Games,
		})
	}
	return out
}

// LevelIndex is levelIndex: 0 to 8, or the Intermediate Mid index (4) for a player without a level.
func LevelIndex(level *string) int {
	if level == nil {
		return defaultLevelIndex
	}
	if i := slices.Index(playingLevels, *level); i >= 0 {
		return i
	}
	return defaultLevelIndex
}

type tallied struct {
	row  AwardRow
	wins int
}

// ComputeAwards is computeAwards. Invalid games count for no one. A partial (substituted) game counts only for the player the
// operator gave it to, for MVP and Most Improved; Off Day keeps to full games. No baseline means no Most Improved or Off Day entry.
func ComputeAwards(matches []model.Match, roster []model.Player, history []PlayerAwardHistory, players []ClubPlayerRef) Awards {
	var done []model.Match
	for _, m := range matches {
		if m.State == model.StateCompleted {
			done = append(done, m)
		}
	}
	level := func(id string) int {
		for _, p := range roster {
			if p.ID == id {
				return LevelIndex(p.Level)
			}
		}
		return defaultLevelIndex
	}
	avg := func(ids []string) float64 {
		if len(ids) == 0 {
			return defaultLevelIndex
		}
		total := 0
		for _, id := range ids {
			total += level(id)
		}
		return float64(total) / float64(len(ids))
	}
	tally := func(p model.Player, withCredit bool) tallied {
		score, games, wins := 0.0, 0, 0
		for _, m := range done {
			side := match.CountedTeam(m, p.ID)
			if side == "" || m.Decision == nil || m.Decision.WinningTeam == nil || *m.Decision.WinningTeam == "" ||
				(!withCredit && match.IsPartial(m.Substitutions, p.ID)) {
				continue
			}
			mine, opp := avg(m.TeamB), avg(m.TeamA)
			if side == "A" {
				mine, opp = opp, mine
			}
			expected := 1 / (1 + pow10((opp-mine)/2))
			won := *m.Decision.WinningTeam == side
			point := 0.0
			if won {
				point = 1
				wins++
			}
			score += point - expected
			games++
		}
		var profile *string
		for _, c := range players {
			if c.ID == p.ClubPlayerID {
				profile = c.PlayerID
				break
			}
		}
		return tallied{row: AwardRow{SessionPlayerID: p.ID, ClubPlayerID: p.ClubPlayerID, PlayerID: profile, Name: p.NameSnapshot, Games: games, Score: score}, wins: wins}
	}
	qualified := func(withCredit bool) []tallied {
		var out []tallied
		for _, p := range roster {
			if t := tally(p, withCredit); t.row.Games >= MVPMinGames {
				out = append(out, t)
			}
		}
		return out
	}
	perf, fullOnly := qualified(true), qualified(false)

	var mvp *AwardRow
	for i := range perf {
		// A stable descending sort puts the first of the highest scores first.
		if mvp == nil || perf[i].row.Score > mvp.Score {
			mvp = &perf[i].row
		}
	}
	improvement := func(rows []tallied) []ImprovementRow {
		var out []ImprovementRow
		for _, t := range rows {
			var h *PlayerAwardHistory
			for i := range history {
				if history[i].ClubPlayerID == t.row.ClubPlayerID {
					h = &history[i]
					break
				}
			}
			if h == nil || h.PriorSessions < AwardMinPriorSessions || h.BaselineWinRate == nil {
				continue
			}
			winRate := float64(t.wins) / float64(t.row.Games)
			out = append(out, ImprovementRow{AwardRow: t.row, PriorSessions: h.PriorSessions, BaselineWinRate: *h.BaselineWinRate, WinRate: winRate, Delta: winRate - *h.BaselineWinRate})
		}
		return out
	}
	var mostImproved *ImprovementRow
	for _, x := range improvement(perf) {
		if x.Delta >= MostImprovedMinDelta && (mostImproved == nil || x.Delta > mostImproved.Delta) {
			picked := x
			mostImproved = &picked
		}
	}
	offDay := []ImprovementRow{}
	for _, x := range improvement(fullOnly) {
		if x.Delta <= OffDayMaxDelta {
			offDay = append(offDay, x)
		}
	}
	slices.SortStableFunc(offDay, func(a, b ImprovementRow) int {
		switch d := a.Delta - b.Delta; {
		case d < 0:
			return -1
		case d > 0:
			return 1
		}
		return 0
	})
	return Awards{MVP: mvp, MostImproved: mostImproved, OffDay: offDay}
}

// AwardBaseline is awardBaseline: the Most Improved and Off Day baseline from a club's earlier finalized sessions. The win rate uses
// full games only, read from the facts' full participation, so a game the operator gave a substitute never enters a baseline.
func AwardBaseline(clubPlayerIDs []string, priorSessions []PriorSession, priorFacts []PriorFact) []PlayerAwardHistory {
	out := make([]PlayerAwardHistory, 0, len(clubPlayerIDs))
	for _, id := range clubPlayerIDs {
		sessions := map[string]bool{}
		for _, r := range priorSessions {
			if r.ClubPlayerID == id {
				sessions[r.SessionID] = true
			}
		}
		full, won := 0, 0
		for _, f := range priorFacts {
			if f.ClubPlayerID == id && f.FullParticipation && sessions[f.SessionID] {
				full++
				if f.Team == f.WinningTeam {
					won++
				}
			}
		}
		h := PlayerAwardHistory{ClubPlayerID: id, PriorSessions: len(sessions)}
		if full > 0 {
			rate := float64(won) / float64(full)
			h.BaselineWinRate = &rate
		}
		out = append(out, h)
	}
	return out
}

// CreateResultSnapshot is createResultSnapshot: the standings, the awards and the prior session counts of one session's roster and
// matches. Rows of another session are left out.
func CreateResultSnapshot(sessionID string, roster []model.Player, matches []model.Match, history []PlayerAwardHistory, players []ClubPlayerRef, generatedAt int64) Snapshot {
	var rs []model.Player
	for _, p := range roster {
		if p.SessionID == sessionID {
			rs = append(rs, p)
		}
	}
	var ms []model.Match
	for _, m := range matches {
		if m.SessionID == sessionID {
			ms = append(ms, m)
		}
	}
	counts := map[string]int{}
	for _, p := range rs {
		n := 0
		for _, h := range history {
			if h.ClubPlayerID == p.ClubPlayerID {
				n = h.PriorSessions
				break
			}
		}
		counts[p.ClubPlayerID] = n
	}
	return Snapshot{
		SessionID: sessionID, Standings: SessionStandings(rs, ms), Awards: ComputeAwards(ms, rs, history, players),
		CalculationVersion: CalculationVersion, PriorSessionCounts: counts, GeneratedAt: generatedAt,
	}
}
