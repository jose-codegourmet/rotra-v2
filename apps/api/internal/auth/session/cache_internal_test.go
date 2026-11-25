package session

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestTTLCacheExpiresEntries(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	c := newTTLCache[string](5*time.Second, func() time.Time { return now })
	id := uuid.New()
	c.put(id, "v", c.epoch())
	if v, ok := c.get(id); !ok || v != "v" {
		t.Fatalf("fresh entry: %v %v", v, ok)
	}
	now = now.Add(5 * time.Second)
	if _, ok := c.get(id); ok {
		t.Fatal("an entry is gone at the TTL")
	}
}

func TestTTLCacheOffWhenTTLIsZero(t *testing.T) {
	c := newTTLCache[string](0, time.Now)
	id := uuid.New()
	c.put(id, "v", c.epoch())
	if _, ok := c.get(id); ok {
		t.Fatal("TTL 0 stores nothing")
	}
}

func TestTTLCacheDeleteAndClear(t *testing.T) {
	c := newTTLCache[int](time.Minute, time.Now)
	a, b := uuid.New(), uuid.New()
	c.put(a, 1, c.epoch())
	c.put(b, 2, c.epoch())
	c.delete(a)
	if _, ok := c.get(a); ok {
		t.Fatal("deleted")
	}
	if _, ok := c.get(b); !ok {
		t.Fatal("others stay")
	}
	c.clear()
	if _, ok := c.get(b); ok {
		t.Fatal("cleared")
	}
}

// A lookup that began before a revoke committed must not put a stale "active" answer back after the revoke
// invalidated the cache: puts from an older epoch are dropped.
func TestTTLCacheRejectsPutsFromBeforeAnInvalidation(t *testing.T) {
	c := newTTLCache[string](time.Minute, time.Now)
	id := uuid.New()
	started := c.epoch() // the lookup begins here and reads the database
	c.delete(id)         // a revoke commits and invalidates meanwhile
	c.put(id, "active", started)
	if _, ok := c.get(id); ok {
		t.Fatal("a put that began before the invalidation must be dropped")
	}
	c.put(id, "active", c.epoch())
	if _, ok := c.get(id); !ok {
		t.Fatal("a put that began after it is fine")
	}
	started = c.epoch()
	c.clear()
	c.put(id, "again", started)
	if _, ok := c.get(id); ok {
		t.Fatal("clear also bumps the epoch")
	}
}

func TestTTLCacheStaysBounded(t *testing.T) {
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	c := newTTLCache[int](time.Second, func() time.Time { return now })
	c.max = 100
	for i := 0; i < 100; i++ {
		c.put(uuid.New(), i, c.epoch())
	}
	now = now.Add(2 * time.Second) // all of those are expired
	c.put(uuid.New(), 1, c.epoch())
	if n := c.size(); n != 1 {
		t.Fatalf("expired entries are pruned when the cache is full, size %d", n)
	}
	for i := 0; i < 500; i++ {
		c.put(uuid.New(), i, c.epoch())
	}
	if n := c.size(); n > 100 {
		t.Fatalf("size %d beyond the cap", n)
	}
}

// An entry put on a test clock that jumped ahead must not outlive a reset to real time.
func TestTTLCacheEntryFromTheFutureExpiresWhenTimeGoesBack(t *testing.T) {
	now := time.Now().Add(3 * time.Hour)
	c := newTTLCache[string](5*time.Second, func() time.Time { return now })
	id := uuid.New()
	c.put(id, "active", c.epoch())
	now = now.Add(-3 * time.Hour)
	if _, ok := c.get(id); ok {
		t.Fatal("an entry that ends more than one TTL ahead was put on a clock that went back; it must miss")
	}
}
