package adminwrites_test

import (
	"crypto/ed25519"
	"log/slog"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/adminwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// testHasher is the sign-in hasher with cheap parameters, as the sign-in service of the test environment has.
func testHasher() *password.Hasher {
	h, err := password.NewHasher(password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}, 2)
	if err != nil {
		panic(err)
	}
	return h
}

// build registers the Admin writes the way main does: on the router signedin.Register builds, next to the reads
// (the same path has a GET there and a POST here).
func build(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	routes, err := adminwrites.Routes(adminwrites.Deps{Pool: pool, Auth: auth, Hasher: testHasher(), Logger: log, Now: now, PasswordResets: testRecovery(pool, log, now)})
	if err != nil {
		panic(err)
	}
	register, err := signedin.Register(signedin.Deps{Pool: pool, Auth: auth, Logger: log, Now: now, Routes: []func(*signedin.Router){routes}})
	if err != nil {
		panic(err)
	}
	return register
}

// testRecovery is the recovery service the review of a password-reset request calls. Review needs the store and the clock only,
// but a Recovery is built on a sign-in service, so this makes one (the same cheap hasher, a key of its own).
func testRecovery(pool *pgxpool.Pool, log *slog.Logger, now func() time.Time) *recovery.Recovery {
	key, err := pass.GenerateKey(nil)
	if err != nil {
		panic(err)
	}
	keys, err := pass.NewKeySet(key.Public().(ed25519.PublicKey))
	if err != nil {
		panic(err)
	}
	signer, err := pass.NewSigner(key, 0)
	if err != nil {
		panic(err)
	}
	verifier, err := pass.NewVerifier(keys, 0)
	if err != nil {
		panic(err)
	}
	st := store.New(pool)
	svc, err := session.New(session.Deps{Store: st, Signer: signer, Verifier: verifier, Hasher: testHasher(), Tuning: config.DefaultAuthTuning(), SigningKey: key, Clock: now, Logger: log})
	if err != nil {
		panic(err)
	}
	rec, err := recovery.New(recovery.Deps{Pool: pool, Service: svc, Store: st, Clock: now, Logger: log})
	if err != nil {
		panic(err)
	}
	return rec
}

var _ writetest.Build = build
