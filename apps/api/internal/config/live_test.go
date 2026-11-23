package config

import (
	"testing"
	"time"
)

func TestLoadLiveUpdateDefaultsAreTheB43AndB48Values(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseDirectURL != "" || cfg.DBIdleInTxTimeout != 5*time.Second {
		t.Fatalf("direct %q idle %v", cfg.DatabaseDirectURL, cfg.DBIdleInTxTimeout)
	}
	if cfg.Stream != (Stream{MaxPerIP: 50, MaxTotal: 3000, TicketsPerMinute: 60}) {
		t.Fatalf("stream limits %+v", cfg.Stream)
	}
}

func TestLoadLiveUpdateOverrides(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL": "postgres://pooled", "DATABASE_DIRECT_URL": "postgres://direct", "DB_IDLE_IN_TX_TIMEOUT": "2s",
		"STREAM_MAX_PER_IP": "20", "STREAM_MAX_TOTAL": "100", "STREAM_TICKETS_PER_MINUTE": "30",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseDirectURL != "postgres://direct" || cfg.DBIdleInTxTimeout != 2*time.Second || cfg.Stream != (Stream{MaxPerIP: 20, MaxTotal: 100, TicketsPerMinute: 30}) {
		t.Fatalf("%+v", cfg)
	}
	off, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "DB_IDLE_IN_TX_TIMEOUT": "0"}))
	if err != nil || off.DBIdleInTxTimeout != 0 {
		t.Fatalf("0 turns the guard off: %v %v", off.DBIdleInTxTimeout, err)
	}
}

func TestLoadRejectsBadLiveUpdateValues(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"idle text":     {"DB_IDLE_IN_TX_TIMEOUT": "soon"},
		"idle negative": {"DB_IDLE_IN_TX_TIMEOUT": "-1s"},
		"per ip zero":   {"STREAM_MAX_PER_IP": "0"},
		"total text":    {"STREAM_MAX_TOTAL": "lots"},
		"tickets":       {"STREAM_TICKETS_PER_MINUTE": "-3"},
	} {
		env["DATABASE_URL"] = "postgres://x"
		if _, err := Load(lookup(env)); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}
