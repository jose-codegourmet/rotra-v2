// Package courtfill holds the shared (bucket 1) rules for filling free courts: Auto Queue placements,
// the next eligible match for a court, and the next-match picker. Pure functions: no database, HTTP,
// clock or randomness; the caller applies the placements and passes `now` (epoch milliseconds).
//
// Ported from packages/data/src/match/match.rules.ts (autoFillPlacements, nextEligibleForCourt,
// nextMatchCandidates) and queue-session/courtFill.ts (courtFillModeOf, putOnCourt).
package courtfill

import (
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// ModeOf is the session's court fill mode: "manual" when not set.
func ModeOf(mode *string) string {
	if mode == nil {
		return "manual"
	}
	return *mode
}

// PutOnCourt is the match after Put on court: it holds its court(s), its players are busy, no timer.
// The input is not changed.
func PutOnCourt(m model.Match, courtIDs []string, now int64) model.Match {
	m.State = model.StateOnCourt
	m.CourtIDs = slices.Clone(courtIDs)
	if m.CourtIDs == nil {
		m.CourtIDs = []string{}
	}
	m.PlacedAt = model.Some(now)
	m.StartedAt = nil
	return m
}

// Placement is one placement Auto Queue makes: a waiting match onto one court, On court (never started).
type Placement struct {
	MatchID string `json:"matchId"`
	CourtID string `json:"courtId"`
}

// FillOptions limits an Auto Queue fill. A nil OnlyCourtIDs means every court; an empty, non-nil one
// means none (TypeScript `[]` is truthy).
type FillOptions struct {
	ExceptMatchID  *string
	OnlyCourtIDs   []string
	ExceptCourtIDs []string
}

// AutoFillPlacements: each free open court, in court order, gets the next eligible waiting match in
// queue order. It skips 5v5 (always placed by hand, on two courts). Each placement counts for the
// next one, so a player is never placed twice. The free courts are worked out once, before any
// placement. Pure: the caller applies the placements and decides whether Auto Queue is on.
func AutoFillPlacements(ctx model.Context, opts FillOptions) []Placement {
	placements := []Placement{}
	matches := ctx.Matches
	for _, court := range courts.Free(ctx.Courts, ctx.Matches, ctx.Now) {
		if opts.OnlyCourtIDs != nil && !slices.Contains(opts.OnlyCourtIDs, court.ID) {
			continue
		}
		if slices.Contains(opts.ExceptCourtIDs, court.ID) {
			continue
		}
		cur := ctx
		cur.Matches = matches
		var next *model.Match
		for _, m := range match.WaitingMatches(matches) {
			if (opts.ExceptMatchID == nil || m.ID != *opts.ExceptMatchID) &&
				match.CourtsNeeded(m.Format) == 1 && match.CanPlace(m, []string{court.ID}, cur) {
				m := m
				next = &m
				break
			}
		}
		if next == nil {
			continue
		}
		placements = append(placements, Placement{MatchID: next.ID, CourtID: court.ID})
		updated := make([]model.Match, len(matches))
		for i, m := range matches {
			if m.ID == next.ID {
				m.State, m.CourtIDs = model.StateOnCourt, []string{court.ID}
			}
			updated[i] = m
		}
		matches = updated
	}
	return placements
}

// Eligible is the next eligible match for a free open court, with the skip explanation.
type Eligible struct {
	Match                *model.Match `json:"match"`
	Skipped              *string      `json:"skipped"`
	NotEnoughFreePlayers bool         `json:"notEnoughFreePlayers"`
}

// NextEligibleForCourt is the first ready waiting match in queue order for a free open court. Given the
// session, NotEnoughFreePlayers says why the court gets no match when too few players are free; without
// it (nil) it is always false.
func NextEligibleForCourt(courtID string, ctx model.Context, session *model.Session) Eligible {
	if !slices.ContainsFunc(courts.Free(ctx.Courts, ctx.Matches, ctx.Now), func(c model.Court) bool { return c.ID == courtID }) {
		return Eligible{}
	}
	waiting := match.WaitingMatches(ctx.Matches)
	var found *model.Match
	for i := range waiting {
		if match.MatchStatus(waiting[i], ctx).Kind == "ready" {
			found = &waiting[i]
			break
		}
	}
	out := Eligible{Match: found}
	if found != nil && found.ID != waiting[0].ID {
		skipped := "Skipped #1: " + match.MatchStatus(waiting[0], ctx).Reason
		out.Skipped = &skipped
	}
	out.NotEnoughFreePlayers = found == nil && session != nil && NotEnoughFreePlayers(*session, ctx)
	return out
}

// StandardMatchSize is the players a standard match needs: doubles 4, else singles 2.
func StandardMatchSize(s model.Session) int {
	switch {
	case s.AllowDoubles:
		return 4
	case s.AllowSingles:
		return 2
	}
	return 0
}

// SmallestStandardMatchSize is the smallest standard match: singles 2 when singles is on, else doubles 4; 0 with neither.
func SmallestStandardMatchSize(s model.Session) int {
	if s.AllowSingles {
		return 2
	}
	return StandardMatchSize(s)
}

// FreePresentCount is the present players who are not busy (On court or Playing).
func FreePresentCount(ctx model.Context) int {
	n := 0
	for _, p := range ctx.Roster {
		if p.Present && match.ActiveMatchFor(p.ID, ctx.Matches, nil) == nil {
			n++
		}
	}
	return n
}

// NotEnoughFreePlayers: fewer players are free than the smallest standard match needs.
func NotEnoughFreePlayers(s model.Session, ctx model.Context) bool {
	need := SmallestStandardMatchSize(s)
	return need > 0 && FreePresentCount(ctx) < need
}

// Candidate is a waiting match ready for a court, with each player's counted games.
type Candidate struct {
	model.Match
	GamesByPlayer map[string]int `json:"gamesByPlayer"`
}

// MaxCandidates is the most matches the next-match picker lists.
const MaxCandidates = 5

// NextMatchCandidates is the next-match picker after a result: the first `limit` waiting matches, in
// Main Queue order, that are ready for the court by the same check Auto Queue uses (one court, and
// CanPlace on that court). A nil limit means 5; the limit is capped at 5 and floored at 0, and a
// fraction is cut off like Array.slice does.
func NextMatchCandidates(courtID string, ctx model.Context, limit *float64) []Candidate {
	n := float64(MaxCandidates)
	if limit != nil {
		n = *limit
	}
	n = max(0, min(n, MaxCandidates))
	out := []Candidate{}
	for _, m := range match.WaitingMatches(ctx.Matches) {
		if len(out) >= int(n) {
			break
		}
		if match.CourtsNeeded(m.Format) != 1 || !match.CanPlace(m, []string{courtID}, ctx) {
			continue
		}
		games := map[string]int{}
		for _, id := range m.AllPlayers() {
			games[id] = match.CountedGames(id, ctx.Matches)
		}
		out = append(out, Candidate{Match: m, GamesByPlayer: games})
	}
	return out
}
