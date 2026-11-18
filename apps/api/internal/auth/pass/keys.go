package pass

import (
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"strings"
)

// Key encodings for Railway variables (B-62 proposal):
//
//	ROTRA_AUTH_SIGNING_KEY        the 32 byte Ed25519 seed as unpadded base64url (43 characters)
//	ROTRA_AUTH_EXTRA_PUBLIC_KEYS  32 byte public keys as unpadded base64url, comma separated
//
// The kid of a key is its RFC 7638 thumbprint (KeyID).

// JWK is one public key in the published set (RFC 8037, OKP Ed25519).
type JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Use string `json:"use"`
}

// KeySet is the public keys passes are accepted from and published as: the current key first, then
// the extras (the next key before a rotation, the old key after a swap; B-47). It never changes.
type KeySet struct {
	keys []ed25519.PublicKey
	jwks []JWK
	byID map[string]ed25519.PublicKey
}

// NewKeySet builds a key set. A key listed twice is kept once, in its first position.
func NewKeySet(current ed25519.PublicKey, extras ...ed25519.PublicKey) (*KeySet, error) {
	ks := &KeySet{byID: map[string]ed25519.PublicKey{}}
	for i, k := range append([]ed25519.PublicKey{current}, extras...) {
		if len(k) != ed25519.PublicKeySize {
			if i == 0 {
				return nil, errors.New("pass: the current public key must be 32 bytes")
			}
			return nil, errors.New("pass: an extra public key must be 32 bytes")
		}
		kid := KeyID(k)
		if _, dup := ks.byID[kid]; dup {
			continue
		}
		k = bytes.Clone(k)
		ks.byID[kid] = k
		ks.keys = append(ks.keys, k)
		ks.jwks = append(ks.jwks, JWK{Kty: "OKP", Crv: "Ed25519", X: base64.RawURLEncoding.EncodeToString(k), Kid: kid, Alg: "EdDSA", Use: "sig"})
	}
	return ks, nil
}

// Lookup finds a key by kid.
func (ks *KeySet) Lookup(kid string) (ed25519.PublicKey, bool) {
	k, ok := ks.byID[kid]
	return k, ok
}

// JWKS lists the keys in publishing order, as a copy.
func (ks *KeySet) JWKS() []JWK { return append([]JWK(nil), ks.jwks...) }

// GenerateKey makes a signing key from 32 bytes read from r (crypto/rand when r is nil).
func GenerateKey(r io.Reader) (ed25519.PrivateKey, error) {
	if r == nil {
		r = rand.Reader
	}
	seed := make([]byte, ed25519.SeedSize)
	if _, err := io.ReadFull(r, seed); err != nil {
		return nil, errors.New("pass: could not read a key seed")
	}
	return ed25519.NewKeyFromSeed(seed), nil
}

// EncodeSigningKey is the ROTRA_AUTH_SIGNING_KEY form of k.
func EncodeSigningKey(k ed25519.PrivateKey) string {
	return base64.RawURLEncoding.EncodeToString(k.Seed())
}

// EncodePublicKey is the ROTRA_AUTH_EXTRA_PUBLIC_KEYS form of one key.
func EncodePublicKey(k ed25519.PublicKey) string { return base64.RawURLEncoding.EncodeToString(k) }

// decodeKeyBytes reads one unpadded base64url value of a fixed length. Surrounding space and trailing
// padding are tolerated because a pasted variable often has them. Errors never repeat the input.
func decodeKeyBytes(s string, size int) ([]byte, bool) {
	s = strings.TrimRight(strings.TrimSpace(s), "=")
	if !validB64URL(s) {
		return nil, false
	}
	b, err := b64url.DecodeString(s)
	if err != nil || len(b) != size {
		return nil, false
	}
	return b, true
}

// ParseSigningKey reads a ROTRA_AUTH_SIGNING_KEY value.
func ParseSigningKey(s string) (ed25519.PrivateKey, error) {
	seed, ok := decodeKeyBytes(s, ed25519.SeedSize)
	if !ok {
		return nil, errors.New("not the unpadded base64url of a 32 byte Ed25519 seed")
	}
	return ed25519.NewKeyFromSeed(seed), nil
}

// ParsePublicKeys reads a ROTRA_AUTH_EXTRA_PUBLIC_KEYS value: comma separated, blanks skipped.
func ParsePublicKeys(s string) ([]ed25519.PublicKey, error) {
	var out []ed25519.PublicKey
	for _, part := range strings.Split(s, ",") {
		if strings.TrimSpace(part) == "" {
			continue
		}
		b, ok := decodeKeyBytes(part, ed25519.PublicKeySize)
		if !ok {
			return nil, errors.New("not a comma separated list of unpadded base64url 32 byte Ed25519 public keys")
		}
		out = append(out, ed25519.PublicKey(b))
	}
	return out, nil
}
