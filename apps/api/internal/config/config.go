// Package config reads the service settings from the environment and fails fast when a required
// one is missing or malformed.
package config

import (
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
)

// DrainingSeconds mirrors RAILWAY_DEPLOYMENT_DRAINING_SECONDS (B-44). The process must exit before it.
const DrainingSeconds = 30

// Config is everything the API reads from the environment.
type Config struct {
	Addr            string
	DatabaseURL     string
	LogLevel        slog.Level
	ShutdownTimeout time.Duration
	DBMaxConns      int32
	Housekeeping    Housekeeping
	// ProxySecret is ROTRA_PROXY_SECRET (B-30). Empty means no request is trusted as coming from a proxy.
	ProxySecret string
	// AllowedOrigins is ROTRA_ALLOWED_ORIGINS: exact app origins allowed by CORS on the stream routes (B-41).
	AllowedOrigins []string
	// AuthHashConcurrency is ROTRA_AUTH_HASH_CONCURRENCY: how many password hashes may run at once
	// (each argon2id hash holds about 19 MiB). 1 to 64, default 4.
	AuthHashConcurrency int
	// AuthSigningKey is ROTRA_AUTH_SIGNING_KEY: the current pass signing key (B-27). Nil means unset: the API
	// serves no auth routes.
	AuthSigningKey ed25519.PrivateKey
	// AuthExtraPublicKeys is ROTRA_AUTH_EXTRA_PUBLIC_KEYS: public keys also published and accepted (B-47).
	AuthExtraPublicKeys []ed25519.PublicKey
	// AuthTuning is the optional ROTRA_AUTH_* configuration: refresh grace window, revocation cache TTL and
	// rate limits (B-29, B-30, B-62).
	AuthTuning AuthTuning
}

// Housekeeping is the B-34 cleanup loop: how often it runs, rows per delete statement, and how many
// days each growing table keeps its rows.
type Housekeeping struct {
	Interval             time.Duration
	BatchSize            int
	LiveUpdateEventsDays int
	AuthEventsDays       int
	AuthSessionsDays     int
}

// MissingError lists every required variable that is unset or blank.
type MissingError struct{ Names []string }

func (e *MissingError) Error() string {
	return "missing required environment: " + strings.Join(e.Names, ", ")
}

// Load builds a Config from lookup (os.LookupEnv in production). Required: DATABASE_URL.
// Optional: PORT (8080), LOG_LEVEL (info), SHUTDOWN_TIMEOUT (25s, must be under DrainingSeconds).
func Load(lookup func(string) (string, bool)) (Config, error) {
	get := func(name string) string {
		v, _ := lookup(name)
		return strings.TrimSpace(v)
	}

	var cfg Config
	var missing []string

	if cfg.DatabaseURL = get("DATABASE_URL"); cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if len(missing) > 0 {
		return Config{}, &MissingError{Names: missing}
	}

	port := 8080
	if v := get("PORT"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 65535 {
			return Config{}, fmt.Errorf("PORT must be a number from 1 to 65535, got %q", v)
		}
		port = n
	}
	cfg.Addr = ":" + strconv.Itoa(port)

	cfg.LogLevel = slog.LevelInfo
	if v := get("LOG_LEVEL"); v != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(v)); err != nil {
			return Config{}, fmt.Errorf("LOG_LEVEL must be debug, info, warn or error, got %q", v)
		}
	}

	cfg.ShutdownTimeout = 25 * time.Second
	if v := get("SHUTDOWN_TIMEOUT"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT must be a duration such as 20s, got %q", v)
		}
		cfg.ShutdownTimeout = d
	}
	if cfg.ShutdownTimeout <= 0 || cfg.ShutdownTimeout >= DrainingSeconds*time.Second {
		return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT must be above 0 and under %ds (Railway draining time)", DrainingSeconds)
	}

	cfg.DBMaxConns = 10
	if v := get("DB_MAX_CONNS"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 1000 {
			return Config{}, fmt.Errorf("DB_MAX_CONNS must be a number from 1 to 1000, got %q", v)
		}
		cfg.DBMaxConns = int32(n)
	}

	cfg.Housekeeping = Housekeeping{Interval: time.Hour, BatchSize: 1000, LiveUpdateEventsDays: 7, AuthEventsDays: 90, AuthSessionsDays: 90}
	if v := get("HOUSEKEEPING_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d <= 0 {
			return Config{}, fmt.Errorf("HOUSEKEEPING_INTERVAL must be a positive duration such as 1h, got %q", v)
		}
		cfg.Housekeeping.Interval = d
	}
	for _, f := range []struct {
		name string
		dst  *int
	}{
		{"HOUSEKEEPING_BATCH_SIZE", &cfg.Housekeeping.BatchSize},
		{"RETENTION_LIVE_UPDATE_EVENTS_DAYS", &cfg.Housekeeping.LiveUpdateEventsDays},
		{"RETENTION_AUTH_EVENTS_DAYS", &cfg.Housekeeping.AuthEventsDays},
		{"RETENTION_AUTH_SESSIONS_DAYS", &cfg.Housekeeping.AuthSessionsDays},
	} {
		if v := get(f.name); v != "" {
			n, err := strconv.Atoi(v)
			if err != nil || n < 1 {
				return Config{}, fmt.Errorf("%s must be a whole number of 1 or more, got %q", f.name, v)
			}
			*f.dst = n
		}
	}

	cfg.AuthHashConcurrency = 4
	if v := get("ROTRA_AUTH_HASH_CONCURRENCY"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 64 {
			return Config{}, fmt.Errorf("ROTRA_AUTH_HASH_CONCURRENCY must be a number from 1 to 64, got %q", v)
		}
		cfg.AuthHashConcurrency = n
	}

	// The signing key is optional: without it the API starts and serves no auth routes. Errors name the
	// variable and never repeat its value.
	if v := get("ROTRA_AUTH_SIGNING_KEY"); v != "" {
		k, err := pass.ParseSigningKey(v)
		if err != nil {
			return Config{}, fmt.Errorf("ROTRA_AUTH_SIGNING_KEY must be the unpadded base64url of a 32 byte Ed25519 seed (go run ./cmd/authkey makes one)")
		}
		cfg.AuthSigningKey = k
	}
	if v := get("ROTRA_AUTH_EXTRA_PUBLIC_KEYS"); v != "" {
		ks, err := pass.ParsePublicKeys(v)
		if err != nil {
			return Config{}, fmt.Errorf("ROTRA_AUTH_EXTRA_PUBLIC_KEYS must be comma separated unpadded base64url 32 byte Ed25519 public keys")
		}
		cfg.AuthExtraPublicKeys = ks
	}

	tuning, err := loadAuthTuning(get)
	if err != nil {
		return Config{}, err
	}
	cfg.AuthTuning = tuning

	cfg.ProxySecret = get("ROTRA_PROXY_SECRET")
	for _, o := range strings.Split(get("ROTRA_ALLOWED_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o == "" {
			continue
		}
		if !validOrigin(o) {
			return Config{}, fmt.Errorf("ROTRA_ALLOWED_ORIGINS must list exact origins such as https://queue.rotra.club (no *, path or trailing slash), got %q", o)
		}
		cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
	}
	return cfg, nil
}

// validOrigin accepts only scheme://host[:port] with an http or https scheme and no wildcard.
func validOrigin(o string) bool {
	u, err := url.Parse(o)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || strings.Contains(u.Host, "*") {
		return false
	}
	return u.Path == "" && u.RawQuery == "" && u.Fragment == "" && u.User == nil && !strings.HasSuffix(o, "/")
}
