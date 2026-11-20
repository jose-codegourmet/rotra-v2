// Package queuegen makes the lineups the server generates (Auto queue, Regenerate, Make match without a lineup) and checks
// the drafts Add to Main Queue sends. It is a port of packages/data/src/match/queue.rules.ts (formatForSelection, balanceTeams,
// splitTeams, generateMatches), autoQueue.rules.ts (autoQueueDraftConflict) and match-queue.ts (seededRng).
//
// These are TypeScript-only rules (bucket 3 of the rule-cases track), so they live here and not under internal/rules: they are
// not built to WebAssembly. The owner moved generation to the device later (BL-3: the device sends the lineups it made and the
// server only checks them); until then the server generates from `n`, and this is the copy of today's behaviour. The reference
// heuristic is an open decision of the business docs (Queue generation); it is ported as it is.
package queuegen

import (
	"fmt"
	"slices"
	"strings"
	"unicode/utf16"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// AutoQueueModes are the five Auto queue alternatives (AUTO_QUEUE_MODES).
var AutoQueueModes = []string{"available", "ahead", "wait", "fewest", "catchup"}

// levelCodes are the nine playing levels in display order (PLAYING_LEVELS).
var levelCodes = []string{
	"beginner_low", "beginner_mid", "beginner_high", "intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

// Session is the part of a Queue Session generation reads.
type Session struct {
	ID           string
	Mode         string // hard, fair or chill
	AllowSingles bool
	AllowDoubles bool
}

// Rng is a function that answers a number in [0, 1).
type Rng func() float64

// SeededRng is seededRng: deterministic per seed, so a recomputed suggestion for the same operation is the same. The hash walks
// UTF-16 code units and every step wraps at 32 bits, as JavaScript's Math.imul and `| 0` do.
func SeededRng(seed string) Rng {
	h := int32(-2128831035) // 2166136261 as a signed 32-bit number
	for _, unit := range utf16.Encode([]rune(seed)) {
		h = (h ^ int32(unit)) * 16777619
	}
	return func() float64 {
		h += 0x6d2b79f5
		t := (h ^ int32(uint32(h)>>15)) * (1 | h)
		t = (t + (t^int32(uint32(t)>>7))*(61|t)) ^ t
		return float64(uint32(t^int32(uint32(t)>>14))) / 4294967296
	}
}

// FormatForSelection is formatForSelection: the format a picked number of players makes, or why there is none.
func FormatForSelection(count int, allowSingles, allowDoubles bool) (*model.Format, string) {
	var format model.Format
	switch count {
	case 2:
		format = "singles"
	case 3:
		format = "fun_1v2"
	case 4:
		format = "doubles"
	case 6:
		format = "fun_3v3"
	case 8:
		format = "fun_4v4"
	case 10:
		format = "fun_5v5"
	default:
		return nil, "pick 2, 3, 4, 6, 8 or 10 players"
	}
	if format == "singles" && !allowSingles {
		return nil, "singles is off for this session"
	}
	if format == "doubles" && !allowDoubles {
		return nil, "doubles is off for this session"
	}
	return &format, ""
}

// level is the playing level index; no level counts as 4, and a level that is not in the list as -1 (indexOf), as in the TypeScript.
func level(p model.Player) int {
	if p.Level == nil || *p.Level == "" {
		return 4
	}
	return slices.Index(levelCodes, *p.Level)
}

type partition struct {
	teamA, teamB []string
	diff         int
}

// partitions are the three ways to split four players, closest levels first (the sort is stable).
func partitions(players []model.Player) []partition {
	splits := [][2][2]int{{{0, 1}, {2, 3}}, {{0, 2}, {1, 3}}, {{0, 3}, {1, 2}}}
	out := make([]partition, 0, len(splits))
	for _, split := range splits {
		side := func(idx [2]int) (ids []string, sum int) {
			ids = []string{}
			for _, i := range idx {
				if i < len(players) {
					ids = append(ids, players[i].ID)
					sum += level(players[i])
				}
			}
			return ids, sum
		}
		a, la := side(split[0])
		b, lb := side(split[1])
		diff := la - lb
		if diff < 0 {
			diff = -diff
		}
		out = append(out, partition{teamA: a, teamB: b, diff: diff})
	}
	slices.SortStableFunc(out, func(x, y partition) int { return x.diff - y.diff })
	return out
}

// BalanceTeams is balanceTeams: the teams of a picked selection, balanced by level.
func BalanceTeams(players []model.Player, format model.Format) model.Lineup {
	if format == "doubles" {
		options := partitions(players)
		if len(options) == 0 {
			return model.Lineup{Format: format, TeamA: []string{}, TeamB: []string{}}
		}
		return model.Lineup{Format: format, TeamA: options[0].teamA, TeamB: options[0].teamB}
	}
	sorted := slices.Clone(players)
	slices.SortStableFunc(sorted, func(a, b model.Player) int { return level(b) - level(a) })
	ids := make([]string, len(sorted))
	for i, p := range sorted {
		ids[i] = p.ID
	}
	if format == "singles" || format == "fun_1v2" {
		return model.Lineup{Format: format, TeamA: ids[:min(1, len(ids))], TeamB: ids[min(1, len(ids)):]}
	}
	a, b := []string{}, []string{}
	for i, id := range ids {
		if i%4 == 0 || i%4 == 3 {
			a = append(a, id)
		}
		if i%4 == 1 || i%4 == 2 {
			b = append(b, id)
		}
	}
	return model.Lineup{Format: format, TeamA: a, TeamB: b}
}

// splitTeams is splitTeams: singles take the first two, doubles the closest split, or in Chill and Fair sometimes the loosest one.
func splitTeams(mode string, players []model.Player, format model.Format, rng Rng) model.Lineup {
	if format == "singles" {
		return model.Lineup{Format: format, TeamA: ids(players[:min(1, len(players))]), TeamB: ids(players[min(1, len(players)):min(2, len(players))])}
	}
	options := partitions(players)
	easy := false
	switch mode {
	case "chill":
		easy = rng() < 0.3
	case "fair":
		easy = rng() < 0.1
	}
	option := options[0]
	if easy {
		option = options[len(options)-1]
	}
	return model.Lineup{Format: format, TeamA: option.teamA, TeamB: option.teamB}
}

func ids(players []model.Player) []string {
	out := make([]string, len(players))
	for i, p := range players {
		out[i] = p.ID
	}
	return out
}

// Generated is what generateMatches answers: the lineups, or the reason there are none.
type Generated struct {
	Matches []model.Lineup
	Error   *string
}

func refuse(text string) Generated { return Generated{Matches: []model.Lineup{}, Error: &text} }

// GenerateMatches is generateMatches: n lineups from the present players with the fewest games, waiting matches counting too (not in Hard).
func GenerateMatches(session Session, roster []model.Player, matches []model.Match, n int, rng Rng) Generated {
	var present []model.Player
	for _, p := range roster {
		if p.SessionID == session.ID && p.Present {
			present = append(present, p)
		}
	}
	var games []model.Match
	for _, m := range matches {
		if m.SessionID == session.ID {
			games = append(games, m)
		}
	}
	if !session.AllowSingles && !session.AllowDoubles {
		return refuse("Singles and doubles are both off for this session, so there is nothing to generate. Add a fun game manually instead.")
	}
	load := make(map[string]float64, len(present))
	for _, p := range present {
		queued := 0.0
		if session.Mode != "hard" {
			queued = 0.9 * float64(match.QueuedCount(p.ID, games))
		}
		load[p.ID] = float64(match.GamesPlayed(p, games)) + queued + rng()*0.4
	}
	out := []model.Lineup{}
	for i := range n {
		var format model.Format
		switch {
		case session.AllowSingles && session.AllowDoubles:
			format = "singles"
			if len(present) >= 4 && i%3 != 2 {
				format = "doubles"
			}
		case session.AllowDoubles:
			format = "doubles"
		default:
			format = "singles"
		}
		size := 2
		if format == "doubles" {
			size = 4
		}
		if len(present) < size {
			who, name := "s are", "Singles"
			if len(present) == 1 {
				who = " is"
			}
			if format == "doubles" {
				name = "Doubles"
			}
			return refuse(fmt.Sprintf("Only %d player%s present. %s needs %d. Mark arrivals present in Players.", len(present), who, name, size))
		}
		pick := slices.Clone(present)
		slices.SortStableFunc(pick, func(a, b model.Player) int {
			switch d := load[a.ID] - load[b.ID]; {
			case d < 0:
				return -1
			case d > 0:
				return 1
			}
			return 0
		})
		pick = pick[:size]
		out = append(out, splitTeams(session.Mode, pick, format, rng))
		for _, p := range pick {
			load[p.ID]++
		}
	}
	return Generated{Matches: out}
}

// PlayerFacingName is playerFacingName: the account nickname, else the first name.
func PlayerFacingName(p model.Player) string {
	if p.NicknameSnapshot != nil && *p.NicknameSnapshot != "" {
		return *p.NicknameSnapshot
	}
	if first, _, _ := strings.Cut(p.NameSnapshot, " "); first != "" {
		return first
	}
	return p.NameSnapshot
}

// QueueMasterName is queueMasterName: the club's nickname for the player, else the name players see.
func QueueMasterName(clubNickname *string, p model.Player) string {
	if clubNickname != nil {
		if trimmed := strings.TrimSpace(*clubNickname); trimmed != "" {
			return trimmed
		}
	}
	return PlayerFacingName(p)
}

// DraftConflict is autoQueueDraftConflict: why a reviewed draft no longer fits, or nil. name is queueMasterName of a roster player.
func DraftConflict(lineup model.Lineup, mode string, session Session, roster []model.Player, matches []model.Match, name func(model.Player) string) *string {
	say := func(text string) *string { return &text }
	if !match.CompleteLineup(lineup) {
		return say("Lineup is incomplete or repeats a player. Regenerate this draft.")
	}
	if lineup.Format != "singles" && lineup.Format != "doubles" {
		return say("Add a fun game manually instead.")
	}
	if (lineup.Format == "singles" && !session.AllowSingles) || (lineup.Format == "doubles" && !session.AllowDoubles) {
		if lineup.Format == "singles" {
			return say("Singles is off for this session.")
		}
		return say("Doubles is off for this session.")
	}
	for _, id := range slices.Concat(lineup.TeamA, lineup.TeamB) {
		var found *model.Player
		for i := range roster {
			if roster[i].ID == id && roster[i].SessionID == session.ID {
				found = &roster[i]
				break
			}
		}
		if found == nil || !found.Present {
			who := "A player"
			if found != nil {
				who = name(*found)
			}
			return say(who + " is not present. Restore presence or regenerate the draft.")
		}
		if mode != "ahead" && match.ActiveMatchFor(id, matches, nil) != nil {
			return say(name(*found) + " is now playing. This draft needs attention; use Plan Ahead or regenerate when they are free.")
		}
	}
	return nil
}
