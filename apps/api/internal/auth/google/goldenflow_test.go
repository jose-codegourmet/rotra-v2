package google_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/register"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// captureCookie is the cookie the cases of the googleflow group send. In the TypeScript capture it stands for what the browser holds
// after a trip to Google (the held Google sign-in and the result, stubbed in capture-writes-player.test.mjs); here it is turned into
// Go's own sealed cookies before the request reaches the routes. Nothing else is stubbed: every decision and write runs for real.
const captureCookie = "capture-google"

type capturedGoogle struct {
	Held *struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	} `json:"held"`
	Result *struct {
		Key     string `json:"key"`
		Intent  string `json:"intent"`
		Outcome string `json:"outcome"`
		Email   string `json:"email"`
		Name    string `json:"name"`
	} `json:"result"`
}

// TestGoldenAfterGoogle replays what the Google routes decide once Google has been through (the group googleflow), captured from the
// TypeScript with the held state and the result stubbed. The answers are compared; Set-Cookie is not (Go's cookies are its own, and
// cookies_test.go pins their names and clearing).
func TestGoldenAfterGoogle(t *testing.T) {
	writetest.ReplayFull(t, "../../playerwrites/testdata", "googleflow", func(pool *pgxpool.Pool, svc *session.Service, st *store.Store, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
		_, key, _ := ed25519.GenerateKey(rand.Reader)
		sealer := google.NewSealer(key)
		g, err := google.New(google.Deps{Pool: pool, Service: svc, Store: st, Sealer: sealer, RedirectBase: "https://player.test", Clock: now, Logger: log})
		if err != nil {
			panic(err)
		}
		registration, err := register.RegisterGoogle(register.Deps{Pool: pool, Service: svc, Store: st, Logger: log, Clock: now}, g)
		if err != nil {
			panic(err)
		}
		reset, err := recovery.New(recovery.Deps{Pool: pool, Service: svc, Store: st, Logger: log, Clock: now})
		if err != nil {
			panic(err)
		}
		inner := http.NewServeMux()
		g.Routes()(inner)
		registration(inner)
		sealed := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sealCapture(t, sealer, now(), r)
			inner.ServeHTTP(w, r)
		})
		return func(mux *http.ServeMux) {
			reset.Routes()(mux)
			for _, pattern := range []string{
				"GET /api/auth/google/outcome", "POST /api/auth/google/outcome", "POST /api/auth/google/link", "GET /api/auth/google/unclaimed",
				"POST /api/claim/{token}/google", "POST /api/register/{clubId}/google", "POST /api/register/google",
			} {
				mux.Handle(pattern, sealed)
			}
		}
	})
}

// sealCapture replaces the capture cookie of a request with Go's sealed held and result cookies.
func sealCapture(t *testing.T, sealer *google.Sealer, now time.Time, r *http.Request) {
	t.Helper()
	var kept []string
	var stub capturedGoogle
	for _, part := range strings.Split(r.Header.Get("Cookie"), ";") {
		name, value, _ := strings.Cut(strings.TrimSpace(part), "=")
		if name != captureCookie {
			if part = strings.TrimSpace(part); part != "" {
				kept = append(kept, part)
			}
			continue
		}
		raw, err := base64.RawURLEncoding.DecodeString(value)
		if err != nil {
			t.Fatalf("the capture cookie is not base64url: %v", err)
		}
		if err := json.Unmarshal(raw, &stub); err != nil {
			t.Fatalf("the capture cookie is not JSON: %v", err)
		}
	}
	if stub.Held != nil {
		kept = append(kept, google.HeldCookie+"="+sealer.Seal("held", google.Held{Email: stub.Held.Email, Name: stub.Held.Name}, now))
	}
	if stub.Result != nil {
		kept = append(kept, google.ResultCookie+"="+sealer.Seal("result", google.Result{Key: stub.Result.Key, Intent: google.Intent(stub.Result.Intent), Outcome: google.Outcome(stub.Result.Outcome), Email: stub.Result.Email, Name: stub.Result.Name}, now))
	}
	if len(kept) == 0 {
		r.Header.Del("Cookie")
		return
	}
	r.Header.Set("Cookie", strings.Join(kept, "; "))
}
