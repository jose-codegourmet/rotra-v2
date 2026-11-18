package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// AuthLimit is "Max attempts per Window" for one rate-limit counter (fixed windows, B-30).
type AuthLimit struct {
	Max    int
	Window time.Duration
}

// AuthLimits are the sign-in rate limits. All are configuration (B-30 starting values), tuned with Grafana.
type AuthLimits struct {
	// LoginFailures: wrong passwords per account (audience + login key).
	LoginFailures AuthLimit
	// DeviceAttempts: sign-in attempts per device id.
	DeviceAttempts AuthLimit
	// IPAttempts: sign-in attempts per trusted client IP. Generous: a full venue shares one WiFi IP.
	IPAttempts AuthLimit
	// ClaimIP and ResetRequestIP: claims and reset requests per trusted client IP.
	ClaimIP        AuthLimit
	ResetRequestIP AuthLimit
	// RefreshIP and RefreshSession: refresh calls per trusted client IP and per session. Not in B-30; the
	// values are generous so a venue whose phones all refresh in the same minute is never limited.
	RefreshIP      AuthLimit
	RefreshSession AuthLimit
}

// AuthTuning is everything about sign-in that is configuration rather than contract.
type AuthTuning struct {
	// AccessLifetime is how long an access pass is valid (B-27: 15 minutes). The access cookie outlives it
	// (B-62 amendment), so Go still sees an expired pass and answers `expired`.
	AccessLifetime time.Duration
	// RefreshGrace is how long after a rotation the previous refresh pass still gets an access pass (B-29).
	RefreshGrace time.Duration
	// RevocationCacheTTL is how long a write may rely on a cached "session is active" answer (B-27, B-62).
	// 0 turns the cache off.
	RevocationCacheTTL time.Duration
	Limits             AuthLimits
}

// DefaultAuthTuning returns the decided starting values (B-29, B-30, B-62).
func DefaultAuthTuning() AuthTuning {
	return AuthTuning{
		AccessLifetime:     15 * time.Minute,
		RefreshGrace:       30 * time.Second,
		RevocationCacheTTL: 5 * time.Second,
		Limits: AuthLimits{
			LoginFailures:  AuthLimit{Max: 5, Window: 15 * time.Minute},
			DeviceAttempts: AuthLimit{Max: 10, Window: 15 * time.Minute},
			IPAttempts:     AuthLimit{Max: 100, Window: 15 * time.Minute},
			ClaimIP:        AuthLimit{Max: 30, Window: time.Hour},
			ResetRequestIP: AuthLimit{Max: 30, Window: time.Hour},
			RefreshIP:      AuthLimit{Max: 600, Window: time.Minute},
			RefreshSession: AuthLimit{Max: 30, Window: time.Minute},
		},
	}
}

const (
	maxAuthLimitAttempts = 1_000_000
	minAccessSeconds     = 30
	maxAccessSeconds     = 900
	maxAuthGrace         = 5 * time.Minute
	maxAuthCacheTTL      = time.Minute
)

// ParseAuthLimit reads "N/duration", for example "5/15m". N is 1 to 1,000,000 and the window 1s to 24h.
func ParseAuthLimit(s string) (AuthLimit, error) {
	parts := strings.Split(s, "/")
	if len(parts) != 2 {
		return AuthLimit{}, fmt.Errorf("want N/duration such as 5/15m, got %q", s)
	}
	n, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil || n < 1 || n > maxAuthLimitAttempts {
		return AuthLimit{}, fmt.Errorf("attempts must be a whole number from 1 to %d, got %q", maxAuthLimitAttempts, parts[0])
	}
	w, err := time.ParseDuration(strings.TrimSpace(parts[1]))
	if err != nil || w < time.Second || w > 24*time.Hour {
		return AuthLimit{}, fmt.Errorf("window must be a duration from 1s to 24h, got %q", parts[1])
	}
	return AuthLimit{Max: n, Window: w}, nil
}

// loadAuthTuning applies the optional ROTRA_AUTH_* overrides on top of the defaults.
func loadAuthTuning(get func(string) string) (AuthTuning, error) {
	t := DefaultAuthTuning()
	if v := get("ROTRA_AUTH_ACCESS_SECONDS"); v != "" {
		n, err := strconv.Atoi(strings.TrimSpace(v))
		if err != nil || n < minAccessSeconds || n > maxAccessSeconds {
			return AuthTuning{}, fmt.Errorf("ROTRA_AUTH_ACCESS_SECONDS must be a whole number of seconds from %d to %d, got %q", minAccessSeconds, maxAccessSeconds, v)
		}
		t.AccessLifetime = time.Duration(n) * time.Second
	}
	for _, f := range []struct {
		name string
		dst  *time.Duration
		max  time.Duration
	}{
		{"ROTRA_AUTH_REFRESH_GRACE", &t.RefreshGrace, maxAuthGrace},
		{"ROTRA_AUTH_REVOCATION_CACHE_TTL", &t.RevocationCacheTTL, maxAuthCacheTTL},
	} {
		v := get(f.name)
		if v == "" {
			continue
		}
		d, err := time.ParseDuration(v)
		if err != nil || d < 0 || d > f.max {
			return AuthTuning{}, fmt.Errorf("%s must be a duration from 0s to %s, got %q", f.name, f.max, v)
		}
		*f.dst = d
	}
	for _, f := range []struct {
		name string
		dst  *AuthLimit
	}{
		{"ROTRA_AUTH_LIMIT_LOGIN_FAILURES", &t.Limits.LoginFailures},
		{"ROTRA_AUTH_LIMIT_DEVICE", &t.Limits.DeviceAttempts},
		{"ROTRA_AUTH_LIMIT_IP", &t.Limits.IPAttempts},
		{"ROTRA_AUTH_LIMIT_CLAIM_IP", &t.Limits.ClaimIP},
		{"ROTRA_AUTH_LIMIT_RESET_REQUEST_IP", &t.Limits.ResetRequestIP},
		{"ROTRA_AUTH_LIMIT_REFRESH_IP", &t.Limits.RefreshIP},
		{"ROTRA_AUTH_LIMIT_REFRESH_SESSION", &t.Limits.RefreshSession},
	} {
		v := get(f.name)
		if v == "" {
			continue
		}
		l, err := ParseAuthLimit(v)
		if err != nil {
			return AuthTuning{}, fmt.Errorf("%s: %w", f.name, err)
		}
		*f.dst = l
	}
	return t, nil
}
