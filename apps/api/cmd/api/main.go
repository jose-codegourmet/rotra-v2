// Command api is the ROTRA Go API.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
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
	handler := tracing.Middleware(httpapi.NewHandler(httpapi.Deps{
		Logger: log, Pinger: pool, Readiness: ready,
		ProxySecret: cfg.ProxySecret, AllowedOrigins: cfg.AllowedOrigins,
	}, publicreads.Register(publicreads.Deps{Pool: pool.Raw(), Limiter: publicLimiter, Logger: log})))
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
