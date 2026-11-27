// Package publicreads serves the public GET routes (no sign-in) that moved from the Next.js Route Handlers.
// Each route keeps the contract of the handler it replaces: same path, JSON shape, status codes and
// error envelope. Every route here sits behind the proxy-secret guard and the per-IP public-read limit.
package publicreads

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
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
	// SnapshotTTL is the safety clock of a public session page snapshot (D-2026-11-09-09: about 10 seconds): a newer version
	// replaces a copy sooner (B-25), but a change with no session event waits for it. Zero is 10 seconds. The clock is Now.
	SnapshotTTL time.Duration
	// Snapshots, when set, is the snapshot cache the page read uses, so main can hand it to the live-update publisher
	// (Snapshots.Observe, SetLive). Nil makes a private one from the settings above.
	Snapshots *Snapshots
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
// here: see ViewerReads. Two paths that other apps answer differently (GET /api/clubs/{clubId} and GET
// /api/ranking-settings) are there too.
func Register(d Deps) func(*http.ServeMux) {
	d = d.withDefaults()
	limited := func(h http.HandlerFunc) http.Handler {
		return httpapi.RateLimit(d.Limiter, rateLimitMessage, h)
	}
	pl := &players{pool: d.Pool, log: d.Logger, now: d.Now}
	lib := &library{pool: d.Pool, log: d.Logger}
	snaps := d.Snapshots
	if snaps == nil {
		snaps = NewSnapshots(SnapshotSettings{TTL: d.SnapshotTTL, MaxEntries: d.SnapshotMaxEntries, MaxBytes: d.SnapshotMaxBytes, Now: d.Now})
	}
	ps := &publicSessions{pool: d.Pool, log: d.Logger, cache: snaps.cache}
	return func(mux *http.ServeMux) {
		mux.Handle("GET /api/public-sessions/{slug}", limited(ps.page))
		mux.Handle("GET /api/public-sessions/{slug}/payment-status", limited(ps.paymentStatus))
		mux.Handle("GET /api/players/{playerId}/clubs", limited(pl.clubs))
		mux.Handle("GET /api/profile-banners/shown", limited(lib.shownBanners))
		mux.Handle("GET /api/profile-characters/shown", limited(lib.shownCharacters))
		mux.Handle("GET /api/profile-characters/{id}/image", limited(lib.characterImage))
	}
}

// SnapshotSettings tunes the session snapshot cache. Zero values take the B-25 defaults: 10 s safety clock, 2048 copies,
// about 64 MB, idle copies dropped after about 10 minutes.
type SnapshotSettings struct {
	TTL        time.Duration
	Idle       time.Duration
	MaxEntries int
	MaxBytes   int
	Now        func() time.Time
}

// Snapshots is the session snapshot cache (B-25): one shared copy per session and view, stamped with the session's
// snapshot version. The live-update publisher tells it every version it pushes (Observe), so a re-read right after a live
// message returns the new snapshot, never the cached older one.
type Snapshots struct{ cache *snapshotCache }

// NewSnapshots builds the cache.
func NewSnapshots(s SnapshotSettings) *Snapshots {
	return &Snapshots{cache: newSnapshotCache(snapshotConfig{TTL: s.TTL, Idle: s.Idle, MaxEntries: s.MaxEntries, MaxBytes: s.MaxBytes, Now: s.Now})}
}

// Observe records a version the publisher pushed for a session.
func (s *Snapshots) Observe(session uuid.UUID, version int64) { s.cache.Observe(session, version) }

// Len and Bytes are how many copies the cache holds and their total size (for the memory dashboard and tests).
func (s *Snapshots) Len() int   { return s.cache.len() }
func (s *Snapshots) Bytes() int { return s.cache.bytes() }
