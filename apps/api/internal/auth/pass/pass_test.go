package pass

import (
	"bytes"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

var t0 = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)

func keyFromSeed(b byte) ed25519.PrivateKey {
	return ed25519.NewKeyFromSeed(bytes.Repeat([]byte{b}, 32))
}

func pub(k ed25519.PrivateKey) ed25519.PublicKey { return k.Public().(ed25519.PublicKey) }

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func clubClaims() Claims {
	return Claims{Subject: "id-1", SessionID: "sess-1", Audience: AudienceClub, AccountID: "acc-1", ClubID: "club-1"}
}

func playerClaims() Claims {
	return Claims{Subject: "id-2", SessionID: "sess-2", Audience: AudiencePlayer, AccountID: "acc-2"}
}

// pair builds a signer on key A and a verifier that knows A.
func pair(t *testing.T) (*Signer, *Verifier) {
	t.Helper()
	k := keyFromSeed(1)
	s, err := NewSigner(k, 0)
	if err != nil {
		t.Fatal(err)
	}
	ks, err := NewKeySet(pub(k))
	if err != nil {
		t.Fatal(err)
	}
	v, err := NewVerifier(ks, 0)
	if err != nil {
		t.Fatal(err)
	}
	return s, v
}

func header(kid string) string { return fmt.Sprintf(`{"alg":"EdDSA","kid":%q,"typ":"JWT"}`, kid) }

// payloadAt is a valid club payload issued at t0 with the given lifetime in seconds.
func payloadAt(life int64) string {
	return fmt.Sprintf(`{"sub":"id-1","sid":"sess-1","aud":"club","acc":"acc-1","club_id":"club-1","iat":%d,"nbf":%d,"exp":%d}`,
		t0.Unix(), t0.Unix(), t0.Unix()+life)
}

// forge signs arbitrary header and payload text with k, so a test can build a validly signed token
// whose content is wrong.
func forge(k ed25519.PrivateKey, hdr, payload string) string {
	return signCompact([]byte(hdr), []byte(payload), k)
}

func wantErr(t *testing.T, name string, err, want error) {
	t.Helper()
	if !errors.Is(err, want) {
		t.Errorf("%s: want %v, got %v", name, want, err)
	}
}

func TestRFC8037SigningVector(t *testing.T) {
	// RFC 8037 Appendix A: an independent implementation's Ed25519 JWS.
	const (
		d   = "nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A"
		x   = "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
		jws = "eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc." +
			"hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg"
	)
	seed, _ := base64.RawURLEncoding.DecodeString(d)
	priv := ed25519.NewKeyFromSeed(seed)
	if got := b64(pub(priv)); got != x {
		t.Fatalf("public key = %s, want %s", got, x)
	}
	if got := signCompact([]byte(`{"alg":"EdDSA"}`), []byte("Example of Ed25519 signing"), priv); got != jws {
		t.Errorf("signature differs from RFC 8037:\n got %s\nwant %s", got, jws)
	}
	c, err := parseCompact(jws)
	if err != nil {
		t.Fatal(err)
	}
	if !ed25519.Verify(pub(priv), []byte(c.signingInput), c.sig) {
		t.Error("RFC 8037 signature does not verify")
	}
	if string(c.payload) != "Example of Ed25519 signing" || string(c.header) != `{"alg":"EdDSA"}` {
		t.Errorf("parsed %q %q", c.header, c.payload)
	}
	// RFC 8037 A.3: the JWK thumbprint of the same key.
	if got := KeyID(pub(priv)); got != "kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k" {
		t.Errorf("kid = %s", got)
	}
}

func TestKeyIDStable(t *testing.T) {
	a, b := KeyID(pub(keyFromSeed(1))), KeyID(pub(keyFromSeed(1)))
	if a != b || a == "" {
		t.Fatalf("kid not stable: %q %q", a, b)
	}
	if a == KeyID(pub(keyFromSeed(2))) {
		t.Fatal("different keys share a kid")
	}
	if len(a) != 43 || strings.ContainsAny(a, "=+/") {
		t.Fatalf("kid is not an unpadded base64url SHA-256: %q", a)
	}
}

func TestSignVerifyRoundTrip(t *testing.T) {
	s, v := pair(t)
	for _, c := range []Claims{clubClaims(), playerClaims(), {Subject: "a", SessionID: "s", Audience: AudienceAdmin, AccountID: "x"}} {
		tok, err := s.Sign(c, t0)
		if err != nil {
			t.Fatalf("%s sign: %v", c.Audience, err)
		}
		got, err := v.Verify(tok, c.Audience, t0.Add(time.Minute))
		if err != nil {
			t.Fatalf("%s verify: %v", c.Audience, err)
		}
		want := c
		want.IssuedAt, want.NotBefore, want.ExpiresAt = t0, t0, t0.Add(DefaultLifetime)
		if got != want {
			t.Errorf("%s claims = %+v, want %+v", c.Audience, got, want)
		}
	}
}

func TestSignOverridesCallerTimes(t *testing.T) {
	s, v := pair(t)
	c := clubClaims()
	c.ExpiresAt = t0.Add(1000 * time.Hour)
	c.IssuedAt = t0.Add(-1000 * time.Hour)
	tok, err := s.Sign(c, t0)
	if err != nil {
		t.Fatal(err)
	}
	got, err := v.Verify(tok, AudienceClub, t0)
	if err != nil || !got.ExpiresAt.Equal(t0.Add(DefaultLifetime)) || !got.IssuedAt.Equal(t0) {
		t.Fatalf("caller times must be ignored: %+v %v", got, err)
	}
}

func TestWireShape(t *testing.T) {
	s, _ := pair(t)
	kid := s.KeyID()
	if kid != KeyID(pub(keyFromSeed(1))) {
		t.Fatalf("signer kid %q", kid)
	}
	tok, err := s.Sign(clubClaims(), t0)
	if err != nil {
		t.Fatal(err)
	}
	c, err := parseCompact(tok)
	if err != nil {
		t.Fatal(err)
	}
	if string(c.header) != header(kid) {
		t.Errorf("header = %s", c.header)
	}
	var m map[string]any
	if err := json.Unmarshal(c.payload, &m); err != nil {
		t.Fatal(err)
	}
	want := map[string]any{"sub": "id-1", "sid": "sess-1", "aud": "club", "acc": "acc-1", "club_id": "club-1",
		"iat": float64(t0.Unix()), "nbf": float64(t0.Unix()), "exp": float64(t0.Unix() + 900)}
	if fmt.Sprint(m) != fmt.Sprint(want) {
		t.Errorf("payload = %v\nwant %v", m, want)
	}
	tok, _ = s.Sign(playerClaims(), t0)
	c, _ = parseCompact(tok)
	if strings.Contains(string(c.payload), "club_id") {
		t.Errorf("a player pass must not carry club_id: %s", c.payload)
	}
}

func TestLifetime(t *testing.T) {
	s, _ := pair(t)
	if s.Lifetime() != 15*time.Minute || DefaultLifetime != 15*time.Minute {
		t.Fatalf("default lifetime %v", s.Lifetime())
	}
	k := keyFromSeed(1)
	s2, err := NewSigner(k, 2*time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	ks, _ := NewKeySet(pub(k))
	v, _ := NewVerifier(ks, 0)
	tok, _ := s2.Sign(clubClaims(), t0)
	if _, err := v.Verify(tok, AudienceClub, t0.Add(119*time.Second)); err != nil {
		t.Errorf("before 2m: %v", err)
	}
	_, err = v.Verify(tok, AudienceClub, t0.Add(120*time.Second))
	wantErr(t, "at 2m", err, ErrExpired)
	if _, err := NewSigner(k, -time.Second); err == nil {
		t.Error("negative lifetime must fail")
	}
	if _, err := NewSigner(ed25519.PrivateKey("short"), 0); err == nil {
		t.Error("short key must fail")
	}
}

func TestSignRejectsBadClaims(t *testing.T) {
	s, _ := pair(t)
	mut := func(f func(*Claims)) Claims { c := clubClaims(); f(&c); return c }
	for name, c := range map[string]Claims{
		"no sub":            mut(func(c *Claims) { c.Subject = "" }),
		"no sid":            mut(func(c *Claims) { c.SessionID = "" }),
		"no acc":            mut(func(c *Claims) { c.AccountID = "" }),
		"no aud":            mut(func(c *Claims) { c.Audience = "" }),
		"bad aud":           mut(func(c *Claims) { c.Audience = "root" }),
		"club without club": mut(func(c *Claims) { c.ClubID = "" }),
		"player with club":  mut(func(c *Claims) { c.Audience = AudiencePlayer }),
		"admin with club":   mut(func(c *Claims) { c.Audience = AudienceAdmin }),
	} {
		if _, err := s.Sign(c, t0); err == nil {
			t.Errorf("%s: want an error", name)
		}
	}
}

func TestExpiryAndNotBefore(t *testing.T) {
	s, v := pair(t)
	tok, _ := s.Sign(clubClaims(), t0)
	exp := t0.Add(DefaultLifetime)
	for _, c := range []struct {
		name string
		now  time.Time
		want error
	}{
		{"at nbf", t0, nil},
		{"last second", exp.Add(-time.Second), nil},
		{"at exp", exp, ErrExpired},
		{"long after", exp.Add(24 * time.Hour), ErrExpired},
		{"before nbf", t0.Add(-time.Second), ErrNotYetValid},
	} {
		_, err := v.Verify(tok, AudienceClub, c.now)
		if c.want == nil && err != nil {
			t.Errorf("%s: %v", c.name, err)
		} else if c.want != nil {
			wantErr(t, c.name, err, c.want)
		}
	}
}

func TestIatInTheFutureIsNotYetValid(t *testing.T) {
	_, v := pair(t)
	p := fmt.Sprintf(`{"sub":"id-1","sid":"s","aud":"club","acc":"a","club_id":"c","iat":%d,"nbf":%d,"exp":%d}`,
		t0.Unix()+100, t0.Unix()-100, t0.Unix()+1000)
	tok := forge(keyFromSeed(1), header(KeyID(pub(keyFromSeed(1)))), p)
	_, err := v.Verify(tok, AudienceClub, t0)
	wantErr(t, "future iat", err, ErrNotYetValid)
}

func TestLeeway(t *testing.T) {
	k := keyFromSeed(1)
	s, _ := NewSigner(k, 0)
	ks, _ := NewKeySet(pub(k))
	tight, _ := NewVerifier(ks, 0)
	loose, err := NewVerifier(ks, 3*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	tok, _ := s.Sign(clubClaims(), t0)
	exp := t0.Add(DefaultLifetime)
	if _, err := loose.Verify(tok, AudienceClub, exp.Add(2*time.Second)); err != nil {
		t.Errorf("inside leeway after exp: %v", err)
	}
	_, err = loose.Verify(tok, AudienceClub, exp.Add(3*time.Second))
	wantErr(t, "leeway edge after exp", err, ErrExpired)
	if _, err := loose.Verify(tok, AudienceClub, t0.Add(-3*time.Second)); err != nil {
		t.Errorf("inside leeway before nbf: %v", err)
	}
	_, err = loose.Verify(tok, AudienceClub, t0.Add(-4*time.Second))
	wantErr(t, "outside leeway before nbf", err, ErrNotYetValid)
	_, err = tight.Verify(tok, AudienceClub, exp)
	wantErr(t, "no leeway", err, ErrExpired)
	if _, err := NewVerifier(ks, MaxLeeway); err != nil {
		t.Errorf("MaxLeeway must be allowed: %v", err)
	}
	if _, err := NewVerifier(ks, MaxLeeway+time.Nanosecond); err == nil {
		t.Error("leeway above the maximum must fail")
	}
	if _, err := NewVerifier(ks, -time.Second); err == nil {
		t.Error("negative leeway must fail")
	}
	if _, err := NewVerifier(nil, 0); err == nil {
		t.Error("nil key set must fail")
	}
}

func TestAudienceIsolation(t *testing.T) {
	s, v := pair(t)
	all := []Claims{clubClaims(), playerClaims(), {Subject: "a", SessionID: "s", Audience: AudienceAdmin, AccountID: "x"}}
	for _, issued := range all {
		tok, _ := s.Sign(issued, t0)
		for _, want := range all {
			_, err := v.Verify(tok, want.Audience, t0)
			if want.Audience == issued.Audience {
				if err != nil {
					t.Errorf("%s for %s: %v", issued.Audience, want.Audience, err)
				}
				continue
			}
			wantErr(t, fmt.Sprintf("%s pass for %s", issued.Audience, want.Audience), err, ErrWrongAudience)
		}
	}
	tok, _ := s.Sign(clubClaims(), t0)
	_, err := v.Verify(tok, "", t0)
	wantErr(t, "empty wanted audience", err, ErrWrongAudience)
	_, err = v.Verify(tok, "root", t0)
	wantErr(t, "unknown wanted audience", err, ErrWrongAudience)
}

func TestVerifyMalformedAndTampered(t *testing.T) {
	kA, kB := keyFromSeed(1), keyFromSeed(2)
	kidA, kidB := KeyID(pub(kA)), KeyID(pub(kB))
	s, v := pair(t)
	good, _ := s.Sign(clubClaims(), t0)
	parts := strings.Split(good, ".")
	hdrA, pay := header(kidA), payloadAt(900)

	swap := func(i int, val string) string {
		p := append([]string{}, parts...)
		p[i] = val
		return strings.Join(p, ".")
	}
	flip := func(s string) string { // change the first character to another valid base64url one
		if s[0] == 'A' {
			return "B" + s[1:]
		}
		return "A" + s[1:]
	}
	hmacTok := func() string { // alg HS256 with the public key as the secret
		h, p := b64([]byte(`{"alg":"HS256","kid":"`+kidA+`","typ":"JWT"}`)), b64([]byte(pay))
		m := hmac.New(sha256.New, pub(kA))
		m.Write([]byte(h + "." + p))
		return h + "." + p + "." + b64(m.Sum(nil))
	}()
	noneTok := b64([]byte(`{"alg":"none","kid":"`+kidA+`","typ":"JWT"}`)) + "." + b64([]byte(pay)) + "."
	big := `{"sub":"` + strings.Repeat("x", MaxTokenBytes) + `"}`

	cases := []struct {
		name string
		tok  string
		want error
	}{
		{"empty", "", ErrMalformed},
		{"one segment", parts[0], ErrMalformed},
		{"two segments", parts[0] + "." + parts[1], ErrMalformed},
		{"four segments", good + ".AAAA", ErrMalformed},
		{"trailing dot", good + ".", ErrMalformed},
		{"leading space", " " + good, ErrMalformed},
		{"trailing newline", good + "\n", ErrMalformed},
		{"truncated", good[:len(good)-10], ErrBadSignature},
		{"truncated mid payload", good[:len(parts[0])+8], ErrMalformed},
		{"padded header", swap(0, parts[0]+"=="), ErrMalformed},
		{"padded signature", swap(2, parts[2]+"="), ErrMalformed},
		{"standard alphabet", swap(1, strings.ReplaceAll(parts[1], "-", "+")+"+"), ErrMalformed},
		{"non-base64", swap(1, "!!!!"), ErrMalformed},
		{"non-canonical trailing bits", swap(2, parts[2][:len(parts[2])-1]+"B"), ErrMalformed},
		{"tampered signature", swap(2, flip(parts[2])), ErrBadSignature},
		{"empty signature", swap(2, ""), ErrBadSignature},
		{"short signature", swap(2, parts[2][:20]), ErrBadSignature},
		{"tampered payload", swap(1, b64([]byte(strings.Replace(payloadAt(900), "club", "admin", 1)))), ErrBadSignature},
		{"tampered header", swap(0, b64([]byte(strings.Replace(hdrA, ",", ", ", 1)))), ErrBadSignature},
		{"payload swapped from another token", swap(1, strings.Split(forge(kA, hdrA, payloadAt(60)), ".")[1]), ErrBadSignature},
		{"alg none no signature", noneTok, ErrMalformed},
		{"alg none with signature", noneTok + parts[2], ErrMalformed},
		{"alg HS256 public key as secret", hmacTok, ErrMalformed},
		{"alg lowercase", forge(kA, `{"alg":"eddsa","kid":"`+kidA+`","typ":"JWT"}`, pay), ErrMalformed},
		{"alg missing", forge(kA, `{"kid":"`+kidA+`","typ":"JWT"}`, pay), ErrMalformed},
		{"alg not a string", forge(kA, `{"alg":1,"kid":"`+kidA+`"}`, pay), ErrMalformed},
		{"alg RS256", forge(kA, `{"alg":"RS256","kid":"`+kidA+`"}`, pay), ErrMalformed},
		{"kid missing", forge(kA, `{"alg":"EdDSA","typ":"JWT"}`, pay), ErrMalformed},
		{"kid empty", forge(kA, `{"alg":"EdDSA","kid":"","typ":"JWT"}`, pay), ErrMalformed},
		{"kid not a string", forge(kA, `{"alg":"EdDSA","kid":7}`, pay), ErrMalformed},
		{"kid unknown", forge(kA, header("nope"), pay), ErrUnknownKey},
		{"kid of key B (not published here), signed by A", forge(kA, header(kidB), pay), ErrUnknownKey},
		{"crit header", forge(kA, `{"alg":"EdDSA","kid":"`+kidA+`","crit":["exp"],"exp":1}`, pay), ErrMalformed},
		{"crit unknown", forge(kA, `{"alg":"EdDSA","kid":"`+kidA+`","crit":["x"]}`, pay), ErrMalformed},
		{"jku header", forge(kA, `{"alg":"EdDSA","kid":"`+kidA+`","jku":"https://evil"}`, pay), ErrMalformed},
		{"embedded jwk", forge(kA, `{"alg":"EdDSA","kid":"`+kidA+`","jwk":{}}`, pay), ErrMalformed},
		{"typ other", forge(kA, `{"alg":"EdDSA","kid":"`+kidA+`","typ":"at+jwt"}`, pay), ErrMalformed},
		{"duplicate header key", forge(kA, `{"alg":"none","alg":"EdDSA","kid":"`+kidA+`"}`, pay), ErrMalformed},
		{"duplicate kid", forge(kA, `{"alg":"EdDSA","kid":"`+kidB+`","kid":"`+kidA+`"}`, pay), ErrMalformed},
		{"header not an object", forge(kA, `["EdDSA"]`, pay), ErrMalformed},
		{"header trailing data", forge(kA, hdrA+`{}`, pay), ErrMalformed},
		{"header not json", forge(kA, `EdDSA`, pay), ErrMalformed},
		{"payload not an object", forge(kA, hdrA, `"x"`), ErrMalformed},
		{"payload not json", forge(kA, hdrA, `nope`), ErrMalformed},
		{"payload trailing data", forge(kA, hdrA, pay+`x`), ErrMalformed},
		{"duplicate claim", forge(kA, hdrA, strings.Replace(pay, `"aud":"club"`, `"aud":"admin","aud":"club"`, 1)), ErrMalformed},
		{"duplicate exp", forge(kA, hdrA, strings.Replace(pay, `"exp":`, `"exp":1,"exp":`, 1)), ErrMalformed},
		{"exp as string", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`"exp":%d`, t0.Unix()+900), fmt.Sprintf(`"exp":"%d"`, t0.Unix()+900), 1)), ErrMalformed},
		{"exp fractional", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`"exp":%d`, t0.Unix()+900), fmt.Sprintf(`"exp":%d.5`, t0.Unix()+900), 1)), ErrMalformed},
		{"exp null", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`"exp":%d`, t0.Unix()+900), `"exp":null`, 1)), ErrMalformed},
		{"sub as number", forge(kA, hdrA, strings.Replace(pay, `"sub":"id-1"`, `"sub":1`, 1)), ErrMalformed},
		{"aud as array", forge(kA, hdrA, strings.Replace(pay, `"aud":"club"`, `"aud":["club"]`, 1)), ErrMalformed},
		{"aud unknown value", forge(kA, hdrA, strings.Replace(pay, `"aud":"club"`, `"aud":"root"`, 1)), ErrMalformed},
		{"claim key in other case", forge(kA, hdrA, strings.Replace(pay, `"sub"`, `"SUB"`, 1)), ErrMalformed},
		{"missing sub", forge(kA, hdrA, strings.Replace(pay, `"sub":"id-1",`, ``, 1)), ErrMalformed},
		{"missing sid", forge(kA, hdrA, strings.Replace(pay, `"sid":"sess-1",`, ``, 1)), ErrMalformed},
		{"missing aud", forge(kA, hdrA, strings.Replace(pay, `"aud":"club",`, ``, 1)), ErrMalformed},
		{"missing acc", forge(kA, hdrA, strings.Replace(pay, `"acc":"acc-1",`, ``, 1)), ErrMalformed},
		{"missing exp", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`,"exp":%d`, t0.Unix()+900), ``, 1)), ErrMalformed},
		{"missing nbf", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`"nbf":%d,`, t0.Unix()), ``, 1)), ErrMalformed},
		{"missing iat", forge(kA, hdrA, strings.Replace(pay, fmt.Sprintf(`"iat":%d,`, t0.Unix()), ``, 1)), ErrMalformed},
		{"empty sub", forge(kA, hdrA, strings.Replace(pay, `"sub":"id-1"`, `"sub":""`, 1)), ErrMalformed},
		{"club pass without club_id", forge(kA, hdrA, strings.Replace(pay, `,"club_id":"club-1"`, ``, 1)), ErrMalformed},
		{"club pass with empty club_id", forge(kA, hdrA, strings.Replace(pay, `"club_id":"club-1"`, `"club_id":""`, 1)), ErrMalformed},
		{"player pass with club_id", forge(kA, hdrA, strings.Replace(pay, `"aud":"club"`, `"aud":"player"`, 1)), ErrMalformed},
		{"exp not after nbf", forge(kA, hdrA, payloadAt(0)), ErrMalformed},
		{"oversize token", forge(kA, hdrA, big), ErrMalformed},
	}
	for _, c := range cases {
		_, err := v.Verify(c.tok, AudienceClub, t0)
		wantErr(t, c.name, err, c.want)
		if err == nil {
			t.Errorf("%s: accepted", c.name)
		}
	}

	// At the limit still works; one byte over does not.
	if _, err := v.Verify(good, AudienceClub, t0); err != nil {
		t.Fatalf("control token: %v", err)
	}
	long := strings.Repeat("a", MaxTokenBytes+1)
	_, err := v.Verify(long, AudienceClub, t0)
	wantErr(t, "token over the size limit", err, ErrMalformed)
}

func TestErrorsNeverCarryKeyBytes(t *testing.T) {
	k := keyFromSeed(9)
	secrets := []string{b64(k.Seed()), b64(pub(k)), base64.StdEncoding.EncodeToString(k.Seed())}
	_, v := pair(t)
	for _, tok := range []string{"", "a.b.c", forge(k, header("x"), payloadAt(900))} {
		_, err := v.Verify(tok, AudienceClub, t0)
		if err == nil {
			t.Fatal("expected an error")
		}
		for _, s := range secrets {
			if strings.Contains(err.Error(), s) {
				t.Errorf("error leaks key material: %v", err)
			}
		}
	}
}

func TestRotation(t *testing.T) {
	kOld, kNew := keyFromSeed(1), keyFromSeed(2)
	signOld, _ := NewSigner(kOld, 0)
	signNew, _ := NewSigner(kNew, 0)
	tokOld, _ := signOld.Sign(clubClaims(), t0)
	tokNew, _ := signNew.Sign(clubClaims(), t0)

	verifier := func(cur ed25519.PublicKey, extra ...ed25519.PublicKey) *Verifier {
		ks, err := NewKeySet(cur, extra...)
		if err != nil {
			t.Fatal(err)
		}
		v, err := NewVerifier(ks, 0)
		if err != nil {
			t.Fatal(err)
		}
		return v
	}

	// Before the swap: current OLD, NEXT published as an extra. Both verify.
	v := verifier(pub(kOld), pub(kNew))
	for name, tok := range map[string]string{"old": tokOld, "new": tokNew} {
		if _, err := v.Verify(tok, AudienceClub, t0); err != nil {
			t.Errorf("before swap, %s pass: %v", name, err)
		}
	}
	// After the swap: current NEW, OLD still an extra. Both still verify.
	v = verifier(pub(kNew), pub(kOld))
	for name, tok := range map[string]string{"old": tokOld, "new": tokNew} {
		if _, err := v.Verify(tok, AudienceClub, t0); err != nil {
			t.Errorf("after swap, %s pass: %v", name, err)
		}
	}
	// Old key removed: its pass is an unknown key (the refresh path handles it); the new one still works.
	v = verifier(pub(kNew))
	_, err := v.Verify(tokOld, AudienceClub, t0)
	wantErr(t, "old key removed", err, ErrUnknownKey)
	if _, err := v.Verify(tokNew, AudienceClub, t0); err != nil {
		t.Errorf("new pass after removal: %v", err)
	}
	// The old key's pass is still ErrUnknownKey, not ErrExpired, even long after expiry.
	_, err = v.Verify(tokOld, AudienceClub, t0.Add(48*time.Hour))
	wantErr(t, "old key removed and expired", err, ErrUnknownKey)
}

func TestKeySet(t *testing.T) {
	a, b, c := pub(keyFromSeed(1)), pub(keyFromSeed(2)), pub(keyFromSeed(3))
	ks, err := NewKeySet(a, b, c, b, a) // duplicates are dropped
	if err != nil {
		t.Fatal(err)
	}
	jwks := ks.JWKS()
	if len(jwks) != 3 {
		t.Fatalf("keys = %d, want 3", len(jwks))
	}
	for i, k := range []ed25519.PublicKey{a, b, c} {
		want := JWK{Kty: "OKP", Crv: "Ed25519", X: b64(k), Kid: KeyID(k), Alg: "EdDSA", Use: "sig"}
		if jwks[i] != want {
			t.Errorf("key %d = %+v, want %+v", i, jwks[i], want)
		}
		got, ok := ks.Lookup(KeyID(k))
		if !ok || !bytes.Equal(got, k) {
			t.Errorf("lookup %d failed", i)
		}
	}
	if _, ok := ks.Lookup("nope"); ok {
		t.Error("unknown kid found")
	}
	if _, ok := ks.Lookup(""); ok {
		t.Error("empty kid found")
	}
	// JWKS returns a copy, so a caller cannot reorder the set.
	jwks[0].Kid = "changed"
	if ks.JWKS()[0].Kid == "changed" {
		t.Error("JWKS exposes internal state")
	}
	if _, err := NewKeySet(nil); err == nil {
		t.Error("nil current key must fail")
	}
	if _, err := NewKeySet(a, ed25519.PublicKey("short")); err == nil {
		t.Error("short extra key must fail")
	}
}

func TestGenerateKeyAndEncoding(t *testing.T) {
	k, err := GenerateKey(bytes.NewReader(bytes.Repeat([]byte{5}, 64)))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(k, ed25519.NewKeyFromSeed(bytes.Repeat([]byte{5}, 32))) {
		t.Error("GenerateKey must read a 32 byte seed from the reader")
	}
	k1, _ := GenerateKey(nil)
	k2, _ := GenerateKey(nil)
	if bytes.Equal(k1, k2) {
		t.Error("random keys repeat")
	}
	if _, err := GenerateKey(bytes.NewReader([]byte("short"))); err == nil {
		t.Error("a short reader must fail")
	}

	enc := EncodeSigningKey(k)
	if len(enc) != 43 || strings.ContainsAny(enc, "=+/") {
		t.Fatalf("signing key encoding must be 43 chars of unpadded base64url, got %q", enc)
	}
	if enc != b64(k.Seed()) {
		t.Error("signing key encoding is the base64url of the 32 byte seed")
	}
	back, err := ParseSigningKey(enc)
	if err != nil || !bytes.Equal(back, k) {
		t.Fatalf("round trip: %v", err)
	}
	if _, err := ParseSigningKey("  " + enc + "\n"); err != nil {
		t.Errorf("surrounding whitespace must be tolerated: %v", err)
	}
	if _, err := ParseSigningKey(enc + "="); err != nil {
		t.Errorf("padding must be tolerated: %v", err)
	}
	for name, bad := range map[string]string{
		"empty": "", "not base64": "!!!!", "short": b64(make([]byte, 31)), "long": b64(make([]byte, 33)),
		"std alphabet": strings.ReplaceAll(b64(bytes.Repeat([]byte{0xfb}, 32)), "-", "+"),
		"pem":          "-----BEGIN PRIVATE KEY-----",
	} {
		_, err := ParseSigningKey(bad)
		if err == nil {
			t.Errorf("%s: want an error", name)
			continue
		}
		if bad != "" && strings.Contains(err.Error(), bad) {
			t.Errorf("%s: error repeats the input: %v", name, err)
		}
	}

	pa, pb := pub(keyFromSeed(1)), pub(keyFromSeed(2))
	if EncodePublicKey(pa) != b64(pa) {
		t.Error("public key encoding is the base64url of the 32 byte key")
	}
	list, err := ParsePublicKeys(" " + EncodePublicKey(pa) + " , " + EncodePublicKey(pb) + ",")
	if err != nil || len(list) != 2 || !bytes.Equal(list[0], pa) || !bytes.Equal(list[1], pb) {
		t.Fatalf("list: %v %v", list, err)
	}
	if list, err := ParsePublicKeys(" "); err != nil || len(list) != 0 {
		t.Errorf("blank list: %v %v", list, err)
	}
	for _, bad := range []string{"!!!", b64(make([]byte, 31)), EncodePublicKey(pa) + ",zzz"} {
		if _, err := ParsePublicKeys(bad); err == nil {
			t.Errorf("%q: want an error", bad)
		}
	}
}

func TestParseCompactSegmentsAreStrict(t *testing.T) {
	if _, err := parseCompact("a.b"); !errors.Is(err, ErrMalformed) {
		t.Errorf("got %v", err)
	}
	if _, err := parseCompact("QQ.QQ.QQ"); err != nil {
		t.Errorf("valid segments: %v", err)
	}
	if _, err := parseCompact("QQ==.QQ.QQ"); !errors.Is(err, ErrMalformed) {
		t.Errorf("padding: %v", err)
	}
	if _, err := parseCompact("QQ.QQ.QQ\x00"); !errors.Is(err, ErrMalformed) {
		t.Errorf("control char: %v", err)
	}
}
