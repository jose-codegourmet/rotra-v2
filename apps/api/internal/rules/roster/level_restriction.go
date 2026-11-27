package roster

import (
	"strconv"
	"strings"
)

// Level restrictions on slots (D-2026-11-19-12, Q28.5): the Go copy of
// packages/data/src/session-roster/levelRestriction.rules.ts. Cases: v1/roster/levelRestrictionBlock.json.

// Restriction kinds, as the apps read them (LevelRestriction['kind']).
const (
	KindAll                   = "all"
	KindBeginners             = "beginners"
	KindBeginnersIntermediate = "beginners-intermediate"
	KindPerLevel              = "per-level"
)

// The three level bands, in order.
const (
	BandBeginner     = "beginner"
	BandIntermediate = "intermediate"
	BandAdvanced     = "advanced"
)

// The reasons a player of a band is refused a slot.
const (
	BeginnersOnlyError         = "This session is for beginners only."
	BeginnersIntermediateError = "This session is for beginners to intermediate only."
)

// LevelSlots is a number per band: the slots a session offers, or the slots taken.
type LevelSlots struct {
	Beginner     float64 `json:"beginner"`
	Intermediate float64 `json:"intermediate"`
	Advanced     float64 `json:"advanced"`
}

func (s LevelSlots) of(band string) float64 {
	switch band {
	case BandBeginner:
		return s.Beginner
	case BandIntermediate:
		return s.Intermediate
	}
	return s.Advanced
}

// LevelRestriction is the pick a session carries; Slots is read only for per-level. An unknown kind reads as all.
type LevelRestriction struct {
	Kind  string      `json:"kind"`
	Slots *LevelSlots `json:"slots"`
}

// LevelBandOf is a level's band (Beginner, Intermediate, Advanced); "" without a level or with a code that is no level.
func LevelBandOf(level string) string {
	band, _, _ := strings.Cut(level, "_")
	switch band {
	case BandBeginner, BandIntermediate, BandAdvanced:
		return band
	}
	return ""
}

// LevelBandCounts is the slots taken per band: the roster's players by their level's band. The waitlist does not count.
func LevelBandCounts(levels []string) LevelSlots {
	var taken LevelSlots
	for _, level := range levels {
		switch LevelBandOf(level) {
		case BandBeginner:
			taken.Beginner++
		case BandIntermediate:
			taken.Intermediate++
		case BandAdvanced:
			taken.Advanced++
		}
	}
	return taken
}

// LevelRestrictionBlock is whether a player of this band may take a slot: "" and false when allowed, otherwise the reason.
// taken is LevelBandCounts of the roster, read only for slots per level. A missing or unknown restriction reads as all
// levels; a player with no band (no level) is always allowed.
func LevelRestrictionBlock(restriction *LevelRestriction, band string, taken LevelSlots) (string, bool) {
	if band == "" || restriction == nil {
		return "", false
	}
	switch restriction.Kind {
	case KindBeginners:
		if band != BandBeginner {
			return BeginnersOnlyError, true
		}
	case KindBeginnersIntermediate:
		if band == BandAdvanced {
			return BeginnersIntermediateError, true
		}
	case KindPerLevel:
		var total float64
		if restriction.Slots != nil {
			total = restriction.Slots.of(band)
		}
		if taken.of(band) >= total {
			n := strconv.FormatFloat(total, 'f', -1, 64)
			if total != 0 {
				return "All " + n + " " + band + " slots are taken.", true
			}
			return "This session has no " + band + " slots.", true
		}
	}
	return "", false
}

// LevelRestrictionBlockFor is the level form of LevelRestrictionBlock: a level against a session's roster levels.
func LevelRestrictionBlockFor(restriction *LevelRestriction, level string, rosterLevels []string) (string, bool) {
	return LevelRestrictionBlock(restriction, LevelBandOf(level), LevelBandCounts(rosterLevels))
}
