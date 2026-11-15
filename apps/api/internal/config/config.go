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
	return cfg, nil
}
