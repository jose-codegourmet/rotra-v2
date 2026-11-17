package publicreads

import (
	"context"
	"errors"
	"sync"
	"time"
)

// The public session page is the one read that many phones repeat for the same few sessions. D-2026-11-09-09
// keeps it cheap: the page is built once and shared, so 24 players refreshing together cost one database read.
//
// One shared copy per session and view, in this process's memory (B-25). The views are the visitor page
// (everything masked) and the signed-in page (registered full names); only the visitor view is served so far,
// because Go cannot verify a sign-in yet (B-24).
//
// FRESHNESS: B-25 versions each copy by the session's latest live-update event id, so a screen told "version N"
// never gets an older copy. That event table does not exist yet (go-writes-queue R4), so for now a copy simply
// lives for a time-to-live (D-2026-11-09-09: about 10 seconds), measured from when its read began. When the event
// id exists, the version replaces the clock in snapshotKey and the TTL becomes the safety net. Until then a
// change (a result published or taken down, a player added) reaches a phone within one TTL.

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
	Now         func() time.Time
}

// snapshotCache shares one built body per key. Nothing but a successful body is ever stored, so an unknown or
// malformed slug, a not_found and a failed read leave no trace; the number and total size of stored bodies are
// capped, so no stream of requests can make it grow without bound.
type snapshotCache struct {
	ttl         time.Duration
	maxEntries  int
	maxBytes    int
	loadTimeout time.Duration
	now         func() time.Time

	mu      sync.Mutex
	entries map[snapshotKey]*snapshotEntry
	flights map[snapshotKey]*snapshotFlight
	size    int
}

type snapshotEntry struct {
	body     []byte
	expires  time.Time
	lastRead time.Time
}

// snapshotFlight is one load in progress; everyone who asks for the key meanwhile waits on it.
type snapshotFlight struct {
	done chan struct{}
	body []byte
	err  error
}

func newSnapshotCache(c snapshotConfig) *snapshotCache {
	cache := &snapshotCache{
		ttl: c.TTL, maxEntries: c.MaxEntries, maxBytes: c.MaxBytes, loadTimeout: c.LoadTimeout, now: c.Now,
		entries: map[snapshotKey]*snapshotEntry{}, flights: map[snapshotKey]*snapshotFlight{},
	}
	if cache.ttl <= 0 {
		cache.ttl = defaultSnapshotTTL
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

// get returns the shared body for key, building it with load when there is none or it has expired. Requests that
// arrive while a build runs wait for it instead of starting their own, so a window costs one load however many
// clients ask. The build runs on its own context (the request's values, not its cancellation, plus a timeout):
// the first client leaving must not fail the others. A waiter leaves as soon as its own context ends.
func (c *snapshotCache) get(ctx context.Context, key snapshotKey, load func(context.Context) ([]byte, error)) ([]byte, error) {
	now := c.now()
	c.mu.Lock()
	if e := c.entries[key]; e != nil {
		if now.Before(e.expires) {
			e.lastRead = now
			body := e.body
			c.mu.Unlock()
			return body, nil
		}
		c.removeLocked(key, e)
	}
	f := c.flights[key]
	if f == nil {
		f = &snapshotFlight{done: make(chan struct{})}
		c.flights[key] = f
		go c.build(context.WithoutCancel(ctx), key, f, now, load)
	}
	c.mu.Unlock()

	select {
	case <-f.done:
		return f.body, f.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// build runs one load and publishes its outcome. The key is always freed and the waiters always released, even if
// the loader panics.
func (c *snapshotCache) build(ctx context.Context, key snapshotKey, f *snapshotFlight, started time.Time, load func(context.Context) ([]byte, error)) {
	ctx, cancel := context.WithTimeout(ctx, c.loadTimeout)
	defer cancel()
	f.err = errLoadPanicked
	defer func() {
		_ = recover() // the waiters get errLoadPanicked
		c.mu.Lock()
		delete(c.flights, key)
		if f.err == nil {
			c.storeLocked(key, f.body, started)
		}
		c.mu.Unlock()
		close(f.done)
	}()
	body, err := load(ctx)
	f.body, f.err = body, err
}

// storeLocked keeps body until started+TTL. It never exceeds the caps: expired snapshots go first, then the
// least recently read. A body bigger than the whole byte cap is served but not kept.
func (c *snapshotCache) storeLocked(key snapshotKey, body []byte, started time.Time) {
	if len(body) > c.maxBytes {
		return
	}
	now := c.now()
	if old := c.entries[key]; old != nil {
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
	c.entries[key] = &snapshotEntry{body: body, expires: started.Add(c.ttl), lastRead: now}
	c.size += len(body)
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
