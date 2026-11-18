package main

import (
	"crypto/ed25519"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

const proxySecret = "test-proxy-secret"

// signInHandler serves the real Go sign-in routes (the same wiring the signin package's own tests use) over
// the fixture's target database.
func (f *fx) signInHandler(t *testing.T) http.Handler {
	t.Helper()
	key, err := pass.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	keys, err := pass.NewKeySet(key.Public().(ed25519.PublicKey))
	if err != nil {
		t.Fatal(err)
	}
	signer, err := pass.NewSigner(key, 0)
	if err != nil {
		t.Fatal(err)
	}
	verifier, err := pass.NewVerifier(keys, 0)
	if err != nil {
		t.Fatal(err)
	}
	hasher, err := password.NewHasher(password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}, 2)
	if err != nil {
		t.Fatal(err)
	}
	clock := func() time.Time { return time.Now().UTC().Truncate(time.Second) }
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	st := store.New(f.target)
	svc, err := session.New(session.Deps{Store: st, Signer: signer, Verifier: verifier, Hasher: hasher,
		Tuning: config.DefaultAuthTuning(), SigningKey: key, Clock: clock, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	register, err := signin.Register(signin.Deps{Service: svc, Store: st, Verifier: verifier, Clock: clock, Logger: log})
	if err != nil {
		t.Fatal(err)
	}
	return httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: f.target, Readiness: httpapi.NewReadiness(), ProxySecret: proxySecret}, register)
}

func signIn(h http.Handler, app, identifier, pw string) *httptest.ResponseRecorder {
	body, _ := json.Marshal(map[string]string{"identifier": identifier, "password": pw})
	r := httptest.NewRequest("POST", "/api/auth/sign-in", strings.NewReader(string(body)))
	r.Host = "localhost:9000"
	r.Header.Set(httpapi.ProxySecretHeader, proxySecret)
	r.Header.Set("X-Rotra-App", app)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

// The point of the import: a Supabase bcrypt hash signs in through the Go routes with the same password, and
// that first sign-in moves the identity to argon2id.
func TestImportedBcryptHashSignsInThroughGoAndRehashes(t *testing.T) {
	f := newFx(t)
	f.club(t, "smash_club", f.user(t, "smash_club@clubs.rotra.invalid"))
	f.player(t, "ana@example.com", f.user(t, "ana@example.com"))
	f.admin(t, f.user(t, "owner@rotra.club"))
	mustImport(t, f, false)
	h := f.signInHandler(t)

	for _, c := range []struct{ app, aud, identifier string }{
		{"club", "club", "Smash_Club"},
		{"player", "player", "Ana@Example.com"},
		{"admin", "admin", "owner@rotra.club"},
	} {
		key := strings.ToLower(c.identifier)
		before := f.identityFor(t, c.aud, key)
		if before.scheme != "bcrypt" {
			t.Fatalf("%s: scheme before sign-in %q", c.aud, before.scheme)
		}

		if w := signIn(h, c.app, c.identifier, "not the password"); w.Code != http.StatusUnauthorized {
			t.Fatalf("%s: a wrong password gave %d", c.aud, w.Code)
		}
		if f.identityFor(t, c.aud, key).scheme != "bcrypt" {
			t.Fatalf("%s: a failed sign-in rehashed", c.aud)
		}

		w := signIn(h, c.app, c.identifier, goodPass)
		if w.Code != http.StatusOK {
			t.Fatalf("%s: sign-in %d: %s", c.aud, w.Code, w.Body.String())
		}
		after := f.identityFor(t, c.aud, key)
		if after.scheme != "argon2id" || !strings.HasPrefix(after.hash, "$argon2id$") || after.hash == before.hash {
			t.Fatalf("%s: not rehashed: %q", c.aud, after.scheme)
		}
		// And it keeps working on the argon2id hash.
		if w := signIn(h, c.app, c.identifier, goodPass); w.Code != http.StatusOK {
			t.Fatalf("%s: second sign-in %d", c.aud, w.Code)
		}
	}
	if n := f.count(t, `SELECT count(*) FROM auth_sessions`); n != 6 {
		t.Fatalf("%d sessions, want 6", n)
	}
}

// A user Supabase had banned imports disabled and cannot sign in through Go.
func TestImportedDisabledIdentityCannotSignIn(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club", banned(time.Now().Add(24*time.Hour))))
	mustImport(t, f, false)

	if w := signIn(f.signInHandler(t), "admin", "owner@rotra.club", goodPass); w.Code == http.StatusOK {
		t.Fatalf("a disabled identity signed in: %s", w.Body.String())
	}
}
