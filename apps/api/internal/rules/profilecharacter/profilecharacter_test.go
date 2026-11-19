package profilecharacter_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/profilecharacter"
)

// Ported from the describe('profile characters') block of packages/data/src/profile-banner/profileBanner.rules.test.ts
// (1 case: 'shows 15 per page and keeps at least 15 shown').
func TestFifteenPerPageAndAtLeastFifteenShown(t *testing.T) {
	if profilecharacter.PlayerPage != 15 || profilecharacter.MinShown != 15 {
		t.Errorf("PlayerPage = %d, MinShown = %d", profilecharacter.PlayerPage, profilecharacter.MinShown)
	}
	if profilecharacter.HideRefusal != "Keep at least 15 images shown, so the players' first page is full." {
		t.Errorf("HideRefusal = %q", profilecharacter.HideRefusal)
	}
	if profilecharacter.DeleteRefusal != "Keep at least 15 images shown. Upload or show another one first." {
		t.Errorf("DeleteRefusal = %q", profilecharacter.DeleteRefusal)
	}
}

func TestBelowMinimum(t *testing.T) {
	if profilecharacter.BelowMinimum(true, 16) || !profilecharacter.BelowMinimum(true, 15) || !profilecharacter.BelowMinimum(true, 3) {
		t.Error("a shown image goes only above the minimum")
	}
	if profilecharacter.BelowMinimum(false, 0) || profilecharacter.BelowMinimum(false, 15) {
		t.Error("a hidden image always goes")
	}
}

func TestCopyOfTheOtherRefusals(t *testing.T) {
	if profilecharacter.Missing != "This image is no longer in the library. Reload the list." ||
		profilecharacter.AlreadyBack != "This image is already back in the library." {
		t.Errorf("%q %q", profilecharacter.Missing, profilecharacter.AlreadyBack)
	}
}

// profileCharacterIdOfSegment: the first seeded image's id is empty, so it travels as "_".
func TestIDOfSegment(t *testing.T) {
	for in, want := range map[string]string{"_": "", "a": "a", "__": "__", "b1000000-0000-4000-8000-000000000001": "b1000000-0000-4000-8000-000000000001"} {
		if got := profilecharacter.IDOfSegment(in); got != want {
			t.Errorf("IDOfSegment(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestIDFormat(t *testing.T) {
	for id, want := range map[string]bool{
		"": true, "a": true, "z": true, "A": false, "ab": false, "1": false, "_": false, "a\n": false, "\n": false,
		"c1000000-0000-4000-8000-000000000001":   true,
		"C1000000-0000-4000-8000-000000000001":   false,
		"c1000000-0000-4000-8000-00000000001":    false,
		"c1000000-0000-4000-8000-000000000001\n": false,
	} {
		if got := profilecharacter.ValidID(id); got != want {
			t.Errorf("ValidID(%q) = %v, want %v", id, got, want)
		}
	}
}
