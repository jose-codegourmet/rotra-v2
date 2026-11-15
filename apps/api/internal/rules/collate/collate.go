// Package collate orders names the way the TypeScript `a.localeCompare(b)` does today in an en-US
// environment (ICU root collation, default strength: letters first by base letter, then accents,
// then case with lowercase first; spaces and punctuation are not ignored). Go's standard library has
// no collation and golang.org/x/text is not allowed, so this is a small documented subset.
//
// What it matches (checked against Node's ICU in collate_test.go with a committed golden file):
//   - ASCII, Latin-1, Latin Extended-A/B and Latin Extended Additional letters, including accents,
//     case, spaces, punctuation and digits, and decomposed (NFD) input for those letters;
//   - the ß, æ, œ, ĳ and ŉ letters, ordered as the two letters they stand for.
//
// What it does not match (these can order differently from ICU; none is in a committed case):
//   - ß versus "ss", æ versus "ae" and the like: ICU breaks that tie by a tertiary weight, here they
//     are equal (the sort stays stable);
//   - characters outside the Latin ranges above: they sort after every Latin character by lowercase
//     code point, with uppercase after lowercase. ICU orders scripts (Greek, Cyrillic, ...) and gives
//     symbols, emoji and CJK their own places, and accents on those letters count there;
//   - ignorable characters (zero-width joiners, most control characters) are skipped, as in ICU, but
//     other combining marks that do not compose with the letter before them are dropped, not weighed;
//   - French or locale tailorings: the locale is fixed to the root/en-US rules.
//
// The weights come from the generated table_gen.go (see testdata/gen.mjs); the algorithm is the
// ICU multi-level comparison: compare all primary weights, then all secondary, then all tertiary.
package collate

import (
	"sort"
	"unicode"
)

type entry struct {
	r       rune
	p, s, t uint16
}

type composition struct{ base, mark, composed rune }

// fallbackBase puts characters without a table entry after every table entry.
const fallbackBase = 1 << 20

type element struct {
	p    uint32
	s, t uint16
}

func lookup(r rune) (entry, bool) {
	i := sort.Search(len(entries), func(i int) bool { return entries[i].r >= r })
	if i < len(entries) && entries[i].r == r {
		return entries[i], true
	}
	return entry{}, false
}

func compose(base, mark rune) (rune, bool) {
	i := sort.Search(len(compositions), func(i int) bool {
		c := compositions[i]
		return c.base > base || (c.base == base && c.mark >= mark)
	})
	if i < len(compositions) && compositions[i].base == base && compositions[i].mark == mark {
		return compositions[i].composed, true
	}
	return 0, false
}

func isMark(r rune) bool {
	return unicode.Is(unicode.Mn, r) || unicode.Is(unicode.Me, r) || unicode.Is(unicode.Mc, r)
}

// ignorable characters have no weight at any level (controls other than tab/newline, format characters).
func ignorable(r rune) bool {
	if r >= 0x09 && r <= 0x0D {
		return false
	}
	return unicode.Is(unicode.Cc, r) || unicode.Is(unicode.Cf, r)
}

// elements turns a string into collation elements: combining marks join the letter before them when
// the table knows the composed letter, expansions become their letters, unknown characters get a
// fallback weight, ignorable and unjoinable marks are skipped.
func elements(s string) []element {
	runes := []rune(s)
	out := make([]element, 0, len(runes))
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		for i+1 < len(runes) && isMark(runes[i+1]) {
			c, ok := compose(r, runes[i+1])
			if !ok {
				break
			}
			r = c
			i++
		}
		switch {
		case ignorable(r) || isMark(r):
			continue
		}
		if letters, ok := expansions[r]; ok {
			out = append(out, elements(letters)...)
			continue
		}
		if e, ok := lookup(r); ok {
			out = append(out, element{uint32(e.p), e.s, e.t})
			continue
		}
		el := element{p: fallbackBase + uint32(unicode.ToLower(r))}
		if unicode.IsUpper(r) {
			el.t = 1
		}
		out = append(out, el)
	}
	return out
}

// Compare returns a negative number when a sorts before b, zero when they are equal at every level,
// and a positive number when a sorts after b.
func Compare(a, b string) int {
	ea, eb := elements(a), elements(b)
	if c := compareLevel(ea, eb, func(e element) uint32 { return e.p }); c != 0 {
		return c
	}
	if c := compareLevel(ea, eb, func(e element) uint32 { return uint32(e.s) }); c != 0 {
		return c
	}
	return compareLevel(ea, eb, func(e element) uint32 { return uint32(e.t) })
}

func compareLevel(a, b []element, weight func(element) uint32) int {
	for i := 0; i < len(a) && i < len(b); i++ {
		wa, wb := weight(a[i]), weight(b[i])
		switch {
		case wa < wb:
			return -1
		case wa > wb:
			return 1
		}
	}
	switch {
	case len(a) < len(b):
		return -1
	case len(a) > len(b):
		return 1
	}
	return 0
}
