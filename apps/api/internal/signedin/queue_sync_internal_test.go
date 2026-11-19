package signedin

import "testing"

// jsLower answers as JavaScript's toLocaleLowerCase does in an English locale (the answers below come from Node).
func TestJSLower(t *testing.T) {
	for in, want := range map[string]string{
		"İ": "i̇", "ΟΔΟΣ": "οδος", "Σ": "σ", "ΑΣ Β": "ας β", "aΣ.": "aς.", "Σa": "σa", "ΑΣΑ": "ασα", "Straße": "straße",
		"ΑΣ'Β": "ασ'β", "ΑΣ́": "ας́", "ÁΣ": "áς", "": "",
	} {
		if got := jsLower(in); got != want {
			t.Errorf("%q: got %q, want %q", in, got, want)
		}
	}
}

func TestNormalizedName(t *testing.T) {
	for in, want := range map[string]string{
		"  alice   REYES ": "alice reyes", "\u00a0\ufeffAlice\u2003\u3000 Reyes\u2028": "alice reyes", "": "", "   ": "",
		"a\tb\nc": "a b c", "Straße": "straße",
	} {
		if got := normalizedName(in); got != want {
			t.Errorf("%q: got %q, want %q", in, got, want)
		}
	}
}
