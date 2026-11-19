package adminplayer_test

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
)

func str(s string) *string { return &s }
func whole(n int64) *int64 { return &n }

// object reads JSON as the route does: numbers stay json.Number.
func object(t *testing.T, doc string) map[string]any {
	t.Helper()
	dec := json.NewDecoder(strings.NewReader(doc))
	dec.UseNumber()
	var m map[string]any
	if err := dec.Decode(&m); err != nil {
		t.Fatal(err)
	}
	return m
}

// Ported from packages/data/src/admin-player/adminPlayer.rules.test.ts, "created date from the RTR ID" (2 cases). The other
// cases of that file (rank status 4, privileged search 6, account filter 1, same-name 2) are rules of the Admin list
// screen that run in the browser (the Go directory read sends every row and the client filters), so none is ported.
func TestCreatedOnFromRtrID(t *testing.T) {
	if got := adminplayer.CreatedOnFromRtrID("RTR-PH-CEB-031526-0001"); got != "2026-03-15" {
		t.Errorf("reads the MMDDYY segment: %q", got)
	}
	if got := adminplayer.CreatedOnFromRtrID("RTR-PH-CEB"); got != "" {
		t.Errorf("a malformed ID is empty: %q", got)
	}
	for in, want := range map[string]string{"": "", "RTR-PH-CEB-12345-1": "", "RTR-PH-CEB-1234567-1": "", "RTR-PH-CEB-12a456-1": "", "RTR-PH-CEB-010199-1": "2099-01-01"} {
		if got := adminplayer.CreatedOnFromRtrID(in); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
}

func TestPlaceCodeFromRtrID(t *testing.T) {
	for in, want := range map[string]string{"RTR-PH-CEB-031526-0001": "PH-CEB", "RTR-PH-CEB": "", "RTR-A-B-C-123456-9": "A-B-C", "": ""} {
		id := in
		if got := adminplayer.PlaceCodeFromRtrID(&id); got != want {
			t.Errorf("%q: %q, want %q", in, got, want)
		}
	}
	if got := adminplayer.PlaceCodeFromRtrID(nil); got != "" {
		t.Errorf("no RTR ID: %q", got)
	}
}

func TestRtrIDWith(t *testing.T) {
	const id = "RTR-PH-CEB-102926-0014"
	for _, c := range []struct {
		place, date any
		want        string
	}{
		{"PH-MNL", "2026-10-29", "RTR-PH-MNL-102926-0014"},
		{"PH-CEB", "2026-10-30", "RTR-PH-CEB-103026-0014"},
		{"PH-DVO", "2031-01-02", "RTR-PH-DVO-010231-0014"},
		{"", "2026-10-29", id},                 // an incomplete place leaves it
		{"PH-MNL", "", id},                     // an incomplete date leaves it
		{"PH-MNL", " 2026-10-29", id},          // the date is not trimmed
		{"PH-MNL", "2026-10-29T00:00:00Z", id}, // nor read from a longer text
		{json.Number("5"), "2026-10-29", "RTR-5-102926-0014"},
		{true, "2026-10-29", "RTR-true-102926-0014"},
		{[]any{"PH-MNL"}, "2026-10-29", "RTR-PH-MNL-102926-0014"}, // a list is its elements joined by commas
		{json.Number("0"), "2026-10-29", id},
		{"PH-MNL", []any{"2026-10-30"}, "RTR-PH-MNL-103026-0014"},
		{"PH-MNL", json.Number("5"), id},
		{map[string]any{}, "2026-10-29", "RTR-[object Object]-102926-0014"},
		{"PH-MNL", false, id},
	} {
		if got := adminplayer.RtrIDWith(id, c.place, c.date); got != c.want {
			t.Errorf("%v %v: %q, want %q", c.place, c.date, got, c.want)
		}
	}
	if got := adminplayer.RtrIDWith("not an id", "PH-MNL", "2026-10-29"); got != "not an id" {
		t.Errorf("another shape stays: %q", got)
	}
}

func TestPlanRtrID(t *testing.T) {
	id := str("RTR-PH-CEB-102926-0014")
	plan := func(place, date any) (*adminplayer.RtrPlan, bool) { return adminplayer.PlanRtrID(id, place, date) }
	if p, ok := plan(nil, nil); p != nil || !ok {
		t.Errorf("nothing sent changes nothing: %v %v", p, ok)
	}
	if p, ok := plan("PH-CEB", "2026-10-29"); p != nil || !ok {
		t.Errorf("the same place and day: %v %v", p, ok)
	}
	p, ok := plan("PH-MNL", "2026-10-30")
	want := &adminplayer.RtrPlan{From: *id, RtrID: "RTR-PH-MNL-103026-0014", CountryCode: "PH", CityCode: "MNL", SyncDate: "2026-10-30", Sequence: 14}
	if !ok || !reflect.DeepEqual(p, want) {
		t.Errorf("plan: %+v %v, want %+v", p, ok, want)
	}
	for _, bad := range [][2]any{{"ph-mnl", "2026-10-29"}, {"PH-CEBU", "2026-10-29"}, {"MNL", "2026-10-29"}, {json.Number("5"), "2026-10-29"}, {"PH-MNL", "2026-02-30"}, {"PH-MNL", "2026-13-01"}, {"PH-MNL", "2026-02-29"}} {
		if p, ok := plan(bad[0], bad[1]); ok || p != nil {
			t.Errorf("%v: a plan that cannot be: %v %v", bad, p, ok)
		}
	}
	if p, ok := plan("PH-CEB", "2028-02-29"); !ok || p == nil || p.SyncDate != "2028-02-29" {
		t.Errorf("a leap day: %v %v", p, ok)
	}
	if p, ok := plan("PH-CEB", "2126-10-29"); p != nil || !ok {
		t.Errorf("the century is not in the ID: %v %v", p, ok)
	}
	if p, ok := adminplayer.PlanRtrID(nil, "PH-MNL", "2026-10-29"); p != nil || !ok {
		t.Errorf("no RTR ID: %v %v", p, ok)
	}
	long := str("RTR-PH-CEB-102926-123456")
	if p, ok := adminplayer.PlanRtrID(long, "PH-MNL", nil); !ok || p == nil || p.Sequence != 123456 || p.RtrID != "RTR-PH-MNL-102926-123456" {
		t.Errorf("a long number: %+v %v", p, ok)
	}
}

func TestParseCreate(t *testing.T) {
	good := `{"name":"  Nina Park ","nickname":" Nin ","phone":"0917 555 0199","email":" Nina@Example.test ","place":"CEB","clubId":"c","allowDuplicate":true,"other":1}`
	v, bad := adminplayer.ParseCreate(object(t, good))
	want := adminplayer.Create{Name: "Nina Park", Nickname: "Nin", Phone: "+639175550199", Email: "Nina@Example.test", Place: "CEB", ClubID: "c", AllowDuplicate: true}
	if bad != nil || v != want {
		t.Errorf("good: %+v %v", v, bad)
	}
	cases := map[string]map[string]string{
		`{}`: {
			"name": "Invalid input: expected string, received undefined", "nickname": "Invalid input: expected string, received undefined",
			"phone": "Invalid input", "email": "Invalid input", "place": `Invalid option: expected one of "CEB"|"MNL"|"DVO"|"ILO"|"BCD"|"TAG"`,
			"clubId": "Invalid input: expected string, received undefined", "allowDuplicate": "Invalid input: expected boolean, received undefined",
		},
		`{"name":"","nickname":"` + strings.Repeat("k", 61) + `","phone":"x","email":"x","place":"x","clubId":1,"allowDuplicate":1.5}`: {
			"name": "Enter a name.", "nickname": "Too big: expected string to have <=60 characters", "phone": "Invalid input",
			"email": "Invalid email address", "place": `Invalid option: expected one of "CEB"|"MNL"|"DVO"|"ILO"|"BCD"|"TAG"`,
			"clubId": "Invalid input: expected string, received number", "allowDuplicate": "Invalid input: expected boolean, received number",
		},
		`{"name":null,"nickname":[],"phone":"","email":"","place":"CEB","clubId":{},"allowDuplicate":"y"}`: {
			"name": "Invalid input: expected string, received null", "nickname": "Invalid input: expected string, received array",
			"clubId": "Invalid input: expected string, received object", "allowDuplicate": "Invalid input: expected boolean, received string",
		},
		`{"name":"` + strings.Repeat("😀", 61) + `","nickname":"","phone":"","email":"   ","place":"CEB","clubId":"","allowDuplicate":false}`: {
			"name": "Too big: expected string to have <=60 characters", "email": "Invalid email address",
		},
	}
	for doc, want := range cases {
		if _, bad := adminplayer.ParseCreate(object(t, doc)); !reflect.DeepEqual(bad, want) {
			t.Errorf("%.60s: %v, want %v", doc, bad, want)
		}
	}
	if v, bad := adminplayer.ParseCreate(object(t, `{"name":"`+strings.Repeat("😀", 60)+`","nickname":"","phone":"","email":"","place":"TAG","clubId":"","allowDuplicate":false}`)); bad != nil || v.Phone != "" || v.Email != "" {
		t.Errorf("60 emoji are 60 characters: %+v %v", v, bad)
	}
}

func hana() adminplayer.Edit {
	return adminplayer.Edit{
		Name: "Hana Ocampo", Phone: str("+639175550008"), Email: str("hana@example.test"), RtrID: str("RTR-PH-CEB-102926-0014"),
		Claimed: true, HasAccount: true,
	}
}

func hanaForm(t *testing.T, changes string) map[string]any {
	t.Helper()
	form := object(t, `{"picture":null,"name":"Hana Ocampo","nickname":"","playingStyle":"","experienceYears":"","experienceMonths":"","facebook":"",
		"instagram":"","youtube":"","linkedin":"","profilePrivate":false,"phoneHidden":false,"phone":"+639175550008","email":"hana@example.test",
		"password":"","reason":"","registrationPlace":"PH-CEB","registrationDate":"2026-10-29"}`)
	for k, v := range object(t, changes) {
		form[k] = v
	}
	return form
}

func TestParseEditAMessageForEachRule(t *testing.T) {
	long := strings.Repeat("x", 301)
	for _, c := range []struct {
		change, field, message string
	}{
		{`{"name":""}`, "name", "Keep the name under 60 characters."}, // the second rule replaces the first
		{`{"name":"` + strings.Repeat("n", 61) + `"}`, "name", "Keep the name under 60 characters."},
		{`{"nickname":"` + strings.Repeat("k", 31) + `"}`, "nickname", "Keep the nickname under 30 characters."},
		{`{"playingStyle":"` + strings.Repeat("s", 281) + `"}`, "playingStyle", "Too big: expected string to have <=280 characters"},
		{`{"experienceYears":"81"}`, "experienceYears", "Use a whole number of years."},
		{`{"experienceYears":"-1"}`, "experienceYears", "Use a whole number of years."},
		{`{"experienceMonths":"12"}`, "experienceMonths", "Use 0 to 11 months."},
		{`{"experienceMonths":"1e1"}`, "experienceMonths", "Use 0 to 11 months."},
		{`{"facebook":"https://example.com/x"}`, "facebook", "Use a Facebook link, like https://facebook.com/name."},
		{`{"instagram":"x"}`, "instagram", "Use a Instagram link, like https://instagram.com/name."},
		{`{"youtube":"x"}`, "youtube", "Use a YouTube link, like https://youtube.com/@channel."},
		{`{"linkedin":"x"}`, "linkedin", "Use a LinkedIn link, like https://linkedin.com/in/name."},
		{`{"phone":"0917"}`, "phone", "Enter the full phone number, like +63 917 555 0142."},
		{`{"email":"nope"}`, "email", "Enter an email like name@example.com."},
		{`{"email":""}`, "email", "A registered player signs in with email. Enter one."},
		{`{"password":"1234567"}`, "password", "Use at least 8 characters, or leave it empty to keep the current password."},
		{`{"reason":"` + long + `"}`, "reason", "Too big: expected string to have <=300 characters"},
		{`{"registrationDate":"  "}`, "registrationDate", "Enter the registration date."},
		{`{"name":5}`, "name", "Invalid input: expected string, received number"},
		{`{"profilePrivate":"yes"}`, "profilePrivate", "Invalid input: expected boolean, received string"},
		{`{"phoneHidden":null}`, "phoneHidden", "Invalid input: expected boolean, received null"},
		{`{"registrationPlace":5}`, "registrationPlace", "Invalid input: expected string, received number"},
	} {
		_, bad := adminplayer.ParseEdit(hana(), hanaForm(t, c.change), false)
		if bad[c.field] != c.message {
			t.Errorf("%s: %v, want %q", c.change[:min(len(c.change), 50)], bad, c.message)
		}
	}
	// A field of the wrong type stops the rules that depend on the player.
	if _, bad := adminplayer.ParseEdit(hana(), hanaForm(t, `{"email":"","phoneHidden":1}`), false); bad["email"] != "" {
		t.Errorf("the email rule must wait: %v", bad)
	}
}

func TestParseEditAGoodFormAndThePicture(t *testing.T) {
	form := hanaForm(t, `{"name":"  Hana  ","phone":"0917 555 0100","facebook":" https://fb.com/h ","password":"  pw 12345  ","reason":" why ","picture":"character:a","experienceYears":" 2 "}`)
	v, bad := adminplayer.ParseEdit(hana(), form, true)
	if bad != nil || v.Name != "Hana" || v.Phone != "+639175550100" || v.Links["facebook"] != "https://fb.com/h" || v.Password != "  pw 12345  " ||
		v.Reason != "why" || v.Picture == nil || *v.Picture != "character:a" || v.ExperienceYears != "2" || v.RegistrationDate == nil {
		t.Errorf("%+v %v", v, bad)
	}
	for picture, message := range map[string]string{"p.png": "Choose a profile picture.", "": "Choose a profile picture.", "http://x/y.png": "Choose a profile picture."} {
		f := hanaForm(t, `{}`)
		f["picture"] = picture
		if _, bad := adminplayer.ParseEdit(hana(), f, true); bad["picture"] != message {
			t.Errorf("%q: %v", picture, bad)
		}
	}
	for _, ok := range []string{"character:zzz", "data:image/png;base64,x", "https://x/y"} {
		f := hanaForm(t, `{}`)
		f["picture"] = ok
		if _, bad := adminplayer.ParseEdit(hana(), f, true); bad != nil {
			t.Errorf("%q: %v", ok, bad)
		}
	}
	f := hanaForm(t, `{}`)
	delete(f, "picture")
	if _, bad := adminplayer.ParseEdit(hana(), f, true); bad["picture"] != "Invalid input: expected string, received undefined" {
		t.Errorf("missing picture: %v", bad)
	}
	f["picture"] = json.Number("5")
	if _, bad := adminplayer.ParseEdit(hana(), f, true); bad["picture"] != "Invalid input: expected string, received number" {
		t.Errorf("number picture: %v", bad)
	}
	if _, bad := adminplayer.ParseEdit(hana(), f, false); bad != nil {
		t.Errorf("the picture is not part of the first pass: %v", bad)
	}
}

func TestChangedFields(t *testing.T) {
	edit := hana()
	edit.Nickname = str("Han")
	edit.ExperienceYears, edit.ExperienceMonths = whole(2), whole(3)
	edit.Facebook = "https://fb.com/h"
	edit.Picture = str("character:a")
	base := `{"picture":"character:a","name":"Hana Ocampo","nickname":"Han","playingStyle":"","experienceYears":"2","experienceMonths":"3","facebook":"https://fb.com/h","instagram":"","youtube":"","linkedin":"",
		"profilePrivate":false,"phoneHidden":false,"phone":"0917 555 0008","email":"hana@example.test","password":""}`
	if got, crashed := adminplayer.ChangedFields(edit, object(t, base)); len(got) != 0 || crashed {
		t.Errorf("nothing: %v %v", got, crashed)
	}
	all := `{"picture":null,"name":"H","nickname":"","playingStyle":"s","experienceYears":"","experienceMonths":"","facebook":"","instagram":"https://instagram.com/h","youtube":"https://youtu.be/x",
		"linkedin":"https://linkedin.com/in/h","profilePrivate":true,"phoneHidden":true,"phone":"0917 555 0100","email":"Hana@example.test","password":"x"}`
	want := []string{"profile picture", "name", "nickname", "playing style", "experience", "private profile", "phone privacy", "phone", "email", "Facebook link", "Instagram link", "YouTube link", "LinkedIn link", "password"}
	if got, _ := adminplayer.ChangedFields(edit, object(t, all)); !reflect.DeepEqual(got, want) {
		t.Errorf("everything: %v", got)
	}
	// Experience is one field for years and months; digits are compared as numbers, anything else always differs.
	for doc, differs := range map[string]bool{`{"experienceYears":"02","experienceMonths":"3"}`: false, `{"experienceYears":"2","experienceMonths":"x"}`: true, `{"experienceYears":"2","experienceMonths":""}`: true} {
		f := object(t, base)
		for k, v := range object(t, doc) {
			f[k] = v
		}
		got, _ := adminplayer.ChangedFields(edit, f)
		if (len(got) == 1 && got[0] == "experience") != differs || (!differs && len(got) != 0) {
			t.Errorf("%s: %v", doc, got)
		}
	}
	// A typed phone that is not a number compares as typed; a picture of another type always differs.
	for doc, field := range map[string]string{`{"phone":"123"}`: "phone", `{"picture":5}`: "profile picture"} {
		f := object(t, base)
		for k, v := range object(t, doc) {
			f[k] = v
		}
		if got, _ := adminplayer.ChangedFields(edit, f); len(got) != 1 || got[0] != field {
			t.Errorf("%s: %v", doc, got)
		}
	}
	// What the TypeScript would throw on is reported.
	if _, crashed := adminplayer.ChangedFields(edit, map[string]any{}); !crashed {
		t.Error("a form with no text fields must crash")
	}
	f := object(t, base)
	f["phone"] = json.Number("5")
	if _, crashed := adminplayer.ChangedFields(edit, f); !crashed {
		t.Error("a phone that is a number must crash")
	}
	delete(f, "phone")
	if got, crashed := adminplayer.ChangedFields(edit, f); crashed || len(got) != 1 || got[0] != "phone" {
		t.Errorf("a missing phone is empty text, which is not the number on file: %v %v", got, crashed)
	}
}

func TestSavedMessage(t *testing.T) {
	if got := adminplayer.SavedMessage("Hana", nil); got != "Nothing changed." {
		t.Error(got)
	}
	if got := adminplayer.SavedMessage("Hana", []string{"name", "RTR ID"}); got != "Saved Hana: name, RTR ID." {
		t.Error(got)
	}
	if got := adminplayer.SavedMessage("Hana", []string{"password"}); got != "Saved Hana: password. Give the new password to the player yourself." {
		t.Error(got)
	}
}

func TestExperienceMonths(t *testing.T) {
	for _, c := range []struct {
		years, months string
		total         int32
		none          bool
	}{{"", "", 0, true}, {"2", "3", 27, false}, {"", "7", 7, false}, {"4", "", 48, false}, {"0", "0", 0, false}, {"80", "11", 971, false}} {
		if total, none := adminplayer.ExperienceMonths(c.years, c.months); total != c.total || none != c.none {
			t.Errorf("%q %q: %d %v", c.years, c.months, total, none)
		}
	}
}

func TestMatchesProvider(t *testing.T) {
	fb := []string{"facebook.com", "fb.com"}
	for link, want := range map[string]bool{
		"https://facebook.com/hana":              true,
		"https://m.facebook.com/hana":            true,
		"https://WEB.Facebook.COM/hana":          true,
		"http://facebook.com/hana":               true,
		"HTTPS://facebook.com/hana":              true,
		"https:facebook.com/hana":                true,
		"https:/facebook.com/hana":               true,
		"https:\\\\facebook.com\\hana":           true,
		"https://user@facebook.com/hana":         true,
		"https://user:pw@facebook.com:8443/hana": true,
		"https://facebook.com:/hana":             true,
		"https://facebook.com/ha na":             true,
		"https://facebook.com?x":                 true,
		"https://face\tbook.com/x":               true,
		"https://%66acebook.com/x":               true,
		"https://fb.com":                         true,
		"https://facebook.com.evil.example/x":    false,
		"https://evilfacebook.com/x":             false,
		"https://facebook.com./x":                false,
		"https://example.com/facebook.com":       false,
		"https://example.com@evil.example/":      false,
		"https://facebook.com:99999/x":           false,
		"https://facebook.com:80a/x":             false,
		"https://[::1]/x":                        false,
		"https://face book.com/x":                false,
		"https://":                               false,
		"https:///":                              false,
		"ftp://facebook.com/x":                   false,
		"facebook.com/hana":                      false,
		"//facebook.com/hana":                    false,
		":facebook.com":                          false,
		"https://facebook.com%2f@x/":             false,
		"https://fa%zzebook.com/":                false,
		"https://facebook.com%/":                 false,
		"https://ｆacebook.com/x":                 true,
	} {
		if got := adminplayer.MatchesProvider(link, fb); got != want {
			t.Errorf("%q: %v, want %v", link, got, want)
		}
	}
	if len(adminplayer.Providers) != 4 || adminplayer.Providers[2].LinkMessage() != "Use a YouTube link, like https://youtube.com/@channel." {
		t.Error("providers")
	}
}

func TestImageReadable(t *testing.T) {
	const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADA"
	const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAAAAAAAAAAAAAAAAAAAAAA="
	for dataURL, want := range map[string]bool{
		png: true, jpg: true,
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB":                          false, // 1 by 1
		"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAAAAAAAAAAAAAAAAAAAAAB=": false, // not a whole group
		"data:image/png;base64,iVBORw0KGgo=":                                              false, // too short
		"data:image/png;base64,":                                                          false,
		"data:image/gif;base64,R0lGODlhAQABAAAAACw=":                                      false,
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADA ":                         false, // trailing space
		"data:image/png;base64,@@@@":                                                      false,
		"data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=":         false, // no JPEG marker
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADB":                          false, // not canonical
	} {
		if got := adminplayer.ImageReadable(dataURL); got != want {
			t.Errorf("%s: %v, want %v", dataURL, got, want)
		}
	}
	if adminplayer.ImageReadable("data:image/jpeg;base64," + strings.Repeat("A", 1398105)) {
		t.Error("too long")
	}
	if adminplayer.ImageReadable("data:image/jpeg;base64," + strings.Repeat("/9j/", 349526)) {
		t.Error("more than a MiB of bytes")
	}
}

func TestIsEmail(t *testing.T) {
	for in, want := range map[string]bool{
		"a@b.co": true, "o'neil+x@mail.example.co.ph": true, "a.b.c@d-e.fg": true, "a@b": false, "@b.co": false, ".a@b.co": false,
		"a..b@c.de": false, "a@b.c": false, "a b@c.de": false, "nín@x.de": false, "a@b@c.de": false, "a@-b.de": false, "a@b.de.": false,
	} {
		if got := adminplayer.IsEmail(in); got != want {
			t.Errorf("%q: %v, want %v", in, got, want)
		}
	}
}
