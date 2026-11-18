// Command authkey prints a new Ed25519 key for the Go sign-in. Nothing is stored: copy the lines into
// Railway (see docs/backend/infrastructure.md) and close the terminal.
//
//	go run ./cmd/authkey
package main

import (
	"crypto/ed25519"
	"fmt"
	"io"
	"os"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
)

func main() {
	if err := run(os.Stdout, nil); err != nil {
		fmt.Fprintln(os.Stderr, "authkey:", err)
		os.Exit(1)
	}
}

// run writes a new key to w. r is the randomness source (crypto/rand when nil).
func run(w io.Writer, r io.Reader) error {
	k, err := pass.GenerateKey(r)
	if err != nil {
		return err
	}
	pub := k.Public().(ed25519.PublicKey)
	_, err = fmt.Fprintf(w, "# Secret. Railway variable ROTRA_AUTH_SIGNING_KEY on the API service (never in the repo or Vercel):\n"+
		"ROTRA_AUTH_SIGNING_KEY=%s\n"+
		"# Public. To publish this key before it signs (B-47), add it to ROTRA_AUTH_EXTRA_PUBLIC_KEYS (comma separated):\n"+
		"ROTRA_AUTH_EXTRA_PUBLIC_KEYS=%s\n"+
		"kid=%s\n", pass.EncodeSigningKey(k), pass.EncodePublicKey(pub), pass.KeyID(pub))
	return err
}
