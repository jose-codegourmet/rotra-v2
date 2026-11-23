package google

import (
	"crypto/ed25519"
	"crypto/rand"
	"strings"
	"testing"
	"time"
)

func testSealer(t *testing.T) *Sealer {
	t.Helper()
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return NewSealer(key)
}

func TestSealOpenRoundTripAndKindIsBound(t *testing.T) {
	s := testSealer(t)
	now := time.Date(2026, 11, 23, 3, 0, 0, 0, time.UTC)
	v := s.Seal("held", Held{Email: "pat@example.test", Name: "Pat"}, now)
	var got Held
	if !s.Open("held", v, now.Add(9*time.Minute), &got) || got.Email != "pat@example.test" {
		t.Fatalf("round trip failed: %+v", got)
	}
	if s.Open("result", v, now, &got) {
		t.Fatal("a value sealed for one cookie must not open as another")
	}
	if s.Open("held", v, now.Add(11*time.Minute), &got) {
		t.Fatal("an expired value must not open")
	}
}

func TestOpenRefusesTamperingAndAnotherKey(t *testing.T) {
	s := testSealer(t)
	now := time.Now()
	v := s.Seal("held", Held{Email: "a@b.test"}, now)
	payload, sig, _ := strings.Cut(v, ".")
	forged := s.Seal("held", Held{Email: "victim@example.test"}, now)
	forgedPayload, _, _ := strings.Cut(forged, ".")
	for name, bad := range map[string]string{
		"changed payload": forgedPayload + "." + sig,
		"changed sig":     payload + "." + sig[:len(sig)-2] + "AA",
		"no dot":          payload,
		"empty":           "",
		"another key":     testSealer(t).Seal("held", Held{Email: "a@b.test"}, now),
	} {
		var got Held
		if s.Open("held", bad, now, &got) {
			t.Errorf("%s opened", name)
		}
	}
}

func TestIntentsAndOutcomesAreTheTypeScriptsWords(t *testing.T) {
	for _, i := range []Intent{IntentLogin, IntentRegister, IntentClaim, IntentConnect} {
		if !i.valid() {
			t.Errorf("%s should be valid", i)
		}
	}
	if Intent("admin").valid() || Intent("").valid() {
		t.Error("an unknown intent must be refused")
	}
}
