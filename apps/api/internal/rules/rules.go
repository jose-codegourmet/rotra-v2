// Package rules is the versioned registry of the shared (bucket 1) queue rules (B-22). Each version is a
// [Ruleset], a struct of rule functions; a change adds a new function only for the rule that changed and
// a new version that reuses the rest. Services call [For] with the Queue Session's rules version and
// never a rule package directly; an unknown or retired version is an error.
package rules

import (
	"fmt"
	"sort"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courtfill"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/roster"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/winchance"
)

// Ruleset is one version of the bucket 1 rules. Times are epoch milliseconds, passed in, never read.
type Ruleset struct {
	// match: guards
	CanPlace               func(m model.Match, courtIDs []string, ctx model.Context) bool
	CanStart               func(m model.Match, courtIDs []string, ctx model.Context) bool
	CanSendBack            func(state string) bool
	CanMoveCourt           func(m model.Match, courtIDs []string, ctx model.Context) bool
	CanMovePlaying         func(m model.Match, courtIDs []string, ctx model.Context) bool
	CanReplacePlayer       func(m model.Match, outID, inID string, ctx model.Context) bool
	ReplacedLineup         func(l model.Lineup, outID, inID string) model.Lineup
	SwapTarget             func(m model.Match, ctx model.Context) *match.SwapTarget
	ValidateResult         func(in match.ResultInput) match.ResultCheck
	MatchStatus            func(m model.Match, ctx model.Context) match.Status
	CompleteLineup         func(l model.Lineup) bool
	SubstitutionCandidates func(m model.Match, roster []model.Player, matches []model.Match) []model.Player
	CourtsNeeded           func(format model.Format) int
	HoldsCourt             func(state string) bool
	TeamSizes              func() map[model.Format][2]int
	// match: game counts, waits, standings
	CountedGames      func(id string, matches []model.Match) int
	CountsFor         func(m model.Match, id string) bool
	CountedTeam       func(m model.Match, id string) string
	CreditedPlayers   func(subs []model.Substitution) []match.Credit
	SubstitutionSlots func(subs []model.Substitution) []int
	IsPartial         func(subs []model.Substitution, id string) bool
	GamesAdjustmentOf func(p *model.Player) int64
	GamesPlayed       func(p model.Player, matches []model.Match) int64
	GamesPlayedFor    func(id string, roster []model.Player, matches []model.Match) int64
	WaitMinutes       func(p model.Player, matches []model.Match, startedAt *int64, now int64) int64
	QueuedCount       func(id string, matches []model.Match) int
	ComputeStandings  func(roster []model.Player, matches []model.Match) []match.Standing
	// match: names and win chance
	MatchCategory      func(teamA, teamB []string) string
	MatchLabel         func(format model.Format, teamA, teamB []string, genderOf func(id string) string) string
	WinChanceBreakdown func(m model.Match, players []winchance.SessionPlayer, matches []model.Match) winchance.Breakdown
	FormRating         func(p winchance.SessionPlayer, players []winchance.SessionPlayer, matches []model.Match) float64
	IsUpset            func(m model.Match, players []winchance.SessionPlayer) bool
	FormFromHistory    func(sessions []winchance.SessionRecord, tonightWeekday int) winchance.Form
	// courts
	CourtOpen               func(c model.Court, now int64) bool
	OpenedEarly             func(c model.Court, now int64) bool
	FreeCourts              func(cs []model.Court, matches []model.Match, now int64) []model.Court
	IsBookingEnded          func(c model.Court, sessionEnd, now int64) bool
	SessionEndError         func(in courts.SessionEndInput, now int64) (string, bool)
	SessionEndCourtConflict func(cs []model.Court, endAt, courtBase, now int64) (string, bool)
	ExpectedFinish          func(scoring *string, minutesPlayed *int64) match.ExpectedFinish
	// roster
	InUnfinishedMatch     func(rosterID string, matches []model.Match) bool
	SlotCapacity          func(courts, playersPerCourt int64) int64
	OpenSlots             func(capacity, rosterCount int64) int64
	LevelRestrictionBlock func(restriction *roster.LevelRestriction, band string, taken roster.LevelSlots) (string, bool)
	// courtfill
	AutoFillPlacements   func(ctx model.Context, opts courtfill.FillOptions) []courtfill.Placement
	NextEligibleForCourt func(courtID string, ctx model.Context, s *model.Session) courtfill.Eligible
	NextMatchCandidates  func(courtID string, ctx model.Context, limit *float64) []courtfill.Candidate
	CourtFillModeOf      func(mode *string) string
	PutOnCourt           func(m model.Match, courtIDs []string, now int64) model.Match
}

// V1 is today's behavior, pinned by the JSON cases in packages/rule-cases/cases/v1.
func V1() Ruleset {
	return Ruleset{
		CanPlace:               match.CanPlace,
		CanStart:               match.CanStart,
		CanSendBack:            match.CanSendBack,
		CanMoveCourt:           match.CanMoveCourt,
		CanMovePlaying:         match.CanMovePlaying,
		CanReplacePlayer:       match.CanReplacePlayer,
		ReplacedLineup:         match.ReplacedLineup,
		SwapTarget:             match.Swap,
		ValidateResult:         match.ValidateResult,
		MatchStatus:            match.MatchStatus,
		CompleteLineup:         match.CompleteLineup,
		SubstitutionCandidates: match.SubstitutionCandidates,
		CourtsNeeded:           match.CourtsNeeded,
		HoldsCourt:             match.HoldsCourt,
		TeamSizes:              match.TeamSizes,
		CountedGames:           match.CountedGames,
		CountsFor:              match.CountsFor,
		CountedTeam:            match.CountedTeam,
		CreditedPlayers:        match.CreditedPlayers,
		SubstitutionSlots:      match.SubstitutionSlots,
		IsPartial:              match.IsPartial,
		GamesAdjustmentOf:      match.GamesAdjustmentOf,
		GamesPlayed:            match.GamesPlayed,
		GamesPlayedFor:         match.GamesPlayedFor,
		WaitMinutes:            match.WaitMinutes,
		QueuedCount:            match.QueuedCount,
		ComputeStandings:       match.ComputeStandings,
		MatchCategory:          match.Category,
		MatchLabel:             match.Label,
		WinChanceBreakdown:     winchance.SessionBreakdown,
		FormRating:             winchance.FormRating,
		IsUpset:                winchance.IsUpset,
		FormFromHistory:        winchance.FormFromHistory,

		CourtOpen:               courts.Open,
		OpenedEarly:             courts.OpenedEarly,
		FreeCourts:              courts.Free,
		IsBookingEnded:          courts.BookingEnded,
		SessionEndError:         courts.SessionEndError,
		SessionEndCourtConflict: courts.SessionEndCourtConflict,
		ExpectedFinish:          match.ExpectedFinishOf,

		InUnfinishedMatch:     roster.InUnfinishedMatch,
		SlotCapacity:          roster.SlotCapacity,
		OpenSlots:             roster.OpenSlots,
		LevelRestrictionBlock: roster.LevelRestrictionBlock,

		AutoFillPlacements:   courtfill.AutoFillPlacements,
		NextEligibleForCourt: courtfill.NextEligibleForCourt,
		NextMatchCandidates:  courtfill.NextMatchCandidates,
		CourtFillModeOf:      courtfill.ModeOf,
		PutOnCourt:           courtfill.PutOnCourt,
	}
}

// registry is read-only after init. Version numbers are the keys of cases/v<n>.
var registry = map[int]func() Ruleset{
	1: V1,
}

// For returns the rules of a version, or an error for an unknown or retired one.
func For(version int) (Ruleset, error) {
	build, ok := registry[version]
	if !ok {
		return Ruleset{}, fmt.Errorf("rules: unknown rules version %d", version)
	}
	return build(), nil
}

// Versions lists the live versions, lowest first.
func Versions() []int {
	out := make([]int, 0, len(registry))
	for v := range registry {
		out = append(out, v)
	}
	sort.Ints(out)
	return out
}
