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
