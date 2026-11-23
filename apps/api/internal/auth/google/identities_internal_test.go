package google

import (
	"reflect"
	"testing"
	"time"
)

func TestLevelLabelAndInitialsFollowTheTypeScript(t *testing.T) {
	for in, want := range map[string]string{"beginner_low": "Beginner Low", "advanced_high": "Advanced High", "intermediate_mid": "Intermediate Mid"} {
		if got := levelLabel(in); got != want {
			t.Errorf("levelLabel(%q) = %q, want %q", in, got, want)
		}
	}
	for in, want := range map[string]string{"Lahug Smash Club": "LS", "  cebu   birdie  club ": "CB", "Solo": "S", "": "", "Ñandú Club": "ÑC"} {
		if got := initials(in); got != want {
			t.Errorf("initials(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestReadOwnDetailsReadsAnythingMalformedAsNotEntered(t *testing.T) {
	d := readOwnDetails([]byte(`{"playingStyle":"Net","experienceMonths":14,"experienceRecordedAt":"2026-05-01T00:00:00.000Z","socialLinks":{"facebook":"f","instagram":3}}`))
	if d.style != "Net" || d.months == nil || *d.months != 14 || d.recordedAt == nil || !d.recordedAt.Equal(time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("%+v", d)
	}
	if !reflect.DeepEqual(d.links, map[string]string{"facebook": "f", "instagram": "", "youtube": "", "linkedin": ""}) {
		t.Fatalf("links %v", d.links)
	}
	for _, bad := range []string{``, `null`, `[]`, `"x"`, `{"experienceMonths":1.5,"experienceRecordedAt":"nope","socialLinks":[]}`, `{"playingStyle":7}`} {
		d := readOwnDetails([]byte(bad))
		if d.style != "" || d.months != nil || d.recordedAt != nil {
			t.Errorf("%q read as %+v", bad, d)
		}
	}
}

func TestSafeReturnPath(t *testing.T) {
	for in, want := range map[string]string{
		"/me?x=1&y=2": "/me?x=1&y=2", "/": "/", "/a/b": "/a/b", "/api": "/api",
		"": "/login", "//x": "/login", "/\\x": "/login", "/api/x": "/login", "x": "/login", "http://x": "/login",
	} {
		if got := safeReturnPath(in); got != want {
			t.Errorf("safeReturnPath(%q) = %q, want %q", in, got, want)
		}
	}
}
