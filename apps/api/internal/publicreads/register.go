// Package publicreads serves the public GET routes (no sign-in) that moved from the Next.js Route Handlers.
// Each route keeps the contract of the handler it replaces: same path, JSON shape, status codes and
// error envelope. Every route here sits behind the proxy-secret guard and the per-IP public-read limit.
package publicreads

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// rateLimitMessage is the human text of the 429 envelope (B-43).
const rateLimitMessage = "Too many requests. Try again in a minute."

// Deps is what the public reads are built from.
type Deps struct {
	Pool *pgxpool.Pool
	// Limiter is the per-IP public-read budget. Routes registered with the same Limiter share it, so
	// main builds one and every public-read area uses it. Nil gets a default 300/minute limiter.
	Limiter *httpapi.RateLimiter
	Logger  *slog.Logger
	// Now is the clock for what depends on today (a profile's experience counts up to it). Nil is time.Now.
	Now func() time.Time
	// SnapshotTTL is how long a public session page snapshot is shared (D-2026-11-09-09: about 10 seconds). Zero is
	// 10 seconds. It is a stand-in for the live-update version of B-25, which needs the event table that does not
	// exist yet. The clock is Now.
	SnapshotTTL time.Duration
	// SnapshotMaxEntries and SnapshotMaxBytes bound the snapshot cache (zero is 2048 snapshots and 64 MiB).
	SnapshotMaxEntries int
	SnapshotMaxBytes   int
	// ApprovedAlgorithms are the rank algorithm versions whose stored rows /rank may show. No formula is
	// approved yet (#247), so production passes none and every rank reads as "no rank yet".
	ApprovedAlgorithms []string
}

// withDefaults fills what a caller may leave out.
func (d Deps) withDefaults() Deps {
	if d.Limiter == nil {
		d.Limiter = httpapi.NewRateLimiter(httpapi.PublicReadsPerMinute, nil)
	}
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	if d.Now == nil {
		d.Now = time.Now
	}
	return d
}

// Register adds the public read routes to the router (pass it to httpapi.NewHandler as an extra).
//
// The reads that depend on the viewer (the leaderboards, the profile, the RTR ID lookup, rank and games) are not
// here: see ViewerReads.
func Register(d Deps) func(*http.ServeMux) {
	d = d.withDefaults()
	limited := func(h http.HandlerFunc) http.Handler {
		return httpapi.RateLimit(d.Limiter, rateLimitMessage, h)
	}
	pl := &players{pool: d.Pool, log: d.Logger, now: d.Now}
	cp := &clubPages{pool: d.Pool, log: d.Logger, now: d.Now}
	lib := &library{pool: d.Pool, log: d.Logger}
	ps := &publicSessions{pool: d.Pool, log: d.Logger, cache: newSnapshotCache(snapshotConfig{
		TTL: d.SnapshotTTL, MaxEntries: d.SnapshotMaxEntries, MaxBytes: d.SnapshotMaxBytes, Now: d.Now,
	})}
	return func(mux *http.ServeMux) {
		mux.Handle("GET /api/public-sessions/{slug}", limited(ps.page))
		mux.Handle("GET /api/players/{playerId}/clubs", limited(pl.clubs))
		mux.Handle("GET /api/clubs/{clubId}", limited(cp.page))
		mux.Handle("GET /api/profile-banners/shown", limited(lib.shownBanners))
		mux.Handle("GET /api/profile-characters/shown", limited(lib.shownCharacters))
		mux.Handle("GET /api/profile-characters/{id}/image", limited(lib.characterImage))
		mux.Handle("GET /api/ranking-settings", limited(lib.rankingSettings))
	}
}
