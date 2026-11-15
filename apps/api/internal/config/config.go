// Package config reads the service settings from the environment and fails fast when a required
// one is missing or malformed.
package config

import (
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"
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
	return cfg, nil
}
