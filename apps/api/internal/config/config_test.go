package config

import (
	"crypto/ed25519"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
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

func TestLoadPlayerOrigins(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_PLAYER_ORIGINS": "https://rotra.club, http://localhost:9001"}))
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.PlayerOrigins) != 2 || cfg.PlayerOrigins[1] != "http://localhost:9001" || len(cfg.QueueOrigins) != 0 {
		t.Fatalf("player %v queue %v", cfg.PlayerOrigins, cfg.QueueOrigins)
	}
	if _, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_PLAYER_ORIGINS": "*"})); err == nil || !strings.Contains(err.Error(), "ROTRA_PLAYER_ORIGINS") {
		t.Errorf("want a ROTRA_PLAYER_ORIGINS error, got %v", err)
	}
}

func TestLoadQueueOriginsAreSeparate(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL": "postgres://x", "ROTRA_ALLOWED_ORIGINS": "https://a.club",
		"ROTRA_QUEUE_ORIGINS": " https://queue.rotra.club ,http://localhost:9000",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.QueueOrigins) != 2 || cfg.QueueOrigins[0] != "https://queue.rotra.club" || len(cfg.AllowedOrigins) != 1 {
		t.Fatalf("queue %v allowed %v", cfg.QueueOrigins, cfg.AllowedOrigins)
	}
	for _, v := range []string{"*", "https://q.club/x", "q.club"} {
		_, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_QUEUE_ORIGINS": v}))
		if err == nil || !strings.Contains(err.Error(), "ROTRA_QUEUE_ORIGINS") {
			t.Errorf("%q: want a ROTRA_QUEUE_ORIGINS error, got %v", v, err)
		}
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

func TestLoadAuthHashConcurrency(t *testing.T) {
	base := map[string]string{"DATABASE_URL": "postgres://x"}
	cfg, err := Load(lookup(base))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AuthHashConcurrency != 4 {
		t.Fatalf("default AuthHashConcurrency = %d, want 4", cfg.AuthHashConcurrency)
	}
	for v, want := range map[string]int{"1": 1, "8": 8, "64": 64, " 2 ": 2} {
		cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_AUTH_HASH_CONCURRENCY": v}))
		if err != nil || cfg.AuthHashConcurrency != want {
			t.Errorf("%q: got %d, %v; want %d", v, cfg.AuthHashConcurrency, err, want)
		}
	}
	for _, v := range []string{"0", "-1", "65", "abc", "2.5"} {
		_, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_AUTH_HASH_CONCURRENCY": v}))
		if err == nil || !strings.Contains(err.Error(), "ROTRA_AUTH_HASH_CONCURRENCY") {
			t.Errorf("%q: want an error naming the variable, got %v", v, err)
		}
	}
}

func authEnv(extra map[string]string) map[string]string {
	env := map[string]string{"DATABASE_URL": "postgres://x"}
	for k, v := range extra {
		env[k] = v
	}
	return env
}

func TestAuthKeysUnsetByDefault(t *testing.T) {
	cfg, err := Load(lookup(authEnv(nil)))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.AuthSigningKey != nil || len(cfg.AuthExtraPublicKeys) != 0 {
		t.Fatalf("keys must be unset: %+v", cfg)
	}
}

func TestAuthKeysParsed(t *testing.T) {
	seed := "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8" // 0x00..0x1f
	other := pass.EncodePublicKey(ed25519.NewKeyFromSeed(make([]byte, 32)).Public().(ed25519.PublicKey))
	cfg, err := Load(lookup(authEnv(map[string]string{
		"ROTRA_AUTH_SIGNING_KEY": " " + seed + " ", "ROTRA_AUTH_EXTRA_PUBLIC_KEYS": other + ", " + other,
	})))
	if err != nil {
		t.Fatal(err)
	}
	if got := pass.EncodeSigningKey(cfg.AuthSigningKey); got != seed {
		t.Errorf("signing key = %q", got)
	}
	if len(cfg.AuthExtraPublicKeys) != 2 || pass.EncodePublicKey(cfg.AuthExtraPublicKeys[0]) != other {
		t.Errorf("extra keys = %v", cfg.AuthExtraPublicKeys)
	}
}

func TestAuthKeysInvalidFailFastWithoutLeakingValues(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"signing key not base64": {"ROTRA_AUTH_SIGNING_KEY": "not-a-key-!!"},
		"signing key too short":  {"ROTRA_AUTH_SIGNING_KEY": "AAECAw"},
		"extra key bad":          {"ROTRA_AUTH_EXTRA_PUBLIC_KEYS": "secret-looking-garbage!!"},
		"extra key short":        {"ROTRA_AUTH_EXTRA_PUBLIC_KEYS": "AAECAw"},
	} {
		_, err := Load(lookup(authEnv(env)))
		if err == nil {
			t.Errorf("%s: want an error", name)
			continue
		}
		for _, v := range env {
			if strings.Contains(err.Error(), v) {
				t.Errorf("%s: error repeats the value: %v", name, err)
			}
		}
		if !strings.Contains(err.Error(), "ROTRA_AUTH") {
			t.Errorf("%s: error must name the variable: %v", name, err)
		}
	}
}

func TestLoadVisitorReceiptSecret(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil || cfg.VisitorReceiptSecret != "" {
		t.Fatalf("unset: %q %v", cfg.VisitorReceiptSecret, err)
	}
	// The secret is the environment's value as it is: the TypeScript reads process.env with no trimming.
	cfg, err = Load(lookup(map[string]string{"DATABASE_URL": "postgres://x", "ROTRA_VISITOR_RECEIPT_SECRET": " a secret "}))
	if err != nil || cfg.VisitorReceiptSecret != " a secret " {
		t.Fatalf("set: %q %v", cfg.VisitorReceiptSecret, err)
	}
	// Loading it never puts it in an error: a missing database URL names only the variable.
	_, err = Load(lookup(map[string]string{"ROTRA_VISITOR_RECEIPT_SECRET": "hunter2"}))
	if err == nil || strings.Contains(err.Error(), "hunter2") {
		t.Fatalf("error %v", err)
	}
}

func TestLoadGoogleSignInUnsetByDefault(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Google != (Google{}) {
		t.Fatalf("Google sign-in must be unset by default, got %+v", cfg.Google)
	}
}

func TestLoadGoogleSignIn(t *testing.T) {
	cfg, err := Load(lookup(map[string]string{
		"DATABASE_URL":               "postgres://x",
		"GOOGLE_OAUTH_CLIENT_ID":     " id.apps.googleusercontent.com ",
		"GOOGLE_OAUTH_CLIENT_SECRET": "s3cret",
		"GOOGLE_OAUTH_REDIRECT_BASE": "https://player.rotra.club",
	}))
	if err != nil {
		t.Fatal(err)
	}
	want := Google{ClientID: "id.apps.googleusercontent.com", ClientSecret: "s3cret", RedirectBase: "https://player.rotra.club"}
	if cfg.Google != want {
		t.Fatalf("got %+v, want %+v", cfg.Google, want)
	}
}

func TestLoadGoogleSignInHalfSetLeavesItOffWithoutStoppingTheAPI(t *testing.T) {
	for name, env := range map[string]map[string]string{
		"id only":          {"GOOGLE_OAUTH_CLIENT_ID": "id"},
		"secret only":      {"GOOGLE_OAUTH_CLIENT_SECRET": "topsecretvalue"},
		"no redirect base": {"GOOGLE_OAUTH_CLIENT_ID": "id", "GOOGLE_OAUTH_CLIENT_SECRET": "topsecretvalue"},
		"bad redirect":     {"GOOGLE_OAUTH_CLIENT_ID": "id", "GOOGLE_OAUTH_CLIENT_SECRET": "topsecretvalue", "GOOGLE_OAUTH_REDIRECT_BASE": "https://player.rotra.club/"},
	} {
		t.Run(name, func(t *testing.T) {
			env["DATABASE_URL"] = "postgres://x"
			cfg, err := Load(lookup(env))
			if err != nil {
				t.Fatalf("a bad Google setting must not stop the API: %v", err)
			}
			if cfg.Google.Set() || cfg.Google.Problem == "" || cfg.Google.ClientSecret != "" {
				t.Fatalf("Google must be off with a reason and no secret: %+v", cfg.Google)
			}
			if strings.Contains(cfg.Google.Problem, "topsecretvalue") {
				t.Fatalf("the reason leaks the secret: %v", cfg.Google.Problem)
			}
		})
	}
}
