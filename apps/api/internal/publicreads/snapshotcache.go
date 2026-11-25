package publicreads

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

// The public session page is the one read that many phones repeat for the same few sessions. D-2026-11-09-09
// keeps it cheap: the page is built once and shared, so 24 players refreshing together cost one database read.
//
// One shared copy per session and view, in this process's memory (B-25). The views are the visitor page
// (everything masked) and the signed-in page (registered full names); only the visitor view is served so far,
// because Go cannot verify a sign-in yet (B-24).
//
// FRESHNESS (B-25): every copy carries the session's snapshot version, its latest live-update event id, read in the
// same snapshot that built the page. A screen told "version N" asks for at least N (the minVersion query parameter): a
// copy at an older version is rebuilt once and shared, however many screens ask at the same moment, and the newer copy
// replaces the older one (one copy per session and view). The publisher also tells the cache every version it pushes
// (Observe), so a plain read, with no version, never returns a copy older than the newest one the API has seen. The
// time-to-live of D-2026-11-09-09 (about 10 seconds) stays as the safety net: a change that carries no session event
// (a club's name or logo, a write no event covers yet) still reaches the page within one TTL. Copies nobody has read for
// about 10 minutes are dropped, and a size cap (about 64 MB) drops the least recently read copy first.

// pageView is which version of a page a snapshot is.
type pageView string

// viewVisitor is the page with every name masked. The signed-in view ("signed_in", registered full names) is not
// built: its loader has no TypeScript source to characterize and Go cannot verify the sign-in.
const viewVisitor pageView = "visitor"

type snapshotKey struct {
	slug string
	view pageView
}

const (
	defaultSnapshotTTL        = 10 * time.Second
	defaultSnapshotMaxEntries = 2048
	defaultSnapshotMaxBytes   = 64 << 20 // B-25: about 64 MB
	defaultSnapshotLoadTime   = 15 * time.Second
	defaultSnapshotIdle       = 10 * time.Minute // B-25: a copy nobody read for about 10 minutes is dropped
)

// errPageNotFound is what a loader returns for a page that does not exist or is gone. Like every error, it is
// shared by the requests waiting on that load and never stored.
var errPageNotFound = errors.New("public session page not found")

var errLoadPanicked = errors.New("snapshot load panicked")

type snapshotConfig struct {
	TTL         time.Duration // zero is 10 s
	MaxEntries  int           // zero is 2048
	MaxBytes    int           // zero is 64 MiB
	LoadTimeout time.Duration // zero is 15 s
	Idle        time.Duration // zero is 10 min
	Now         func() time.Time
}

// snapshot is what a loader builds: the body, and the session's snapshot version it was read at.
type snapshot struct {
	body []byte
	// version is the session's latest live-update event id when the page was read (0 before its first event).
	version int64
	// session is the session behind the page, so the publisher's Observe can reach its copies.
	session uuid.UUID
}

// snapshotCache shares one built body per key. Nothing but a successful body is ever stored, so an unknown or
// malformed slug, a not_found and a failed read leave no trace; the number and total size of stored bodies are
// capped, so no stream of requests can make it grow without bound.
type snapshotCache struct {
	ttl         time.Duration
	idle        time.Duration
	maxEntries  int
	maxBytes    int
	loadTimeout time.Duration
	now         func() time.Time

	mu        sync.Mutex
	entries   map[snapshotKey]*snapshotEntry
	flights   map[snapshotKey]*snapshotFlight
	latest    map[uuid.UUID]observed // newest version the publisher pushed per session
	size      int
	lastSweep time.Time
}

type observed struct {
	version int64
	seen    time.Time
}

type snapshotEntry struct {
	body     []byte
	version  int64
	session  uuid.UUID
	expires  time.Time
	lastRead time.Time
}

// snapshotFlight is one load in progress; everyone who asks for the key meanwhile waits on it. min is the version it was
// started to satisfy: its read begins after that version committed, so it sees at least that.
type snapshotFlight struct {
	done chan struct{}
	min  int64
	snap snapshot
	err  error
}

func newSnapshotCache(c snapshotConfig) *snapshotCache {
	cache := &snapshotCache{
		ttl: c.TTL, idle: c.Idle, maxEntries: c.MaxEntries, maxBytes: c.MaxBytes, loadTimeout: c.LoadTimeout, now: c.Now,
		entries: map[snapshotKey]*snapshotEntry{}, flights: map[snapshotKey]*snapshotFlight{}, latest: map[uuid.UUID]observed{},
	}
	if cache.ttl <= 0 {
		cache.ttl = defaultSnapshotTTL
	}
	if cache.idle <= 0 {
		cache.idle = defaultSnapshotIdle
	}
	if cache.maxEntries <= 0 {
		cache.maxEntries = defaultSnapshotMaxEntries
	}
	if cache.maxBytes <= 0 {
		cache.maxBytes = defaultSnapshotMaxBytes
	}
	if cache.loadTimeout <= 0 {
		cache.loadTimeout = defaultSnapshotLoadTime
	}
	if cache.now == nil {
		cache.now = time.Now
	}
	return cache
}

// Observe records that the session has a version at least as new as version (the publisher pushed it). A copy older than
// that is stale from now on.
func (c *snapshotCache) Observe(session uuid.UUID, version int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	if o, ok := c.latest[session]; !ok || version > o.version {
		c.latest[session] = observed{version: version, seen: now}
	} else {
		c.latest[session] = observed{version: o.version, seen: now}
	}
}

// usableLocked reports whether the entry may be served to a reader that wants at least min.
func (c *snapshotCache) usableLocked(e *snapshotEntry, min int64, now time.Time) bool {
	if e.version < min {
		return false
	}
	if o, ok := c.latest[e.session]; ok && e.version < o.version {
		return false
	}
	// An entry that expires more than one TTL ahead was built on a clock that has since gone back (the test clock).
	return now.Before(e.expires) && e.expires.Sub(now) <= c.ttl
}

// get returns the shared body for key, building it with load when there is none or it has expired. It is getAt with no
// version asked for.
func (c *snapshotCache) get(ctx context.Context, key snapshotKey, load func(context.Context) ([]byte, error)) ([]byte, error) {
	snap, err := c.getAt(ctx, key, 0, func(ctx context.Context) (snapshot, error) {
		body, err := load(ctx)
		return snapshot{body: body}, err
	})
	return snap.body, err
}

// getAt returns the shared snapshot for key at version min or newer, building it with load when the stored copy is older
// or has expired. Requests that arrive while a build runs wait for it instead of starting their own, so a version costs
// one load however many clients ask. The build runs on its own context (the request's values, not its cancellation, plus a
// timeout): the first client leaving must not fail the others. A waiter leaves as soon as its own context ends.
func (c *snapshotCache) getAt(ctx context.Context, key snapshotKey, min int64, load func(context.Context) (snapshot, error)) (snapshot, error) {
	for {
		now := c.now()
		c.mu.Lock()
		c.sweepLocked(now)
		if e := c.entries[key]; e != nil {
			if c.usableLocked(e, min, now) {
				e.lastRead = now
				snap := snapshot{body: e.body, version: e.version, session: e.session}
				c.mu.Unlock()
				return snap, nil
			}
			c.removeLocked(key, e)
		}
		f := c.flights[key]
		started := false
		if f == nil {
			f = &snapshotFlight{done: make(chan struct{}), min: min}
			c.flights[key] = f
			started = true
			go c.build(context.WithoutCancel(ctx), key, f, now, load)
		}
		c.mu.Unlock()

		select {
		case <-f.done:
		case <-ctx.Done():
			return snapshot{}, ctx.Err()
		}
		if f.err != nil {
			return snapshot{}, f.err
		}
		// This flight was started for a reader that knew at least as much as this one: its read began after that version
		// committed, so it is as new as this reader needs. An older flight (started with less knowledge) may predate the
		// write this reader was told about: build again.
		if started || f.min >= min {
			return f.snap, nil
		}
	}
}

// build runs one load and publishes its outcome. The key is always freed and the waiters always released, even if
// the loader panics.
func (c *snapshotCache) build(ctx context.Context, key snapshotKey, f *snapshotFlight, started time.Time, load func(context.Context) (snapshot, error)) {
	ctx, cancel := context.WithTimeout(ctx, c.loadTimeout)
	defer cancel()
	f.err = errLoadPanicked
	defer func() {
		_ = recover() // the waiters get errLoadPanicked
		c.mu.Lock()
		delete(c.flights, key)
		if f.err == nil {
			c.storeLocked(key, f.snap, started)
		}
		c.mu.Unlock()
		close(f.done)
	}()
	snap, err := load(ctx)
	f.snap, f.err = snap, err
}

// storeLocked keeps the snapshot until started+TTL. It never exceeds the caps:
// expired snapshots go first, then the least recently read. A body bigger than the whole byte cap is served but not kept.
// An older version never replaces a newer one a faster build already stored.
func (c *snapshotCache) storeLocked(key snapshotKey, snap snapshot, started time.Time) {
	body := snap.body
	if len(body) > c.maxBytes {
		return
	}
	now := c.now()
	if old := c.entries[key]; old != nil {
		if old.version > snap.version {
			return
		}
		c.removeLocked(key, old)
	}
	if len(c.entries) >= c.maxEntries || c.size+len(body) > c.maxBytes {
		for k, e := range c.entries {
			if !now.Before(e.expires) {
				c.removeLocked(k, e)
			}
		}
	}
	for len(c.entries) >= c.maxEntries || c.size+len(body) > c.maxBytes {
		var victim snapshotKey
		var oldest *snapshotEntry
		for k, e := range c.entries {
			if oldest == nil || e.lastRead.Before(oldest.lastRead) {
				victim, oldest = k, e
			}
		}
		c.removeLocked(victim, oldest)
	}
	c.entries[key] = &snapshotEntry{body: body, version: snap.version, session: snap.session, expires: started.Add(c.ttl), lastRead: now}
	c.size += len(body)
}

// sweepLocked drops copies nobody read for the idle time, and the versions seen for sessions with no copy and no news for
// as long. It runs at most once an idle-time tenth.
func (c *snapshotCache) sweepLocked(now time.Time) {
	if now.Sub(c.lastSweep) < c.idle/10 {
		return
	}
	c.lastSweep = now
	for k, e := range c.entries {
		if now.Sub(e.lastRead) >= c.idle {
			c.removeLocked(k, e)
		}
	}
	for s, o := range c.latest {
		if now.Sub(o.seen) >= c.idle {
			delete(c.latest, s)
		}
	}
}

func (c *snapshotCache) removeLocked(key snapshotKey, e *snapshotEntry) {
	delete(c.entries, key)
	c.size -= len(e.body)
}

// len and bytes are what the cache holds now (for tests and, later, the memory dashboard).
func (c *snapshotCache) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.entries)
}

func (c *snapshotCache) bytes() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.size
}
