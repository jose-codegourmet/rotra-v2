package profile_test

import (
	"math"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

func f64(v float64) *float64 { return &v }

func base() profile.Input {
	return profile.Input{FullName: "Ana Reyes", Links: map[string]string{"facebook": "", "instagram": "", "youtube": "", "linkedin": ""}}
}

func wantField(t *testing.T, name string, in profile.Input, field, message string) {
	t.Helper()
	_, ferr := profile.Parse(in)
	if ferr == nil || ferr.Field != field || ferr.Message != message {
		t.Errorf("%s: %+v, want %s: %q", name, ferr, field, message)
	}
}

// updateMyProfile (profile.ts) answers invalid for an empty full name and for experience out of range; the
// field limits are the @rotra/schema ones (60, 24, 280, years 0-80, months 0-11, provider links).
func TestParseFullName(t *testing.T) {
	in := base()
	in.FullName = " \t "
	wantField(t, "blank", in, "fullName", "Enter your full name.")
	in.FullName = strings.Repeat("a", 61)
	wantField(t, "61", in, "fullName", "Keep your name to 60 characters or fewer.")
	in.FullName = strings.Repeat("\U0001F3F8", 61) // zod 4 counts code points: 61 of them are too many
	wantField(t, "code points", in, "fullName", "Keep your name to 60 characters or fewer.")
	in.FullName = strings.Repeat("\U0001F3F8", 31) // 62 UTF-16 units but 31 code points: fine
	if _, ferr := profile.Parse(in); ferr != nil {
		t.Fatalf("31 emoji: %+v", ferr)
	}
	in.FullName = "  " + strings.Repeat("a", 60) + "\n"
	d, ferr := profile.Parse(in)
	if ferr != nil || d.FullName != strings.Repeat("a", 60) {
		t.Fatalf("60 trimmed: %+v %+v", d, ferr)
	}
	in.FullName = "Ana\x00"
	wantField(t, "NUL", in, "fullName", "Check the details and try again.")
}

func TestParseNicknameAndStyle(t *testing.T) {
	in := base()
	in.Nickname = "   "
	d, ferr := profile.Parse(in)
	if ferr != nil || d.Nickname != "" {
		t.Fatalf("blank nickname is none: %+v %+v", d, ferr)
	}
	in.Nickname = " Nana "
	d, _ = profile.Parse(in)
	if d.Nickname != "Nana" {
		t.Fatalf("%q", d.Nickname)
	}
	in.Nickname = strings.Repeat("n", 25)
	wantField(t, "nickname", in, "nickname", "Keep your nickname to 24 characters or fewer.")
	in.Nickname = ""
	in.PlayingStyle = strings.Repeat("s", 281)
	wantField(t, "style", in, "playingStyle", "Keep your playing style to 280 characters or fewer.")
	in.PlayingStyle = "  baseline  "
	d, _ = profile.Parse(in)
	if d.PlayingStyle != "baseline" {
		t.Fatalf("%q", d.PlayingStyle)
	}
}

func TestParseExperience(t *testing.T) {
	const msg = "Enter years and months of experience."
	ok := map[string]struct {
		years, months *float64
		want          *int32
	}{
		"none":              {nil, nil, nil},
		"years only":        {f64(3), nil, i32(36)},
		"months only":       {nil, f64(5), i32(5)},
		"both":              {f64(3), f64(4), i32(40)},
		"zero":              {f64(0), f64(0), i32(0)},
		"max":               {f64(80), f64(11), i32(971)},
		"3.0 is an integer": {f64(3.0), nil, i32(36)},
	}
	for name, c := range ok {
		in := base()
		in.ExperienceYears, in.ExperienceMonths = c.years, c.months
		d, ferr := profile.Parse(in)
		if ferr != nil {
			t.Errorf("%s: %+v", name, ferr)
			continue
		}
		if (d.ExperienceMonths == nil) != (c.want == nil) || (c.want != nil && *d.ExperienceMonths != *c.want) {
			t.Errorf("%s: %v, want %v", name, deref(d.ExperienceMonths), deref(c.want))
		}
	}
	for name, c := range map[string][2]*float64{
		"12 months":      {f64(1), f64(12)},
		"negative years": {f64(-1), nil},
		"negative month": {nil, f64(-1)},
		"fraction":       {f64(1.5), nil},
		"not a number":   {f64(math.NaN()), nil}, // a value that was not a JSON number
		"infinity":       {f64(math.Inf(1)), nil},
		"81 years":       {f64(81), nil},
		"huge":           {f64(1e12), nil},
	} {
		in := base()
		in.ExperienceYears, in.ExperienceMonths = c[0], c[1]
		wantField(t, name, in, "experience", msg)
	}
}

func TestParseLinks(t *testing.T) {
	in := base()
	in.Links = map[string]string{
		"facebook": " https://facebook.com/ana ", "instagram": "https://m.instagram.com/ana",
		"youtube": "https://youtu.be/xyz", "linkedin": "https://LinkedIn.com/in/ana",
	}
	d, ferr := profile.Parse(in)
	if ferr != nil {
		t.Fatalf("%+v", ferr)
	}
	if d.Links["facebook"] != "https://facebook.com/ana" || d.Links["linkedin"] != "https://LinkedIn.com/in/ana" || len(d.Links) != 4 {
		t.Fatalf("%v", d.Links)
	}
	for name, c := range map[string][2]string{
		"other host":        {"facebook", "https://twitter.com/ana"},
		"suffix trick":      {"facebook", "https://facebook.com.evil.example/ana"},
		"not a link":        {"instagram", "instagram.com/ana"},
		"http is refused":   {"instagram", "http://instagram.com/ana"}, // the database requires https://
		"upper case scheme": {"youtube", "HTTPS://youtube.com/@a"},     // ... and so does the check, case-sensitively
		"other scheme":      {"youtube", "ftp://youtube.com/@a"},
		"userinfo":          {"linkedin", "https://linkedin.com@evil.example/in/a"},
		"space inside":      {"linkedin", "https://linkedin.com/in/a b"},
		"NUL":               {"linkedin", "https://linkedin.com/in/a\x00"},
	} {
		in := base()
		in.Links[c[0]] = c[1]
		label := map[string]string{"facebook": "Facebook", "instagram": "Instagram", "youtube": "YouTube", "linkedin": "LinkedIn"}[c[0]]
		example := map[string]string{"facebook": "https://facebook.com/yourname", "instagram": "https://instagram.com/yourname",
			"youtube": "https://youtube.com/@yourchannel", "linkedin": "https://linkedin.com/in/yourname"}[c[0]]
		wantField(t, name, in, c[0], "Enter a full "+label+" link, like "+example+".")
	}
	// a provider left out is left alone (Edit profile sends only what changed); an unknown key is ignored
	in = base()
	in.Links = map[string]string{"facebook": "https://fb.com/a", "mastodon": "https://x.example"}
	d, ferr = profile.Parse(in)
	if ferr != nil || len(d.Links) != 1 || d.Links["facebook"] != "https://fb.com/a" {
		t.Fatalf("%+v %+v", d.Links, ferr)
	}
}

// The first problem wins, in the order of the form: name, nickname, style, experience, then the links.
func TestParseReportsTheFirstProblemOnly(t *testing.T) {
	in := base()
	in.FullName, in.Nickname = "", strings.Repeat("n", 30)
	in.ExperienceYears = f64(-1)
	in.Links["facebook"] = "nope"
	wantField(t, "name first", in, "fullName", "Enter your full name.")
	in.FullName = "Ana"
	wantField(t, "nickname next", in, "nickname", "Keep your nickname to 24 characters or fewer.")
	in.Nickname = ""
	wantField(t, "experience next", in, "experience", "Enter years and months of experience.")
	in.ExperienceYears = nil
	wantField(t, "link last", in, "facebook", "Enter a full Facebook link, like https://facebook.com/yourname.")
}

// experienceUpdate in profile.ts: an unchanged value keeps its recorded date; a new value is recorded now; none
// clears both together.
func TestExperienceChange(t *testing.T) {
	now := d("2026-11-17T12:00:00Z")
	cases := []struct {
		name          string
		next, shown   *int32
		wantMonths    *int32
		wantRecorded  bool
		keepsOldStamp bool
	}{
		{"unchanged", i32(20), i32(20), nil, false, true},
		{"both none", nil, nil, nil, false, true},
		{"changed", i32(21), i32(20), i32(21), true, false},
		{"set from none", i32(3), nil, i32(3), true, false},
		{"cleared", nil, i32(20), nil, false, false},
	}
	for _, c := range cases {
		ch := profile.ExperienceChange(c.next, c.shown, now)
		if ch.Keep != c.keepsOldStamp {
			t.Errorf("%s: keep %v", c.name, ch.Keep)
		}
		if ch.Keep {
			continue
		}
		if (ch.Months == nil) != (c.wantMonths == nil) || (c.wantMonths != nil && *ch.Months != *c.wantMonths) {
			t.Errorf("%s: months %v", c.name, deref(ch.Months))
		}
		if (ch.RecordedAt != nil) != c.wantRecorded || (ch.RecordedAt != nil && !ch.RecordedAt.Equal(now)) {
			t.Errorf("%s: recorded %v", c.name, ch.RecordedAt)
		}
	}
}
