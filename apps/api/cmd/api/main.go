// Command api is the ROTRA Go API.
package main

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/signin"
	authstore "github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/telemetry"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "rotra-api:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.LookupEnv)
	if err != nil {
		return err
	}
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel})).
		With(slog.String("service", "rotra-api"))
	pool, err := db.Open(context.Background(), cfg.DatabaseURL, db.Options{MaxConns: cfg.DBMaxConns})
	if err != nil {
		return err
	}
	defer pool.Close()

	tracing, err := telemetry.New(context.Background(), os.LookupEnv)
	if err != nil {
		return err
	}
	defer func() {
		// Flush last spans after the server has drained; a dead collector cannot hold the exit past 5 s.
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tracing.Shutdown(ctx)
	}()
	if cfg.ProxySecret == "" {
		log.Warn("ROTRA_PROXY_SECRET is not set: only /healthz and the stream routes answer")
	}
	log.Info("tracing", slog.Bool("enabled", tracing.Enabled()))

	ready := httpapi.NewReadiness()
	// One budget per trusted client IP for every public-read route (B-43); later tracks pass the same limiter.
	publicLimiter := httpapi.NewRateLimiter(httpapi.PublicReadsPerMinute, nil)
	routes := []func(*http.ServeMux){publicreads.Register(publicreads.Deps{Pool: pool.Raw(), Limiter: publicLimiter, Logger: log})}
	if cfg.AuthSigningKey == nil {
		log.Warn("ROTRA_AUTH_SIGNING_KEY is not set: no auth routes are served")
		// With no sign-in every caller is a visitor, so the reads that depend on the viewer are served as the visitor's.
		routes = append(routes, publicreads.RegisterVisitorOnly(publicreads.Deps{Pool: pool.Raw(), Limiter: publicLimiter, Logger: log}))
	} else {
		current := cfg.AuthSigningKey.Public().(ed25519.PublicKey)
		keys, err := pass.NewKeySet(current, cfg.AuthExtraPublicKeys...)
		if err != nil {
			return err
		}
		routes = append(routes, pass.Register(pass.Deps{Keys: keys, Limiter: publicLimiter}))
		signer, err := pass.NewSigner(cfg.AuthSigningKey, cfg.AuthTuning.AccessLifetime)
		if err != nil {
			return err
		}
		// No leeway: the verifier runs in the same process, on the same clock, as the signer.
		verifier, err := pass.NewVerifier(keys, 0)
		if err != nil {
			return err
		}
		hasher, err := password.NewHasher(password.DefaultParams(), cfg.AuthHashConcurrency)
		if err != nil {
			return err
		}
		authStore := authstore.New(pool.Raw())
		svc, err := session.New(session.Deps{
			Store: authStore, Signer: signer, Verifier: verifier, Hasher: hasher,
			Tuning: cfg.AuthTuning, SigningKey: cfg.AuthSigningKey, Logger: log,
		})
		if err != nil {
			return err
		}
		signInRoutes, err := signin.Register(signin.Deps{Service: svc, Store: authStore, Verifier: verifier, Logger: log})
		if err != nil {
			return err
		}
		routes = append(routes, signInRoutes)
		// The registration link shares the public-read budget for its read and the sign-in limits for its submit.
		claimRoutes, err := claim.Register(claim.Deps{Pool: pool.Raw(), Service: svc, Store: authStore, ReadLimiter: publicLimiter, Logger: log})
		if err != nil {
			return err
		}
		routes = append(routes, claimRoutes)
		// Admin-reviewed password recovery: the two public Player routes. The Admin list and review routes belong to
		// go-writes-admin-player (track 8), which calls the same service.
		recoveryService, err := recovery.New(recovery.Deps{Pool: pool.Raw(), Service: svc, Store: authStore, Logger: log})
		if err != nil {
			return err
		}
		routes = append(routes, recoveryService.Routes())
		// The signed-in reads of the Player, Admin and Queue apps (go-signed-in-reads). They need the pass check, so
		// they are served only where sign-in is.
		signedInRoutes, err := signedin.Register(signedin.Deps{
			Pool: pool.Raw(), Auth: svc.Authenticator(), Logger: log,
			// The viewer-aware public reads share the public-read budget; the stats read allows the same exact app origins
			// as the stream routes (the paired Queue pages).
			Limiter: publicLimiter, QueueOrigins: cfg.QueueOrigins,
			// The Admin list of password-reset requests is the recovery service's read.
			PasswordResets: recoveryService,
		})
		if err != nil {
			return err
		}
		routes = append(routes, signedInRoutes)
		log.Info("auth signing key loaded", slog.String("kid", pass.KeyID(current)), slog.Int("published_keys", len(keys.JWKS())))
	}
	handler := tracing.Middleware(httpapi.NewHandler(httpapi.Deps{
		Logger: log, Pinger: pool, Readiness: ready,
		ProxySecret: cfg.ProxySecret, AllowedOrigins: cfg.AllowedOrigins,
	}, routes...))
	srv := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}
	ln, err := net.Listen("tcp", cfg.Addr)
	if err != nil {
		return err
	}

	// SIGTERM is what Railway sends at the start of draining; SIGINT is Ctrl+C in development.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	// Housekeeping shares the signal context, so it stops when draining starts (B-44). Tracks that add a
	// growing table register its cleanup here, using cfg.Housekeeping retention (go-sign-in, go-writes-queue).
	hk := housekeeping.New(pool.Raw(), log, housekeeping.Options{Interval: cfg.Housekeeping.Interval, BatchSize: cfg.Housekeeping.BatchSize})
	// Events first, then the sessions they reference (B-34).
	hk.Register(authstore.AuthEventsCleanup(cfg.Housekeeping.AuthEventsDays))
	hk.Register(authstore.AuthSessionsCleanup(cfg.Housekeeping.AuthSessionsDays))
	hkDone := make(chan struct{})
	go func() {
		defer close(hkDone)
		hk.Run(ctx)
	}()

	log.Info("listening", slog.String("addr", ln.Addr().String()))
	err = httpapi.Serve(ctx, srv, ln, ready, cfg.ShutdownTimeout, log)
	stop()
	<-hkDone // the loop has released its lock and connection before the pool closes
	return err
}
