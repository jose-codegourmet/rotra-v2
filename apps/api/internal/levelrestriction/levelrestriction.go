// Package levelrestriction is a session's Restrictions (D-2026-11-19-12, Q28.5) as the apps read and save it: the wire shape
// (levelRestrictionDto), the columns behind it, and the check of a request body (levelRestrictionInput). The check on a player's
// level is the shared rule in rules/roster.
package levelrestriction

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/roster"
)

// Slots is the slots per level of the per-level pick.
type Slots struct {
	Beginner     int32 `json:"beginner"`
	Intermediate int32 `json:"intermediate"`
	Advanced     int32 `json:"advanced"`
}

// Wire is LevelRestriction on the wire: the kind, and the slots per level for slots per level only.
type Wire struct {
	Kind  string `json:"kind"`
	Slots *Slots `json:"slots,omitempty"`
}

// Of is levelRestrictionDto: the stored pick, with the three slot counts only for slots per level.
func Of(kind sqlcgen.LevelRestriction, beginner, intermediate, advanced pgtype.Int4) Wire {
	switch kind {
	case sqlcgen.LevelRestrictionBeginners:
		return Wire{Kind: roster.KindBeginners}
	case sqlcgen.LevelRestrictionBeginnersIntermediate:
		return Wire{Kind: roster.KindBeginnersIntermediate}
	case sqlcgen.LevelRestrictionSlotsPerBand:
		return Wire{Kind: roster.KindPerLevel, Slots: &Slots{Beginner: beginner.Int32, Intermediate: intermediate.Int32, Advanced: advanced.Int32}}
	}
	return Wire{Kind: roster.KindAll}
}

// Rule is the restriction in the shape of the shared rule.
func (w Wire) Rule() *roster.LevelRestriction {
	r := &roster.LevelRestriction{Kind: w.Kind}
	if w.Slots != nil {
		r.Slots = &roster.LevelSlots{Beginner: float64(w.Slots.Beginner), Intermediate: float64(w.Slots.Intermediate), Advanced: float64(w.Slots.Advanced)}
	}
	return r
}

// Restricted is a restriction other than All levels (the check is skipped for All levels).
func (w Wire) Restricted() bool { return w.Kind != roster.KindAll }

// Columns are the four columns a pick is stored in.
type Columns struct {
	Kind                             sqlcgen.LevelRestriction
	Beginner, Intermediate, Advanced pgtype.Int4
}

const slotsNumberError = "Use whole numbers, 0 or more."
const pickError = "Choose which levels can take a slot."

// Input is levelRestrictionInput: the columns to write from a request body's levelRestriction, and whether to write them at all
// (a body that leaves it out, or sends null, keeps the stored pick). When the body is refused it answers the message the 422 carries
// under the field "levelRestriction". courts is the session's court count and perCourt its players per court.
func Input(value any, courts int, perCourt int16) (cols Columns, set bool, refused string) {
	if value == nil {
		return Columns{}, false, ""
	}
	obj, isObject := value.(map[string]any)
	kind, kindOK := "", false
	slotsBad := false
	var counts [3]float64
	slotsPresent := false
	if isObject {
		kind, kindOK = pickOf(obj["kind"])
		if raw, has := obj["slots"]; has {
			slotsPresent = true
			slots, ok := raw.(map[string]any)
			if !ok {
				slotsBad = true
			} else {
				for n, band := range [3]string{"beginner", "intermediate", "advanced"} {
					c, ok := countOf(slots[band])
					if !ok {
						slotsBad = true
					}
					counts[n] = c
				}
			}
		}
	}
	// The Zod parse collects every issue; one under `slots` wins the message.
	if slotsBad {
		return Columns{}, false, slotsNumberError
	}
	if !isObject || !kindOK {
		return Columns{}, false, pickError
	}
	if kind != roster.KindPerLevel {
		cols = Columns{Kind: storedOf(kind)}
		return cols, true, ""
	}
	if !slotsPresent {
		counts = [3]float64{} // slots missing read as 0 each: the sum then differs from the session's slots
	}
	// levelSlotsError: the counts must add up to the session's slots.
	sum := counts[0] + counts[1] + counts[2]
	capacity := courts * int(perCourt)
	if sum != float64(capacity) {
		plural := "s"
		if courts == 1 {
			plural = ""
		}
		return Columns{}, false, fmt.Sprintf("The slots add up to %s; this session has %d (%d court%s × %d).", strconv.FormatFloat(sum, 'f', -1, 64), capacity, courts, plural, perCourt)
	}
	return Columns{
		Kind: sqlcgen.LevelRestrictionSlotsPerBand, Beginner: pgtype.Int4{Int32: int32(counts[0]), Valid: true},
		Intermediate: pgtype.Int4{Int32: int32(counts[1]), Valid: true}, Advanced: pgtype.Int4{Int32: int32(counts[2]), Valid: true},
	}, true, ""
}

func pickOf(v any) (string, bool) {
	s, _ := v.(string)
	switch s {
	case roster.KindAll, roster.KindBeginners, roster.KindBeginnersIntermediate, roster.KindPerLevel:
		return s, true
	}
	return "", false
}

func storedOf(kind string) sqlcgen.LevelRestriction {
	switch kind {
	case roster.KindBeginners:
		return sqlcgen.LevelRestrictionBeginners
	case roster.KindBeginnersIntermediate:
		return sqlcgen.LevelRestrictionBeginnersIntermediate
	case roster.KindPerLevel:
		return sqlcgen.LevelRestrictionSlotsPerBand
	}
	return sqlcgen.LevelRestrictionAll
}

// countOf is levelSlotsField: a JSON number that is a whole number, 0 or more.
func countOf(v any) (float64, bool) {
	n, ok := v.(json.Number)
	if !ok {
		return 0, false
	}
	f, err := strconv.ParseFloat(string(n), 64)
	if err != nil || math.IsNaN(f) || math.IsInf(f, 0) || f != math.Trunc(f) || f < 0 || f > 9007199254740991 {
		return 0, false
	}
	return f, true
}

// Block is levelRestrictionBlockFor: why a player of this level cannot take a slot in a session now, or none. rosterLevels is the levels of
// the live roster (nil entries have none); a player with no level is always allowed. The rule itself is rules/roster.
func Block(w Wire, level *string, rosterLevels []*string) (string, bool) {
	if !w.Restricted() || level == nil {
		return "", false
	}
	codes := make([]string, 0, len(rosterLevels))
	for _, c := range rosterLevels {
		if c != nil {
			codes = append(codes, *c)
		}
	}
	rs, err := rules.For(1) // version 1 until a session stamps its rules version
	if err != nil {
		return "", false // version 1 always exists
	}
	return rs.LevelRestrictionBlock(w.Rule(), roster.LevelBandOf(*level), roster.LevelBandCounts(codes))
}
