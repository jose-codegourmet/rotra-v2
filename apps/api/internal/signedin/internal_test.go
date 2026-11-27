package signedin

import "testing"

func TestReadClubInviteCodeNormalizesLikeTheTypeScript(t *testing.T) {
	for in, want := range map[string]string{
		" smash2026abc ": "SMASH2026ABC",
		"STRASSE12":      "STRASSE12",
		"straße12":       "STRASSE12", // JavaScript's toUpperCase expands the sharp s
		"ﬁnal2026":       "FINAL2026",
		" abcd1234 ":     "ABCD1234",
	} {
		got, ok := readClubInviteCode(in)
		if !ok || got != want {
			t.Errorf("%q: got %q %v, want %q", in, got, ok, want)
		}
	}
	for _, bad := range []string{"", "ABC", "ABCDEFGH1234567890", "abcd-1234", "abcd 1234", "abéd1234", "ABCD-EFGH"} {
		if _, ok := readClubInviteCode(bad); ok {
			t.Errorf("%q must not look like a code", bad)
		}
	}
}

func TestMaskPhone(t *testing.T) {
	for in, want := range map[string]string{
		"+639185550377": "+63 918 ••• ••77",
		"09185550377":   "+63 918 ••• ••77",
		"+14155550123":  "+1 415 ••• ••23",
		"+12345678":     "+12 345 ••• ••78",
		"no digits":     "no digits",
		"":              "",
		"7":             "+7  ••• ••",
	} {
		if got := maskPhone(in); got != want {
			t.Errorf("%q: got %q, want %q", in, got, want)
		}
	}
}

func TestOwnStandingPosition(t *testing.T) {
	mine := map[string]bool{"a": true}
	num := func(v float64) *float64 { return &v }
	for name, tc := range map[string]struct {
		raw  string
		want *float64
	}{
		// The saved standings are shown with shared positions without gaps (1, 1, 2), whatever position they were saved with.
		"first row of mine":         {`[{"clubPlayerId":"b","wins":3,"losses":0,"position":1},{"clubPlayerId":"a","wins":1,"losses":1,"position":3}]`, num(2)},
		"saved with a gap":          {`[{"clubPlayerId":"b","wins":3,"losses":0,"position":1},{"clubPlayerId":"c","wins":3,"losses":0,"position":1},{"clubPlayerId":"a","wins":1,"losses":1,"position":3}]`, num(2)},
		"the first match decides":   {`[{"clubPlayerId":"a","wins":2,"losses":0,"position":"2"},{"clubPlayerId":"a","wins":1,"losses":0,"position":3}]`, num(1)},
		"null position":             {`[{"clubPlayerId":"a","position":null}]`, num(1)},
		"missing position":          {`[{"clubPlayerId":"a"}]`, num(1)},
		"clubPlayerId not a string": {`[{"clubPlayerId":5,"position":1}]`, nil},
		"not an array":              {`{"clubPlayerId":"a","position":1}`, nil},
		"no snapshot":               {``, nil},
		"row is not an object":      {`[1,"a",{"clubPlayerId":"a","position":2.5}]`, num(1)},
	} {
		got := ownStandingPosition([]byte(tc.raw), mine)
		if (got == nil) != (tc.want == nil) || (got != nil && *got != *tc.want) {
			t.Errorf("%s: got %v, want %v", name, got, tc.want)
		}
	}
}

func TestParseUUIDStringIsStrict(t *testing.T) {
	for _, ok := range []string{"b4000000-0000-4000-8000-000000000001", "B4000000-0000-4000-8000-00000000000A"} {
		if _, valid := parseUUIDString(ok); !valid {
			t.Errorf("%q is a UUID", ok)
		}
	}
	for _, bad := range []string{"", "nope", "b4000000-0000-4000-8000-00000000000", "b4000000_0000_4000_8000_000000000001", "g4000000-0000-4000-8000-000000000001", "{b4000000-0000-4000-8000-000000000001}"} {
		if _, valid := parseUUIDString(bad); valid {
			t.Errorf("%q is not a UUID", bad)
		}
	}
}

func TestServiceErrorNamesItsCode(t *testing.T) {
	if errNotFound.Error() != "not_found" {
		t.Fatalf("%q", errNotFound.Error())
	}
}
