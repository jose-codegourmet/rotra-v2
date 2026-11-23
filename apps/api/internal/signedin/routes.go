// Package signedin serves the signed-in GET routes that moved from the Next.js Route Handlers of the Queue,
// Player and Admin apps. Each route keeps the contract of the handler it replaces: same path, JSON shape,
// status codes, error envelope and cache headers.
//
// The apps share some paths (for example /api/players) with a different handler each, so a path is chosen
// in two steps: the X-Rotra-App header names the app, then the pass is checked for that app's audience.
package signedin

import (
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
)

// Router collects handlers per pattern and per app, then registers each pattern once. net/http panics on a
// duplicate pattern, so the three apps' handlers for one path must share one registration.
type Router struct {
	patterns []string
	byApp    map[string]map[store.Audience]http.Handler
}

// NewRouter returns an empty router.
func NewRouter() *Router { return &Router{byApp: map[string]map[store.Audience]http.Handler{}} }

// Handle sets the handler an app gets for a pattern such as "GET /api/me/account". Setting the same pair twice
// is a programming error.
func (rt *Router) Handle(pattern string, aud store.Audience, h http.Handler) {
	m, ok := rt.byApp[pattern]
	if !ok {
		m = map[store.Audience]http.Handler{}
		rt.byApp[pattern] = m
		rt.patterns = append(rt.patterns, pattern)
	}
	if _, dup := m[aud]; dup {
		panic("signedin: " + pattern + " is already handled for " + string(aud))
	}
	// A classified write route runs in a live-update scope: what its commands note is added as events when they commit.
	m[aud] = liveupdates.Scoped(string(aud), pattern, h)
}

// Patterns lists every registered pattern with the audiences that answer it ("club", "player", "admin"), in registration
// order. The live-updates audit reads it to check that every write route is classified.
func (rt *Router) Patterns() map[string][]store.Audience {
	out := make(map[string][]store.Audience, len(rt.patterns))
	for _, p := range rt.patterns {
		for aud := range rt.byApp[p] {
			out[p] = append(out[p], aud)
		}
	}
	return out
}

// Mount registers every pattern on the mux. A request whose app header is missing or unknown, or whose app has
// no handler for the pattern, gets the generic 404 envelope: no audience is guessed.
func (rt *Router) Mount(mux *http.ServeMux) {
	for _, pattern := range rt.patterns {
		apps := rt.byApp[pattern]
		mux.Handle(pattern, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			aud, ok := session.AudienceOf(r)
			if !ok || apps[aud] == nil {
				httpapi.WriteError(w, httpapi.ErrNotFound, nil)
				return
			}
			apps[aud].ServeHTTP(w, r)
		}))
	}
}
