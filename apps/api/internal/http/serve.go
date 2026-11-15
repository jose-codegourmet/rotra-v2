package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// Serve runs srv on ln until ctx ends (SIGTERM in production). Then it marks the process not ready,
// stops accepting connections, lets requests in progress finish for at most grace, and returns.
// grace stays under Railway's draining time (config enforces it). Background loops share ctx, so they
// stop at the same moment. A stuck request is cut at the grace limit and context.DeadlineExceeded returns.
func Serve(ctx context.Context, srv *http.Server, ln net.Listener, ready *Readiness, grace time.Duration, log *slog.Logger) error {
	errc := make(chan error, 1)
	go func() { errc <- srv.Serve(ln) }()

	select {
	case err := <-errc:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
	}

	ready.SetDraining()
	log.Info("shutdown started", slog.Duration("grace", grace))
	sctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), grace)
	defer cancel()
	if err := srv.Shutdown(sctx); err != nil {
		_ = srv.Close()
		log.Error("shutdown timed out; open connections closed", slog.String("error", err.Error()))
		return err
	}
	log.Info("shutdown complete")
	return nil
}
