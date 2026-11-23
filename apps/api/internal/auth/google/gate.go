package google

import (
	"net/http"
	"time"
)

// GateCookie is the httpOnly navigation hint for the Player app's proxy.ts (which has no database): "1" while the signed-in
// player has no Google account, the deadline has passed and the flag is on (D-2026-11-16-01). Set and cleared by the session read
// and the password sign-in, and cleared when Google is connected. Not a security boundary: the routes check the real state.
const GateCookie = "rotra-player-google-gate"

const gateTTL = 24 * time.Hour

// SetGateHint sets the hint while required, and clears a leftover one otherwise (no Set-Cookie when there is none to clear).
func SetGateHint(w http.ResponseWriter, r *http.Request, required, secure bool) {
	c := &http.Cookie{Name: GateCookie, Value: "1", Path: "/", SameSite: http.SameSiteLaxMode, HttpOnly: true, Secure: secure, MaxAge: int(gateTTL / time.Second)}
	if !required {
		if _, err := r.Cookie(GateCookie); err != nil {
			return
		}
		c.Value, c.MaxAge = "", -1
	}
	http.SetCookie(w, c)
}

// clearGate forgets the hint once the player has Google.
func (h *Handlers) clearGate(w http.ResponseWriter, r *http.Request) {
	SetGateHint(w, r, false, h.jar(w, r).secure)
}
