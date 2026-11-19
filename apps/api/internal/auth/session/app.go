package session

import (
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// AppHeader names the app a request is for: "club", "player" or "admin". Each app's proxy.ts sets it next to
// the proxy secret, so it is only ever read from a trusted caller.
const AppHeader = "X-Rotra-App"

// AudienceOf reads the app header. ok is false for a missing or unknown value: no audience is guessed, and
// it is never inferred from cookie names.
func AudienceOf(r *http.Request) (aud store.Audience, ok bool) {
	switch a := store.Audience(r.Header.Get(AppHeader)); a {
	case store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin:
		return a, true
	}
	return "", false
}
