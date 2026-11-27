package rules

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courtfill"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/winchance"
)

// Runner calls one rule from JSON, the way the case files and the WebAssembly build do: the case's
// `input` and optional `now` (epoch milliseconds) in, the value `expected` holds out. A rule that reads
// the clock returns an error when `now` is nil. This is the Go twin of packages/data/src/rule-cases/runners.ts.
type Runner func(input json.RawMessage, now *int64) (any, error)

// ErrNeedsNow is returned by a rule that reads the clock when the call carries no `now`.
var ErrNeedsNow = errors.New("rules: this rule reads the clock and needs `now`")

type world struct {
	Roster  []model.Player `json:"roster"`
	Matches []model.Match  `json:"matches"`
	Courts  []model.Court  `json:"courts"`
}

func (w world) context(now int64) model.Context {
	return model.Context{Roster: w.Roster, Matches: w.Matches, Courts: w.Courts, Now: now}
}

func decode(raw json.RawMessage, into any, strict bool) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	if strict {
		dec.DisallowUnknownFields()
	}
	if err := dec.Decode(into); err != nil {
		return fmt.Errorf("rules: bad input: %w", err)
	}
	return nil
}

// plain adapts a rule that does not read the clock.
func plain[I any](strict bool, fn func(I) any) Runner {
	return func(raw json.RawMessage, now *int64) (any, error) {
		var in I
		if err := decode(raw, &in, strict); err != nil {
			return nil, err
		}
		return fn(in), nil
	}
}

// clocked adapts a rule that reads the clock.
func clocked[I any](strict bool, fn func(I, int64) any) Runner {
	return func(raw json.RawMessage, now *int64) (any, error) {
		if now == nil {
			return nil, ErrNeedsNow
		}
		var in I
		if err := decode(raw, &in, strict); err != nil {
			return nil, err
		}
		return fn(in, *now), nil
	}
}

type (
	matchCourts struct {
		world
		Match    model.Match `json:"match"`
		CourtIDs []string    `json:"courtIds"`
	}
	// The TypeScript signatures take a Pick<Match, …>; the cases pass whole matches, so these decode
	// into model.Match and the rule reads the one field it needs.
	onlyMatch struct {
		Match model.Match `json:"match"`
	}
	matchID struct {
		Match model.Match `json:"match"`
		ID    string      `json:"id"`
	}
	idMatches struct {
		ID      string        `json:"id"`
		Matches []model.Match `json:"matches"`
	}
	winInput struct {
		Match   model.Match               `json:"match"`
		Players []winchance.SessionPlayer `json:"players"`
		Matches []model.Match             `json:"matches"`
	}
	endCourts struct {
		StartedAt        *int64        `json:"startedAt"`
		ScheduledStartAt int64         `json:"scheduledStartAt"`
		EndAt            *int64        `json:"endAt"`
		Courts           []model.Court `json:"courts"`
	}
)

func orNull(msg string, found bool) any {
	if !found {
		return nil
	}
	return msg
}

// Runners returns the rules of this ruleset keyed by case path ("match/canPlace"), built from the
// ruleset's own functions so a later version's changed rule is what runs. strict makes unknown input
// fields an error: the tests use it so a field the Go structs lack fails loudly instead of vanishing;
// the WebAssembly build leaves it off so the wire stays forward compatible.
func (rs Ruleset) Runners(strict bool) map[string]Runner {
	return map[string]Runner{
		"match/canPlace": clocked(strict, func(i matchCourts, now int64) any {
			return rs.CanPlace(i.Match, i.CourtIDs, i.context(now))
		}),
		"match/canStart": clocked(strict, func(i matchCourts, now int64) any {
			return rs.CanStart(i.Match, i.CourtIDs, i.context(now))
		}),
		"match/canSendBack": plain(strict, func(i onlyMatch) any { return rs.CanSendBack(i.Match.State) }),
		"match/canMoveCourt": clocked(strict, func(i matchCourts, now int64) any {
			return rs.CanMoveCourt(i.Match, i.CourtIDs, i.context(now))
		}),
		"match/canMovePlaying": clocked(strict, func(i matchCourts, now int64) any {
			return rs.CanMovePlaying(i.Match, i.CourtIDs, i.context(now))
		}),
		"match/canReplacePlayer": plain(strict, func(i struct {
			world
			Match model.Match `json:"match"`
			OutID string      `json:"outId"`
			InID  string      `json:"inId"`
		}) any {
			return rs.CanReplacePlayer(i.Match, i.OutID, i.InID, i.context(0))
		}),
		"match/replacedLineup": plain(strict, func(i struct {
			Lineup model.Match `json:"lineup"` // a lineup, or a whole match
			OutID  string      `json:"outId"`
			InID   string      `json:"inId"`
		}) any {
			return rs.ReplacedLineup(model.Lineup{Format: i.Lineup.Format, TeamA: i.Lineup.TeamA, TeamB: i.Lineup.TeamB}, i.OutID, i.InID)
		}),
		"match/swapTarget": clocked(strict, func(i struct {
			world
			Match model.Match `json:"match"`
		}, now int64) any {
			return rs.SwapTarget(i.Match, i.context(now))
		}),
		"match/validateResult": plain(strict, func(i match.ResultInput) any { return rs.ValidateResult(i) }),
		"match/matchStatus": clocked(strict, func(i struct {
			world
			Match model.Match `json:"match"`
		}, now int64) any {
			return rs.MatchStatus(i.Match, i.context(now))
		}),
		"match/completeLineup": plain(strict, func(i struct {
			Lineup model.Lineup `json:"lineup"`
		}) any {
			return rs.CompleteLineup(i.Lineup)
		}),
		"match/substitutionCandidates": plain(strict, func(i struct {
			world
			Match model.Match `json:"match"`
		}) any {
			return rs.SubstitutionCandidates(i.Match, i.Roster, i.Matches)
		}),
		"match/courtsNeeded": plain(strict, func(i onlyMatch) any {
			return rs.CourtsNeeded(i.Match.Format)
		}),
		"match/holdsCourt":        plain(strict, func(i onlyMatch) any { return rs.HoldsCourt(i.Match.State) }),
		"match/FORMAT_TEAM_SIZES": plain(strict, func(i struct{}) any { return rs.TeamSizes() }),
		"match/countedGames":      plain(strict, func(i idMatches) any { return rs.CountedGames(i.ID, i.Matches) }),
		"match/countsFor":         plain(strict, func(i matchID) any { return rs.CountsFor(i.Match, i.ID) }),
		"match/countedTeam": plain(strict, func(i matchID) any {
			team := rs.CountedTeam(i.Match, i.ID)
			return orNull(team, team != "")
		}),
		"match/creditedPlayers": plain(strict, func(i onlyMatch) any { return rs.CreditedPlayers(i.Match.Substitutions) }),
		"match/substitutionSlots": plain(strict, func(i struct {
			Substitutions []model.Substitution `json:"substitutions"`
		}) any {
			return rs.SubstitutionSlots(i.Substitutions)
		}),
		"match/isPartial": plain(strict, func(i matchID) any {
			return rs.IsPartial(i.Match.Substitutions, i.ID)
		}),
		"match/gamesAdjustmentOf": plain(strict, func(i struct {
			Player *model.Player `json:"player"`
		}) any {
			return rs.GamesAdjustmentOf(i.Player)
		}),
		"match/gamesPlayed": plain(strict, func(i struct {
			Player  model.Player  `json:"player"`
			Matches []model.Match `json:"matches"`
		}) any {
			return rs.GamesPlayed(i.Player, i.Matches)
		}),
		"match/gamesPlayedFor": plain(strict, func(i struct {
			ID      string         `json:"id"`
			Roster  []model.Player `json:"roster"`
			Matches []model.Match  `json:"matches"`
		}) any {
			return rs.GamesPlayedFor(i.ID, i.Roster, i.Matches)
		}),
		"match/waitMinutes": clocked(strict, func(i struct {
			Player    model.Player  `json:"player"`
			Matches   []model.Match `json:"matches"`
			StartedAt *int64        `json:"startedAt"`
		}, now int64) any {
			return rs.WaitMinutes(i.Player, i.Matches, i.StartedAt, now)
		}),
		"match/queuedCount": plain(strict, func(i idMatches) any { return rs.QueuedCount(i.ID, i.Matches) }),
		"match/matchCategory": plain(strict, func(i struct {
			TeamA []string `json:"teamA"`
			TeamB []string `json:"teamB"`
		}) any {
			return rs.MatchCategory(i.TeamA, i.TeamB)
		}),
		"match/matchLabel": plain(strict, func(i struct {
			Lineup model.Lineup `json:"lineup"`
			Roster []struct {
				ID     string  `json:"id"`
				Gender *string `json:"gender"`
			} `json:"roster"`
		}) any {
			gender := map[string]string{}
			for _, p := range i.Roster {
				if p.Gender != nil {
					gender[p.ID] = *p.Gender
				}
			}
			return rs.MatchLabel(i.Lineup.Format, i.Lineup.TeamA, i.Lineup.TeamB, func(id string) string { return gender[id] })
		}),
		"match/winChance": plain(strict, func(i winInput) any {
			return rs.WinChanceBreakdown(i.Match, i.Players, i.Matches).Chance
		}),
		"match/winChanceBreakdown": plain(strict, func(i winInput) any {
			return rs.WinChanceBreakdown(i.Match, i.Players, i.Matches)
		}),
		"match/formRating": plain(strict, func(i struct {
			Player  winchance.SessionPlayer   `json:"player"`
			Players []winchance.SessionPlayer `json:"players"`
			Matches []model.Match             `json:"matches"`
		}) any {
			return rs.FormRating(i.Player, i.Players, i.Matches)
		}),
		"match/isUpset": plain(strict, func(i struct {
			Match   model.Match               `json:"match"`
			Players []winchance.SessionPlayer `json:"players"`
		}) any {
			return rs.IsUpset(i.Match, i.Players)
		}),
		"match/formFromHistory": plain(strict, func(i struct {
			Sessions       []winchance.SessionRecord `json:"sessions"`
			TonightWeekday int                       `json:"tonightWeekday"`
		}) any {
			return rs.FormFromHistory(i.Sessions, i.TonightWeekday)
		}),
		"match/computeStandings": plain(strict, func(i struct {
			Roster  []model.Player `json:"roster"`
			Matches []model.Match  `json:"matches"`
		}) any {
			return rs.ComputeStandings(i.Roster, i.Matches)
		}),

		"courts/courtOpen": clocked(strict, func(i struct {
			Court model.Court `json:"court"`
		}, now int64) any {
			return rs.CourtOpen(i.Court, now)
		}),
		"courts/openedEarly": clocked(strict, func(i struct {
			Court model.Court `json:"court"`
		}, now int64) any {
			return rs.OpenedEarly(i.Court, now)
		}),
		"courts/freeCourts": clocked(strict, func(i struct {
			Courts  []model.Court `json:"courts"`
			Matches []model.Match `json:"matches"`
		}, now int64) any {
			return rs.FreeCourts(i.Courts, i.Matches, now)
		}),
		"courts/isBookingEnded": clocked(strict, func(i struct {
			Court      model.Court `json:"court"`
			SessionEnd int64       `json:"sessionEnd"`
		}, now int64) any {
			return rs.IsBookingEnded(i.Court, i.SessionEnd, now)
		}),
		"courts/sessionEndError": clocked(strict, func(i endCourts, now int64) any {
			return orNull(rs.SessionEndError(courts.SessionEndInput{
				StartedAt: i.StartedAt, ScheduledStartAt: i.ScheduledStartAt, EndAt: i.EndAt, Courts: i.Courts,
			}, now))
		}),
		"courts/sessionEndCourtConflict": clocked(strict, func(i struct {
			Courts    []model.Court `json:"courts"`
			EndAt     int64         `json:"endAt"`
			CourtBase int64         `json:"courtBase"`
		}, now int64) any {
			return orNull(rs.SessionEndCourtConflict(i.Courts, i.EndAt, i.CourtBase, now))
		}),

		"roster/inUnfinishedMatch": plain(strict, func(i struct {
			RosterID string        `json:"rosterId"`
			Matches  []model.Match `json:"matches"`
		}) any {
			return rs.InUnfinishedMatch(i.RosterID, i.Matches)
		}),
		"roster/slotCapacity": plain(strict, func(i struct {
			Courts          int64 `json:"courts"`
			PlayersPerCourt int64 `json:"playersPerCourt"`
		}) any {
			return rs.SlotCapacity(i.Courts, i.PlayersPerCourt)
		}),
		"roster/openSlots": plain(strict, func(i struct {
			Capacity    int64 `json:"capacity"`
			RosterCount int64 `json:"rosterCount"`
		}) any {
			return rs.OpenSlots(i.Capacity, i.RosterCount)
		}),

		"courtfill/autoFillPlacements": clocked(strict, func(i struct {
			world
			ExceptMatchID  *string  `json:"exceptMatchId"`
			OnlyCourtIDs   []string `json:"onlyCourtIds"`
			ExceptCourtIDs []string `json:"exceptCourtIds"`
		}, now int64) any {
			return rs.AutoFillPlacements(i.context(now), courtfill.FillOptions{
				ExceptMatchID: i.ExceptMatchID, OnlyCourtIDs: i.OnlyCourtIDs, ExceptCourtIDs: i.ExceptCourtIDs,
			})
		}),
		"courtfill/nextEligibleForCourt": clocked(strict, func(i struct {
			world
			CourtID string         `json:"courtId"`
			Session *model.Session `json:"session"`
		}, now int64) any {
			return rs.NextEligibleForCourt(i.CourtID, i.context(now), i.Session)
		}),
		"courtfill/nextMatchCandidates": clocked(strict, func(i struct {
			world
			CourtID string   `json:"courtId"`
			Limit   *float64 `json:"limit"`
		}, now int64) any {
			return rs.NextMatchCandidates(i.CourtID, i.context(now), i.Limit)
		}),
		"courtfill/courtFillModeOf": plain(strict, func(i struct {
			Session struct {
				CourtFillMode *string `json:"courtFillMode"`
			} `json:"session"`
		}) any {
			return rs.CourtFillModeOf(i.Session.CourtFillMode)
		}),
		"courtfill/putOnCourt": clocked(strict, func(i struct {
			Match    model.Match `json:"match"`
			CourtIDs []string    `json:"courtIds"`
		}, now int64) any {
			return rs.PutOnCourt(i.Match, i.CourtIDs, now)
		}),
	}
}
