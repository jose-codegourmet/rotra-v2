package levelrestriction

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

func parse(t *testing.T, text string) any {
	t.Helper()
	d := json.NewDecoder(strings.NewReader(text))
	d.UseNumber()
	var v any
	if err := d.Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

// The messages and the pick are the TypeScript's (levelRestrictionInput); their goldens are queuewrites prep.golden.json.
func TestInput(t *testing.T) {
	for _, c := range []struct {
		name, body string
		set        bool
		refused    string
	}{
		{"no body keeps", `null`, false, ""},
		{"all", `{"kind":"all"}`, true, ""},
		{"per level adds up", `{"kind":"per-level","slots":{"beginner":2,"intermediate":1,"advanced":1}}`, true, ""},
		{"per level short", `{"kind":"per-level","slots":{"beginner":1,"intermediate":1,"advanced":1}}`, false, "The slots add up to 3; this session has 4 (2 courts × 2)."},
		{"per level not whole", `{"kind":"per-level","slots":{"beginner":1.5,"intermediate":1.5,"advanced":1}}`, false, slotsNumberError},
		{"per level negative", `{"kind":"per-level","slots":{"beginner":-1,"intermediate":3,"advanced":2}}`, false, slotsNumberError},
		{"unknown kind", `{"kind":"experts"}`, false, pickError},
		{"a string", `"beginners"`, false, pickError},
		{"bad slots win over a bad kind", `{"kind":"experts","slots":{"beginner":-1,"intermediate":0,"advanced":0}}`, false, slotsNumberError},
	} {
		_, set, refused := Input(parse(t, c.body), 2, 2)
		if set != c.set || refused != c.refused {
			t.Errorf("%s: set %v refused %q, want %v %q", c.name, set, refused, c.set, c.refused)
		}
	}
}

func TestOf(t *testing.T) {
	slots := Of(sqlcgen.LevelRestrictionSlotsPerBand, pgtype.Int4{Int32: 3, Valid: true}, pgtype.Int4{Int32: 2, Valid: true}, pgtype.Int4{})
	if slots.Kind != "per-level" || slots.Slots == nil || *slots.Slots != (Slots{3, 2, 0}) {
		t.Errorf("per level: %+v", slots)
	}
	if got := Of(sqlcgen.LevelRestrictionBeginnersIntermediate, pgtype.Int4{}, pgtype.Int4{}, pgtype.Int4{}); got.Kind != "beginners-intermediate" || got.Slots != nil {
		t.Errorf("beginners-intermediate: %+v", got)
	}
}
