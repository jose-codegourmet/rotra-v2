package session

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// RefreshCookiePath limits the refresh cookie to the auth endpoints (B-27, amended by B-62: it was the refresh
// endpoint alone, so an idle browser never sent it to sign-out and the session stayed live). Sign-out, refresh
// and the other /api/auth routes receive it; nothing else does.
const RefreshCookiePath = "/api/auth"

// AccessCookieName is the access pass cookie of one app. Names differ per audience so Queue, Player and Admin
// on localhost (same host, different ports share cookies) never overwrite each other.
func AccessCookieName(aud store.Audience) string { return "rotra-" + string(aud) + "-access" }

// RefreshCookieName is the refresh pass cookie of one app.
func RefreshCookieName(aud store.Audience) string { return "rotra-" + string(aud) + "-refresh" }

// Cookies is what a sign-in or refresh puts in the browser.
type Cookies struct {
	// Access is the access pass; AccessMaxAge is the cookie's lifetime, which callers set to the refresh
	// lifetime, longer than the pass inside it (B-62 amendment): an expired pass must still reach Go.
	Access       string
	AccessMaxAge time.Duration
	// Refresh is the refresh pass; empty leaves the browser's refresh cookie alone (the grace window, B-29).
	Refresh       string
	RefreshMaxAge time.Duration
}

// cookieSecure is true unless the request is plain http to localhost. Production reaches Go through Railway's
// TLS front end, so r.TLS is nil there: the default must be Secure, and only a loopback host relaxes it.
func cookieSecure(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	if proto, _, _ := strings.Cut(r.Header.Get("X-Forwarded-Proto"), ","); strings.EqualFold(strings.TrimSpace(proto), "https") {
		return true
	}
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")
	return host != "localhost" && host != "127.0.0.1" && host != "::1"
}

func newCookie(name, value, path string, maxAge time.Duration, secure bool) *http.Cookie {
	return &http.Cookie{
		Name: name, Value: value, Path: path, MaxAge: max(int(maxAge/time.Second), 1),
		HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode, // host-only: no Domain
	}
}

// SetCookies adds the access cookie and, when there is a new refresh pass, the refresh cookie. They are two
// separate Set-Cookie header lines (a single combined line is invalid and the apps' proxy keeps them apart).
func SetCookies(w http.ResponseWriter, r *http.Request, aud store.Audience, c Cookies) {
	secure := cookieSecure(r)
	http.SetCookie(w, newCookie(AccessCookieName(aud), c.Access, "/", c.AccessMaxAge, secure))
	if c.Refresh != "" {
		http.SetCookie(w, newCookie(RefreshCookieName(aud), c.Refresh, RefreshCookiePath, c.RefreshMaxAge, secure))
	}
}

// ClearCookies expires both cookies, each on its own path (sign-out, or a refused refresh).
func ClearCookies(w http.ResponseWriter, r *http.Request, aud store.Audience) {
	secure := cookieSecure(r)
	for _, c := range []*http.Cookie{
		newCookie(AccessCookieName(aud), "", "/", time.Second, secure),
		newCookie(RefreshCookieName(aud), "", RefreshCookiePath, time.Second, secure),
	} {
		c.MaxAge = -1
		http.SetCookie(w, c)
	}
}

// TokenFromRequest reads the access pass: a Bearer Authorization header (non-browser callers) first, then the
// audience's access cookie. "" when there is none.
func TokenFromRequest(r *http.Request, aud store.Audience) string {
	if h := r.Header.Get("Authorization"); len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		if t := strings.TrimSpace(h[7:]); t != "" {
			return t
		}
	}
	if c, err := r.Cookie(AccessCookieName(aud)); err == nil {
		return c.Value
	}
	return ""
}
