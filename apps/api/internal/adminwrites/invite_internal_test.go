package adminwrites

import (
	"strings"
	"testing"
)

// The generator draws from the alphabet only, ten at a time, and every letter of the alphabet turns up (no bias that
// leaves one out, no character from outside it).
func TestNewInviteCodeDrawsFromTheAlphabet(t *testing.T) {
	seen := map[rune]int{}
	for i := 0; i < 3000; i++ {
		c, err := newInviteCode()
		if err != nil {
			t.Fatal(err)
		}
		if len(c) != inviteLength {
			t.Fatalf("length %d", len(c))
		}
		for _, r := range c {
			if !strings.ContainsRune(inviteAlphabet, r) {
				t.Fatalf("%q is not in the alphabet", r)
			}
			seen[r]++
		}
	}
	if len(seen) != len(inviteAlphabet) {
		t.Errorf("%d of %d letters drawn", len(seen), len(inviteAlphabet))
	}
	// 30000 draws over 31 letters: each about 968; a modulo bias on 256 % 31 = 8 would make the first eight 1/31 more
	// likely, far inside the noise here, so only a gross fault is caught.
	for r, n := range seen {
		if n < 600 || n > 1400 {
			t.Errorf("%q drawn %d times", r, n)
		}
	}
	if strings.ContainsAny(inviteAlphabet, "ILO01") {
		t.Error("the alphabet has look-alikes")
	}
}
