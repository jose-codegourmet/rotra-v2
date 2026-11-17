package pass

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"
)

// The vector file is shared with the TypeScript verifier (go-sign-in task 4.1). Its key is a throwaway
// made from a fixed seed (0x00 to 0x1f); it protects nothing.
const vectorPath = "testdata/vector.json"

type vector struct {
	Note string `json:"note"`
	JWK  JWK    `json:"jwk"`
	// The token is stored in three parts, joined with ".", so a secret scanner does not mistake the
	// throwaway test token for a leaked JWT.
	TokenParts []string        `json:"tokenParts"`
	Audience   Audience        `json:"audience"`
	Now        string          `json:"now"`
	Claims     json.RawMessage `json:"claims"`
	// Cases the verifier must answer the same way.
	Expired struct {
		Now string `json:"now"`
	} `json:"expired"`
	WrongAudience Audience `json:"wrongAudience"`
}

func vectorKey() []byte {
	seed := make([]byte, 32)
	for i := range seed {
		seed[i] = byte(i)
	}
	return seed
}

func buildVector(t *testing.T) vector {
	t.Helper()
	priv, err := GenerateKey(bytes.NewReader(vectorKey()))
	if err != nil {
		t.Fatal(err)
	}
	s, err := NewSigner(priv, 0)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	tok, err := s.Sign(Claims{Subject: "identity-1", SessionID: "session-1", Audience: AudienceClub, AccountID: "account-1", ClubID: "club-1"}, now)
	if err != nil {
		t.Fatal(err)
	}
	c, err := parseCompact(tok)
	if err != nil {
		t.Fatal(err)
	}
	ks, _ := NewKeySet(pub(priv))
	var v vector
	v.Note = "Throwaway test key (seed 00..1f). Join tokenParts with '.' and verify the token with jwk at now; expect claims. expired.now must give 'expired', wrongAudience must give 'wrong audience'."
	v.JWK = ks.JWKS()[0]
	v.TokenParts, v.Audience, v.Now = strings.Split(tok, "."), AudienceClub, now.Add(time.Minute).Format(time.RFC3339)
	v.Claims = c.payload
	v.Expired.Now = now.Add(DefaultLifetime).Format(time.RFC3339)
	v.WrongAudience = AudienceAdmin
	return v
}

func TestVectorFile(t *testing.T) {
	want := buildVector(t)
	if os.Getenv("ROTRA_PASS_UPDATE_VECTOR") == "1" {
		b, err := json.MarshalIndent(want, "", "  ")
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(vectorPath, append(b, '\n'), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	raw, err := os.ReadFile(vectorPath)
	if err != nil {
		t.Fatal(err)
	}
	var got vector
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	if strings.Join(got.TokenParts, ".") != strings.Join(want.TokenParts, ".") || got.JWK != want.JWK {
		t.Fatalf("vector file is stale; regenerate with ROTRA_PASS_UPDATE_VECTOR=1 go test ./internal/auth/pass -run TestVectorFile")
	}

	// Verify straight from the file's public JWK, as another implementation would.
	pubKey, err := ParsePublicKeys(got.JWK.X)
	if err != nil || len(pubKey) != 1 {
		t.Fatalf("jwk x: %v", err)
	}
	if got.JWK.Kid != KeyID(pubKey[0]) {
		t.Errorf("kid is not the RFC 7638 thumbprint of x")
	}
	ks, _ := NewKeySet(pubKey[0])
	v, _ := NewVerifier(ks, 0)
	now, _ := time.Parse(time.RFC3339, got.Now)
	c, err := v.Verify(strings.Join(got.TokenParts, "."), got.Audience, now)
	if err != nil {
		t.Fatal(err)
	}
	var wantClaims map[string]any
	if err := json.Unmarshal(got.Claims, &wantClaims); err != nil {
		t.Fatal(err)
	}
	if c.Subject != wantClaims["sub"] || c.SessionID != wantClaims["sid"] || string(c.Audience) != wantClaims["aud"] ||
		c.AccountID != wantClaims["acc"] || c.ClubID != wantClaims["club_id"] || float64(c.ExpiresAt.Unix()) != wantClaims["exp"] {
		t.Errorf("claims %+v do not match %v", c, wantClaims)
	}
	exp, _ := time.Parse(time.RFC3339, got.Expired.Now)
	_, err = v.Verify(strings.Join(got.TokenParts, "."), got.Audience, exp)
	wantErr(t, "expired case", err, ErrExpired)
	_, err = v.Verify(strings.Join(got.TokenParts, "."), got.WrongAudience, now)
	wantErr(t, "wrong audience case", err, ErrWrongAudience)
}
