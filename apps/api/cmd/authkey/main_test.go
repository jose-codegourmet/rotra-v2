package main

import (
	"bytes"
	"crypto/ed25519"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
)

func TestRunPrintsAUsableKey(t *testing.T) {
	var out bytes.Buffer
	if err := run(&out, bytes.NewReader(bytes.Repeat([]byte{3}, 32))); err != nil {
		t.Fatal(err)
	}
	var seed, public, kid string
	for _, line := range strings.Split(strings.TrimSpace(out.String()), "\n") {
		switch {
		case strings.HasPrefix(line, "ROTRA_AUTH_SIGNING_KEY="):
			seed = strings.TrimPrefix(line, "ROTRA_AUTH_SIGNING_KEY=")
		case strings.HasPrefix(line, "ROTRA_AUTH_EXTRA_PUBLIC_KEYS="):
			public = strings.TrimPrefix(line, "ROTRA_AUTH_EXTRA_PUBLIC_KEYS=")
		case strings.HasPrefix(line, "kid="):
			kid = strings.TrimPrefix(line, "kid=")
		}
	}
	priv, err := pass.ParseSigningKey(seed)
	if err != nil {
		t.Fatalf("signing key line: %v\n%s", err, out.String())
	}
	pubs, err := pass.ParsePublicKeys(public)
	if err != nil || len(pubs) != 1 || pass.KeyID(pubs[0]) != kid || pass.EncodePublicKey(pubs[0]) != public {
		t.Fatalf("public/kid lines inconsistent: %v\n%s", err, out.String())
	}
	if pass.KeyID(priv.Public().(ed25519.PublicKey)) != kid {
		t.Fatal("no kid")
	}
}

func TestRunReportsAShortRandomSource(t *testing.T) {
	if err := run(&bytes.Buffer{}, bytes.NewReader([]byte("x"))); err == nil {
		t.Fatal("want an error")
	}
}
