package recovery_test

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// submitPasswordResetRequest (password-resets.ts:37-58): the same acknowledgement for every address; an eligible
// account links its player to the request, everything else leaves player_id null.
func TestSubmitAcknowledgesEveryEmail(t *testing.T) {
	e := newEnv(t)
	good := e.player(t, acctOpts{})
	cases := []struct {
		name   string
		a      acct
		linked bool
	}{
		{"eligible", good, true},
		{"unknown address", acct{email: "nobody@example.test"}, false},
		{"account disabled", e.player(t, acctOpts{disabled: true}), false},
		{"another provider", e.player(t, acctOpts{provider: "supabase"}), false},
		{"contact sync failed", e.player(t, acctOpts{syncStatus: "failed"}), false},
		{"contact sync applying", e.player(t, acctOpts{syncStatus: "applying"}), false},
		{"identity missing", e.player(t, acctOpts{noIdentity: true}), false},
		{"identity disabled", e.player(t, acctOpts{identityOff: true}), false},
		{"player without an account", e.player(t, acctOpts{noAccount: true}), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if err := e.rec.Submit(e.ctx, c.a.email); err != nil {
				t.Fatalf("Submit: %v", err)
			}
			r := e.request(t, e.requestFor(t, c.a.email))
			if r.status != "pending" || r.reviewedBy != nil || r.reviewedAt != nil || r.digest != nil || r.subject != nil {
				t.Fatalf("a new request is plain pending: %+v", r)
			}
			if got := r.playerID != nil; got != c.linked {
				t.Fatalf("linked to a player: %v, want %v", got, c.linked)
			}
			if c.linked && *r.playerID != c.a.player {
				t.Fatalf("linked to %s, want %s", *r.playerID, c.a.player)
			}
		})
	}
}

func TestSubmitNormalizesTheAddress(t *testing.T) {
	e := newEnv(t)
	a := e.player(t, acctOpts{email: "ana.reyes@example.test"})
	// JS trim() strips the no-break space too; toLowerCase() folds the case.
	if err := e.rec.Submit(e.ctx, "  Ana.Reyes@EXAMPLE.test \n"); err != nil {
		t.Fatal(err)
	}
	r := e.request(t, e.requestFor(t, a.email))
	if r.email != a.email || r.playerID == nil || *r.playerID != a.player {
		t.Fatalf("request %+v", r)
	}
	if !r.reviewedAtIsNil() {
		t.Fatal("not reviewed")
	}
	var at, created, updated time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT requested_at, created_at, updated_at FROM player_password_reset_requests WHERE id = $1`, r.id).Scan(&at, &created, &updated); err != nil {
		t.Fatal(err)
	}
	if !at.Equal(base) || !created.Equal(base) || !updated.Equal(base) {
		t.Fatalf("timestamps %v %v %v", at, created, updated)
	}
}

func (r request) reviewedAtIsNil() bool { return r.reviewedAt == nil }

func TestSubmitRejectsBadAddresses(t *testing.T) {
	e := newEnv(t)
	astral := func(n int) string { return strings.Repeat("\U0001F600", n) }
	bad := map[string]string{
		"empty":               "",
		"blank":               "   ",
		"no at":               "name.example.test",
		"two ats":             "a@b@example.test",
		"no dot after the at": "name@example",
		"dot first":           "name@.example",
		"dot last":            "name@example.",
		"only a dot":          "name@.",
		"no local part":       "@example.test",
		"inner space":         "na me@example.test",
		"inner no-break":      "name@exa mple.test",
		"inner ideographic":   "name@exa　mple.test",
		"inner tab":           "na\tme@example.test",
		"a NUL":               "na\x00me@example.test",
		"255 characters":      strings.Repeat("a", 255-len("@b.co")) + "@b.co",
		"255 UTF-16 units":    astral(125) + "@b.co",
	}
	for name, addr := range bad {
		t.Run(name, func(t *testing.T) {
			err := e.rec.Submit(e.ctx, addr)
			wantServiceErr(t, err, httpapi.ErrInvalid, map[string]string{"email": "Enter an email address, like name@example.com."})
		})
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests`); n != 0 {
		t.Fatalf("a refused address saved %d requests", n)
	}
	good := map[string]string{
		"254 characters":    strings.Repeat("a", 254-len("@b.co")) + "@b.co",
		"254 UTF-16 units":  astral(124) + "@b.co",
		"dot in the middle": "name@exa.mple",
		"dots around":       "name@a..b",
		"plus tag":          "name+tag@example.test",
	}
	for name, addr := range good {
		t.Run(name, func(t *testing.T) {
			if err := e.rec.Submit(e.ctx, addr); err != nil {
				t.Fatalf("Submit: %v", err)
			}
		})
	}
}

// One unresolved request per address (the partial unique index): a repeat is a quiet no-op.
func TestSubmitIsIdempotent(t *testing.T) {
	e := newEnv(t)
	a := e.player(t, acctOpts{})
	for _, addr := range []string{a.email, strings.ToUpper(a.email), " " + a.email + " "} {
		if err := e.rec.Submit(e.ctx, addr); err != nil {
			t.Fatal(err)
		}
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE email = $1`, a.email); n != 1 {
		t.Fatalf("%d requests, want 1", n)
	}
}

func TestSubmitSimultaneousRequestsMakeOne(t *testing.T) {
	e := newEnv(t)
	a := e.player(t, acctOpts{})
	var wg sync.WaitGroup
	errs := make(chan error, 12)
	for range 12 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- e.rec.Submit(e.ctx, a.email)
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE email = $1`, a.email); n != 1 {
		t.Fatalf("%d requests, want 1", n)
	}
}

// A request that was declined (or issued) is resolved: the player may ask again.
func TestSubmitAfterAResolvedRequestMakesANewOne(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	first := e.asked(t, a)
	if _, err := e.rec.Review(e.ctx, admin, first.String(), recovery.ReviewInput{Action: "decline"}); err != nil {
		t.Fatal(err)
	}
	second := e.asked(t, a)
	if second == first || e.request(t, second).status != "pending" {
		t.Fatalf("expected a new pending request, got %s", second)
	}
	if uuid.Nil == second {
		t.Fatal("nil id")
	}
}
