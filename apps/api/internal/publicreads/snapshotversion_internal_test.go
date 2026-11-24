package publicreads

import (
	"context"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
)

// versioned is a loader that builds the session's current version, counting builds.
type versioned struct {
	session uuid.UUID
	current atomic.Int64 // what the "database" holds
	calls   atomic.Int64
	gate    chan struct{}
	started chan struct{}
	body    func(version int64) []byte
}

func (v *versioned) load(ctx context.Context) (snapshot, error) {
	v.calls.Add(1)
	if v.started != nil {
		select {
		case v.started <- struct{}{}:
		default:
		}
	}
	version := v.current.Load() // the read's snapshot is taken when the build starts
	if v.gate != nil {
		select {
		case <-v.gate:
		case <-ctx.Done():
			return snapshot{}, ctx.Err()
		}
	}
	body := []byte("v" + strconv.FormatInt(version, 10))
	if v.body != nil {
		body = v.body(version)
	}
	return snapshot{body: body, version: version, session: v.session}, nil
}

func newVersioned() *versioned { return &versioned{session: uuid.New()} }

func TestAReadAskingForAVersionNeverGetsAnOlderCopyAndAnEqualOrNewerOneIsShared(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	v := newVersioned()
	ctx := context.Background()
	v.current.Store(3)
	s, _ := c.getAt(ctx, visitorKey, 0, v.load)
	if s.version != 3 || v.calls.Load() != 1 {
		t.Fatalf("first: %+v after %d builds", s, v.calls.Load())
	}
	for _, min := range []int64{0, 1, 3} { // at least this: the copy at 3 does
		if s, _ := c.getAt(ctx, visitorKey, min, v.load); s.version != 3 || v.calls.Load() != 1 {
			t.Fatalf("min %d: version %d after %d builds", min, s.version, v.calls.Load())
		}
	}
	v.current.Store(5)
	s, _ = c.getAt(ctx, visitorKey, 5, v.load)
	if s.version != 5 || string(s.body) != "v5" || v.calls.Load() != 2 {
		t.Fatalf("min 5: %+v after %d builds", s, v.calls.Load())
	}
	if c.len() != 1 || c.bytes() != len("v5") {
		t.Fatalf("the cache holds %d copies of %d bytes: a newer version replaces the older one", c.len(), c.bytes())
	}
}

func TestManyReadersOfOneNewVersionShareOneBuild(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	v := newVersioned()
	v.current.Store(1)
	ctx := context.Background()
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	v.current.Store(2)
	v.gate = make(chan struct{})
	v.started = make(chan struct{}, 1)

	var wg sync.WaitGroup
	got := make([]int64, 50)
	for i := range got {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s, _ := c.getAt(ctx, visitorKey, 2, v.load)
			got[i] = s.version
		}()
	}
	<-v.started
	time.Sleep(50 * time.Millisecond) // the other readers have queued behind the build
	close(v.gate)
	wg.Wait()
	for i, g := range got {
		if g != 2 {
			t.Fatalf("reader %d got version %d", i, g)
		}
	}
	if v.calls.Load() != 2 {
		t.Fatalf("%d builds for 50 readers of version 2, want 1 (2 in all)", v.calls.Load())
	}
}

// A build that started before the write committed may read the older state: a reader that was told about the newer version must not
// be answered by it.
func TestAReaderWhoKnowsANewerVersionDoesNotJoinABuildThatMayPredateIt(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	v := newVersioned()
	v.current.Store(1)
	v.gate = make(chan struct{})
	v.started = make(chan struct{}, 4)
	ctx := context.Background()

	first := make(chan snapshot, 1)
	go func() { s, _ := c.getAt(ctx, visitorKey, 0, v.load); first <- s }() // started knowing nothing: reads version 1
	<-v.started
	v.current.Store(2) // the write commits while that build is still running
	second := make(chan snapshot, 1)
	go func() { s, _ := c.getAt(ctx, visitorKey, 2, v.load); second <- s }() // told about 2
	time.Sleep(50 * time.Millisecond)
	if v.calls.Load() != 1 {
		t.Fatal("the reader joined the running build")
	}
	v.gate <- struct{}{} // the first build ends with version 1
	if s := <-first; s.version != 1 {
		t.Fatalf("first reader got %d", s.version)
	}
	<-v.started // the second reader builds for itself
	v.gate <- struct{}{}
	if s := <-second; s.version != 2 {
		t.Fatalf("the reader told about version 2 got %d", s.version)
	}
}

func TestAnObservedVersionMakesAnOlderCopyStaleForAPlainRead(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	v := newVersioned()
	v.current.Store(4)
	ctx := context.Background()
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	c.Observe(v.session, 4) // nothing newer
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	if v.calls.Load() != 1 {
		t.Fatal("an observed version equal to the copy's rebuilt it")
	}
	c.Observe(v.session, 6)
	c.Observe(v.session, 5) // an older one never lowers it
	v.current.Store(6)
	if s, _ := c.getAt(ctx, visitorKey, 0, v.load); s.version != 6 || v.calls.Load() != 2 {
		t.Fatalf("%+v after %d builds", s, v.calls.Load())
	}
	// Another session's version leaves it alone.
	c.Observe(uuid.New(), 100)
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	if v.calls.Load() != 2 {
		t.Fatal("another session's version rebuilt this copy")
	}
}

func TestAnOlderBuildNeverReplacesANewerCopy(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	c.mu.Lock()
	c.storeLocked(visitorKey, snapshot{body: []byte("new"), version: 8}, clk.Now())
	c.storeLocked(visitorKey, snapshot{body: []byte("old"), version: 7}, clk.Now()) // a slower build that read before the write
	c.mu.Unlock()
	if s, _ := c.getAt(context.Background(), visitorKey, 0, func(context.Context) (snapshot, error) { return snapshot{}, context.Canceled }); string(s.body) != "new" {
		t.Fatalf("got %q", s.body)
	}
}

func TestAVersionNoBuildCanReachIsBuiltOnceAndAnswered(t *testing.T) {
	clk := newFakeClock()
	c := newTestCache(clk)
	v := newVersioned()
	v.current.Store(2)
	s, err := c.getAt(context.Background(), visitorKey, 1_000_000, v.load)
	if err != nil || s.version != 2 || v.calls.Load() != 1 {
		t.Fatalf("%+v %v after %d builds: a version past the database's is answered with what it has", s, err, v.calls.Load())
	}
	// It does not stay cached as if it satisfied that version: the next such ask rebuilds (one build per ask, never a loop).
	_, _ = c.getAt(context.Background(), visitorKey, 1_000_000, v.load)
	if v.calls.Load() != 2 {
		t.Fatalf("%d builds", v.calls.Load())
	}
}

func TestACopyNobodyReadForTheIdleTimeIsDropped(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: time.Hour, Idle: 10 * time.Minute, MaxEntries: 10, MaxBytes: 1 << 20, Now: clk.Now})
	ctx := context.Background()
	v := newVersioned()
	v.current.Store(1)
	other := snapshotKey{slug: "other", view: viewVisitor}
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	_, _ = c.getAt(ctx, other, 0, v.load)
	clk.Advance(6 * time.Minute)
	_, _ = c.getAt(ctx, visitorKey, 0, v.load) // read again: stays
	c.Observe(v.session, 1)
	clk.Advance(5 * time.Minute) // "other" has now sat unread for 11 minutes
	_, _ = c.getAt(ctx, visitorKey, 0, v.load)
	if c.len() != 1 {
		t.Fatalf("%d copies: the one unread for 11 minutes must be gone", c.len())
	}
	clk.Advance(20 * time.Minute)
	_, _ = c.getAt(ctx, other, 0, v.load) // a read sweeps what is idle, and the observed versions with it
	c.mu.Lock()
	seen := len(c.latest)
	c.mu.Unlock()
	if seen != 0 {
		t.Fatalf("%d observed versions linger", seen)
	}
}

func TestOneCopyPerSessionAndViewUnderTheByteCap(t *testing.T) {
	clk := newFakeClock()
	c := newSnapshotCache(snapshotConfig{TTL: time.Hour, MaxEntries: 100, MaxBytes: 100, Now: clk.Now})
	ctx := context.Background()
	v := newVersioned()
	v.body = func(int64) []byte { return make([]byte, 40) }
	for i := 0; i < 10; i++ {
		v.current.Store(int64(i + 1))
		_, _ = c.getAt(ctx, visitorKey, int64(i+1), v.load) // ten versions of one page: one copy
	}
	if c.len() != 1 || c.bytes() != 40 {
		t.Fatalf("%d copies, %d bytes after ten versions of one page", c.len(), c.bytes())
	}
	for i := 0; i < 20; i++ {
		_, _ = c.getAt(ctx, snapshotKey{slug: "s" + strconv.Itoa(i), view: viewVisitor}, 0, v.load)
		if c.bytes() > 100 {
			t.Fatalf("%d bytes held, the cap is 100", c.bytes())
		}
	}
	if c.len() != 2 {
		t.Fatalf("%d copies of 40 bytes under a 100 byte cap, want 2", c.len())
	}
}
