// Package pass signs and verifies the access passes of the Go sign-in (B-27, B-62 proposal): a compact
// JWS signed with Ed25519, written on the standard library and verified in each app with WebCrypto.
// It knows nothing about the database: a pass is checked from its signature and claims alone, and the
// session row is checked elsewhere (on writes and on refresh).
package pass

import (
	"crypto/ed25519"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Audience is which app a pass opens. A pass for one audience never verifies for another.
type Audience string

const (
	AudienceClub   Audience = "club"
	AudiencePlayer Audience = "player"
	AudienceAdmin  Audience = "admin"
)

const (
	// DefaultLifetime is the access pass lifetime (B-27).
	DefaultLifetime = 15 * time.Minute
	// MaxLeeway is the most clock skew a Verifier may be told to forgive.
	MaxLeeway = 5 * time.Second
)

// The verification outcomes. Wrap-checked with errors.Is; the text never carries key bytes or token content.
var (
	// ErrExpired: the signature is valid and exp has passed, so a client refreshes.
	ErrExpired = errors.New("pass: expired")
	// ErrNotYetValid: nbf or iat is still in the future.
	ErrNotYetValid = errors.New("pass: not yet valid")
	// ErrUnknownKey: the kid is not in the key set (an old key was removed; the refresh path handles it).
	ErrUnknownKey = errors.New("pass: unknown key id")
	// ErrBadSignature: the signature does not match the header and payload.
	ErrBadSignature = errors.New("pass: bad signature")
	// ErrMalformed: not a pass this package would issue (structure, header, or claims).
	ErrMalformed = errors.New("pass: malformed")
	// ErrWrongAudience: a valid pass for another audience.
	ErrWrongAudience = errors.New("pass: wrong audience")
)

// Claims are what a pass says. IssuedAt, NotBefore and ExpiresAt are whole seconds in UTC.
type Claims struct {
	Subject   string // sub: the identity id
	SessionID string // sid: the auth_sessions id
	Audience  Audience
	AccountID string // acc
	ClubID    string // club_id: set on club passes only
	IssuedAt  time.Time
	NotBefore time.Time
	ExpiresAt time.Time
}

func (a Audience) valid() bool {
	return a == AudienceClub || a == AudiencePlayer || a == AudienceAdmin
}

// validate checks the claims that do not depend on time.
func (c Claims) validate() error {
	switch {
	case c.Subject == "":
		return errors.New("sub is empty")
	case c.SessionID == "":
		return errors.New("sid is empty")
	case c.AccountID == "":
		return errors.New("acc is empty")
	case !c.Audience.valid():
		return errors.New("aud is not club, player or admin")
	case c.Audience == AudienceClub && c.ClubID == "":
		return errors.New("a club pass needs club_id")
	case c.Audience != AudienceClub && c.ClubID != "":
		return errors.New("only a club pass carries club_id")
	}
	return nil
}

type wireClaims struct {
	Sub    string   `json:"sub"`
	Sid    string   `json:"sid"`
	Aud    Audience `json:"aud"`
	Acc    string   `json:"acc"`
	ClubID string   `json:"club_id,omitempty"`
	Iat    int64    `json:"iat"`
	Nbf    int64    `json:"nbf"`
	Exp    int64    `json:"exp"`
}

// Signer issues passes with the current private key.
type Signer struct {
	key      ed25519.PrivateKey
	header   []byte
	kid      string
	lifetime time.Duration
}

// NewSigner builds a Signer. A zero lifetime is DefaultLifetime.
func NewSigner(key ed25519.PrivateKey, lifetime time.Duration) (*Signer, error) {
	if len(key) != ed25519.PrivateKeySize || !key.Equal(ed25519.NewKeyFromSeed(key.Seed())) {
		return nil, errors.New("pass: signing key is not a valid Ed25519 private key")
	}
	if lifetime < 0 {
		return nil, errors.New("pass: lifetime must not be negative")
	}
	if lifetime == 0 {
		lifetime = DefaultLifetime
	}
	kid := KeyID(key.Public().(ed25519.PublicKey))
	return &Signer{key: key, kid: kid, lifetime: lifetime, header: []byte(`{"alg":"EdDSA","kid":"` + kid + `","typ":"JWT"}`)}, nil
}

// KeyID is the kid this signer puts in every pass.
func (s *Signer) KeyID() string { return s.kid }

// Lifetime is how long a pass signed by s lasts.
func (s *Signer) Lifetime() time.Duration { return s.lifetime }

// Sign issues a pass for c. iat and nbf are now and exp is now plus the lifetime; any times already
// in c are ignored.
func (s *Signer) Sign(c Claims, now time.Time) (string, error) {
	if err := c.validate(); err != nil {
		return "", fmt.Errorf("pass: %w", err)
	}
	iat := now.Unix()
	payload, err := json.Marshal(wireClaims{
		Sub: c.Subject, Sid: c.SessionID, Aud: c.Audience, Acc: c.AccountID, ClubID: c.ClubID,
		Iat: iat, Nbf: iat, Exp: iat + int64(s.lifetime/time.Second),
	})
	if err != nil {
		return "", fmt.Errorf("pass: encoding claims: %w", err)
	}
	return signCompact(s.header, payload, s.key), nil
}

// Verifier checks passes against a key set.
type Verifier struct {
	keys   *KeySet
	leeway time.Duration
}

// NewVerifier builds a Verifier. leeway is the clock skew it forgives on exp, nbf and iat: 0 to MaxLeeway.
func NewVerifier(keys *KeySet, leeway time.Duration) (*Verifier, error) {
	if keys == nil {
		return nil, errors.New("pass: a verifier needs a key set")
	}
	if leeway < 0 || leeway > MaxLeeway {
		return nil, fmt.Errorf("pass: leeway must be from 0 to %s", MaxLeeway)
	}
	return &Verifier{keys: keys, leeway: leeway}, nil
}

// Verify checks token and returns its claims when it is a valid, current pass for wantAud. Order:
// structure, header (alg EdDSA only, kid required), key lookup, signature, claims, audience, time.
// Claims are read only after the signature checks out.
func (v *Verifier) Verify(token string, wantAud Audience, now time.Time) (Claims, error) {
	c, err := parseCompact(token)
	if err != nil {
		return Claims{}, err
	}
	kid, err := parseHeader(c.header)
	if err != nil {
		return Claims{}, err
	}
	pub, ok := v.keys.Lookup(kid)
	if !ok {
		return Claims{}, ErrUnknownKey
	}
	if len(c.sig) != ed25519.SignatureSize || !ed25519.Verify(pub, []byte(c.signingInput), c.sig) {
		return Claims{}, ErrBadSignature
	}
	claims, err := parseClaims(c.payload)
	if err != nil {
		return Claims{}, err
	}
	if claims.Audience != wantAud {
		return Claims{}, ErrWrongAudience
	}
	if now.Add(v.leeway).Before(claims.NotBefore) || now.Add(v.leeway).Before(claims.IssuedAt) {
		return Claims{}, ErrNotYetValid
	}
	if !now.Before(claims.ExpiresAt.Add(v.leeway)) {
		return Claims{}, ErrExpired
	}
	return claims, nil
}

// parseHeader enforces the header policy and returns the kid. The only members allowed are alg, kid
// and typ, which also rules out crit, jku, jwk, x5u and every other header that changes how a
// signature is checked.
func parseHeader(b []byte) (string, error) {
	m, err := strictObject(b)
	if err != nil {
		return "", malformed("header: %v", err)
	}
	for name := range m {
		if name != "alg" && name != "kid" && name != "typ" {
			return "", malformed("header member %q is not allowed", name)
		}
	}
	if alg, _, err := stringMember(m, "alg"); err != nil || alg != "EdDSA" {
		return "", malformed("header alg must be EdDSA")
	}
	kid, _, err := stringMember(m, "kid")
	if err != nil || kid == "" {
		return "", malformed("header kid is required")
	}
	if typ, present, err := stringMember(m, "typ"); err != nil || (present && typ != "JWT") {
		return "", malformed("header typ must be JWT")
	}
	return kid, nil
}

func parseClaims(b []byte) (Claims, error) {
	m, err := strictObject(b)
	if err != nil {
		return Claims{}, malformed("payload: %v", err)
	}
	var c Claims
	for _, f := range []struct {
		name string
		dst  *string
		opt  bool
	}{{"sub", &c.Subject, false}, {"sid", &c.SessionID, false}, {"acc", &c.AccountID, false}, {"club_id", &c.ClubID, true}} {
		s, present, err := stringMember(m, f.name)
		if err != nil {
			return Claims{}, malformed("%v", err)
		}
		if !present && !f.opt {
			return Claims{}, malformed("%q is missing", f.name)
		}
		*f.dst = s
	}
	aud, present, err := stringMember(m, "aud")
	if err != nil || !present {
		return Claims{}, malformed("\"aud\" is missing or not a string")
	}
	c.Audience = Audience(aud)
	var secs [3]int64
	for i, name := range []string{"iat", "nbf", "exp"} {
		if secs[i], err = intMember(m, name); err != nil {
			return Claims{}, malformed("%v", err)
		}
	}
	c.IssuedAt, c.NotBefore, c.ExpiresAt = time.Unix(secs[0], 0).UTC(), time.Unix(secs[1], 0).UTC(), time.Unix(secs[2], 0).UTC()
	if err := c.validate(); err != nil {
		return Claims{}, malformed("%v", err)
	}
	if !c.ExpiresAt.After(c.NotBefore) {
		return Claims{}, malformed("exp is not after nbf")
	}
	return c, nil
}
