package google_test

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/google"
)

const (
	testClientID = "client-1.apps.googleusercontent.com"
	testSecret   = "client-secret"
)

// fakeGoogle is a stand-in for Google's token endpoint and key set. It signs ID tokens with its own RSA key. The tests that use
// it prove the Go side of the flow only: nothing here talks to the real Google.
type fakeGoogle struct {
	srv *httptest.Server
	key *rsa.PrivateKey
	kid string

	mu       sync.Mutex
	codes    map[string]claims // code -> what its ID token says
	keyFetch int
	tokenHit []url.Values
	status   int // token endpoint status override
	// certsGate, when set, holds every key set request until it is closed (a slow Google keys endpoint).
	certsGate chan struct{}
}

type claims map[string]any

func newFakeGoogle(t *testing.T) *fakeGoogle {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeGoogle{key: key, kid: "kid-1", codes: map[string]claims{}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /token", f.token)
	mux.HandleFunc("GET /certs", f.certs)
	f.srv = httptest.NewServer(mux)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeGoogle) endpoints() google.Endpoints {
	return google.Endpoints{Auth: f.srv.URL + "/auth", Token: f.srv.URL + "/token", JWKS: f.srv.URL + "/certs", Issuers: []string{"https://accounts.google.com"}}
}

func (f *fakeGoogle) client(now func() time.Time) *google.Client {
	return google.NewClient(testClientID, testSecret, f.endpoints(), f.srv.Client(), now)
}

// grant makes code a code whose ID token carries the standard claims plus over.
func (f *fakeGoogle) grant(code, nonce string, now time.Time, over claims) {
	c := claims{
		"iss": "https://accounts.google.com", "aud": testClientID, "iat": now.Unix(), "exp": now.Add(time.Hour).Unix(),
		"nonce": nonce, "email": "pat@example.test", "email_verified": true, "name": "Pat Reyes",
	}
	for k, v := range over {
		if v == nil {
			delete(c, k)
		} else {
			c[k] = v
		}
	}
	f.mu.Lock()
	f.codes[code] = c
	f.mu.Unlock()
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func (f *fakeGoogle) sign(header, payload any, key *rsa.PrivateKey) string {
	h, _ := json.Marshal(header)
	p, _ := json.Marshal(payload)
	signing := b64(h) + "." + b64(p)
	sum := sha256.Sum256([]byte(signing))
	sig, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, sum[:])
	if err != nil {
		panic(err)
	}
	return signing + "." + b64(sig)
}

func (f *fakeGoogle) token(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	f.mu.Lock()
	f.tokenHit = append(f.tokenHit, r.PostForm)
	c, ok := f.codes[r.PostForm.Get("code")]
	status := f.status
	f.mu.Unlock()
	if status != 0 {
		w.WriteHeader(status)
		return
	}
	if !ok || r.PostForm.Get("client_secret") != testSecret || r.PostForm.Get("grant_type") != "authorization_code" || r.PostForm.Get("code_verifier") == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"id_token": f.sign(map[string]string{"alg": "RS256", "kid": f.kid, "typ": "JWT"}, c, f.key), "access_token": "x"})
}

func (f *fakeGoogle) certs(w http.ResponseWriter, _ *http.Request) {
	f.mu.Lock()
	f.keyFetch++
	gate, kid := f.certsGate, f.kid
	f.mu.Unlock()
	if gate != nil {
		<-gate
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
		"kid": kid, "kty": "RSA", "alg": "RS256", "use": "sig",
		"n": b64(f.key.N.Bytes()), "e": b64([]byte{1, 0, 1}),
	}}})
}

// tokenServer answers every token request with the given ID token.
func tokenServer(t *testing.T, idToken string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"id_token": idToken})
	}))
	t.Cleanup(srv.Close)
	return srv
}
