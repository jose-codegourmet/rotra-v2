package pass

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

const proxySecret = "test-proxy-secret"

type noPing struct{}

func (noPing) Ping(context.Context) error { return nil }

func router(t *testing.T, d Deps) http.Handler {
	t.Helper()
	return httpapi.NewHandler(httpapi.Deps{
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Pinger: noPing{}, Readiness: httpapi.NewReadiness(), ProxySecret: proxySecret,
	}, Register(d))
}

func keysReq(h http.Handler, secret, ip string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/api/auth/keys", nil)
	req.RemoteAddr = "10.0.0.1:5555"
	if secret != "" {
		req.Header.Set(httpapi.ProxySecretHeader, secret)
	}
	if ip != "" {
		req.Header.Set("X-Real-IP", ip)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func twoKeys(t *testing.T) *KeySet {
	t.Helper()
	ks, err := NewKeySet(pub(keyFromSeed(1)), pub(keyFromSeed(2)))
	if err != nil {
		t.Fatal(err)
	}
	return ks
}

func TestKeysEndpoint(t *testing.T) {
	h := router(t, Deps{Keys: twoKeys(t)})
	rec := keysReq(h, proxySecret, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Cache-Control"); got != "private, max-age=300" {
		t.Errorf("Cache-Control = %q", got)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q", got)
	}
	var body struct {
		Keys []JWK `json:"keys"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Keys) != 2 || body.Keys[0].Kid != KeyID(pub(keyFromSeed(1))) || body.Keys[1].Kid != KeyID(pub(keyFromSeed(2))) {
		t.Fatalf("keys (current first): %+v", body.Keys)
	}
	want := `{"keys":[{"kty":"OKP","crv":"Ed25519","x":"` + b64(pub(keyFromSeed(1))) + `","kid":"` + KeyID(pub(keyFromSeed(1))) +
		`","alg":"EdDSA","use":"sig"},{"kty":"OKP","crv":"Ed25519","x":"` + b64(pub(keyFromSeed(2))) + `","kid":"` +
		KeyID(pub(keyFromSeed(2))) + `","alg":"EdDSA","use":"sig"}]}`
	if rec.Body.String() != want {
		t.Errorf("body\n got %s\nwant %s", rec.Body, want)
	}
	// A private key never appears in the document.
	if json.Valid(rec.Body.Bytes()) && strings.Contains(rec.Body.String(), `"d"`) {
		t.Error("document has a private member")
	}
}

func TestKeysEndpointIsBehindTheProxySecret(t *testing.T) {
	h := router(t, Deps{Keys: twoKeys(t)})
	for name, secret := range map[string]string{"no secret": "", "wrong secret": "nope"} {
		rec := keysReq(h, secret, "")
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s: status %d, want 404", name, rec.Code)
		}
	}
}

func TestKeysEndpointSharesTheRateLimiter(t *testing.T) {
	lim := httpapi.NewRateLimiter(2, nil)
	h := router(t, Deps{Keys: twoKeys(t), Limiter: lim})
	for i := 0; i < 2; i++ {
		if rec := keysReq(h, proxySecret, "203.0.113.9"); rec.Code != http.StatusOK {
			t.Fatalf("request %d: %d", i, rec.Code)
		}
	}
	if rec := keysReq(h, proxySecret, "203.0.113.9"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("third request: %d, want 429", rec.Code)
	}
	if rec := keysReq(h, proxySecret, "203.0.113.10"); rec.Code != http.StatusOK {
		t.Fatalf("another IP: %d", rec.Code)
	}
}

func TestKeysEndpointDefaultsTheLimiter(t *testing.T) {
	h := router(t, Deps{Keys: twoKeys(t)})
	for i := 0; i < httpapi.PublicReadsPerMinute; i++ {
		if rec := keysReq(h, proxySecret, "203.0.113.9"); rec.Code != http.StatusOK {
			t.Fatalf("request %d: %d", i, rec.Code)
		}
	}
	if rec := keysReq(h, proxySecret, "203.0.113.9"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("over the default limit: %d", rec.Code)
	}
}

func TestRegisterWithoutKeysAddsNoRoute(t *testing.T) {
	h := router(t, Deps{})
	if rec := keysReq(h, proxySecret, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("no keys: status %d, want 404", rec.Code)
	}
}
