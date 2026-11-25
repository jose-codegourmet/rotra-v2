//go:build !e2e

package main

import (
	"context"
	"log/slog"
	"time"
)

// testClock is the real clock in every normal build: the regression suite's virtual clock is compiled in only with the e2e build tag.
func testClock(func(string) (string, bool), string, *slog.Logger) (func() time.Time, func(context.Context), error) {
	return time.Now, func(context.Context) {}, nil
}
