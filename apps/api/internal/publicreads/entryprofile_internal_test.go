package publicreads

import "testing"

func TestReadOwnDetailsReadsOnlyWellFormedValues(t *testing.T) {
	cases := []struct {
		name   string
		stored string
		style  string
		months int64 // -1: not entered
		links  socialLinks
	}{
		{"nothing stored", ``, "", -1, socialLinks{}},
		{"null", `null`, "", -1, socialLinks{}},
		{"an array", `[]`, "", -1, socialLinks{}},
		{"the stored shape", `{"version":1,"playingStyle":"Smasher","experienceMonths":30,"experienceRecordedAt":"2026-05-20T00:00:00.000Z","socialLinks":{"facebook":"f","youtube":"y"}}`, "Smasher", 30, socialLinks{Facebook: "f", Youtube: "y"}},
		{"a whole number written with a point", `{"experienceMonths":6.0}`, "", 6, socialLinks{}},
		{"months that are not a whole number", `{"experienceMonths":6.5}`, "", -1, socialLinks{}},
		{"months written as text", `{"experienceMonths":"12"}`, "", -1, socialLinks{}},
		{"a style that is not text", `{"playingStyle":7}`, "", -1, socialLinks{}},
		{"links that are not an object", `{"socialLinks":"x"}`, "", -1, socialLinks{}},
		{"a link that is not text", `{"socialLinks":{"facebook":3,"linkedin":"l"}}`, "", -1, socialLinks{Linkedin: "l"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := readOwnDetails([]byte(c.stored))
			if got.playingStyle != c.style || got.links != c.links {
				t.Fatalf("style %q links %+v, want %q %+v", got.playingStyle, got.links, c.style, c.links)
			}
			switch {
			case c.months < 0 && got.months != nil:
				t.Fatalf("months = %d, want none", *got.months)
			case c.months >= 0 && (got.months == nil || *got.months != c.months):
				t.Fatalf("months = %v, want %d", got.months, c.months)
			}
		})
	}
}
