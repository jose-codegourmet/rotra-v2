package model

import (
	"encoding/json"
	"strings"
	"testing"
)

// absent, null and a value must each survive a round trip: the rules copy whole objects to their output.
func TestOptKeepsAbsentNullAndValueApart(t *testing.T) {
	for _, tc := range []struct{ in, out string }{
		{`{"id":"m"}`, `"placedAt"`},
		{`{"id":"m","placedAt":null}`, `"placedAt":null`},
		{`{"id":"m","placedAt":42}`, `"placedAt":42`},
	} {
		var m Match
		if err := json.Unmarshal([]byte(tc.in), &m); err != nil {
			t.Fatal(err)
		}
		raw, err := json.Marshal(m)
		if err != nil {
			t.Fatal(err)
		}
		has := strings.Contains(string(raw), tc.out)
		if tc.out == `"placedAt"` && strings.Contains(string(raw), `placedAt`) {
			t.Errorf("an absent placedAt must stay absent: %s", raw)
		} else if tc.out != `"placedAt"` && !has {
			t.Errorf("%s: want %s in %s", tc.in, tc.out, raw)
		}
	}
}

func TestOptValueAndConstructors(t *testing.T) {
	if _, ok := (Opt[int64]{}).Value(); ok {
		t.Error("absent has no value")
	}
	if _, ok := Null[int64]().Value(); ok {
		t.Error("null has no value")
	}
	if v, ok := Some(int64(7)).Value(); !ok || v != 7 {
		t.Errorf("Some(7) = %d %v", v, ok)
	}
	if !(Opt[bool]{}).IsZero() || Some(false).IsZero() || Null[bool]().IsZero() {
		t.Error("only the absent field is zero")
	}
	var o Opt[int64]
	if err := json.Unmarshal([]byte(`"x"`), &o); err == nil {
		t.Error("a string is not an int64")
	}
	var set Opt[int64]
	_ = json.Unmarshal([]byte(`null`), &set)
	_ = json.Unmarshal([]byte(`5`), &set)
	if v, ok := set.Value(); !ok || v != 5 {
		t.Error("a value after null replaces it")
	}
}

func TestMatchHelpers(t *testing.T) {
	m := Match{State: StateOnCourt, TeamA: []string{"a"}, TeamB: []string{"b", "c"}}
	if !m.HoldsCourt() || (Match{State: StateWaiting}).HoldsCourt() {
		t.Error("only On court and Playing hold a court")
	}
	if got := strings.Join(m.AllPlayers(), ","); got != "a,b,c" {
		t.Errorf("AllPlayers = %s", got)
	}
	zero, one := int64(0), int64(1)
	if (Court{}).Removed() || (Court{RemovedAt: &zero}).Removed() || !(Court{RemovedAt: &one}).Removed() {
		t.Error("removedAt 0 or null is not removed, like `!court.removedAt`")
	}
}
