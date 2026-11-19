package adminplayer

import (
	"math"
	"regexp"
	"sort"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// The Admin list rules of packages/data/src/admin-player/{adminPlayer,management}.rules.ts: the rank status line, the
// privileged search, the account filter, the same-name and duplicate groups, the paging with its counts, and the CSV. The
// Go directory read sends every row and the screen filters, so no route runs these; they are here with their cases as the
// club directory filter and search are in rules/club.

// RankStatus is the rank line of a player row.
type RankStatus struct{ Kind, Text string }

var levelLabels = []string{"Beginner Low", "Beginner Mid", "Beginner High", "Intermediate Low", "Intermediate Mid", "Intermediate High", "Advanced Low", "Advanced Mid", "Advanced High"}

// RankStatusOf is rankOf in the prototype: `threshold` is the recent-match requirement in effect. A level index outside the
// nine levels is no rank. notOnLeaderboard is an unclaimed person saved by more than one club.
func RankStatusOf(levelIndex *int, recentStandardMatches, threshold int, notOnLeaderboard bool) RankStatus {
	if levelIndex == nil || *levelIndex < 0 || *levelIndex >= len(levelLabels) {
		return RankStatus{"none", "No rank yet"}
	}
	label := levelLabels[*levelIndex]
	kind := "board"
	if recentStandardMatches < threshold {
		kind = "below"
	}
	switch {
	case notOnLeaderboard:
		return RankStatus{kind, label + " · not on the leaderboard until they register"}
	case kind == "below":
		return RankStatus{kind, label + " · " + itoa(recentStandardMatches) + " of " + itoa(threshold) + " recent matches"}
	}
	return RankStatus{kind, label + " · on the overall leaderboard"}
}

// LevelBandOf is levelBandOf: the nine levels in three bands; an index outside them is in none ("").
func LevelBandOf(index *int) string {
	switch {
	case index == nil || *index < 0 || *index > 8:
		return ""
	case *index < 3:
		return "beginner"
	case *index < 6:
		return "intermediate"
	}
	return "advanced"
}

// Row is what the list rules read of a player row.
type Row struct {
	ID, Name        string
	Nickname        *string
	RtrID           *string
	Phone, Email    string
	Claimed         bool
	DetailsRequired bool
	LevelBand       string
	AddedOn         string
	ArchivedAt      string
	PlaceCode       string
	PlaceName       string
	Clubs           []string
	RankText        string
}

var nonDigits = regexp.MustCompile(`\D`)

// MatchesAdminSearch is matchesAdminPlayerSearch: name, nickname, RTR ID and email match accent- and case-insensitive; the
// phone matches by its digits only when the query has four or more digits, and a leading 0 also matches as 63. Admin only:
// a public search must never match phones or emails.
func MatchesAdminSearch(row Row, q string) bool {
	query := fields.JSTrim(q)
	if query == "" {
		return true
	}
	nickname, rtr := "", ""
	if row.Nickname != nil {
		nickname = *row.Nickname
	}
	if row.RtrID != nil {
		rtr = *row.RtrID
	}
	if strings.Contains(club.PlainIdentity(strings.Join([]string{row.Name, nickname, rtr, row.Email}, " ")), club.PlainIdentity(query)) {
		return true
	}
	digits := nonDigits.ReplaceAllString(query, "")
	if len(digits) < 4 {
		return false
	}
	phone := nonDigits.ReplaceAllString(row.Phone, "")
	return strings.Contains(phone, digits) || strings.Contains(phone, leadingZeroAs63(digits))
}

func leadingZeroAs63(digits string) string {
	if strings.HasPrefix(digits, "0") {
		return "63" + digits[1:]
	}
	return digits
}

// MatchesAccountFilter is matchesAccountFilter: "details" is an unclaimed record with details required, otherwise "all",
// "registered" or "unclaimed" (an empty option is "all").
func MatchesAccountFilter(claimed bool, account string, detailsRequired bool) bool {
	switch account {
	case "details":
		return !claimed && detailsRequired
	case "", "all":
		return true
	case "registered":
		return claimed
	}
	return !claimed
}

// IsDetailsRequired is isAdminDetailsRequired (D-2026-11-16-04): an unclaimed record with a phone and no email.
func IsDetailsRequired(claimed bool, phone, email string) bool {
	return !claimed && fields.JSTrim(phone) != "" && fields.JSTrim(email) == ""
}

// NameGroup is a name that more than one identity shares.
type NameGroup struct {
	Name  string
	Count int
}

// SameNameGroups is sameNameGroups: names that more than one identity shares, in first-seen order (exact name match,
// never merged).
func SameNameGroups(names []string) []NameGroup {
	var order []string
	counts := map[string]int{}
	for _, n := range names {
		if _, seen := counts[n]; !seen {
			order = append(order, n)
		}
		counts[n]++
	}
	groups := []NameGroup{}
	for _, n := range order {
		if counts[n] > 1 {
			groups = append(groups, NameGroup{n, counts[n]})
		}
	}
	return groups
}

// DuplicateGroup is a connected set of rows with overlapping name or contact matches.
type DuplicateGroup struct {
	IDs, Reasons []string
}

var spaces = regexp.MustCompile(`[\t\n\v\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]+`)

func normalizeText(value string) string {
	return spaces.ReplaceAllString(strings.ToLower(fields.JSTrim(value)), " ")
}

func phoneKey(value string) string {
	d := nonDigits.ReplaceAllString(value, "")
	if strings.HasPrefix(d, "0") {
		return "63" + d[1:]
	}
	return d
}

func unionOf(lists ...[]string) []string {
	var out []string
	seen := map[string]bool{}
	for _, l := range lists {
		for _, v := range l {
			if !seen[v] {
				seen[v] = true
				out = append(out, v)
			}
		}
	}
	return out
}

// DuplicateGroups is duplicateGroups: overlapping normalized name, phone and email matches are kept together without
// merging the records. The groups keep the order the matches were found in.
func DuplicateGroups(rows []Row) []DuplicateGroup {
	groups := []DuplicateGroup{}
	type match struct {
		key string
		ids []string
	}
	var order []string
	seen := map[string]*match{}
	for _, row := range rows {
		for _, rv := range [][2]string{{"Same name", normalizeText(row.Name)}, {"Same phone", phoneKey(row.Phone)}, {"Same email", normalizeText(row.Email)}} {
			if rv[1] == "" {
				continue
			}
			key := rv[0] + ":" + rv[1]
			if seen[key] == nil {
				seen[key] = &match{key: key}
				order = append(order, key)
			}
			seen[key].ids = append(seen[key].ids, row.ID)
		}
	}
	for _, key := range order {
		ids := seen[key].ids
		if len(ids) < 2 {
			continue
		}
		var overlaps []int
		for gi, g := range groups {
			for _, id := range g.IDs {
				if containsString(ids, id) {
					overlaps = append(overlaps, gi)
					break
				}
			}
		}
		merged := DuplicateGroup{IDs: ids, Reasons: []string{strings.SplitN(key, ":", 2)[0]}}
		for _, gi := range overlaps {
			merged.IDs = append(merged.IDs, groups[gi].IDs...)
		}
		merged.IDs = unionOf(merged.IDs)
		for _, gi := range overlaps {
			merged.Reasons = append(merged.Reasons, groups[gi].Reasons...)
		}
		merged.Reasons = unionOf(merged.Reasons)
		kept := groups[:0:0]
		for gi, g := range groups {
			if !containsInt(overlaps, gi) {
				kept = append(kept, g)
			}
		}
		groups = append(kept, merged)
	}
	return groups
}

func containsString(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

func containsInt(list []int, v int) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// Stats is adminPlayerStats: how many rows are in each band and account state.
type Stats struct{ Advanced, Intermediate, Beginner, NoRank, Registered, Unclaimed int }

// StatsOf is adminPlayerStats.
func StatsOf(rows []Row) Stats {
	var s Stats
	for _, r := range rows {
		switch r.LevelBand {
		case "advanced":
			s.Advanced++
		case "intermediate":
			s.Intermediate++
		case "beginner":
			s.Beginner++
		default:
			s.NoRank++
		}
		if r.Claimed {
			s.Registered++
		} else {
			s.Unclaimed++
		}
	}
	return s
}

// ListParams is AdminPlayerListParams. A zero Page is the first page, a zero PageSize is 25. Archived is "active" by
// default.
type ListParams struct {
	Q, Account, Level          string
	Duplicates                 bool
	AddedFrom, AddedTo         string
	Places                     []string
	Archived                   string
	Page, PageSize, Limit      float64
	HasPage, HasSize, HasLimit bool
}

// Selection is what selectAdminPlayers answers: one page, its place in the matches, and the counts.
type Selection struct {
	Rows            []Row
	Start, End      int
	Total           int
	Page, PageSize  int
	PageCount       int
	Stats           Stats
	MatchingIDs     []string
	DuplicateGroups []DuplicateGroup
	DuplicateNames  []NameGroup
	All, Registered int
	Unclaimed       int
	Places          []Place
}

// Place is a registration place of the list.
type Place struct{ Code, Name string }

// SelectAdminPlayers is selectAdminPlayers: the account filter, the search, the level, the duplicates, the inclusive
// creation dates, the places and the archive apply before paging, newest first (then by ID); a duplicate group is never
// split across pages; the page is clamped into range.
func SelectAdminPlayers(all []Row, params ListParams) Selection {
	groups := DuplicateGroups(all)
	duplicateIDs := map[string]bool{}
	for _, g := range groups {
		for _, id := range g.IDs {
			duplicateIDs[id] = true
		}
	}
	var matches []Row
	for _, p := range all {
		if !MatchesAccountFilter(p.Claimed, params.Account, p.DetailsRequired) || !MatchesAdminSearch(p, params.Q) {
			continue
		}
		if params.Level == "none" && p.LevelBand != "" || params.Level != "" && params.Level != "none" && p.LevelBand != params.Level {
			continue
		}
		if params.Duplicates && !duplicateIDs[p.ID] {
			continue
		}
		if params.AddedFrom != "" && p.AddedOn < params.AddedFrom || params.AddedTo != "" && p.AddedOn > params.AddedTo {
			continue
		}
		if len(params.Places) > 0 && !containsString(params.Places, p.PlaceCode) {
			continue
		}
		if params.Archived != "all" && (params.Archived == "archived") != (p.ArchivedAt != "") {
			continue
		}
		matches = append(matches, p)
	}
	sort.SliceStable(matches, func(i, j int) bool {
		if matches[i].AddedOn != matches[j].AddedOn {
			return matches[i].AddedOn > matches[j].AddedOn
		}
		return matches[i].ID < matches[j].ID
	})
	groupIndex := func(id string) int {
		for gi, g := range groups {
			if containsString(g.IDs, id) {
				return gi
			}
		}
		return -1
	}
	if params.Duplicates {
		sort.SliceStable(matches, func(i, j int) bool { return groupIndex(matches[i].ID) < groupIndex(matches[j].ID) })
	}
	pageSize := 25
	switch {
	case params.HasSize:
		pageSize = sizeOf(params.PageSize)
	case params.HasLimit:
		pageSize = sizeOf(params.Limit)
	}
	var pages [][]Row
	if params.Duplicates {
		for _, g := range groups {
			var members []Row
			for _, p := range matches {
				if containsString(g.IDs, p.ID) {
					members = append(members, p)
				}
			}
			if len(members) == 0 {
				continue
			}
			if n := len(pages); n > 0 && len(pages[n-1])+len(members) <= pageSize {
				pages[n-1] = append(pages[n-1], members...)
			} else {
				pages = append(pages, members)
			}
		}
	} else {
		for offset := 0; offset < len(matches); offset += pageSize {
			pages = append(pages, matches[offset:min(offset+pageSize, len(matches))])
		}
	}
	pageCount := max(1, len(pages))
	requested := 1.0
	if params.HasPage && !math.IsNaN(params.Page) && !math.IsInf(params.Page, 0) {
		requested = math.Floor(params.Page)
	}
	page := int(math.Min(float64(pageCount), math.Max(1, requested)))
	var rows []Row
	if page-1 < len(pages) {
		rows = pages[page-1]
	}
	start := 0
	if len(matches) > 0 {
		start = 1
		for _, p := range pages[:page-1] {
			start += len(p)
		}
	}
	end := 0
	if start > 0 {
		end = start + len(rows) - 1
	}
	registered := 0
	for _, p := range all {
		if p.Claimed {
			registered++
		}
	}
	sel := Selection{
		Rows: rows, Start: start, End: end, Total: len(matches), Page: page, PageSize: pageSize, PageCount: pageCount, Stats: StatsOf(matches),
		MatchingIDs: []string{}, DuplicateGroups: []DuplicateGroup{}, All: len(all), Registered: registered, Unclaimed: len(all) - registered,
	}
	names := make([]string, len(matches))
	for i, p := range matches {
		sel.MatchingIDs = append(sel.MatchingIDs, p.ID)
		names[i] = p.Name
	}
	sel.DuplicateNames = SameNameGroups(names)
	for _, g := range groups {
		for _, id := range g.IDs {
			if rowsHave(rows, id) {
				sel.DuplicateGroups = append(sel.DuplicateGroups, g)
				break
			}
		}
	}
	index := map[string]int{}
	for _, p := range all {
		if at, ok := index[p.PlaceCode]; ok {
			sel.Places[at] = Place{p.PlaceCode, p.PlaceName} // a later row of a place gives its name, the first gives its place in the list
			continue
		}
		index[p.PlaceCode] = len(sel.Places)
		sel.Places = append(sel.Places, Place{p.PlaceCode, p.PlaceName})
	}
	return sel
}

func rowsHave(rows []Row, id string) bool {
	for _, r := range rows {
		if r.ID == id {
			return true
		}
	}
	return false
}

func sizeOf(v float64) int {
	switch v {
	case 25, 50, 100:
		return int(v)
	}
	return 25
}

// PlayersCSV is adminPlayersCsv: every field is quoted and one that could run as a spreadsheet formula starts with an
// apostrophe; contacts are never exported.
func PlayersCSV(players []Row) string {
	cell := func(value string) string {
		prefix := ""
		if value != "" && strings.ContainsRune("=+@-\t\r", rune(value[0])) {
			prefix = "'"
		}
		return `"` + prefix + strings.ReplaceAll(value, `"`, `""`) + `"`
	}
	rows := [][]string{{"Name", "Nickname", "RTR ID", "Account", "Rank", "Clubs", "Added", "Place"}}
	for _, p := range players {
		nick, rtr, account := "", "", "Unclaimed"
		if p.Nickname != nil {
			nick = *p.Nickname
		}
		if p.RtrID != nil {
			rtr = *p.RtrID
		}
		if p.Claimed {
			account = "Registered"
		}
		rows = append(rows, []string{p.Name, nick, rtr, account, p.RankText, strings.Join(p.Clubs, "; "), p.AddedOn, p.PlaceName})
	}
	lines := make([]string, len(rows))
	for i, row := range rows {
		cells := make([]string, len(row))
		for j, c := range row {
			cells[j] = cell(c)
		}
		lines[i] = strings.Join(cells, ",")
	}
	return strings.Join(lines, "\r\n")
}
