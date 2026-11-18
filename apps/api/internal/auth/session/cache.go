package session

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// ttlCache is a small in-process cache keyed by uuid with a fixed TTL, used for the write-path session check
// and the account check (B-27: "briefly cached", about 5 s, configuration).
//
// Invalidation is race-safe through an epoch: every delete or clear bumps it, and a put carries the epoch its
// caller read BEFORE it queried the database. A lookup that began before a revoke committed therefore cannot
// put its stale "active" answer back after the revoke invalidated the key: its epoch is older and the put is
// dropped. A lookup that began after the invalidation reads the database after the commit and sees the revoke.
type ttlCache[V any] struct {
	ttl time.Duration
	now func() time.Time
	max int

	mu sync.Mutex
	ep uint64
	m  map[uuid.UUID]cacheEntry[V]
}

type cacheEntry[V any] struct {
	v     V
	until time.Time
}

// defaultCacheMax bounds the cache: at the size of the whole beta this is a few MiB at most.
const defaultCacheMax = 50_000

func newTTLCache[V any](ttl time.Duration, now func() time.Time) *ttlCache[V] {
	return &ttlCache[V]{ttl: ttl, now: now, max: defaultCacheMax, m: map[uuid.UUID]cacheEntry[V]{}}
}

// epoch is read before the database lookup whose answer will be put.
func (c *ttlCache[V]) epoch() uint64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ep
}

func (c *ttlCache[V]) get(id uuid.UUID) (V, bool) {
	var zero V
	if c.ttl <= 0 {
		return zero, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.m[id]
	if !ok {
		return zero, false
	}
	if !c.now().Before(e.until) {
		delete(c.m, id)
		return zero, false
	}
	return e.v, true
}

// put stores v unless an invalidation happened since started was read.
func (c *ttlCache[V]) put(id uuid.UUID, v V, started uint64) {
	if c.ttl <= 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if started != c.ep {
		return
	}
	now := c.now()
	if len(c.m) >= c.max {
		for k, e := range c.m {
			if !now.Before(e.until) {
				delete(c.m, k)
			}
		}
		if len(c.m) >= c.max {
			clear(c.m) // still full of live entries: start over rather than grow
		}
	}
	c.m[id] = cacheEntry[V]{v: v, until: now.Add(c.ttl)}
}

func (c *ttlCache[V]) delete(ids ...uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ep++
	for _, id := range ids {
		delete(c.m, id)
	}
}

func (c *ttlCache[V]) clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.ep++
	clear(c.m)
}

func (c *ttlCache[V]) size() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.m)
}
