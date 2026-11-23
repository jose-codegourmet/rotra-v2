package google_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
)

var fixedNow = time.Date(2026, 11, 23, 3, 0, 0, 0, time.UTC)

func TestPKCEChallengeIsTheS256OfTheVerifier(t *testing.T) {
	v, c, err := google.PKCE()
	if err != nil || len(v) < 43 || c == "" || v == c {
		t.Fatalf("verifier %q challenge %q err %v", v, c, err)
	}
	v2, c2, _ := google.PKCE()
	if v == v2 || c == c2 {
		t.Fatal("two PKCE pairs must differ")
	}
	// RFC 7636 appendix B vector.
	if got := google.ChallengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"); got != "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" {
		t.Fatalf("S256 challenge = %q", got)
	}
}

func TestAuthURLCarriesTheFlowAndAsksForTheAccountPicker(t *testing.T) {
	f := newFakeGoogle(t)
	raw := f.client(nil).AuthURL("https://player.test/api/auth/google/callback", "st", "ch", "no")
	u, err := url.Parse(raw)
	if err != nil || !strings.HasPrefix(raw, f.srv.URL+"/auth?") {
		t.Fatalf("url %q err %v", raw, err)
	}
	want := map[string]string{
		"client_id": testClientID, "redirect_uri": "https://player.test/api/auth/google/callback", "response_type": "code",
		"scope": "openid email profile", "state": "st", "nonce": "no", "code_challenge": "ch", "code_challenge_method": "S256", "prompt": "select_account",
	}
	for k, v := range want {
		if got := u.Query().Get(k); got != v {
			t.Errorf("%s = %q, want %q", k, got, v)
		}
	}
	if u.Query().Get("client_secret") != "" {
		t.Fatal("the secret must never be in the browser's URL")
	}
}

func TestExchangeVerifiesAndNormalizesTheGoogleAccount(t *testing.T) {
	f := newFakeGoogle(t)
	f.grant("code-1", "nonce-1", fixedNow, claims{"email": "  Pat@Example.TEST ", "name": "  Pat Reyes  "})
	got, err := f.client(func() time.Time { return fixedNow }).Exchange(context.Background(), "code-1", "verifier", "https://p/cb", "nonce-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Email != "pat@example.test" || got.Name != "Pat Reyes" {
		t.Fatalf("got %+v", got)
	}
	hit := f.tokenHit[0]
	if hit.Get("code_verifier") != "verifier" || hit.Get("redirect_uri") != "https://p/cb" || hit.Get("client_id") != testClientID {
		t.Fatalf("the token request was %v", hit)
	}
}

func TestExchangeRefusesAnythingThatDoesNotVerify(t *testing.T) {
	cases := map[string]claims{
		"wrong nonce":         {"nonce": "other"},
		"no nonce":            {"nonce": nil},
		"wrong audience":      {"aud": "someone-else"},
		"wrong issuer":        {"iss": "https://evil.example"},
		"expired":             {"exp": fixedNow.Add(-time.Hour).Unix()},
		"from the future":     {"iat": fixedNow.Add(time.Hour).Unix()},
		"email not verified":  {"email_verified": false},
		"no email":            {"email": nil},
		"not an email":        {"email": "no-at-sign"},
		"two ats":             {"email": "a@b@c"},
		"spaces in the email": {"email": "a b@c"},
	}
	for name, over := range cases {
		t.Run(name, func(t *testing.T) {
			f := newFakeGoogle(t)
			f.grant("c", "nonce-1", fixedNow, over)
			_, err := f.client(func() time.Time { return fixedNow }).Exchange(context.Background(), "c", "v", "https://p/cb", "nonce-1")
			if err != google.ErrExchange {
				t.Fatalf("err = %v, want ErrExchange", err)
			}
		})
	}
}

func TestExchangeAcceptsAudienceListsAndTheStringTrue(t *testing.T) {
	f := newFakeGoogle(t)
	f.grant("c", "n", fixedNow, claims{"aud": []string{"other", testClientID}, "email_verified": "true"})
	if _, err := f.client(func() time.Time { return fixedNow }).Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != nil {
		t.Fatal(err)
	}
}

func TestExchangeRefusesABadSignatureAnUnknownKeyAndOtherAlgorithms(t *testing.T) {
	f := newFakeGoogle(t)
	other, _ := rsa.GenerateKey(rand.Reader, 2048)
	good := claims{"iss": "https://accounts.google.com", "aud": testClientID, "iat": fixedNow.Unix(), "exp": fixedNow.Add(time.Hour).Unix(), "nonce": "n", "email": "a@b.test", "email_verified": true}
	for name, token := range map[string]string{
		"signed by another key": f.sign(map[string]string{"alg": "RS256", "kid": f.kid}, good, other),
		"unknown kid":           f.sign(map[string]string{"alg": "RS256", "kid": "nope"}, good, f.key),
		"alg none":              f.sign(map[string]string{"alg": "none", "kid": f.kid}, good, f.key),
		"alg HS256":             f.sign(map[string]string{"alg": "HS256", "kid": f.kid}, good, f.key),
		"no kid":                f.sign(map[string]string{"alg": "RS256"}, good, f.key),
		"not a jws":             "abc",
	} {
		t.Run(name, func(t *testing.T) {
			f.mu.Lock()
			f.codes["c"] = nil
			f.mu.Unlock()
			srv := tokenServer(t, token)
			c := google.NewClient(testClientID, testSecret, google.Endpoints{Auth: "x", Token: srv.URL, JWKS: f.srv.URL + "/certs", Issuers: []string{"https://accounts.google.com"}}, srv.Client(), func() time.Time { return fixedNow })
			if _, err := c.Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != google.ErrExchange {
				t.Fatalf("err = %v, want ErrExchange", err)
			}
		})
	}
}

func TestExchangeRefusesAProviderThatSaysNoOrIsDown(t *testing.T) {
	f := newFakeGoogle(t)
	now := func() time.Time { return fixedNow }
	if _, err := f.client(now).Exchange(context.Background(), "never-granted", "v", "https://p/cb", "n"); err != google.ErrExchange {
		t.Fatalf("invalid_grant: %v", err)
	}
	f.status = http.StatusInternalServerError
	f.grant("c", "n", fixedNow, nil)
	if _, err := f.client(now).Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != google.ErrExchange {
		t.Fatalf("500: %v", err)
	}
	f.srv.Close()
	if _, err := f.client(now).Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != google.ErrExchange {
		t.Fatalf("unreachable: %v", err)
	}
}

func TestKeysAreCachedAndRefetchedForAnUnknownKidAtMostOncePerMinute(t *testing.T) {
	f := newFakeGoogle(t)
	clock := fixedNow
	c := f.client(func() time.Time { return clock })
	for i := 0; i < 3; i++ {
		f.grant("c", "n", clock, nil)
		if _, err := c.Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != nil {
			t.Fatal(err)
		}
	}
	if f.keyFetch != 1 {
		t.Fatalf("keys fetched %d times for three exchanges, want 1", f.keyFetch)
	}
	// Google rotates: a token with a new kid triggers one refetch, then the minute guard holds.
	f.mu.Lock()
	f.kid = "kid-2"
	f.mu.Unlock()
	f.grant("c", "n", clock, nil)
	if _, err := c.Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err == nil {
		t.Fatal("a new kid inside the minute must not refetch")
	}
	clock = clock.Add(2 * time.Minute)
	f.grant("c", "n", clock, nil)
	if _, err := c.Exchange(context.Background(), "c", "v", "https://p/cb", "n"); err != nil {
		t.Fatalf("after the minute the new key must be fetched: %v", err)
	}
	if f.keyFetch != 2 {
		t.Fatalf("keys fetched %d times, want 2", f.keyFetch)
	}
}

func TestASlowKeyFetchDoesNotBlockATokenWhoseKeyIsCached(t *testing.T) {
	f := newFakeGoogle(t)
	clock := fixedNow
	c := f.client(func() time.Time { return clock })
	f.grant("warm", "n", clock, nil)
	if _, err := c.Exchange(context.Background(), "warm", "v", "https://p/cb", "n"); err != nil {
		t.Fatal(err)
	}
	// A token signed with a new kid needs a refetch, and Google's key endpoint is slow.
	clock = clock.Add(2 * time.Minute)
	gate := make(chan struct{})
	var release sync.Once
	open := func() { release.Do(func() { close(gate) }) }
	t.Cleanup(open) // a failing run must not leave the fake's handler stuck
	f.mu.Lock()
	f.kid, f.certsGate = "kid-2", gate
	f.mu.Unlock()
	f.grant("rotated", "n", clock, nil)
	done := make(chan error, 1)
	go func() {
		_, err := c.Exchange(context.Background(), "rotated", "v", "https://p/cb", "n")
		done <- err
	}()
	for deadline := time.Now().Add(5 * time.Second); ; time.Sleep(5 * time.Millisecond) {
		f.mu.Lock()
		fetches := f.keyFetch
		f.mu.Unlock()
		if fetches == 2 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("the refetch never started")
		}
	}
	// While it is stuck, a token with the cached key verifies at once.
	f.mu.Lock()
	f.kid = "kid-1"
	f.mu.Unlock()
	f.grant("known", "n", clock, nil)
	ok := make(chan error, 1)
	go func() {
		_, err := c.Exchange(context.Background(), "known", "v", "https://p/cb", "n")
		ok <- err
	}()
	select {
	case err := <-ok:
		if err != nil {
			t.Fatalf("a cached key verifies while the keys are being fetched: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("a verification with a cached key waited for the slow key fetch")
	}
	open()
	<-done
}

func TestAKeyFetchSurvivesTheCancellationOfTheRequestThatStartedIt(t *testing.T) {
	f := newFakeGoogle(t)
	clock := fixedNow
	c := f.client(func() time.Time { return clock })
	f.grant("warm", "n", clock, nil)
	if _, err := c.Exchange(context.Background(), "warm", "v", "https://p/cb", "n"); err != nil {
		t.Fatal(err)
	}
	// The cached keys are an hour old. The first browser to need a fetch goes away while Google's key endpoint is slow.
	clock = clock.Add(2 * time.Hour)
	gate := make(chan struct{})
	var release sync.Once
	open := func() { release.Do(func() { close(gate) }) }
	t.Cleanup(open)
	f.mu.Lock()
	f.certsGate = gate
	f.mu.Unlock()
	f.grant("first", "n", clock, nil)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		_, _ = c.Exchange(ctx, "first", "v", "https://p/cb", "n")
	}()
	for deadline := time.Now().Add(5 * time.Second); ; time.Sleep(5 * time.Millisecond) {
		f.mu.Lock()
		fetches := f.keyFetch
		f.mu.Unlock()
		if fetches == 2 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("the refetch never started")
		}
	}
	cancel()
	open()
	<-done
	// The next sign-in must not be refused for a minute because of that browser.
	f.grant("second", "n", clock, nil)
	if _, err := c.Exchange(context.Background(), "second", "v", "https://p/cb", "n"); err != nil {
		t.Fatalf("a later sign-in after a cancelled key fetch: %v", err)
	}
}
