package publicreads

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// The snapshot cache is tested with a counting loader and a fake clock: what matters is how many loads happen.

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func newFakeClock() *fakeClock { return &fakeClock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)} }
func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}
func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

type countingLoader struct {
	calls atomic.Int64
	body  func(n int64) []byte
	err   error
	gate  chan struct{} // when set, a load waits for it to close
}

func (l *countingLoader) load(ctx context.Context) ([]byte, error) {
	n := l.calls.Add(1)
	if l.gate != nil {
		select {
		case <-l.gate:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	if l.err != nil {
		return nil, l.err
	}
	if l.body != nil {
		return l.body(n), nil
	}
	return []byte("body-" + strconv.FormatInt(n, 10)), nil
}

func newTestCache(clk *fakeClock) *snapshotCache {
	return newSnapshotCache(snapshotConfig{TTL: 10 * time.Second, MaxEntries: 100, MaxBytes: 1 << 20, LoadTimeout: 5 * time.Second, Now: clk.Now})
}

var visitorKey = snapshotKey{slug: "open-night", view: viewVisitor}

func TestSnapshotIsSharedForTheTTLThenReloaded(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	l := &countingLoader{}
	ctx := context.Background()
	first, err := c.get(ctx, visitorKey, l.load)
	if err != nil || string(first) != "body-1" {
		t.Fatalf("first = %q, %v", first, err)
	}
	clk.Advance(9*time.Second + 999*time.Millisecond)
	again, _ := c.get(ctx, visitorKey, l.load)
	if string(again) != "body-1" || l.calls.Load() != 1 {
		t.Fatalf("inside the window: body %q after %d loads, want the shared copy after 1", again, l.calls.Load())
	}
	clk.Advance(time.Millisecond) // exactly the TTL: expired
	fresh, _ := c.get(ctx, visitorKey, l.load)
	if string(fresh) != "body-2" || l.calls.Load() != 2 {
		t.Fatalf("at the TTL: body %q after %d loads, want a reload", fresh, l.calls.Load())
	}
}

func TestSnapshotViewsAreIndependent(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	visitor := &countingLoader{body: func(int64) []byte { return []byte("visitor-copy") }}
	signedIn := &countingLoader{body: func(int64) []byte { return []byte("signed-in-copy") }}
	other := snapshotKey{slug: visitorKey.slug, view: pageView("signed_in")}
	ctx := context.Background()
	v1, _ := c.get(ctx, visitorKey, visitor.load)
	clk.Advance(6 * time.Second)
	s1, _ := c.get(ctx, other, signedIn.load)
	if string(v1) != "visitor-copy" || string(s1) != "signed-in-copy" {
		t.Fatalf("copies %q and %q: one view must never answer the other", v1, s1)
	}
	clk.Advance(5 * time.Second) // the visitor copy (age 11 s) expired, the signed-in copy (age 5 s) did not
	v2, _ := c.get(ctx, visitorKey, visitor.load)
	s2, _ := c.get(ctx, other, signedIn.load)
	if visitor.calls.Load() != 2 || signedIn.calls.Load() != 1 {
		t.Fatalf("loads visitor=%d signed_in=%d, want 2 and 1: expiry is per view", visitor.calls.Load(), signedIn.calls.Load())
	}
	if string(v2) != "visitor-copy" || string(s2) != "signed-in-copy" {
		t.Fatalf("after expiry %q and %q", v2, s2)
	}
	// another slug is another snapshot
	if _, _ = c.get(ctx, snapshotKey{slug: "other-night", view: viewVisitor}, visitor.load); visitor.calls.Load() != 3 {
		t.Fatal("a different slug must load its own snapshot")
	}
	if c.len() != 3 {
		t.Fatalf("%d snapshots held, want 3 (two slugs, two views)", c.len())
	}
}

func TestConcurrentRequestsInOneWindowLoadOnce(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	l := &countingLoader{gate: make(chan struct{})}
	const n = 200
	var started, done sync.WaitGroup
	started.Add(n)
	done.Add(n)
	bodies := make([]string, n)
	for i := range n {
		go func() {
			defer done.Done()
			started.Done()
			b, err := c.get(context.Background(), visitorKey, l.load)
			if err != nil {
				bodies[i] = "error: " + err.Error()
				return
			}
			bodies[i] = string(b)
		}()
	}
	started.Wait()
	time.Sleep(20 * time.Millisecond) // let most of them park on the one load
	close(l.gate)
	done.Wait()
	if got := l.calls.Load(); got != 1 {
		t.Fatalf("%d loads for %d concurrent requests, want exactly 1", got, n)
	}
	for i, b := range bodies {
		if b != "body-1" {
			t.Fatalf("request %d got %q", i, b)
		}
	}
}

func TestConcurrentRefreshAfterExpiryLoadsOnce(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	l := &countingLoader{}
	if _, err := c.get(context.Background(), visitorKey, l.load); err != nil {
		t.Fatal(err)
	}
	clk.Advance(11 * time.Second)
	l.gate = make(chan struct{})
	const n = 100
	var wg sync.WaitGroup
	for range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := c.get(context.Background(), visitorKey, l.load); err != nil {
				t.Error(err)
			}
		}()
	}
	time.Sleep(20 * time.Millisecond)
	close(l.gate)
	wg.Wait()
	if got := l.calls.Load(); got != 2 {
		t.Fatalf("%d loads in all, want 1 first + exactly 1 refresh", got)
	}
}

func TestAnErrorIsSharedByTheBurstButNeverStored(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	boom := errors.New("database down")
	l := &countingLoader{err: boom, gate: make(chan struct{})}
	const n = 50
	var wg sync.WaitGroup
	for range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := c.get(context.Background(), visitorKey, l.load); !errors.Is(err, boom) {
				t.Errorf("err = %v, want the load error", err)
			}
		}()
	}
	time.Sleep(20 * time.Millisecond)
	close(l.gate)
	wg.Wait()
	if l.calls.Load() != 1 {
		t.Fatalf("%d loads for one failing burst, want 1", l.calls.Load())
	}
	if c.len() != 0 {
		t.Fatalf("%d snapshots held after an error, want none", c.len())
	}
	// the next request retries at once: an outage is never extended by the cache
	l.err, l.gate = nil, nil
	if b, err := c.get(context.Background(), visitorKey, l.load); err != nil || string(b) == "" {
		t.Fatalf("retry = %q, %v", b, err)
	}
	if l.calls.Load() != 2 {
		t.Fatalf("%d loads, want the retry to load again", l.calls.Load())
	}
}

func TestNotFoundIsNeverStoredAndUnknownKeysDoNotGrowTheCache(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	l := &countingLoader{err: errPageNotFound}
	for i := range 1000 {
		key := snapshotKey{slug: "unknown-" + strconv.Itoa(i), view: viewVisitor}
		if _, err := c.get(context.Background(), key, l.load); !errors.Is(err, errPageNotFound) {
			t.Fatalf("err = %v", err)
		}
	}
	if c.len() != 0 || c.bytes() != 0 {
		t.Fatalf("%d snapshots (%d bytes) after 1000 unknown slugs, want none", c.len(), c.bytes())
	}
	// a session created a moment later is visible at once: no negative entry hides it
	l.err = nil
	key := snapshotKey{slug: "unknown-5", view: viewVisitor}
	if b, err := c.get(context.Background(), key, l.load); err != nil || len(b) == 0 {
		t.Fatalf("got %q, %v", b, err)
	}
}

func TestTheFirstRequesterLeavingDoesNotFailTheOthers(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	l := &countingLoader{gate: make(chan struct{})}
	first, cancelFirst := context.WithCancel(context.Background())
	firstDone := make(chan error, 1)
	go func() {
		_, err := c.get(first, visitorKey, l.load)
		firstDone <- err
	}()
	for l.calls.Load() == 0 { // the first requester started the load
		time.Sleep(time.Millisecond)
	}
	second := make(chan string, 1)
	go func() {
		b, err := c.get(context.Background(), visitorKey, l.load)
		if err != nil {
			second <- "error: " + err.Error()
			return
		}
		second <- string(b)
	}()
	time.Sleep(20 * time.Millisecond)
	cancelFirst() // the first client disconnects while the shared load runs
	if err := <-firstDone; !errors.Is(err, context.Canceled) {
		t.Fatalf("first err = %v, want its own cancellation", err)
	}
	close(l.gate)
	if got := <-second; got != "body-1" {
		t.Fatalf("second got %q, want the shared body: one client leaving must not fail the others", got)
	}
	if l.calls.Load() != 1 {
		t.Fatalf("%d loads, want 1", l.calls.Load())
	}
}

func TestAPanickingLoadFreesTheKeyAndTheWaiters(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	boom := func(context.Context) ([]byte, error) { panic("loader bug") }
	if _, err := c.get(context.Background(), visitorKey, boom); err == nil {
		t.Fatal("a panicking load must come back as an error")
	}
	l := &countingLoader{}
	if b, err := c.get(context.Background(), visitorKey, l.load); err != nil || string(b) != "body-1" {
		t.Fatalf("after the panic: %q, %v (the key must be free to load again)", b, err)
	}
}

func TestALoadThatNeverEndsTimesOutAndIsNotStored(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: 10 * time.Second, MaxEntries: 10, MaxBytes: 1 << 20, LoadTimeout: 30 * time.Millisecond, Now: clk.Now})
	l := &countingLoader{gate: make(chan struct{})} // never closed
	_, err := c.get(context.Background(), visitorKey, l.load)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("err = %v, want the load timeout", err)
	}
	if c.len() != 0 {
		t.Fatal("a timed out load must not be stored")
	}
}

func TestTheCacheNeverHoldsMoreThanItsEntryCapAndEvictsTheLeastRecentlyRead(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: 10 * time.Second, MaxEntries: 3, MaxBytes: 1 << 20, LoadTimeout: time.Second, Now: clk.Now})
	l := &countingLoader{}
	ctx := context.Background()
	key := func(s string) snapshotKey { return snapshotKey{slug: s, view: viewVisitor} }
	for _, s := range []string{"aaaa", "bbbb", "cccc"} {
		clk.Advance(time.Second)
		if _, err := c.get(ctx, key(s), l.load); err != nil {
			t.Fatal(err)
		}
	}
	clk.Advance(time.Second)
	if _, err := c.get(ctx, key("aaaa"), l.load); err != nil { // aaaa is read again: bbbb is now the least recently read
		t.Fatal(err)
	}
	if l.calls.Load() != 3 {
		t.Fatal("aaaa must still be cached")
	}
	clk.Advance(time.Second)
	if _, err := c.get(ctx, key("dddd"), l.load); err != nil {
		t.Fatal(err)
	}
	if c.len() != 3 {
		t.Fatalf("%d snapshots held, want the cap of 3", c.len())
	}
	before := l.calls.Load()
	for _, s := range []string{"aaaa", "cccc", "dddd"} {
		if _, err := c.get(ctx, key(s), l.load); err != nil {
			t.Fatal(err)
		}
	}
	if l.calls.Load() != before {
		t.Fatal("aaaa, cccc and dddd should all still be cached")
	}
	if _, err := c.get(ctx, key("bbbb"), l.load); err != nil || l.calls.Load() != before+1 {
		t.Fatalf("bbbb (the least recently read) should have been evicted and reloaded: loads %d -> %d", before, l.calls.Load())
	}
	// a flood of distinct slugs stays inside the cap
	for i := range 500 {
		if _, err := c.get(ctx, key(fmt.Sprintf("flood-%d", i)), l.load); err != nil {
			t.Fatal(err)
		}
		if c.len() > 3 {
			t.Fatalf("%d snapshots held after %d distinct slugs, cap is 3", c.len(), i+1)
		}
	}
}

func TestExpiredSnapshotsAreDroppedBeforeALiveOneIsEvicted(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: 10 * time.Second, MaxEntries: 2, MaxBytes: 1 << 20, LoadTimeout: time.Second, Now: clk.Now})
	l := &countingLoader{}
	ctx := context.Background()
	key := func(s string) snapshotKey { return snapshotKey{slug: s, view: viewVisitor} }
	_, _ = c.get(ctx, key("old1"), l.load) // loaded at 0 s
	clk.Advance(5 * time.Second)
	_, _ = c.get(ctx, key("live"), l.load) // loaded at 5 s
	clk.Advance(4 * time.Second)
	_, _ = c.get(ctx, key("old1"), l.load) // read at 9 s: "live" is now the least recently read
	clk.Advance(2 * time.Second)           // 11 s: old1 has expired (age 11 s), live has not (age 6 s)
	n := l.calls.Load()
	_, _ = c.get(ctx, key("new1"), l.load) // a third key: the expired old1 goes, not the live one
	if _, err := c.get(ctx, key("live"), l.load); err != nil || l.calls.Load() != n+1 {
		t.Fatalf("the live snapshot must survive the eviction: loads %d -> %d", n, l.calls.Load())
	}
}

func TestTheCacheNeverHoldsMoreThanItsByteCapAndSkipsAnOversizeBody(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: 10 * time.Second, MaxEntries: 100, MaxBytes: 100, LoadTimeout: time.Second, Now: clk.Now})
	ctx := context.Background()
	body := func(n int) func(int64) []byte { return func(int64) []byte { return make([]byte, n) } }
	for i := range 10 {
		l := &countingLoader{body: body(40)}
		if _, err := c.get(ctx, snapshotKey{slug: fmt.Sprintf("slug-%d", i), view: viewVisitor}, l.load); err != nil {
			t.Fatal(err)
		}
		if c.bytes() > 100 {
			t.Fatalf("%d bytes held, cap is 100", c.bytes())
		}
	}
	big := &countingLoader{body: body(101)}
	if b, err := c.get(ctx, snapshotKey{slug: "huge", view: viewVisitor}, big.load); err != nil || len(b) != 101 {
		t.Fatalf("an oversize body must still be served: %d bytes, %v", len(b), err)
	}
	if _, err := c.get(ctx, snapshotKey{slug: "huge", view: viewVisitor}, big.load); err != nil || big.calls.Load() != 2 {
		t.Fatalf("an oversize body is not stored, so it loads each time: loads %d", big.calls.Load())
	}
	if c.bytes() > 100 {
		t.Fatalf("%d bytes held, cap is 100", c.bytes())
	}
}

func TestDefaultsAreTenSecondsAndABoundedCache(t *testing.T) {
	c := newSnapshotCache(snapshotConfig{})
	if c.ttl != 10*time.Second || c.maxEntries <= 0 || c.maxBytes <= 0 || c.loadTimeout <= 0 || c.now == nil {
		t.Fatalf("defaults ttl=%v entries=%d bytes=%d timeout=%v now set=%v", c.ttl, c.maxEntries, c.maxBytes, c.loadTimeout, c.now != nil)
	}
}
