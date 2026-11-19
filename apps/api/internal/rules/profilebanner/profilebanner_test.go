package profilebanner_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/profilebanner"
)

// Ported from the describe('minimum shown banners') block of packages/data/src/profile-banner/profileBanner.rules.test.ts
// (3 cases). The describe('default banner') block tests resolveProfileBanner, which is the shared read masking and
// is already in Go (publicreads.ResolveBanner); the describe('profile characters') block is in profilecharacter.

// it('keeps at least 2 shown, with the Admin log copy')
func TestMinimumShownKeepsTheAdminLogCopy(t *testing.T) {
	if profilebanner.MinShown != 2 {
		t.Errorf("MinShown = %d", profilebanner.MinShown)
	}
	if profilebanner.HideRefusal != "Keep at least 2 banners shown, so players have a choice." {
		t.Errorf("HideRefusal = %q", profilebanner.HideRefusal)
	}
	if profilebanner.DeleteRefusal != "Keep at least 2 banners shown. Upload or show another one first." {
		t.Errorf("DeleteRefusal = %q", profilebanner.DeleteRefusal)
	}
}

// it('refuses hiding or deleting a shown banner only at the minimum')
func TestRefusesAShownBannerOnlyAtTheMinimum(t *testing.T) {
	if profilebanner.BelowMinimum(true, 3) {
		t.Error("three shown: a shown banner may go")
	}
	if !profilebanner.BelowMinimum(true, 2) {
		t.Error("two shown: a shown banner stays")
	}
	if !profilebanner.BelowMinimum(true, 1) {
		t.Error("fewer than the minimum shown: a shown banner stays")
	}
}

// it('always lets a hidden banner go')
func TestAHiddenBannerAlwaysGoes(t *testing.T) {
	for _, shown := range []int{0, 1, 2, 3} {
		if profilebanner.BelowMinimum(false, shown) {
			t.Errorf("%d shown: a hidden banner may go", shown)
		}
	}
}

func TestCopyOfTheOtherRefusals(t *testing.T) {
	for got, want := range map[string]string{
		profilebanner.Missing:        "This banner is no longer in the library. Reload the list.",
		profilebanner.AlreadyBack:    "This banner is already back in the library.",
		profilebanner.DefaultRefusal: "This is the default banner. Make another banner the default first.",
		profilebanner.DefaultHidden:  "Show this banner before making it the default.",
		profilebanner.DefaultID:      "court",
	} {
		if got != want {
			t.Errorf("got %q, want %q", got, want)
		}
	}
}

func TestIDFormat(t *testing.T) {
	for id, want := range map[string]bool{
		"court": true, "a": true, "abcdefghijklmnopqrstuvwx": true, "abcdefghijklmnopqrstuvwxy": false, "": false,
		"Court": false, "has-dash": false, "a b": false, "é": false, "night\n": false,
		"b1000000-0000-4000-8000-000000000001":   true,
		"B1000000-0000-4000-8000-000000000001":   false,
		"b1000000-0000-4000-8000-00000000000":    false,
		"b1000000-0000-4000-8000-0000000000012":  false,
		"b1000000-0000-4000-8000-000000000001\n": false,
	} {
		if got := profilebanner.ValidID(id); got != want {
			t.Errorf("ValidID(%q) = %v, want %v", id, got, want)
		}
	}
}
