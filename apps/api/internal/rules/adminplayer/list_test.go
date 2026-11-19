package adminplayer_test

import (
	"fmt"
	"reflect"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
)

func idx(n int) *int { return &n }

// Ported from packages/data/src/admin-player/adminPlayer.rules.test.ts (the other 13 cases of the file, with the demo pool
// fixtures written out: Jose is the row of the player the fixtures call Jose, with the phone and email of his account).
func TestRankStatus(t *testing.T) {
	if got := adminplayer.RankStatusOf(nil, 30, 10, false); got != (adminplayer.RankStatus{Kind: "none", Text: "No rank yet"}) {
		t.Errorf("no level is no rank yet: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(3), 9, 10, false); got != (adminplayer.RankStatus{Kind: "below", Text: "Intermediate Low · 9 of 10 recent matches"}) {
		t.Errorf("below the requirement: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(8), 10, 10, false); got != (adminplayer.RankStatus{Kind: "board", Text: "Advanced High · on the overall leaderboard"}) {
		t.Errorf("meeting the requirement: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(9), 12, 10, false); got.Kind != "none" {
		t.Errorf("an unknown level index is no rank yet: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(-1), 12, 10, false); got.Kind != "none" {
		t.Errorf("a negative index: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(4), 3, 10, true); got != (adminplayer.RankStatus{Kind: "below", Text: "Intermediate Mid · not on the leaderboard until they register"}) {
		t.Errorf("not on the leaderboard: %v", got)
	}
	if got := adminplayer.RankStatusOf(idx(4), 30, 10, true); got.Kind != "board" {
		t.Errorf("not on the leaderboard, enough matches: %v", got)
	}
}

func jose() adminplayer.Row {
	return adminplayer.Row{Name: "Jose", RtrID: str("RTR-PH-CEB-031526-0001"), Phone: "+63 917 555 0142", Email: "jose@example.com"}
}

func TestPrivilegedSearch(t *testing.T) {
	row := jose()
	for _, c := range []struct {
		row  adminplayer.Row
		q    string
		want bool
		why  string
	}{
		{row, "  ", true, "an empty query matches everyone"},
		{row, "JOSÉ", true, "name, ignoring case and accents"},
		{row, "rtr-ph-ceb-031526-0001", true, "RTR ID"},
		{row, "jose@example", true, "email"},
		{adminplayer.Row{Name: "Maria Steph", Nickname: str("Atty Steph"), RtrID: str("RTR-PH-CEB-061126-0105")}, "atty", true, "nickname"},
		{row, "0917 555 0142", true, "a local number finds the +63 phone"},
		{row, "+63 917 555 0142", true, "the +63 form"},
		{row, "0142", true, "four digits"},
		{row, "142", false, "fewer than four digits never search phones"},
		{adminplayer.Row{Name: "Jose", RtrID: str("RTR-X"), Phone: row.Phone, Email: row.Email}, "917", false, "fewer than four digits, again"},
		{adminplayer.Row{Name: "Jose", RtrID: row.RtrID, Email: row.Email}, "0917 555 0142", false, "a player without a phone is not matched by digits"},
		{row, "zzzz", false, "nothing"},
	} {
		if got := adminplayer.MatchesAdminSearch(c.row, c.q); got != c.want {
			t.Errorf("%s: %v", c.why, got)
		}
	}
}

func TestAccountFilter(t *testing.T) {
	for _, c := range []struct {
		claimed bool
		account string
		details bool
		want    bool
	}{
		{true, "", false, true}, {true, "registered", false, true}, {true, "unclaimed", false, false}, {false, "unclaimed", false, true},
		{false, "registered", false, false}, {false, "all", false, true}, {false, "details", true, true}, {false, "details", false, false}, {true, "details", true, false},
	} {
		if got := adminplayer.MatchesAccountFilter(c.claimed, c.account, c.details); got != c.want {
			t.Errorf("%+v: %v", c, got)
		}
	}
	for _, c := range []struct {
		claimed      bool
		phone, email string
		want         bool
	}{{false, "+639170000001", "", true}, {false, "+639170000001", "a@b.co", false}, {true, "+639170000001", "", false}, {false, "  ", "", false}} {
		if got := adminplayer.IsDetailsRequired(c.claimed, c.phone, c.email); got != c.want {
			t.Errorf("%+v: %v", c, got)
		}
	}
}

func TestSameNameGroups(t *testing.T) {
	got := adminplayer.SameNameGroups([]string{"Carlo Medina", "Jose", "Carlo Medina", "carlo medina"})
	if !reflect.DeepEqual(got, []adminplayer.NameGroup{{Name: "Carlo Medina", Count: 2}}) {
		t.Errorf("flags exact duplicates only: %v", got)
	}
	if got := adminplayer.SameNameGroups([]string{"Jose", "Maria", "Pedro"}); len(got) != 0 {
		t.Errorf("a pool with no shared names: %v", got)
	}
}

// Ported from management.rules.test.ts (5 cases; the demo player of its fixture is a row with the fields written out).
func TestLevelBand(t *testing.T) {
	var got []string
	for i := 0; i < 9; i++ {
		got = append(got, adminplayer.LevelBandOf(idx(i)))
	}
	want := []string{"beginner", "beginner", "beginner", "intermediate", "intermediate", "intermediate", "advanced", "advanced", "advanced"}
	if !reflect.DeepEqual(got, want) || adminplayer.LevelBandOf(nil) != "" || adminplayer.LevelBandOf(idx(9)) != "" || adminplayer.LevelBandOf(idx(-1)) != "" {
		t.Errorf("%v", got)
	}
}

func TestDuplicateGroups(t *testing.T) {
	groups := adminplayer.DuplicateGroups([]adminplayer.Row{
		{ID: "a", Name: " Alex   Reyes ", Phone: "09171234567"},
		{ID: "b", Name: "alex reyes", Email: "demo@example.com"},
		{ID: "c", Name: "Different", Email: " DEMO@example.com "},
	})
	if len(groups) != 1 {
		t.Fatalf("%v", groups)
	}
	ids := append([]string{}, groups[0].IDs...)
	reasons := append([]string{}, groups[0].Reasons...)
	sortStrings(ids)
	sortStrings(reasons)
	if !reflect.DeepEqual(ids, []string{"a", "b", "c"}) || !reflect.DeepEqual(reasons, []string{"Same email", "Same name"}) {
		t.Errorf("%v %v", ids, reasons)
	}
	if got := adminplayer.DuplicateGroups([]adminplayer.Row{{ID: "a", Name: "A"}, {ID: "b", Name: "B"}}); len(got) != 0 {
		t.Errorf("%v", got)
	}
	// A phone typed with the leading 0 and one with 63 are the same number.
	if got := adminplayer.DuplicateGroups([]adminplayer.Row{{ID: "a", Name: "A", Phone: "0917 123 4567"}, {ID: "b", Name: "B", Phone: "+63 917 123 4567"}}); len(got) != 1 || got[0].Reasons[0] != "Same phone" {
		t.Errorf("%v", got)
	}
}

func sortStrings(s []string) {
	for i := range s {
		for j := i + 1; j < len(s); j++ {
			if s[j] < s[i] {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
}

func demo() adminplayer.Row {
	return adminplayer.Row{ID: "a", Name: "Demo", AddedOn: "2026-10-01", PlaceCode: "CEB", PlaceName: "Cebu City", RankText: "No rank yet"}
}

func TestSelectAppliesDatesPlaceAndArchiveBeforePaging(t *testing.T) {
	b := demo()
	b.ID, b.AddedOn, b.LevelBand, b.Claimed = "b", "2026-10-02", "advanced", true
	c := demo()
	c.ID, c.ArchivedAt = "c", "2026-10-02"
	rows := []adminplayer.Row{demo(), b, c}
	res := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{AddedFrom: "2026-10-01", AddedTo: "2026-10-02", Places: []string{"CEB"}})
	if res.Total != 2 || res.Stats != (adminplayer.Stats{Advanced: 1, NoRank: 1, Registered: 1, Unclaimed: 1}) {
		t.Errorf("%+v", res)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Archived: "archived"}).Rows; len(got) != 1 || got[0].ID != "c" {
		t.Errorf("%v", got)
	}
	if adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{AddedFrom: "2026-10-02", AddedTo: "2026-10-02"}).Total != 1 {
		t.Error("inclusive dates")
	}
	if adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Places: []string{"MNL"}}).Total != 0 {
		t.Error("place")
	}
	if adminplayer.StatsOf(nil).NoRank != 0 {
		t.Error("stats of none")
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Archived: "all"}); got.Total != 3 || got.All != 3 || got.Registered != 1 || got.Unclaimed != 2 || len(got.Places) != 1 {
		t.Errorf("%+v", got)
	}
	// Newest first, then by ID; level none; account; search; duplicates.
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{}).MatchingIDs; !reflect.DeepEqual(got, []string{"b", "a"}) {
		t.Errorf("order %v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Level: "none", Archived: "all"}).MatchingIDs; !reflect.DeepEqual(got, []string{"a", "c"}) {
		t.Errorf("none %v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Level: "advanced"}).MatchingIDs; !reflect.DeepEqual(got, []string{"b"}) {
		t.Errorf("advanced %v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Account: "registered"}).MatchingIDs; !reflect.DeepEqual(got, []string{"b"}) {
		t.Errorf("registered %v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Q: "zzzz"}).Total; got != 0 {
		t.Errorf("search %v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Duplicates: true}); got.Total != 2 || len(got.DuplicateGroups) != 1 || len(got.DuplicateNames) != 1 {
		t.Errorf("duplicates %+v", got)
	}
}

func TestSelectClampsThePage(t *testing.T) {
	var rows []adminplayer.Row
	for i := 0; i < 76; i++ {
		r := demo()
		r.ID, r.Name = fmt.Sprint(i), fmt.Sprint("Player ", i)
		rows = append(rows, r)
	}
	res := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Page: 999, HasPage: true, PageSize: 25, HasSize: true})
	if res.Page != 4 || len(res.Rows) != 1 || res.Stats.NoRank != 76 {
		t.Errorf("%+v", res)
	}
	if adminplayer.SelectAdminPlayers(nil, adminplayer.ListParams{Page: 20, HasPage: true}).Page != 1 {
		t.Error("an empty list has one page")
	}
	if adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Page: -1, HasPage: true}).Page != 1 {
		t.Error("a page below one")
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Limit: 50, HasLimit: true}); got.PageSize != 50 || got.PageCount != 2 || got.Start != 1 || got.End != 50 {
		t.Errorf("limit: %+v", got)
	}
	if got := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{PageSize: 30, HasSize: true}); got.PageSize != 25 {
		t.Errorf("a page size that is not offered: %d", got.PageSize)
	}
}

func TestSelectKeepsADuplicateGroupTogetherAcrossPages(t *testing.T) {
	var rows []adminplayer.Row
	for i := 0; i < 30; i++ {
		r := demo()
		r.ID, r.Name = fmt.Sprint(i), "Group B"
		if i < 24 {
			r.Name = "Group A"
		}
		rows = append(rows, r)
	}
	first := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Duplicates: true, PageSize: 25, HasSize: true})
	second := adminplayer.SelectAdminPlayers(rows, adminplayer.ListParams{Duplicates: true, PageSize: 25, HasSize: true, Page: 2, HasPage: true})
	if len(first.Rows) != 24 || len(second.Rows) != 6 || second.Start != 25 || second.End != 30 {
		t.Errorf("%d %d %d %d", len(first.Rows), len(second.Rows), second.Start, second.End)
	}
}

func TestPlayersCSV(t *testing.T) {
	r := adminplayer.Row{Name: `=SUM(A1)`, Nickname: str(`Quote"d`), RtrID: str("RTR-1"), Claimed: true, RankText: "No rank yet", Clubs: []string{"A", "B"}, AddedOn: "2026-10-01", PlaceName: "Cebu City"}
	u := adminplayer.Row{Name: "Plain", Phone: "+63 917 000 0000", Email: "secret@example.com"}
	got := adminplayer.PlayersCSV([]adminplayer.Row{r, u})
	want := strings.Join([]string{
		`"Name","Nickname","RTR ID","Account","Rank","Clubs","Added","Place"`,
		`"'=SUM(A1)","Quote""d","RTR-1","Registered","No rank yet","A; B","2026-10-01","Cebu City"`,
		`"Plain","","","Unclaimed","","","",""`,
	}, "\r\n")
	if got != want || strings.Contains(got, "secret") || strings.Contains(got, "917") {
		t.Errorf("%s", got)
	}
}
