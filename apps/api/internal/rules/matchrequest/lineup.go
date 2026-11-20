package matchrequest

import (
	"slices"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// NoMatchRequestsText is the toast when the session allows no format.
const NoMatchRequestsText = "This session isn't taking match requests"

// FormatNotAllowedText is a disabled format pill's tooltip, reused as the refusal for that format.
const FormatNotAllowedText = "Not allowed for requests in this session"

// FormatOrder is the six Request a match pills in the prototype's order: 2 v 2 first and default.
var FormatOrder = []model.Format{"doubles", "singles", "fun_1v2", "fun_3v3", "fun_4v4", "fun_5v5"}

var formatLabels = map[model.Format]string{
	"singles": "Singles", "doubles": "Doubles", "fun_1v2": "1v2 fun", "fun_3v3": "3v3 fun", "fun_4v4": "4v4 fun", "fun_5v5": "5v5 fun",
}

// FormatLabel is the label of a format (FORMAT_LABELS).
func FormatLabel(f model.Format) string { return formatLabels[f] }

// Request is the shape of a stored request: the requester and the spots in slot order. A nil spot is Anyone.
type Request struct {
	PID       string
	Format    model.Format
	Partners  []*string
	Opponents []*string
}

// AllowedFormats is allowedRequestFormats: the formats the session lets players request, in pill order. A nil record is the
// prototype default (sessions saved before the setting): 2 v 2, and 1 v 1 while singles is on.
func AllowedFormats(allowSingles bool, record map[string]bool) []model.Format {
	if record == nil {
		record = map[string]bool{"doubles": true, "singles": allowSingles}
	}
	out := []model.Format{}
	for _, f := range FormatOrder {
		if record[string(f)] {
			out = append(out, f)
		}
	}
	return out
}

// Spots is requestSpots: the spots a format needs besides the requester, N-1 partners and N opponents.
func Spots(f model.Format) (partners, opponents int) {
	sizes := match.TeamSizes()[f]
	return sizes[0] - 1, sizes[1]
}

// Named is namedIn: everyone a request names, the requester and every picked spot ("Anyone" names no one).
func Named(r Request) []string {
	out := []string{r.PID}
	for _, id := range slices.Concat(r.Partners, r.Opponents) {
		if id != nil && *id != "" {
			out = append(out, *id)
		}
	}
	return out
}

// NotEnoughToFillText is Add to queue's refusal when the Anyone spots can't be filled.
func NotEnoughToFillText(label string) string {
	return "Not enough present players to fill this " + lower(label) + " match"
}

// lower is toLowerCase for the ASCII labels.
func lower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 'a' - 'A'
		}
	}
	return string(b)
}

// Lineup is requestLineup (D-2026-11-09-05): the requester on team A, the named spots kept, every Anyone spot filled from the
// present players the request does not name, fewest games (played plus queued) first, in roster order among equals. False when
// the present players can't fill the spots.
func Lineup(r Request, roster []model.Player, matches []model.Match) (model.Lineup, bool) {
	sizes := match.TeamSizes()[r.Format]
	na, nb := sizes[0], sizes[1]
	named := map[string]bool{}
	for _, id := range Named(r) {
		named[id] = true
	}
	need := na + nb - len(named)
	type loaded struct {
		id   string
		load int64
	}
	var candidates []loaded
	for _, p := range roster {
		if p.Present && !named[p.ID] {
			candidates = append(candidates, loaded{p.ID, match.GamesPlayedFor(p.ID, roster, matches) + int64(match.QueuedCount(p.ID, matches))})
		}
	}
	slices.SortStableFunc(candidates, func(a, b loaded) int {
		switch {
		case a.load < b.load:
			return -1
		case a.load > b.load:
			return 1
		}
		return 0
	})
	if len(candidates) < need {
		return model.Lineup{}, false
	}
	fill := make([]string, 0, need)
	for _, c := range candidates[:need] {
		fill = append(fill, c.id)
	}
	next := func() string {
		id := fill[0]
		fill = fill[1:]
		return id
	}
	spot := func(list []*string, i int) string {
		if i < len(list) && list[i] != nil && *list[i] != "" {
			return *list[i]
		}
		return next()
	}
	teamA := []string{r.PID}
	for i := 0; i < na-1; i++ {
		teamA = append(teamA, spot(r.Partners, i))
	}
	teamB := make([]string, 0, nb)
	for i := 0; i < nb; i++ {
		teamB = append(teamB, spot(r.Opponents, i))
	}
	return model.Lineup{Format: r.Format, TeamA: teamA, TeamB: teamB}, true
}
