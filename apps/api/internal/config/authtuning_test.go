package config

import (
	"strings"
	"testing"
	"time"
)

func TestAuthTuningDefaults(t *testing.T) {
	cfg, err := Load(lookup(authEnv(nil)))
	if err != nil {
		t.Fatal(err)
	}
	want := AuthTuning{
		AccessLifetime:     15 * time.Minute,
		RefreshGrace:       30 * time.Second,
		RevocationCacheTTL: 5 * time.Second,
		Limits: AuthLimits{
			LoginFailures:  AuthLimit{5, 15 * time.Minute},
			DeviceAttempts: AuthLimit{10, 15 * time.Minute},
			IPAttempts:     AuthLimit{100, 15 * time.Minute},
			ClaimIP:        AuthLimit{30, time.Hour},
			ResetRequestIP: AuthLimit{30, time.Hour},
			RefreshIP:      AuthLimit{600, time.Minute},
			RefreshSession: AuthLimit{30, time.Minute},
			GoogleTripIP:   AuthLimit{100, 15 * time.Minute},
		},
	}
	if cfg.AuthTuning != want {
		t.Fatalf("defaults:\n got %+v\nwant %+v", cfg.AuthTuning, want)
	}
	if DefaultAuthTuning() != want {
		t.Fatal("DefaultAuthTuning must equal the loaded defaults")
	}
}

func TestAuthTuningOverrides(t *testing.T) {
	cfg, err := Load(lookup(authEnv(map[string]string{
		"ROTRA_AUTH_ACCESS_SECONDS":         "45",
		"ROTRA_AUTH_REFRESH_GRACE":          "10s",
		"ROTRA_AUTH_REVOCATION_CACHE_TTL":   "0s",
		"ROTRA_AUTH_LIMIT_LOGIN_FAILURES":   "3/10m",
		"ROTRA_AUTH_LIMIT_DEVICE":           " 20 / 1h ",
		"ROTRA_AUTH_LIMIT_IP":               "250/15m",
		"ROTRA_AUTH_LIMIT_CLAIM_IP":         "5/30m",
		"ROTRA_AUTH_LIMIT_RESET_REQUEST_IP": "7/2h",
		"ROTRA_AUTH_LIMIT_REFRESH_IP":       "1000/1m",
		"ROTRA_AUTH_LIMIT_REFRESH_SESSION":  "12/30s",
	})))
	if err != nil {
		t.Fatal(err)
	}
	a := cfg.AuthTuning
	if a.AccessLifetime != 45*time.Second {
		t.Fatalf("access lifetime: %v", a.AccessLifetime)
	}
	if a.RefreshGrace != 10*time.Second || a.RevocationCacheTTL != 0 {
		t.Fatalf("durations: %+v", a)
	}
	l := a.Limits
	if l.LoginFailures != (AuthLimit{3, 10 * time.Minute}) || l.DeviceAttempts != (AuthLimit{20, time.Hour}) ||
		l.IPAttempts != (AuthLimit{250, 15 * time.Minute}) || l.ClaimIP != (AuthLimit{5, 30 * time.Minute}) ||
		l.ResetRequestIP != (AuthLimit{7, 2 * time.Hour}) || l.RefreshIP != (AuthLimit{1000, time.Minute}) ||
		l.RefreshSession != (AuthLimit{12, 30 * time.Second}) {
		t.Fatalf("limits: %+v", l)
	}
}

func TestAuthTuningRejectsBadValues(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"access not a number":     {"ROTRA_AUTH_ACCESS_SECONDS": "soon"},
		"access a duration":       {"ROTRA_AUTH_ACCESS_SECONDS": "60s"},
		"access under 30":         {"ROTRA_AUTH_ACCESS_SECONDS": "29"},
		"access zero":             {"ROTRA_AUTH_ACCESS_SECONDS": "0"},
		"access negative":         {"ROTRA_AUTH_ACCESS_SECONDS": "-900"},
		"access over 900":         {"ROTRA_AUTH_ACCESS_SECONDS": "901"},
		"grace not a duration":    {"ROTRA_AUTH_REFRESH_GRACE": "soon"},
		"grace negative":          {"ROTRA_AUTH_REFRESH_GRACE": "-1s"},
		"grace over five minutes": {"ROTRA_AUTH_REFRESH_GRACE": "6m"},
		"cache ttl negative":      {"ROTRA_AUTH_REVOCATION_CACHE_TTL": "-5s"},
		"cache ttl over a minute": {"ROTRA_AUTH_REVOCATION_CACHE_TTL": "2m"},
		"limit without window":    {"ROTRA_AUTH_LIMIT_IP": "100"},
		"limit zero attempts":     {"ROTRA_AUTH_LIMIT_IP": "0/15m"},
		"limit negative":          {"ROTRA_AUTH_LIMIT_LOGIN_FAILURES": "-1/15m"},
		"limit not a number":      {"ROTRA_AUTH_LIMIT_DEVICE": "many/15m"},
		"limit bad window":        {"ROTRA_AUTH_LIMIT_CLAIM_IP": "5/soon"},
		"limit window zero":       {"ROTRA_AUTH_LIMIT_RESET_REQUEST_IP": "5/0s"},
		"limit window over a day": {"ROTRA_AUTH_LIMIT_REFRESH_IP": "5/25h"},
		"limit too many attempts": {"ROTRA_AUTH_LIMIT_REFRESH_SESSION": "1000001/1m"},
		"limit window sub-second": {"ROTRA_AUTH_LIMIT_IP": "5/500ms"},
		"limit extra slash":       {"ROTRA_AUTH_LIMIT_IP": "5/1m/1h"},
	} {
		_, err := Load(lookup(authEnv(env)))
		if err == nil {
			t.Errorf("%s: want an error", name)
			continue
		}
		var varName string
		for k := range env {
			varName = k
		}
		if !strings.Contains(err.Error(), varName) {
			t.Errorf("%s: error must name %s: %v", name, varName, err)
		}
	}
}

func TestParseAuthLimit(t *testing.T) {
	got, err := ParseAuthLimit("5/15m")
	if err != nil || got != (AuthLimit{5, 15 * time.Minute}) {
		t.Fatalf("got %+v %v", got, err)
	}
}
