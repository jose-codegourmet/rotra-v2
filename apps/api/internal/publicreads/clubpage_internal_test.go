package publicreads

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"testing"
)

// The helpers that copy what JavaScript and Node do, pinned against values captured from Node itself.

func TestJSDecodeURIComponent(t *testing.T) {
	for _, tc := range []struct {
		in   string
		want string
		ok   bool
	}{
		{"", "", true},
		{"plain+text", "plain+text", true},
		{"%41%e6%97%a5", "A\u65e5", true},
		{"%F0%9F%98%80", "\U0001F600", true},
		{"\u65e5\U0001F600", "\u65e5\U0001F600", true},
		{"%7E%25", "~%", true},
		{"%zz", "", false},
		{"100%", "", false},
		{"%4", "", false},
		{"%E6%97", "", false},
		{"%E6%97x", "", false},
		{"%C0%80", "", false},
		{"%80", "", false},
		{"%ED%A0%80", "", false},
		{"%F4%90%80%80", "", false},
		{"%F8%88%80%80%80", "", false},
		{"%E0%80%80", "", false},
		{"%C2%80", "\u0080", true},
		{"%DF%BF", "\u07ff", true},
		{"%F4%8F%BF%BF", "\U0010FFFF", true},
	} {
		got, ok := jsDecodeURIComponent(tc.in)
		if ok != tc.ok || (ok && string(got) != tc.want) {
			t.Errorf("jsDecodeURIComponent(%q) = %q, %v; want %q, %v", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestNodeBase64Decode(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"", ""},
		{"Q", ""},
		{"QU", "A"},
		{"QUJD", "ABC"},
		{"QUJDRA", "ABCD"},
		{"QUJDRA==", "ABCD"},
		{"QU JD\tRE\nRg==", "ABCDD`"},
		{"-_-_", "\xfb\xff\xbf"},
		{"QU=JD", "A"},
		{"QQ==QUJD", "A"},
		{"!!!!", ""},
		{"====", ""},
		{"QU%4A", "AN\x00"},
		{"QU\u0141JD", "A@\t"},   // a UTF-16 unit counts by its low byte: U+0141 is 'A'
		{"QU\u012bJD", "AO\x89"}, // U+012B is '+'
		{"QU\u013dJD", "A"},      // U+013D is '=': stop
		{"QU\u0100JD", "ABC"},    // U+0100 is NUL: skipped
		{"QU\U0001F600JD", "A"},  // the high surrogate D83D is '=': stop
		{"QU\u00e9JD", "ABC"},
		{"QUJDx", "ABC"},
		{"QUJD=", "ABC"},
	} {
		if got := nodeBase64Decode(tc.in); string(got) != tc.want {
			t.Errorf("nodeBase64Decode(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestLocationHeaderValue(t *testing.T) {
	for _, tc := range []struct {
		in   string
		want string
		ok   bool
	}{
		{"https://example.test/a.png", "https://example.test/a.png", true},
		{"https://example.test/x.png   ", "https://example.test/x.png", true},
		{"https://example.test/x\n", "https://example.test/x", true},
		{"https://example.test/a\tb", "https://example.test/a\tb", true},
		{"https://example.test/a b", "https://example.test/a b", true},
		{"https://example.test/a\x7fb", "https://example.test/a\x7fb", true},
		{"https://example.test/caf\u00e9", "https://example.test/caf\xe9", true}, // one byte per character
		{"https://example.test/a\nb", "", false},
		{"https://example.test/a\rb", "", false},
		{"https://example.test/\u65e5", "", false},
		{"https://example.test/\U0001F600", "", false},
	} {
		got, ok := locationHeaderValue(tc.in)
		if ok != tc.ok || got != tc.want {
			t.Errorf("locationHeaderValue(%q) = %q, %v; want %q, %v", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestLevelCodeForSkillLevelID(t *testing.T) {
	for id, want := range map[int16]string{0: "beginner_low", 4: "intermediate_mid", 8: "advanced_high"} {
		if got := levelCode(id); got == nil || *got != want {
			t.Errorf("levelCode(%d) = %v, want %s", id, got, want)
		}
	}
	for _, id := range []int16{-1, 9, 100} {
		if got := levelCode(id); got != nil {
			t.Errorf("levelCode(%d) = %q, want null", id, *got)
		}
	}
}

// TestMemberNameOrderMatchesLocaleCompare sorts the masked names the way a.name.localeCompare(b.name) does,
// against an order captured from Node (testdata/tools/capture-collation.mjs).
func TestMemberNameOrderMatchesLocaleCompare(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "collation.golden.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g struct {
		Inputs []string `json:"inputs"`
		Sorted []string `json:"sorted"`
	}
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	if len(g.Inputs) < 100 || len(g.Inputs) != len(g.Sorted) {
		t.Fatalf("collation golden has %d inputs and %d sorted", len(g.Inputs), len(g.Sorted))
	}
	got := append([]string{}, g.Inputs...)
	compare := newNameComparer()
	sort.SliceStable(got, func(i, j int) bool { return compare(got[i], got[j]) < 0 })
	for i := range got {
		if got[i] != g.Sorted[i] {
			t.Fatalf("position %d: %q, want %q", i, got[i], g.Sorted[i])
		}
	}
	if compare("J*** D***", "J*** D***") != 0 || compare("a", "A") >= 0 {
		t.Error("equal names must compare 0, and lower case sorts before upper case")
	}
}
