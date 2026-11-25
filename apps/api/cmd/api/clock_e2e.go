//go:build e2e

package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testclock"
)

// testClock is the regression suite's virtual clock (internal/testclock). Without ROTRA_E2E_CLOCK=1 it is the real clock;
// with it, the API refuses to start unless DATABASE_URL is the local throwaway database. The control endpoint binds 127.0.0.1.
func testClock(lookup func(string) (string, bool), databaseURL string, log *slog.Logger) (func() time.Time, func(context.Context), error) {
	clock, err := testclock.FromEnv(lookup, databaseURL)
	if err != nil {
		return nil, nil, err
	}
	if clock == nil {
		return time.Now, func(context.Context) {}, nil
	}
	addr := testclock.DefaultAddr
	if v, ok := lookup(testclock.AddrEnvVar); ok && v != "" {
		addr = v
	}
	log.Warn("TEST CLOCK ON: business time follows the regression suite's virtual clock", slog.String("control", addr))
	return clock.Now, func(ctx context.Context) {
		if err := testclock.Serve(ctx, clock, addr); err != nil {
			log.Error("test clock control endpoint stopped", slog.Any("error", err))
		}
	}, nil
}
