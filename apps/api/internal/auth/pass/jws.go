package pass

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

// The compact JWS core: strict parsing and Ed25519 signing, on the standard library only. Nothing in
// here knows about claims, so the RFC 8037 vector can run through it unchanged.

// MaxTokenBytes is the longest token a verifier reads. A pass is about 400 bytes; the limit stops a
// caller from making the verifier decode a large body.
const MaxTokenBytes = 4096

var b64url = base64.RawURLEncoding.Strict()

// compact is a parsed compact JWS: the decoded segments and the exact text that was signed.
type compact struct {
	header, payload, sig []byte
	signingInput         string
}

func malformed(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrMalformed, fmt.Sprintf(format, args...))
}

// validB64URL reports whether s uses only the unpadded base64url alphabet. Go's decoder skips CR and
// LF, so the alphabet is checked first.
func validB64URL(s string) bool {
	for i := 0; i < len(s); i++ {
		c := s[i]
		isAlpha := c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z'
		if !isAlpha && (c < '0' || c > '9') && c != '-' && c != '_' {
			return false
		}
	}
	return true
}

func decodeSegment(name, s string) ([]byte, error) {
	if !validB64URL(s) {
		return nil, malformed("%s is not unpadded base64url", name)
	}
	b, err := b64url.DecodeString(s)
	if err != nil {
		return nil, malformed("%s is not canonical base64url", name)
	}
	return b, nil
}

// parseCompact splits a token into exactly three canonical base64url segments.
func parseCompact(token string) (compact, error) {
	if len(token) > MaxTokenBytes {
		return compact{}, malformed("token is longer than %d bytes", MaxTokenBytes)
	}
	segs := strings.Split(token, ".")
	if len(segs) != 3 {
		return compact{}, malformed("want 3 segments, got %d", len(segs))
	}
	var c compact
	var err error
	if c.header, err = decodeSegment("header", segs[0]); err != nil {
		return compact{}, err
	}
	if c.payload, err = decodeSegment("payload", segs[1]); err != nil {
		return compact{}, err
	}
	if c.sig, err = decodeSegment("signature", segs[2]); err != nil {
		return compact{}, err
	}
	c.signingInput = segs[0] + "." + segs[1]
	return c, nil
}

// signCompact signs header and payload (raw bytes) with k and returns the compact serialization.
func signCompact(header, payload []byte, k ed25519.PrivateKey) string {
	in := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload)
	return in + "." + base64.RawURLEncoding.EncodeToString(ed25519.Sign(k, []byte(in)))
}

// strictObject decodes one JSON object whose keys are all distinct and rejects trailing data. Values
// stay raw so the caller checks their types. Keys match exactly, never case-insensitively.
func strictObject(b []byte) (map[string]json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(b))
	if tok, err := dec.Token(); err != nil || tok != json.Delim('{') {
		return nil, errors.New("not a JSON object")
	}
	m := map[string]json.RawMessage{}
	for dec.More() {
		kt, err := dec.Token()
		if err != nil {
			return nil, errors.New("invalid JSON")
		}
		key, ok := kt.(string)
		if !ok {
			return nil, errors.New("invalid JSON")
		}
		var raw json.RawMessage
		if err := dec.Decode(&raw); err != nil {
			return nil, errors.New("invalid JSON")
		}
		if _, dup := m[key]; dup {
			return nil, errors.New("duplicate member " + fmt.Sprintf("%q", key))
		}
		m[key] = raw
	}
	if _, err := dec.Token(); err != nil { // the closing brace
		return nil, errors.New("invalid JSON")
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return nil, errors.New("trailing data after the JSON object")
	}
	return m, nil
}

// stringMember reads a non-null JSON string member.
func stringMember(m map[string]json.RawMessage, name string) (string, bool, error) {
	raw, ok := m[name]
	if !ok {
		return "", false, nil
	}
	var s string
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || json.Unmarshal(raw, &s) != nil {
		return "", true, fmt.Errorf("%q is not a string", name)
	}
	return s, true, nil
}

// intMember reads a non-null JSON integer member (no fraction, no exponent, no string).
func intMember(m map[string]json.RawMessage, name string) (int64, error) {
	raw, ok := m[name]
	if !ok {
		return 0, fmt.Errorf("%q is missing", name)
	}
	var n int64
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) || json.Unmarshal(raw, &n) != nil {
		return 0, fmt.Errorf("%q is not an integer", name)
	}
	return n, nil
}

// KeyID is the RFC 7638 thumbprint of an Ed25519 public key: the base64url SHA-256 of the canonical
// JWK {"crv":"Ed25519","kty":"OKP","x":...}. The same key always has the same id.
func KeyID(k ed25519.PublicKey) string {
	sum := sha256.Sum256([]byte(`{"crv":"Ed25519","kty":"OKP","x":"` + base64.RawURLEncoding.EncodeToString(k) + `"}`))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
