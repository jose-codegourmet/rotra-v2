package publicreads

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

func rosterRow(name, avatar string) sqlcgen.ListPublicSessionRosterRow {
	r := sqlcgen.ListPublicSessionRosterRow{NameSnapshot: name}
	if avatar != "" {
		r.HasProfile, r.ProfileAvatarRef = true, pgtype.Text{String: avatar, Valid: true}
	}
	return r
}

func TestResultsWithPicturesPutsFacesOnNamedRowsOnly(t *testing.T) {
	roster := []sqlcgen.ListPublicSessionRosterRow{rosterRow("Ann Lee", "https://x.test/a.png"), rosterRow("Twin", ""), rosterRow("Twin", "https://x.test/t.png"), rosterRow("Bo", "")}
	raw := `{"standings":[{"position":1,"name":"Ann Lee"},{"name":"Twin"},{"name":"Bo"},{"name":"Nobody"},{"name":7},{"x":1},"s"],"awards":{"mvp":{"name":"Ann Lee"},"mostImproved":null},"offDay":[{"name":"Bo","priorSessions":2}]}`
	out, err := resultsWithPictures([]byte(raw), roster)
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(out)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"standings":[{"position":1,"name":"Ann Lee","pictureUrl":"https://x.test/a.png","participant":0},{"name":"Twin","position":1,"pictureUrl":null},{"name":"Bo","position":1,"pictureUrl":null,"participant":3},{"name":"Nobody","position":1,"pictureUrl":null},{"name":7,"position":1,"pictureUrl":null},{"x":1,"position":1},{"0":"s","position":1}],"awards":{"mvp":{"name":"Ann Lee","pictureUrl":"https://x.test/a.png","participant":0},"mostImproved":null},"offDay":[{"name":"Bo","priorSessions":2,"pictureUrl":null,"participant":3}]}`
	if string(got) != want {
		t.Errorf("\n got %s\nwant %s", got, want)
	}
}

func TestResultsWithPicturesNoCopyIsNullAndABadCopyIsAnError(t *testing.T) {
	if out, err := resultsWithPictures(nil, nil); out != nil || err != nil {
		t.Fatalf("no copy = %v, %v, want null", out, err)
	}
	if out, err := resultsWithPictures([]byte(`[1,2]`), nil); out != nil || err != nil {
		t.Fatalf("a non-object copy (the table's CHECK forbids it) = %v, %v", out, err)
	}
	for _, bad := range []string{`{"standings":`, `{"a":1} {"b":2}`, `{"a"`, `[`, `{"a":[1,}`, `nope`} {
		if _, err := resultsWithPictures([]byte(bad), nil); err == nil {
			t.Errorf("%q: want an error", bad)
		}
	}
}

// A null standings row is the TypeScript's TypeError (reading wins of null): the whole read fails.
func TestResultsWithANullStandingsRowFail(t *testing.T) {
	if _, err := resultsWithPictures([]byte(`{"standings":[{"name":"A"},null]}`), nil); err == nil {
		t.Fatal("want an error")
	}
}

func TestResultsNumbersPrintAsJavaScriptDoes(t *testing.T) {
	out, err := resultsWithPictures([]byte(`{"standings":[{"wins":2.0,"a":1e2,"b":1.50,"d":123456789012}]}`), nil)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := json.Marshal(out)
	if want := `{"standings":[{"wins":2,"a":100,"b":1.5,"d":123456789012,"position":1}]}`; string(got) != want {
		t.Errorf("\n got %s\nwant %s", got, want)
	}
}

func TestValidSlugMatchesTheTableCheck(t *testing.T) {
	for s, want := range map[string]bool{
		"abcd": true, "a-b-": true, "0000": true, strings.Repeat("a", 64): true,
		"abc": false, "": false, strings.Repeat("a", 65): false, "ABCD": false, "ab_cd": false, "ab cd": false, "ab\x00cd": false, "ab\u00e9cd": false, "ab/cd": false,
	} {
		if validSlug(s) != want {
			t.Errorf("validSlug(%q) = %v, want %v", s, !want, want)
		}
	}
}

func TestPublicLevelLabelsAndCapitalize(t *testing.T) {
	p := newPublicPerson("A***", pgtype.Text{}, pgtype.Int2{Int16: 4, Valid: true})
	if p.SkillGroup == nil || *p.SkillGroup != "intermediate" || *p.LevelLabel != "Intermediate Mid" {
		t.Fatalf("level 4 = %v %v", p.SkillGroup, p.LevelLabel)
	}
	for _, id := range []pgtype.Int2{{}, {Int16: -1, Valid: true}, {Int16: 9, Valid: true}} {
		if p := newPublicPerson("A***", pgtype.Text{}, id); p.SkillGroup != nil || p.LevelLabel != nil {
			t.Errorf("level %+v has a ring: %v", id, p)
		}
	}
	if capitalize("") != "" {
		t.Error("capitalize of empty")
	}
}
