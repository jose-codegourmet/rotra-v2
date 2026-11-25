package httpapi

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// PublicReadsPerMinute is the limit for public reads per trusted client IP (B-43).
const PublicReadsPerMinute = 300

const rateWindow = time.Minute

// RateLimiter counts requests per key in fixed one-minute windows. It lives in memory, which is right
// for one API instance (B-43); a second instance would need a shared store. Stream tickets and the
// public reads both use it, each with its own limit and, for routes that share a budget, one instance.
type RateLimiter struct {
	perMinute int
	now       func() time.Time

	mu        sync.Mutex
	windows   map[string]*window
	lastPrune time.Time
}

type window struct {
	start time.Time
	count int
}

// NewRateLimiter allows perMinute requests per key in each minute. A nil now uses the real clock.
func NewRateLimiter(perMinute int, now func() time.Time) *RateLimiter {
	if now == nil {
		now = time.Now
	}
	return &RateLimiter{perMinute: perMinute, now: now, windows: map[string]*window{}}
}

// Allow counts one request for key. When key is over its limit it returns ok=false and the whole
// seconds to wait for the window to end (never less than 1).
func (l *RateLimiter) Allow(key string) (retryAfter int, ok bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.pruneLocked(now)

	w := l.windows[key]
	// A window that starts after now (the test clock went back) is over as well.
	if w == nil || now.Before(w.start) || now.Sub(w.start) >= rateWindow {
		w = &window{start: now}
		l.windows[key] = w
	}
	if w.count >= l.perMinute {
		wait := int((rateWindow - now.Sub(w.start)).Seconds()) + 1
		return max(wait, 1), false
	}
	w.count++
	return 0, true
}

// pruneLocked drops windows that have ended. It scans at most once a minute, so a busy route does not
// pay for the whole map on every request.
func (l *RateLimiter) pruneLocked(now time.Time) {
	if now.Sub(l.lastPrune) < rateWindow && !now.Before(l.lastPrune) {
		return // an ended window left in the map is harmless: Allow starts a new one for its key
	}
	l.lastPrune = now
	for k, w := range l.windows {
		if now.Before(w.start) || now.Sub(w.start) >= rateWindow {
			delete(l.windows, k)
		}
	}
}

func (l *RateLimiter) size() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.windows)
}

// WriteRateLimited answers 429 with Retry-After and the standard error envelope.
func WriteRateLimited(w http.ResponseWriter, retryAfter int, message string) {
	w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
	WriteJSON(w, http.StatusTooManyRequests,
		errorBody{Error: errorDetail{Code: "rate_limited", Message: message}}, Private)
}

// RateLimit counts each request against the trusted client IP (from ProxyGuard, never a header the
// caller chose) and answers 429 over the limit. Routes wrapped with the same limiter share one budget.
func RateLimit(l *RateLimiter, message string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if retry, ok := l.Allow(ClientIPFrom(r.Context())); !ok {
			WriteRateLimited(w, retry, message)
			return
		}
		next.ServeHTTP(w, r)
	})
}
