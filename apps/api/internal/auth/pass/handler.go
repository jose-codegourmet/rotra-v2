package pass

import (
	"encoding/json"
	"net/http"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

const rateLimitMessage = "Too many requests. Try again in a minute."

// Deps is what the auth key route is built from.
type Deps struct {
	// Keys is the published key set. Nil registers nothing (the API runs without a signing key).
	Keys *KeySet
	// Limiter is the shared per-IP public-read budget (B-43). Nil gets a default 300/minute limiter; main
	// passes the instance the public reads use, so every area spends one budget.
	Limiter *httpapi.RateLimiter
}

// Register adds GET /api/auth/keys. The route is not in the proxy guard's open list, so it answers
// 404 without the proxy secret (B-30): only the apps fetch it.
func Register(d Deps) func(*http.ServeMux) {
	if d.Keys == nil {
		return func(*http.ServeMux) {}
	}
	if d.Limiter == nil {
		d.Limiter = httpapi.NewRateLimiter(httpapi.PublicReadsPerMinute, nil)
	}
	// The set never changes while the process runs, so the body is built once.
	body, err := json.Marshal(struct {
		Keys []JWK `json:"keys"`
	}{d.Keys.JWKS()})
	if err != nil {
		panic("pass: encoding the key set: " + err.Error()) // cannot happen: only strings
	}
	h := httpapi.RateLimit(d.Limiter, rateLimitMessage, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "private, max-age=300")
		_, _ = w.Write(body)
	}))
	return func(mux *http.ServeMux) { mux.Handle("GET /api/auth/keys", h) }
}
