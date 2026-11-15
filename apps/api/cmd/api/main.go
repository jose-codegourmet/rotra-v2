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
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
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

	ready := httpapi.NewReadiness()
	handler := httpapi.NewHandler(httpapi.Deps{Logger: log, Pinger: pool, Readiness: ready})
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
	log.Info("listening", slog.String("addr", ln.Addr().String()))
	return httpapi.Serve(ctx, srv, ln, ready, cfg.ShutdownTimeout, log)
}
