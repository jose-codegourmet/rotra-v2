package store_test

import (
	"errors"
	"net/netip"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestInsertEvent(t *testing.T) {
	e := newEnv(t)
	ident, clubID, s := e.clubSession(t, "ev-club", 80)
	_ = clubID
	ip := netip.MustParseAddr("192.0.2.77")
	dev := uuid.New()
	at := base.Add(time.Hour)
	if err := e.s.InsertEvent(e.ctx, store.NewEvent{IdentityID: &ident.ID, SessionID: &s.ID, Audience: store.AudienceClub,
		Event: store.EventSignIn, IP: &ip, DeviceID: &dev, At: at}); err != nil {
		t.Fatal(err)
	}
	// A failed attempt with an unknown login records no identity and no session.
	if err := e.s.InsertEvent(e.ctx, store.NewEvent{Audience: store.AudiencePlayer, Event: store.EventSignInFailed, At: at}); err != nil {
		t.Fatal(err)
	}
	var n int
	var gotIP netip.Addr
	var gotAt time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT count(*), max(ip), max(occurred_at) FROM auth_events`).Scan(&n, &gotIP, &gotAt); err != nil {
		t.Fatal(err)
	}
	if n != 2 || gotIP != ip || !sameTime(gotAt, at) {
		t.Fatalf("events: n=%d ip=%v at=%v", n, gotIP, gotAt)
	}
	if err := e.s.InsertEvent(e.ctx, store.NewEvent{Audience: store.AudienceClub, Event: "login_ok", At: at}); err == nil {
		t.Fatal("an event outside the CHECK must fail")
	}
	if err := e.s.InsertEvent(e.ctx, store.NewEvent{IdentityID: ptr(uuid.New()), Audience: store.AudienceClub, Event: store.EventSignIn, At: at}); err == nil {
		t.Fatal("an unknown identity must fail the foreign key")
	}
}

func TestAuthEventsHaveNoPersonalColumns(t *testing.T) {
	e := newEnv(t)
	rows, err := e.pool.Query(e.ctx, `SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_events'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	want := map[string]bool{"id": true, "identity_id": true, "session_id": true, "audience": true, "event": true, "ip": true, "device_id": true, "occurred_at": true}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			t.Fatal(err)
		}
		if !want[c] {
			t.Fatalf("auth_events has an unexpected column %q: events must not store emails, usernames or passwords", c)
		}
		delete(want, c)
	}
	if len(want) != 0 {
		t.Fatalf("missing columns %v", want)
	}
}

func TestUpsertAttemptCounts(t *testing.T) {
	e := newEnv(t)
	w1, w2 := base, base.Add(15*time.Minute)
	for want := 1; want <= 3; want++ {
		got, err := e.s.UpsertAttempt(e.ctx, store.ScopeIP, "203.0.113.5", store.ActionSignIn, w1)
		if err != nil || got != want {
			t.Fatalf("attempt %d: got %d err %v", want, got, err)
		}
	}
	for name, c := range map[string]struct {
		scope   store.RateScope
		subject string
		action  store.RateAction
		window  time.Time
	}{
		"next window":     {store.ScopeIP, "203.0.113.5", store.ActionSignIn, w2},
		"other subject":   {store.ScopeIP, "203.0.113.6", store.ActionSignIn, w1},
		"other scope":     {store.ScopeDevice, "203.0.113.5", store.ActionSignIn, w1},
		"other action":    {store.ScopeIP, "203.0.113.5", store.ActionClaim, w1},
		"login scope too": {store.ScopeLogin, "club:abc", store.ActionResetRequest, w1},
	} {
		if got, err := e.s.UpsertAttempt(e.ctx, c.scope, c.subject, c.action, c.window); err != nil || got != 1 {
			t.Fatalf("%s starts at 1: got %d err %v", name, got, err)
		}
	}
	if _, err := e.s.UpsertAttempt(e.ctx, "country", "x", store.ActionSignIn, w1); err == nil {
		t.Fatal("a scope outside the CHECK must fail")
	}
	if _, err := e.s.UpsertAttempt(e.ctx, store.ScopeIP, "x", "login", w1); err == nil {
		t.Fatal("an action outside the CHECK must fail")
	}
}

func TestUpsertAttemptConcurrentCountsAreExact(t *testing.T) {
	e := newEnv(t)
	const n = 20
	seen := make(chan int, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			got, err := e.s.UpsertAttempt(e.ctx, store.ScopeLogin, "club:burst", store.ActionSignIn, base)
			if err != nil {
				t.Error(err)
				return
			}
			seen <- got
		}()
	}
	wg.Wait()
	close(seen)
	counts := map[int]bool{}
	for c := range seen {
		counts[c] = true
	}
	for i := 1; i <= n; i++ {
		if !counts[i] {
			t.Fatalf("every attempt must see its own count 1..%d, missing %d (saw %v)", n, i, counts)
		}
	}
}

func TestDeleteExpiredWindows(t *testing.T) {
	e := newEnv(t)
	old, mid, fresh := base, base.Add(15*time.Minute), base.Add(30*time.Minute)
	for _, w := range []time.Time{old, mid, fresh} {
		if _, err := e.s.UpsertAttempt(e.ctx, store.ScopeIP, "198.51.100.1", store.ActionSignIn, w); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := e.s.UpsertAttempt(e.ctx, store.ScopeIP, "198.51.100.2", store.ActionSignIn, old); err != nil {
		t.Fatal(err)
	}
	// Pruning one subject leaves another subject's old window alone.
	n, err := e.s.DeleteExpiredWindowsFor(e.ctx, store.ScopeIP, "198.51.100.1", mid)
	if err != nil || n != 1 {
		t.Fatalf("for subject: n=%d err=%v, want only the %v window", n, err, old)
	}
	if n, err = e.s.DeleteExpiredWindows(e.ctx, mid); err != nil || n != 1 {
		t.Fatalf("global: n=%d err=%v, want the other subject's old window", n, err)
	}
	var left int
	if err := e.pool.QueryRow(e.ctx, `SELECT count(*) FROM auth_rate_limits`).Scan(&left); err != nil || left != 2 {
		t.Fatalf("left %d err %v, want 2 (mid and fresh)", left, err)
	}
	if n, _ = e.s.DeleteExpiredWindows(e.ctx, base.Add(24*time.Hour)); n != 2 {
		t.Fatalf("a later cutoff removes the rest, got %d", n)
	}
}

func TestEnrollDevice(t *testing.T) {
	e := newEnv(t)
	clubID := e.club(t, nil, false, nil)
	otherClub := e.club(t, nil, false, nil)
	id := uuid.New()

	d, created, err := e.s.EnrollDevice(e.ctx, clubID, id, "  Front desk  ", base)
	if err != nil || !created || d.ID != id || d.ClubID != clubID || d.Label != "Front desk" ||
		!sameTime(d.RegisteredAt, base) || d.RevokedAt != nil || d.Revision != 1 {
		t.Fatalf("new device: %+v created=%v err=%v", d, created, err)
	}
	// Same club again: the stored row, label untouched, nothing created (registerDevice).
	again, created, err := e.s.EnrollDevice(e.ctx, clubID, id, "A different label", base.Add(time.Hour))
	if err != nil || created || again.Label != "Front desk" || !sameTime(again.RegisteredAt, base) {
		t.Fatalf("repeat: %+v created=%v err=%v", again, created, err)
	}
	// Another club may not take the id.
	if _, _, err := e.s.EnrollDevice(e.ctx, otherClub, id, "x", base); !errors.Is(err, store.ErrDeviceOtherClub) {
		t.Fatalf("other club: %v", err)
	}
	// An empty label gets the default.
	blank, _, err := e.s.EnrollDevice(e.ctx, clubID, uuid.New(), "   ", base)
	if err != nil || blank.Label != "This device" {
		t.Fatalf("blank label: %+v %v", blank, err)
	}
	// Revoked devices are refused, whichever club asks that is the owner.
	if ok, err := e.s.RevokeDevice(e.ctx, clubID, id, base.Add(time.Hour)); err != nil || !ok {
		t.Fatalf("revoke: %v %v", ok, err)
	}
	if _, _, err := e.s.EnrollDevice(e.ctx, clubID, id, "x", base); !errors.Is(err, store.ErrDeviceRevoked) {
		t.Fatalf("revoked: %v", err)
	}
	if _, _, err := e.s.EnrollDevice(e.ctx, otherClub, id, "x", base); !errors.Is(err, store.ErrDeviceOtherClub) {
		t.Fatalf("revoked device of another club is still not_found: %v", err)
	}
	// An unknown club is a foreign key error, not a typed one.
	if _, _, err := e.s.EnrollDevice(e.ctx, uuid.New(), uuid.New(), "x", base); err == nil {
		t.Fatal("unknown club must fail")
	}
}

func TestEnrollDeviceConcurrentIsSafe(t *testing.T) {
	e := newEnv(t)
	clubID := e.club(t, nil, false, nil)
	id := uuid.New()
	var wg sync.WaitGroup
	var mu sync.Mutex
	created := 0
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, c, err := e.s.EnrollDevice(e.ctx, clubID, id, "Tablet", base)
			if err != nil {
				t.Error(err)
				return
			}
			if c {
				mu.Lock()
				created++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if created != 1 {
		t.Fatalf("exactly one caller creates the device, got %d", created)
	}
}

func TestRevokeDevice(t *testing.T) {
	e := newEnv(t)
	clubID := e.club(t, nil, false, nil)
	id := uuid.New()
	if _, _, err := e.s.EnrollDevice(e.ctx, clubID, id, "Tablet", base); err != nil {
		t.Fatal(err)
	}
	first := base.Add(time.Hour)
	if ok, err := e.s.RevokeDevice(e.ctx, clubID, id, first); err != nil || !ok {
		t.Fatalf("first: %v %v", ok, err)
	}
	if ok, err := e.s.RevokeDevice(e.ctx, clubID, id, first.Add(time.Hour)); err != nil || ok {
		t.Fatalf("second must change nothing: %v %v", ok, err)
	}
	d, err := e.s.GetDevice(e.ctx, clubID, id)
	if err != nil || d.RevokedAt == nil || !sameTime(*d.RevokedAt, first) || d.Revision != 2 {
		t.Fatalf("device: %+v %v", d, err)
	}
	if _, err := e.s.RevokeDevice(e.ctx, clubID, uuid.New(), first); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown device: %v", err)
	}
	if _, err := e.s.RevokeDevice(e.ctx, uuid.New(), id, first); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("another club's revoke: %v", err)
	}
	if _, err := e.s.GetDevice(e.ctx, uuid.New(), id); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("get with the wrong club: %v", err)
	}
}

func TestInTxCommitsAndRollsBack(t *testing.T) {
	e := newEnv(t)
	var kept store.Identity
	err := e.s.InTx(e.ctx, func(q *store.Queries) error {
		var err error
		kept, err = q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudienceClub, LoginKey: "kept", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base})
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.s.GetIdentityByID(e.ctx, kept.ID); err != nil {
		t.Fatalf("committed row must be visible: %v", err)
	}

	boom := errors.New("boom")
	err = e.s.InTx(e.ctx, func(q *store.Queries) error {
		if _, err := q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudienceClub, LoginKey: "undone", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base}); err != nil {
			return err
		}
		return boom
	})
	if !errors.Is(err, boom) {
		t.Fatalf("InTx must return the callback's error, got %v", err)
	}
	if _, err := e.s.GetIdentityByLogin(e.ctx, store.AudienceClub, "undone"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("rolled back row must be gone: %v", err)
	}
}

func TestInTxKeepsTypedErrors(t *testing.T) {
	e := newEnv(t)
	e.identity(t, store.AudienceClub, "dup")
	err := e.s.InTx(e.ctx, func(q *store.Queries) error {
		_, err := q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudienceClub, LoginKey: "dup", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base})
		return err
	})
	if !errors.Is(err, store.ErrLoginKeyTaken) {
		t.Fatalf("inside a transaction: %v", err)
	}
}

func TestInTxRollsBackOnPanic(t *testing.T) {
	e := newEnv(t)
	func() {
		defer func() {
			if recover() == nil {
				t.Error("the panic must propagate")
			}
		}()
		_ = e.s.InTx(e.ctx, func(q *store.Queries) error {
			if _, err := q.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudienceClub, LoginKey: "panicked", PasswordHash: fakeHash, PasswordScheme: store.SchemeArgon2id, Now: base}); err != nil {
				t.Error(err)
			}
			panic("stop")
		})
	}()
	if _, err := e.s.GetIdentityByLogin(e.ctx, store.AudienceClub, "panicked"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("a panic must roll back: %v", err)
	}
}

func TestSignInTablesAreLockedAgainstTheDataAPI(t *testing.T) {
	e := newEnv(t)
	tables := []string{"auth_identities", "auth_sessions", "auth_rate_limits", "auth_events"}
	for _, role := range []string{"anon", "authenticated"} {
		for _, table := range tables {
			for _, priv := range []string{"SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"} {
				var has bool
				if err := e.pool.QueryRow(e.ctx, `SELECT has_table_privilege($1, $2, $3)`, role, table, priv).Scan(&has); err != nil {
					t.Fatal(err)
				}
				if has {
					t.Errorf("%s has %s on %s", role, priv, table)
				}
			}
		}
		var seq bool
		if err := e.pool.QueryRow(e.ctx, `SELECT has_sequence_privilege($1, 'auth_events_id_seq', 'USAGE') OR has_sequence_privilege($1, 'auth_events_id_seq', 'SELECT')`, role).Scan(&seq); err != nil {
			t.Fatal(err)
		}
		if seq {
			t.Errorf("%s can use auth_events_id_seq", role)
		}
	}
	for _, table := range tables {
		var rls bool
		if err := e.pool.QueryRow(e.ctx, `SELECT relrowsecurity FROM pg_class WHERE relname = $1 AND relkind = 'r'`, table).Scan(&rls); err != nil {
			t.Fatal(err)
		}
		if !rls {
			t.Errorf("row level security is off on %s", table)
		}
	}
}
