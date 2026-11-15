package collate

import (
	"encoding/json"
	"os"
	"sort"
	"testing"
)

type golden struct {
	ICU    string   `json:"icu"`
	Sorted []string `json:"sorted"`
	Pairs  [][3]any `json:"pairs"`
}

func loadGolden(t *testing.T) golden {
	t.Helper()
	raw, err := os.ReadFile("testdata/icu_golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g golden
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	return g
}

// The golden file lists strings in the order Node's ICU puts them (ties removed): every neighbour
// must compare strictly before the next, and the sampled pairs must give ICU's sign.
func TestMatchesICUGolden(t *testing.T) {
	g := loadGolden(t)
	if len(g.Sorted) < 1000 {
		t.Fatalf("golden has only %d strings", len(g.Sorted))
	}
	for i := 1; i < len(g.Sorted); i++ {
		if c := Compare(g.Sorted[i-1], g.Sorted[i]); c >= 0 {
			t.Fatalf("%q must sort before %q (ICU %s), got %d", g.Sorted[i-1], g.Sorted[i], g.ICU, c)
		}
	}
	for _, p := range g.Pairs {
		a, b, want := p[0].(string), p[1].(string), int(p[2].(float64))
		if got := Compare(a, b); sign(got) != want {
			t.Fatalf("Compare(%q, %q) = %d, ICU says %d", a, b, got, want)
		}
	}
	shuffled := append([]string(nil), g.Sorted...)
	sort.SliceStable(shuffled, func(i, j int) bool { return Compare(shuffled[i], shuffled[j]) < 0 })
	for i := range shuffled {
		if shuffled[i] != g.Sorted[i] {
			t.Fatalf("sorting by Compare differs from ICU at %d: %q vs %q", i, shuffled[i], g.Sorted[i])
		}
	}
}

func sign(n int) int {
	switch {
	case n < 0:
		return -1
	case n > 0:
		return 1
	}
	return 0
}

func TestKnownOrders(t *testing.T) {
	// Each list is in ICU en-US order (the committed standings cases).
	lists := [][]string{
		{"emile", "Emile", "Émile", "zoe", "Zoe", "Zoë"},
		{"Angel", "Ángel", "ångel", "Zed"},
		{"Ana  Maria", "ana maria", "Ana Maria", "Ana-Maria", "Ana10", "Ana2"},
		{"Çelik", "Zofia", "Žofia"},
		{"Celik", "Oyvind", "Øyvind"},
		{"a", "A", "b", "B"},
	}
	for _, l := range lists {
		for i := 1; i < len(l); i++ {
			if Compare(l[i-1], l[i]) >= 0 {
				t.Errorf("%q must sort before %q", l[i-1], l[i])
			}
		}
	}
}

func TestEqualAndEmpty(t *testing.T) {
	for _, s := range []string{"", "Sam", "amy"} {
		if Compare(s, s) != 0 {
			t.Errorf("%q must equal itself", s)
		}
	}
	if Compare("", "a") >= 0 || Compare("a", "") <= 0 {
		t.Error("the empty string sorts first")
	}
	if Compare("a\u200db", "ab") != 0 {
		t.Error("a zero-width joiner is ignorable")
	}
	if Compare("a\x01b", "ab") != 0 {
		t.Error("control characters are ignorable")
	}
}

func TestDecomposedInputMatchesComposed(t *testing.T) {
	if Compare("Émile", "Émile") != 0 {
		t.Error("NFD É must equal NFC É")
	}
	if Compare("Emile", "Émile") >= 0 {
		t.Error("accent sorts after the plain letter")
	}
	// A mark that joins no letter is dropped.
	if Compare("á", "á") != 0 {
		t.Error("a + acute composes")
	}
	if Compare("1́", "1") != 0 {
		t.Error("an unjoinable mark is dropped")
	}
}

func TestExpansionsSortAsTwoLetters(t *testing.T) {
	if Compare("Straße", "Strasse") != 0 {
		t.Error("ß is ss")
	}
	if Compare("æon", "aeon") != 0 || Compare("Œuvre", "OEuvre") != 0 {
		t.Error("æ and œ are two letters")
	}
	if Compare("ß", "st") >= 0 || Compare("ß", "sr") <= 0 {
		t.Error("ß sorts between sr and st")
	}
}

func TestOtherScriptsFallBackAfterLatin(t *testing.T) {
	if Compare("Zoe", "Ωmega") >= 0 || Compare("Zoe", "Ωmega") == 0 {
		t.Error("Greek sorts after Latin")
	}
	if Compare("Ωmega", "ωmega") <= 0 {
		t.Error("lowercase sorts first in the fallback too")
	}
	if Compare("Ωmega", "Ωmegb") >= 0 {
		t.Error("fallback letters order by code point")
	}
}

func TestLookupAndCompose(t *testing.T) {
	if _, ok := lookup('a'); !ok {
		t.Error("a is in the table")
	}
	if _, ok := lookup('中'); ok {
		t.Error("CJK is not in the table")
	}
	if c, ok := compose('e', 0x0301); !ok || c != 'é' {
		t.Errorf("compose(e, acute) = %q %v", c, ok)
	}
	if _, ok := compose('e', 0x0000); ok {
		t.Error("no such composition")
	}
}
