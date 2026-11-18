package password

import (
	"context"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func newTestHasher(t *testing.T, max int) *Hasher {
	t.Helper()
	h, err := NewHasher(fast, max)
	if err != nil {
		t.Fatal(err)
	}
	return h
}

func TestNewHasherValidates(t *testing.T) {
	for _, n := range []int{0, -1} {
		if _, err := NewHasher(fast, n); err == nil {
			t.Errorf("maxConcurrent %d: want error", n)
		}
	}
	if _, err := NewHasher(Params{}, 2); err == nil {
		t.Error("bad params: want error")
	}
}

func TestHasherHashAndVerify(t *testing.T) {
	h := newTestHasher(t, 2)
	ctx := context.Background()
	stored, err := h.Hash(ctx, "pw")
	if err != nil {
		t.Fatal(err)
	}
	ok, rehash, err := h.Verify(ctx, "pw", stored)
	if err != nil || !ok || rehash {
		t.Fatalf("Verify = %v %v %v", ok, rehash, err)
	}
	ok, _, err = h.Verify(ctx, "nope", stored)
	if err != nil || ok {
		t.Fatalf("wrong password: %v %v", ok, err)
	}
	// The Hasher's params are the "current" ones for the rehash flag.
	ok, rehash, err = h.Verify(ctx, vecArgonDefaultPw, vecArgonDefault)
	if err != nil || !ok || !rehash {
		t.Fatalf("default-params hash under fast params: %v %v %v", ok, rehash, err)
	}
	if _, _, err := h.Verify(ctx, "pw", "garbage"); !errors.Is(err, ErrMalformedHash) {
		t.Fatalf("err = %v", err)
	}
}

// The cap is observed from inside the slot: the number of callers in flight never exceeds the
// limit, and does reach it when there are enough callers.
func TestHasherCapsConcurrency(t *testing.T) {
	const limit, callers = 3, 16
	h := newTestHasher(t, limit)
	var mu sync.Mutex
	cur, peak := 0, 0
	h.onSlot = func() {
		mu.Lock()
		cur++
		if cur > peak {
			peak = cur
		}
		mu.Unlock()
		time.Sleep(15 * time.Millisecond)
		mu.Lock()
		cur--
		mu.Unlock()
	}
	var wg sync.WaitGroup
	for i := 0; i < callers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			var err error
			switch i % 3 {
			case 0:
				_, err = h.Hash(context.Background(), "pw")
			case 1:
				_, _, err = h.Verify(context.Background(), "pw", vecBcrypt2y)
			default:
				_, err = h.VerifyUnknown(context.Background(), "pw")
			}
			if err != nil {
				t.Errorf("caller %d: %v", i, err)
			}
		}(i)
	}
	wg.Wait()
	if peak != limit {
		t.Fatalf("peak in flight = %d, want exactly %d", peak, limit)
	}
}

func TestHasherWaitingRespectsContext(t *testing.T) {
	h := newTestHasher(t, 1)
	var entered atomic.Int32
	hold, release := make(chan struct{}), make(chan struct{})
	h.onSlot = func() {
		if entered.Add(1) == 1 {
			close(hold)
			<-release
		}
	}
	done := make(chan error, 1)
	go func() { _, err := h.Hash(context.Background(), "pw"); done <- err }()
	<-hold // the only slot is taken

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	for name, call := range map[string]func() error{
		"Hash":          func() error { _, err := h.Hash(ctx, "pw"); return err },
		"Verify":        func() error { _, _, err := h.Verify(ctx, "pw", vecBcrypt2y); return err },
		"VerifyUnknown": func() error { _, err := h.VerifyUnknown(ctx, "pw"); return err },
	} {
		if err := call(); !errors.Is(err, context.DeadlineExceeded) {
			t.Errorf("%s: err = %v, want deadline exceeded", name, err)
		}
	}
	if n := entered.Load(); n != 1 {
		t.Fatalf("%d callers hashed, want only the slot holder", n)
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	// The slot is free again after the holder finishes.
	if _, err := h.Hash(context.Background(), "pw"); err != nil {
		t.Fatal(err)
	}
}

func TestHasherCancelledContextDoesNotHashEvenWithFreeSlot(t *testing.T) {
	h := newTestHasher(t, 2)
	var entered atomic.Int32
	h.onSlot = func() { entered.Add(1) }
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := h.Hash(ctx, "pw"); !errors.Is(err, context.Canceled) {
		t.Fatalf("Hash err = %v", err)
	}
	if _, _, err := h.Verify(ctx, "pw", vecBcrypt2y); !errors.Is(err, context.Canceled) {
		t.Fatalf("Verify err = %v", err)
	}
	if ok, err := h.VerifyUnknown(ctx, "pw"); ok || !errors.Is(err, context.Canceled) {
		t.Fatalf("VerifyUnknown = %v %v", ok, err)
	}
	if entered.Load() != 0 {
		t.Fatal("nothing may be hashed for a cancelled context")
	}
}

func TestHasherVerifyUnknownSpendsASlotAndReturnsFalse(t *testing.T) {
	h := newTestHasher(t, 1)
	var entered atomic.Int32
	h.onSlot = func() { entered.Add(1) }
	for _, pw := range []string{"pw", "", strings.Repeat("x", 200)} {
		ok, err := h.VerifyUnknown(context.Background(), pw)
		if ok || err != nil {
			t.Fatalf("VerifyUnknown(%q) = %v %v", pw, ok, err)
		}
	}
	if entered.Load() != 3 {
		t.Fatalf("slot used %d times, want 3", entered.Load())
	}
	// The dummy must never match anything we can guess, including the empty password.
	if ok, _, _ := fast.Verify("", h.dummy); ok {
		t.Fatal("dummy hash must not verify the empty password")
	}
}

func TestHasherDummyHashUsesCurrentParams(t *testing.T) {
	a := Params{MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}
	b := Params{MemoryKiB: 128, Iterations: 2, Parallelism: 2, SaltLen: 16, KeyLen: 32}
	for _, p := range []Params{a, b} {
		h, err := NewHasher(p, 1)
		if err != nil {
			t.Fatal(err)
		}
		// Verified against the Hasher's own params, a dummy built with them asks for no rehash;
		// under any other params it would. Verify-with-wrong-password returns no rehash flag, so
		// read the parsed parameters directly.
		got, err := parseArgon2id(h.dummy)
		if err != nil {
			t.Fatal(err)
		}
		if got.params != p {
			t.Fatalf("dummy params = %+v, want %+v", got.params, p)
		}
	}
	h1, _ := NewHasher(a, 1)
	h2, _ := NewHasher(a, 1)
	if h1.dummy == h2.dummy {
		t.Fatal("dummy hash must be generated at construction, not constant")
	}
}
