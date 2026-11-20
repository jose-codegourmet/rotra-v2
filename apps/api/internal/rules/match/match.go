// Package match holds the shared (bucket 1) rules about a match: lineups, guards (can it be placed,
// started, moved), results, counted games, waiting time and standings. Pure functions: no database,
// HTTP or clock; the caller passes the data and `now` (epoch milliseconds).
//
// Ported from packages/data/src/match/match.rules.ts. Behavior is the TypeScript behavior; the JSON
// cases in packages/rule-cases/cases/v1/match pin it.
package match

import (
	"encoding/json"
	"fmt"
	"math"
	"slices"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/collate"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// TeamSizes is the number of players on teams A and B for each format.
func TeamSizes() map[model.Format][2]int {
	return map[model.Format][2]int{
		"singles": {1, 1},
		"doubles": {2, 2},
		"fun_1v2": {1, 2},
		"fun_3v3": {3, 3},
		"fun_4v4": {4, 4},
		"fun_5v5": {5, 5},
	}
}

// CourtsNeeded is how many courts a match holds: two for a 5v5 fun match, one for every other format.
func CourtsNeeded(format model.Format) int {
	if format == "fun_5v5" {
		return 2
	}
	return 1
}

// HoldsCourt: On court (placed, not started) and Playing matches hold their courts; their players are busy.
func HoldsCourt(state string) bool {
	return state == model.StateOnCourt || state == model.StateActive
}

// ActiveMatchFor is the On court or Playing match a player is busy in, ignoring exceptID (an On court
// match rechecking its own players before Start match). Nil when none.
func ActiveMatchFor(id string, matches []model.Match, exceptID *string) *model.Match {
	for i := range matches {
		m := &matches[i]
		if exceptID != nil && m.ID == *exceptID {
			continue
		}
		if m.HoldsCourt() && slices.Contains(m.AllPlayers(), id) {
			return m
		}
	}
	return nil
}

// QueuedCount is how many waiting matches a player is in.
func QueuedCount(id string, matches []model.Match) int {
	n := 0
	for _, m := range matches {
		if m.State == model.StateWaiting && slices.Contains(m.AllPlayers(), id) {
			n++
		}
	}
	return n
}

func lineupPlayers(l model.Lineup) []string {
	out := make([]string, 0, len(l.TeamA)+len(l.TeamB))
	return append(append(out, l.TeamA...), l.TeamB...)
}

// CompleteLineup: both teams have the format's size and nobody is named twice.
func CompleteLineup(l model.Lineup) bool {
	sizes, ok := TeamSizes()[l.Format]
	if !ok {
		return false
	}
	all := lineupPlayers(l)
	seen := make(map[string]struct{}, len(all))
	for _, id := range all {
		seen[id] = struct{}{}
	}
	return len(l.TeamA) == sizes[0] && len(l.TeamB) == sizes[1] && len(seen) == len(all)
}

// Status is what the queue shows for a waiting or placed match.
type Status struct {
	Kind   string `json:"kind"` // ready | needs-attention | blocked | waiting-for-courts
	Reason string `json:"reason"`
}

func shortName(p model.Player) string {
	if p.NicknameSnapshot != nil && *p.NicknameSnapshot != "" {
		return *p.NicknameSnapshot
	}
	first, _, _ := strings.Cut(p.NameSnapshot, " ")
	if first != "" {
		return first
	}
	return p.NameSnapshot
}

func listNames(names []string) string {
	if len(names) < 3 {
		return strings.Join(names, " and ")
	}
	return strings.Join(names[:len(names)-1], ", ") + " and " + names[len(names)-1]
}

func findPlayer(roster []model.Player, id string) *model.Player {
	for i := range roster {
		if roster[i].ID == id {
			return &roster[i]
		}
	}
	return nil
}

func courtNames(m model.Match, all []model.Court) string {
	names := make([]string, len(m.CourtIDs))
	for i, id := range m.CourtIDs {
		names[i] = "Court"
		for _, c := range all {
			if c.ID == id {
				names[i] = c.Label
				break
			}
		}
	}
	return strings.Join(names, " + ")
}

func isAre(n int) string {
	if n == 1 {
		return "is"
	}
	return "are"
}

// MatchStatus says whether a match is ready, and if not why. (TypeScript matchStatus.)
func MatchStatus(m model.Match, ctx model.Context) Status {
	lineup := model.Lineup{Format: m.Format, TeamA: m.TeamA, TeamB: m.TeamB}
	if !CompleteLineup(lineup) {
		return Status{"needs-attention", "Lineup is incomplete"}
	}
	names := func(ids []string) string {
		out := make([]string, len(ids))
		for i, id := range ids {
			out[i] = "Player"
			if p := findPlayer(ctx.Roster, id); p != nil {
				out[i] = shortName(*p)
			}
		}
		return listNames(out)
	}
	var absent []string
	for _, id := range m.AllPlayers() {
		if p := findPlayer(ctx.Roster, id); p == nil || !p.Present {
			absent = append(absent, id)
		}
	}
	if len(absent) > 0 {
		return Status{"needs-attention", fmt.Sprintf("%s %s not present", names(absent), isAre(len(absent)))}
	}
	// An On court match already holds its court(s): only its players' presence and busy state count.
	var except *string
	placed := m.State == model.StateOnCourt
	if placed {
		except = &m.ID
	}
	var busy []string
	for _, id := range m.AllPlayers() {
		if ActiveMatchFor(id, ctx.Matches, except) != nil {
			busy = append(busy, id)
		}
	}
	if len(busy) > 0 {
		game := ActiveMatchFor(busy[0], ctx.Matches, except)
		where := "playing on"
		if game.State == model.StateOnCourt {
			where = "on"
		}
		return Status{"blocked", fmt.Sprintf("%s %s %s %s", names(busy), isAre(len(busy)), where, courtNames(*game, ctx.Courts))}
	}
	if placed {
		return Status{"ready", "Ready to start"}
	}
	if len(courts.Free(ctx.Courts, ctx.Matches, ctx.Now)) < CourtsNeeded(m.Format) {
		reason := "Waiting for a free court"
		if CourtsNeeded(m.Format) == 2 {
			reason = "Needs two free courts"
		}
		return Status{"waiting-for-courts", reason}
	}
	return Status{"ready", "Ready to start"}
}

// WaitingMatches are the waiting matches in queue order (stable for equal positions).
func WaitingMatches(matches []model.Match) []model.Match {
	out := []model.Match{}
	for _, m := range matches {
		if m.State == model.StateWaiting {
			out = append(out, m)
		}
	}
	slices.SortStableFunc(out, func(a, b model.Match) int { return cmpInt(a.QueuePosition, b.QueuePosition) })
	return out
}

func cmpInt(a, b int64) int {
	switch {
	case a < b:
		return -1
	case a > b:
		return 1
	}
	return 0
}

func distinct(ids []string) bool {
	seen := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		seen[id] = struct{}{}
	}
	return len(seen) == len(ids)
}

func isFree(free []model.Court, id string) bool {
	return slices.ContainsFunc(free, func(c model.Court) bool { return c.ID == id })
}

// CanPlace (Put on court): a ready waiting match on the right number of distinct, free, open courts.
func CanPlace(m model.Match, courtIDs []string, ctx model.Context) bool {
	if m.State != model.StateWaiting || MatchStatus(m, ctx).Kind != "ready" ||
		len(courtIDs) != CourtsNeeded(m.Format) || !distinct(courtIDs) {
		return false
	}
	free := courts.Free(ctx.Courts, ctx.Matches, ctx.Now)
	for _, id := range courtIDs {
		if !isFree(free, id) {
			return false
		}
	}
	return true
}

// CanStart (Start match). From On court: no court choice (empty courtIDs, or exactly the held
// courts); rechecks lineup, presence and busy players, and that each held court is still open and
// held by no other match. From waiting: the older one-step start, same checks as [CanPlace].
func CanStart(m model.Match, courtIDs []string, ctx model.Context) bool {
	if m.State == model.StateWaiting {
		return CanPlace(m, courtIDs, ctx)
	}
	if m.State != model.StateOnCourt {
		return false
	}
	held := map[string]struct{}{}
	for _, id := range m.CourtIDs {
		held[id] = struct{}{}
	}
	if len(courtIDs) > 0 {
		if len(courtIDs) != len(held) {
			return false
		}
		for _, id := range courtIDs {
			if _, ok := held[id]; !ok {
				return false
			}
		}
	}
	if MatchStatus(m, ctx).Kind != "ready" || len(held) != len(m.CourtIDs) || len(m.CourtIDs) != CourtsNeeded(m.Format) {
		return false
	}
	for _, id := range m.CourtIDs {
		var court *model.Court
		for i := range ctx.Courts {
			if ctx.Courts[i].ID == id {
				court = &ctx.Courts[i]
				break
			}
		}
		if court == nil || court.Removed() || !courts.Open(*court, ctx.Now) {
			return false
		}
		for _, o := range ctx.Matches {
			if o.ID != m.ID && o.HoldsCourt() && slices.Contains(o.CourtIDs, id) {
				return false
			}
		}
	}
	return true
}

// CanSendBack: any On court match can go back to the queue.
func CanSendBack(state string) bool { return state == model.StateOnCourt }

// CanMoveCourt (Move to another court): an On court match onto the right number of distinct, free,
// open courts. Its own courts are held by itself, so they never count as free.
func CanMoveCourt(m model.Match, courtIDs []string, ctx model.Context) bool {
	if m.State != model.StateOnCourt || len(courtIDs) != CourtsNeeded(m.Format) || !distinct(courtIDs) {
		return false
	}
	free := courts.Free(ctx.Courts, ctx.Matches, ctx.Now)
	for _, id := range courtIDs {
		if !isFree(free, id) {
			return false
		}
	}
	return true
}

// SubstitutionCandidates are the roster rows that could replace a player: same session, present, not
// in this match and not busy elsewhere (On court or Playing).
func SubstitutionCandidates(m model.Match, roster []model.Player, matches []model.Match) []model.Player {
	out := []model.Player{}
	all := m.AllPlayers()
	for _, p := range roster {
		if p.SessionID == m.SessionID && p.Present && !slices.Contains(all, p.ID) && ActiveMatchFor(p.ID, matches, nil) == nil {
			out = append(out, p)
		}
	}
	return out
}

// CanReplacePlayer: On court (a lineup change) or Playing (fixes a mistake) match, an outgoing player
// who is in it, and an incoming player who is a substitution candidate.
func CanReplacePlayer(m model.Match, outID, inID string, ctx model.Context) bool {
	if m.State != model.StateOnCourt && m.State != model.StateActive {
		return false
	}
	if !slices.Contains(m.AllPlayers(), outID) {
		return false
	}
	return slices.ContainsFunc(SubstitutionCandidates(m, ctx.Roster, ctx.Matches), func(p model.Player) bool { return p.ID == inID })
}

// ReplacedLineup is the lineup after Replace player: the incoming player takes the outgoing player's slot.
func ReplacedLineup(l model.Lineup, outID, inID string) model.Lineup {
	swap := func(ids []string) []string {
		out := make([]string, len(ids))
		for i, id := range ids {
			out[i] = id
			if id == outID {
				out[i] = inID
			}
		}
		return out
	}
	return model.Lineup{Format: l.Format, TeamA: swap(l.TeamA), TeamB: swap(l.TeamB)}
}

// SwapTarget is the waiting match an On court match can swap with, and its 1-based queue position.
type SwapTarget struct {
	Match    model.Match `json:"match"`
	Position int         `json:"position"`
}

// Swap with the queue (court card menu): the first waiting match in queue order that needs the same
// number of courts and could be put on this match's court(s) once this match's players count as free.
// Nil when the match is not On court or no other waiting match is ready.
func Swap(m model.Match, ctx model.Context) *SwapTarget {
	if m.State != model.StateOnCourt {
		return nil
	}
	// This match off the court: its court(s) free up and its players are no longer busy.
	freed := ctx
	freed.Matches = make([]model.Match, len(ctx.Matches))
	for i, x := range ctx.Matches {
		if x.ID == m.ID {
			x.State, x.CourtIDs = model.StateWaiting, []string{}
		}
		freed.Matches[i] = x
	}
	for i, x := range WaitingMatches(ctx.Matches) {
		if x.ID != m.ID && CourtsNeeded(x.Format) == CourtsNeeded(m.Format) && CanPlace(x, m.CourtIDs, freed) {
			return &SwapTarget{Match: x, Position: i + 1}
		}
	}
	return nil
}

// ScoringMode is one row of the scoring table (@rotra/schema/scoring SCORING): the points that win
// a game, one game or best of 3, and whether target − 1 all goes to deuce (first to lead by 2, no cap).
type ScoringMode struct {
	Target int
	Games  int
	Deuce  bool
}

// Scoring is the scoring table by stored key. Labels and texts live with the UI copy in TypeScript.
var Scoring = map[string]ScoringMode{
	"31":     {Target: 31, Games: 1, Deuce: true},
	"31nd":   {Target: 31, Games: 1, Deuce: false},
	"21":     {Target: 21, Games: 1, Deuce: true},
	"21x3":   {Target: 21, Games: 3, Deuce: true},
	"21x3nd": {Target: 21, Games: 3, Deuce: false},
}

// DefaultScoring is 16/31: what a session with no (or an unknown) scoring mode reads as.
const DefaultScoring = "31"

// ScoringOf is the session's scoring mode: the stored key, or 16/31 when it is missing or unknown.
func ScoringOf(key *string) ScoringMode {
	if key != nil {
		if m, ok := Scoring[*key]; ok {
			return m
		}
	}
	return Scoring[DefaultScoring]
}

// GameInput is one best-of-3 game score as entered. Nil means empty (null or missing).
type GameInput struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// ResultInput is a result as the Queue Master entered it. Nil means empty (null or missing).
type ResultInput struct {
	// Scoring is the session's scoring mode key; missing or unknown reads as 16/31.
	Scoring *string  `json:"scoring"`
	Winner  *string  `json:"winner"`
	ScoreA  *float64 `json:"scoreA"`
	ScoreB  *float64 `json:"scoreB"`
	// Games is every game played, best of 3 only. ScoreA/ScoreB are then derived and not read.
	Games []GameInput `json:"games"`
}

// ResultCheck is the outcome of [ValidateResult]: a winner, or an error message (one of the two is nil).
type ResultCheck struct {
	Winner *string `json:"winner"`
	Error  *string `json:"error"`
}

func isWholeNumber(f float64) bool { return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) }

// isWhole is `typeof n === 'number' && Number.isInteger(n) && n >= 0`.
func isWhole(f *float64) bool { return f != nil && isWholeNumber(*f) && *f >= 0 }

func losingScoreMax(m ScoringMode) int {
	if m.Deuce {
		return m.Target - 2
	}
	return m.Target - 1
}

// The refusal copy, exactly as @rotra/schema/scoring words it.
const (
	pickWinnerError      = "Pick the winner."
	everyGameScoreError  = "Enter a score for every game played, or clear them all."
	undecidedGamesError  = "Pick who won each game. One pair must win 2 games to decide the match."
	oneGameOnlyError     = "This scoring mode has one game. Enter one score, not game scores."
	scoreDisagreesFormat = "The score says Team %s won, but Team %s is picked. Fix one of them."
	gamesDisagreeFormat  = "The games say Team %s won, but Team %s is picked. Fix one of them."
)

// gameScoreError is the stored-score reading of gameScoreError in @rotra/schema/scoring: a side
// above the target reads as a deuce entry, anything else as the single losing-score box. game is
// the 0-based best-of-3 row, or -1 for a one-game result. Empty string means the score is valid.
func gameScoreError(m ScoringMode, winner string, a, b *float64, game int) string {
	T := m.Target
	row := game >= 0
	pre := ""
	if row {
		pre = fmt.Sprintf("Game %d: ", game+1)
	}
	rangeErr := fmt.Sprintf("%sEnter the losing score as a whole number from 0 to %d.", pre, losingScoreMax(m))
	leadErr := fmt.Sprintf("%sA deuce game ends when one pair leads by 2, like %d–%d.", pre, T+1, T-1)
	if !isWhole(a) || !isWhole(b) {
		return rangeErr
	}
	av, bv := int(*a), int(*b)
	by := "B"
	if av > bv {
		by = "A"
	}
	if m.Deuce && max(av, bv) > T {
		// Two typed boxes: the game must end with one pair above the target, 2 ahead.
		if av-bv != 2 && bv-av != 2 {
			return leadErr
		}
		if by != winner {
			return pre + fmt.Sprintf(scoreDisagreesFormat, by, winner)
		}
		return ""
	}
	// The single box: the winner's side is the target, the loser's side is the typed score.
	if av != bv {
		if by != winner {
			return pre + fmt.Sprintf(scoreDisagreesFormat, by, winner)
		}
	} else if m.Deuce && av >= T-1 {
		return leadErr
	}
	won, lost := av, bv
	if winner == "B" {
		won, lost = bv, av
	}
	if won != T {
		return rangeErr
	}
	if lost > losingScoreMax(m) {
		if m.Deuce && lost == T-1 {
			sw := "Went to deuce"
			if row {
				sw = "Deuce for this game"
			}
			return fmt.Sprintf("%sAt %d–%d the game goes to deuce. Turn on %s and type both scores.", pre, T-1, T-1, sw)
		}
		return rangeErr
	}
	return ""
}

// ValidateResult is the scoring mode's result check (Q22). A winner-only result is valid in every
// mode. One game: the winner must be picked and a score, if any, is one the mode can produce with
// that winner. Best of 3: game scores, if any, are two games won by one pair or a split and a third,
// each valid, agreeing with a picked winner (the games decide the winner when none is picked).
func ValidateResult(in ResultInput) ResultCheck {
	fail := func(msg string) ResultCheck { return ResultCheck{Error: &msg} }
	win := func(team string) ResultCheck { return ResultCheck{Winner: &team} }
	m := ScoringOf(in.Scoring)
	winner := ""
	if in.Winner != nil && (*in.Winner == "A" || *in.Winner == "B") {
		winner = *in.Winner
	}
	if m.Games == 1 {
		if len(in.Games) > 0 {
			return fail(oneGameOnlyError)
		}
		if winner == "" {
			return fail(pickWinnerError)
		}
		if in.ScoreA == nil && in.ScoreB == nil {
			return win(winner)
		}
		if msg := gameScoreError(m, winner, in.ScoreA, in.ScoreB, -1); msg != "" {
			return fail(msg)
		}
		return win(winner)
	}
	if len(in.Games) == 0 {
		if in.ScoreA != nil || in.ScoreB != nil {
			return fail(everyGameScoreError)
		}
		if winner == "" {
			return fail(pickWinnerError)
		}
		return win(winner)
	}
	for _, g := range in.Games {
		if g.A == nil || g.B == nil {
			return fail(everyGameScoreError)
		}
	}
	// A game nobody won (a tie, or not whole numbers) cannot be counted: its row says why.
	for i, g := range in.Games {
		if isWhole(g.A) && isWhole(g.B) && *g.A != *g.B {
			continue
		}
		if msg := gameScoreError(m, "A", g.A, g.B, i); msg != "" {
			return fail(msg)
		}
		return fail(undecidedGamesError)
	}
	winsOf := func(games []GameInput) (a, b int) {
		for _, g := range games {
			if *g.A > *g.B {
				a++
			} else if *g.B > *g.A {
				b++
			}
		}
		return a, b
	}
	decidedOf := func(a, b int) string {
		switch {
		case a >= 2:
			return "A"
		case b >= 2:
			return "B"
		}
		return ""
	}
	decided := decidedOf(winsOf(in.Games))
	firstTwo := decidedOf(winsOf(in.Games[:min(2, len(in.Games))]))
	// Two games won by one pair, or a 1–1 split and a third: nothing after the match is decided.
	if len(in.Games) > 3 || decided == "" || (len(in.Games) == 3 && firstTwo != "") {
		return fail(undecidedGamesError)
	}
	if winner != "" && winner != decided {
		return fail(fmt.Sprintf(gamesDisagreeFormat, decided, winner))
	}
	for i, g := range in.Games {
		w := "B"
		if *g.A > *g.B {
			w = "A"
		}
		if msg := gameScoreError(m, w, g.A, g.B, i); msg != "" {
			return fail(msg)
		}
	}
	return win(decided)
}

// Credit is one credited substitute: the player and the side they count on. It marshals as the
// [id, team] pair a TypeScript Map entry is written as.
type Credit struct {
	ID   string
	Team string
}

// SubstitutionSlots is the team slot of each substitution, by index: a substitution whose outgoing
// player came in through an earlier one in the same team shares that one's slot.
func SubstitutionSlots(subs []model.Substitution) []int {
	slotOf := map[string]int{}
	out := make([]int, len(subs))
	for i, s := range subs {
		key := s.Team + ":" + s.OutID
		slot, ok := slotOf[key]
		if !ok {
			slot = i
		}
		delete(slotOf, key)
		slotOf[s.Team+":"+s.InID] = slot
		out[i] = slot
	}
	return out
}

// CreditedPlayers is who gets the game after in-game substitutions, with their team, in the
// insertion order of a TypeScript Map. One person per team slot at most: a later substitution in the
// same slot that names a person replaces the earlier choice; Nobody leaves it alone.
func CreditedPlayers(subs []model.Substitution) []Credit {
	slots := SubstitutionSlots(subs)
	var order []int // slot keys in first-insertion order
	bySlot := map[int]Credit{}
	for i, s := range subs {
		creditTo, _ := s.CreditTo.Value()
		var c Credit
		switch creditTo {
		case "incoming":
			c = Credit{ID: s.InID, Team: s.Team}
		case "outgoing":
			c = Credit{ID: s.OutID, Team: s.Team}
		default:
			continue
		}
		if _, seen := bySlot[slots[i]]; !seen {
			order = append(order, slots[i])
		}
		bySlot[slots[i]] = c
	}
	// new Map(entries): a repeated id keeps its first position and takes the last team.
	out := []Credit{}
	index := map[string]int{}
	for _, slot := range order {
		c := bySlot[slot]
		if at, ok := index[c.ID]; ok {
			out[at].Team = c.Team
			continue
		}
		index[c.ID] = len(out)
		out = append(out, c)
	}
	return out
}

// IsPartial: both sides of an in-game substitution are not full participants of the match.
func IsPartial(subs []model.Substitution, id string) bool {
	return slices.ContainsFunc(subs, func(s model.Substitution) bool { return s.OutID == id || s.InID == id })
}

// CountedTeam is the side a counted player played on: their team as the match finished, or, for a
// credited substitute who went off, the team of their slot. "" when the match does not count for them.
func CountedTeam(m model.Match, id string) string {
	if m.State != model.StateCompleted {
		return ""
	}
	if !IsPartial(m.Substitutions, id) {
		switch {
		case slices.Contains(m.TeamA, id):
			return "A"
		case slices.Contains(m.TeamB, id):
			return "B"
		}
		return ""
	}
	for _, c := range CreditedPlayers(m.Substitutions) {
		if c.ID == id {
			return c.Team
		}
	}
	return ""
}

// CountsFor: a completed match the player played in full, or one the operator gave them after a
// substitution. Invalid matches count for no one.
func CountsFor(m model.Match, id string) bool { return CountedTeam(m, id) != "" }

// CountedGames is how many matches count for the player.
func CountedGames(id string, matches []model.Match) int {
	n := 0
	for _, m := range matches {
		if CountsFor(m, id) {
			n++
		}
	}
	return n
}

// GamesAdjustmentOf is a roster row's Set games played adjustment; 0 when none or no row.
func GamesAdjustmentOf(p *model.Player) int64 {
	if p == nil {
		return 0
	}
	v, _ := p.GamesAdjustment.Value()
	return v
}

// GamesPlayed is the games shown everywhere: counted games plus the adjustment, floored at 0.
func GamesPlayed(p model.Player, matches []model.Match) int64 {
	return max(0, int64(CountedGames(p.ID, matches))+GamesAdjustmentOf(&p))
}

// GamesPlayedFor is [GamesPlayed] by roster id; an unknown id has no adjustment.
func GamesPlayedFor(id string, roster []model.Player, matches []model.Match) int64 {
	return GamesPlayed(model.Player{ID: id, GamesAdjustment: adjustmentOption(findPlayer(roster, id))}, matches)
}

func adjustmentOption(p *model.Player) model.Opt[int64] {
	if p == nil {
		return model.Opt[int64]{}
	}
	return model.Some(GamesAdjustmentOf(p))
}

// WaitMinutes is whole minutes since the player last played (a finished match they were in, or one
// they were substituted out of), arrived or the session started; never negative.
func WaitMinutes(p model.Player, matches []model.Match, startedAt *int64, now int64) int64 {
	base := now
	switch {
	case p.PresentChangedAt != nil:
		base = *p.PresentChangedAt
	case startedAt != nil:
		base = *startedAt
	}
	for _, m := range matches {
		if m.State != model.StateCompleted && m.State != model.StateInvalid {
			continue
		}
		if !slices.Contains(m.AllPlayers(), p.ID) && !slices.ContainsFunc(m.Substitutions, func(s model.Substitution) bool { return s.OutID == p.ID }) {
			continue
		}
		var end int64
		if m.EndedAt != nil {
			end = *m.EndedAt
		}
		base = max(base, end)
	}
	diff := now - base
	if diff < 0 {
		return 0
	}
	return diff / 60000
}

// Standing is one row of the live standings. Position is shared by rows with the same wins and losses;
// the next record takes the next number, without gaps (1, 1, 2).
type Standing struct {
	PlayerID string `json:"playerId"`
	Name     string `json:"name"`
	Wins     int    `json:"wins"`
	Losses   int    `json:"losses"`
	Games    int64  `json:"games"`
	Position int    `json:"position"`
}

// ComputeStandings ranks players with counted games: most wins, then fewest losses (D-2026-11-18-05).
// Rows with the same wins and losses share a position and the next record takes the next number, without
// gaps (1, 1, 2; owner, November 19, 2026). Nothing else separates players: the name ([collate.Compare]) only orders the rows inside a
// shared position, and the sort is stable, so equal names keep roster order.
func ComputeStandings(roster []model.Player, matches []model.Match) []Standing {
	rows := []Standing{}
	for _, p := range roster {
		games := GamesPlayed(p, matches)
		if games <= 0 {
			continue
		}
		wins, losses := 0, 0
		for _, m := range matches {
			team := CountedTeam(m, p.ID)
			if team == "" || m.Decision == nil || m.Decision.WinningTeam == nil || *m.Decision.WinningTeam == "" {
				continue
			}
			if *m.Decision.WinningTeam == team {
				wins++
			} else {
				losses++
			}
		}
		rows = append(rows, Standing{PlayerID: p.ID, Name: p.NameSnapshot, Wins: wins, Losses: losses, Games: games})
	}
	slices.SortStableFunc(rows, func(a, b Standing) int {
		if d := b.Wins - a.Wins; d != 0 {
			return d
		}
		if d := a.Losses - b.Losses; d != 0 {
			return d
		}
		return collate.Compare(a.Name, b.Name)
	})
	for i := range rows {
		// No gaps (owner, November 19, 2026): the next record takes the next number (1, 1, 2).
		switch {
		case i == 0:
			rows[i].Position = 1
		case rows[i].Wins == rows[i-1].Wins && rows[i].Losses == rows[i-1].Losses:
			rows[i].Position = rows[i-1].Position
		default:
			rows[i].Position = rows[i-1].Position + 1
		}
	}
	return rows
}

// MarshalJSON writes the [id, team] pair a TypeScript Map entry is written as in the cases.
func (c Credit) MarshalJSON() ([]byte, error) { return json.Marshal([2]string{c.ID, c.Team}) }
