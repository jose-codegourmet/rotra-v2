package config

import (
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func lookup(env map[string]string) func(string) (string, bool) {
	return func(k string) (string, bool) { v, ok := env[k]; return v, ok }
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://u:p@db:5432/rotra"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":8080" || cfg.LogLevel != slog.LevelInfo || cfg.ShutdownTimeout != 25*time.Second {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if cfg.DatabaseURL == "" {
		t.Fatal("database url not read")
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL": "postgres://x", "PORT": "9100", "LOG_LEVEL": "debug", "SHUTDOWN_TIMEOUT": "5s",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":9100" || cfg.LogLevel != slog.LevelDebug || cfg.ShutdownTimeout != 5*time.Second {
		t.Fatalf("unexpected: %+v", cfg)
	}
}

func TestLoadMissingRequiredFailsFast(t *testing.T) {
	_, err := Load(lookup(map[string]string{}))
	if err == nil {
		t.Fatal("expected an error")
	}
	var me *MissingError
	if !errors.As(err, &me) || len(me.Names) != 1 || me.Names[0] != "DATABASE_URL" {
		t.Fatalf("want MissingError for DATABASE_URL, got %v", err)
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("message must name the variable: %v", err)
	}
}

func TestLoadBlankCountsAsMissing(t *testing.T) {
	if _, err := Load(lookup(map[string]string{"DATABASE_URL": "  "})); err == nil {
		t.Fatal("blank value must count as missing")
	}
}

func TestLoadInvalidValues(t *testing.T) {
	base := map[string]string{"DATABASE_URL": "postgres://x"}
	cases := map[string]string{
		"PORT":             "abc",
		"LOG_LEVEL":        "loud",
		"SHUTDOWN_TIMEOUT": "forever",
	}
	for k, v := range cases {
		env := map[string]string{}
		for bk, bv := range base {
			env[bk] = bv
		}
		env[k] = v
		if _, err := Load(lookup(env)); err == nil {
			t.Errorf("%s=%q should fail", k, v)
		}
	}
}

func TestLoadShutdownTimeoutMustFitDraining(t *testing.T) {
	// Railway draining is 30 s (B-44); the process must exit before that.
	for _, v := range []string{"30s", "45s", "0s", "-1s"} {
		_, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "SHUTDOWN_TIMEOUT": v}))
		if err == nil {
			t.Errorf("SHUTDOWN_TIMEOUT=%s should be refused", v)
		}
	}
}

func TestLoadPortRange(t *testing.T) {
	for _, v := range []string{"0", "70000", "-3"} {
		if _, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "PORT": v})); err == nil {
			t.Errorf("PORT=%s should be refused", v)
		}
	}
}

func TestLoadDatabaseAndHousekeepingDefaults(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil {
		t.Fatal(err)
	}
	h := cfg.Housekeeping
	if cfg.DBMaxConns != 10 || h.Interval != time.Hour || h.BatchSize != 1000 {
		t.Fatalf("unexpected defaults: %+v %d", h, cfg.DBMaxConns)
	}
	// B-34 starting values.
	if h.LiveUpdateEventsDays != 7 || h.AuthEventsDays != 90 || h.AuthSessionsDays != 90 {
		t.Fatalf("B-34 retention defaults wrong: %+v", h)
	}
}

func TestLoadDatabaseAndHousekeepingOverrides(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL": "postgres://x", "DB_MAX_CONNS": "4", "HOUSEKEEPING_INTERVAL": "30m", "HOUSEKEEPING_BATCH_SIZE": "250",
		"RETENTION_LIVE_UPDATE_EVENTS_DAYS": "3", "RETENTION_AUTH_EVENTS_DAYS": "30", "RETENTION_AUTH_SESSIONS_DAYS": "45",
	}))
	if err != nil {
		t.Fatal(err)
	}
	h := cfg.Housekeeping
	if cfg.DBMaxConns != 4 || h.Interval != 30*time.Minute || h.BatchSize != 250 ||
		h.LiveUpdateEventsDays != 3 || h.AuthEventsDays != 30 || h.AuthSessionsDays != 45 {
		t.Fatalf("unexpected: %+v %d", h, cfg.DBMaxConns)
	}
}

func TestLoadRejectsBadDatabaseAndHousekeepingValues(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"DB_MAX_CONNS":                       {"DB_MAX_CONNS": "0"},
		"DB_MAX_CONNS text":                  {"DB_MAX_CONNS": "many"},
		"HOUSEKEEPING_INTERVAL":              {"HOUSEKEEPING_INTERVAL": "soon"},
		"HOUSEKEEPING_INTERVAL non-positive": {"HOUSEKEEPING_INTERVAL": "0s"},
		"HOUSEKEEPING_BATCH_SIZE":            {"HOUSEKEEPING_BATCH_SIZE": "-5"},
		"RETENTION_AUTH_EVENTS_DAYS":         {"RETENTION_AUTH_EVENTS_DAYS": "0"},
		"RETENTION_AUTH_SESSIONS_DAYS":       {"RETENTION_AUTH_SESSIONS_DAYS": "x"},
		"RETENTION_LIVE_UPDATE_EVENTS_DAYS":  {"RETENTION_LIVE_UPDATE_EVENTS_DAYS": "-1"},
	} {
		env["DATABASE_URL"] = "postgres://x"
		_, err := Load(lookup(env))
		if err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
}

func TestLoadProxySecretAndOriginsDefaultToNothing(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ProxySecret != "" || len(cfg.AllowedOrigins) != 0 {
		t.Fatalf("unexpected: %+v", cfg)
	}
}

func TestLoadProxySecretAndOrigins(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL": "postgres://x", "ROTRA_PROXY_SECRET": "  s3cret ",
		"ROTRA_ALLOWED_ORIGINS": " https://queue.rotra.club, http://localhost:9000 ,,",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ProxySecret != "s3cret" {
		t.Fatalf("secret %q", cfg.ProxySecret)
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[0] != "https://queue.rotra.club" || cfg.AllowedOrigins[1] != "http://localhost:9000" {
		t.Fatalf("origins %v", cfg.AllowedOrigins)
	}
}

func TestLoadRejectsBadOrigins(t *testing.T) {
	for _, v := range []string{"*", "https://a.club/path", "queue.rotra.club", "https://a.club/", "ftp://a.club", "https://*.rotra.club"} {
		_, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_ALLOWED_ORIGINS": v}))
		if err == nil || !strings.Contains(err.Error(), "ROTRA_ALLOWED_ORIGINS") {
			t.Errorf("%q: want an ROTRA_ALLOWED_ORIGINS error, got %v", v, err)
		}
	}
}
