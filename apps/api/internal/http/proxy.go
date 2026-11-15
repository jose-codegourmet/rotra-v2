package httpapi

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"net"
	"net/http"
	"net/netip"
	"strings"
)

// ProxySecretHeader is the header each app's proxy.ts sets on forwarded calls (B-30). Its value is
// ROTRA_PROXY_SECRET, which lives in Vercel and Railway and never in the repo.
const ProxySecretHeader = "X-Rotra-Proxy-Secret"

type clientIPKey struct{}

// ClientIPFrom returns the trusted client IP: the forwarded one when the proxy secret was correct,
// otherwise the connection's own address. "" outside a request.
func ClientIPFrom(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey{}).(string)
	return ip
}

// secretMatches compares in constant time. Both sides are hashed first so the length is not leaked.
// An empty configured secret never matches, so with no secret every request is untrusted.
func secretMatches(configured, got string) bool {
	if configured == "" {
		return false
	}
	a, b := sha256.Sum256([]byte(configured)), sha256.Sum256([]byte(got))
	return subtle.ConstantTimeCompare(a[:], b[:]) == 1
}

// resolveClient returns the client IP and whether the request carried the correct proxy secret.
// X-Real-IP, then the first X-Forwarded-For entry, is honoured only for a trusted request, and only
// when it parses as an IP; every other case falls back to the connection address.
func resolveClient(r *http.Request, secret string) (ip string, trusted bool) {
	conn := r.RemoteAddr
	if host, _, err := net.SplitHostPort(conn); err == nil {
		conn = host
	}
	if !secretMatches(secret, r.Header.Get(ProxySecretHeader)) {
		return conn, false
	}
	candidates := []string{r.Header.Get("X-Real-IP"), strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0])}
	for _, c := range candidates {
		if a, err := netip.ParseAddr(strings.TrimSpace(c)); err == nil {
			return a.String(), true
		}
	}
	return conn, true
}

// openPath is what stays reachable without the proxy secret (B-30, B-41): the health probe, the stream
// ticket route and the stream itself (the browser opens it directly on this domain).
func openPath(p string) bool {
	return p == "/healthz" || p == streamTicketPath || p == streamPath
}

// ProxyGuard puts the trusted client IP in the context and answers 404 to anything but the open paths
// when the proxy secret is missing or wrong.
func ProxyGuard(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, trusted := resolveClient(r, secret)
			if !trusted && !openPath(r.URL.Path) {
				WriteError(w, ErrNotFound, nil)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), clientIPKey{}, ip)))
		})
	}
}
