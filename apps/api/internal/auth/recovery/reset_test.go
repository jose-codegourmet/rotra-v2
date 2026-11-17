package recovery_test

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

var linkGone = map[string]string{"link": "This reset link has expired or was already used."}

// signIn is POST /api/auth/sign-in for a player.
func (e *env) signIn(email, pw string) *httptest.ResponseRecorder {
	return e.do(req{method: "POST", path: "/api/auth/sign-in", body: jsonBody(obj{"identifier": email, "password": pw})})
}

func (e *env) sessions(t testing.TB, identity uuid.UUID, where string) int {
	t.Helper()
	return e.count(t, `SELECT count(*) FROM auth_sessions WHERE identity_id = $1 `+where, identity)
}

// resetFor issues a link for a new player and returns everything a test needs.
func (e *env) resetFor(t testing.TB, o acctOpts) (acct, uuid.UUID, string, uuid.UUID) {
	t.Helper()
	admin := e.admin(t, "Owner")
	a := e.player(t, o)
	id, token := e.issued(t, admin, a)
	return a, id, token, admin
}

// resetPassword + consumeReviewedResetToken (account-access.ts:90-130, password-resets.ts:175-196): the link is
// single use, the password is set, every session ends, and nobody is signed in.
func TestResetSetsThePasswordAndEndsEverySession(t *testing.T) {
	e := newEnv(t)
	a, id, token, _ := e.resetFor(t, acctOpts{})
	other := e.player(t, acctOpts{})

	// Two devices signed in with the old password, and another player's session that must survive.
	var tokens []string
	for range 2 {
		w := e.signIn(a.email, goodPass)
		if w.Code != http.StatusOK {
			t.Fatalf("sign-in: %d %s", w.Code, w.Body.String())
		}
		tokens = append(tokens, cookieValue(w, "rotra-player-access"))
	}
	if w := e.signIn(other.email, goodPass); w.Code != http.StatusOK {
		t.Fatal(w.Body.String())
	}
	// Prime the authenticator's cache: the old access pass is good before the reset.
	for _, tok := range tokens {
		if _, err := e.svc.Authenticator().Authenticate(e.ctx, tok, store.AudiencePlayer, session.ModeWrite); err != nil {
			t.Fatalf("before: %v", err)
		}
	}
	before := e.identityRow(t, a.identity)
	sessionsBefore := e.count(t, `SELECT count(*) FROM auth_sessions`)
	e.clk.Advance(time.Hour)

	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatalf("Reset: %v", err)
	}

	after := e.identityRow(t, a.identity)
	if after.PasswordScheme != store.SchemeArgon2id || after.PasswordHash == before.PasswordHash || !after.PasswordChangedAt.Equal(base.Add(time.Hour)) || after.Revision != before.Revision+1 {
		t.Fatalf("identity %+v -> %+v", before, after)
	}
	if ok, _, err := e.svc.Hasher().Verify(e.ctx, newPass, after.PasswordHash); err != nil || !ok {
		t.Fatalf("the new password does not verify: %v", err)
	}
	r := e.request(t, id)
	if r.digest != nil || r.consumedAt == nil || !r.consumedAt.Equal(base.Add(time.Hour)) || r.status != "issued" {
		t.Fatalf("the link is burned: %+v", r)
	}
	if n := e.sessions(t, a.identity, `AND revoked_at IS NULL`); n != 0 {
		t.Fatalf("%d sessions still active", n)
	}
	if n := e.sessions(t, a.identity, `AND revoke_reason = 'password_changed'`); n != 2 {
		t.Fatalf("%d sessions revoked as password_changed, want 2", n)
	}
	if n := e.sessions(t, other.identity, `AND revoked_at IS NULL`); n != 1 {
		t.Fatal("another player's session was touched")
	}
	if e.count(t, `SELECT count(*) FROM auth_sessions`) != sessionsBefore {
		t.Fatal("a reset must not issue a session")
	}
	for _, ev := range []string{"password_changed", "password_reset_used"} {
		if n := e.count(t, `SELECT count(*) FROM auth_events WHERE identity_id = $1 AND event = $2 AND audience = 'player'`, a.identity, ev); n != 1 {
			t.Fatalf("%d %s events", n, ev)
		}
	}
	if n := e.count(t, `SELECT count(*) FROM auth_events WHERE identity_id = $1 AND event = 'session_revoked'`, a.identity); n != 2 {
		t.Fatalf("%d session_revoked events, want 2", n)
	}
	// The old access passes are refused on a write at once (the revocation cache was dropped after the commit).
	for _, tok := range tokens {
		if _, err := e.svc.Authenticator().Authenticate(e.ctx, tok, store.AudiencePlayer, session.ModeWrite); err == nil {
			t.Fatal("an old access pass still writes")
		}
	}
	// And through the routes: the old password is refused, the new one signs in.
	if w := e.signIn(a.email, goodPass); w.Code != http.StatusUnauthorized {
		t.Fatalf("old password: %d", w.Code)
	}
	if w := e.signIn(a.email, newPass); w.Code != http.StatusOK {
		t.Fatalf("new password: %d %s", w.Code, w.Body.String())
	}
}

func cookieValue(w *httptest.ResponseRecorder, name string) string {
	for _, c := range w.Result().Cookies() {
		if c.Name == name {
			return c.Value
		}
	}
	return ""
}

// The old refresh passes die with the sessions.
func TestResetRefusesTheOldRefreshPasses(t *testing.T) {
	e := newEnv(t)
	a, _, token, _ := e.resetFor(t, acctOpts{})
	w := e.signIn(a.email, goodPass)
	refresh := cookieValue(w, "rotra-player-refresh")
	if refresh == "" {
		t.Fatal("no refresh cookie")
	}
	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatal(err)
	}
	got := e.do(req{method: "POST", path: "/api/auth/refresh", cookies: []*http.Cookie{{Name: "rotra-player-refresh", Value: refresh}}})
	if got.Code != http.StatusUnauthorized {
		t.Fatalf("refresh after a reset: %d %s", got.Code, got.Body.String())
	}
}

func TestResetReplacesABcryptHash(t *testing.T) {
	e := newEnv(t)
	a, _, token, _ := e.resetFor(t, acctOpts{})
	e.exec(t, `UPDATE auth_identities SET password_scheme = 'bcrypt' WHERE id = $1`, a.identity)
	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatal(err)
	}
	if got := e.identityRow(t, a.identity); got.PasswordScheme != store.SchemeArgon2id || !strings.HasPrefix(got.PasswordHash, "$argon2id$") {
		t.Fatalf("%s %s", got.PasswordScheme, got.PasswordHash)
	}
}

func TestResetIsSingleUse(t *testing.T) {
	e := newEnv(t)
	_, _, token, _ := e.resetFor(t, acctOpts{})
	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatal(err)
	}
	wantServiceErr(t, e.rec.Reset(e.ctx, token, "another new password", nil), httpapi.ErrForbidden, linkGone)
}

// Parallel consumes of one token: exactly one wins, and the password is the winner's.
func TestResetParallelConsumesOfOneTokenHaveOneWinner(t *testing.T) {
	e := newEnv(t)
	a, _, token, _ := e.resetFor(t, acctOpts{})
	const n = 8
	results := make([]error, n)
	var wg sync.WaitGroup
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results[i] = e.rec.Reset(e.ctx, token, "password number "+string(rune('a'+i)), nil)
		}()
	}
	wg.Wait()
	winner := -1
	for i, err := range results {
		if err == nil {
			if winner >= 0 {
				t.Fatalf("two winners: %d and %d", winner, i)
			}
			winner = i
			continue
		}
		wantServiceErr(t, err, httpapi.ErrForbidden, linkGone)
	}
	if winner < 0 {
		t.Fatal("no winner")
	}
	ident := e.identityRow(t, a.identity)
	for i := range n {
		ok, _, err := e.svc.Hasher().Verify(e.ctx, "password number "+string(rune('a'+i)), ident.PasswordHash)
		if err != nil || ok != (i == winner) {
			t.Fatalf("password %d verifies: %v (winner %d)", i, ok, winner)
		}
	}
	if k := e.count(t, `SELECT count(*) FROM auth_events WHERE identity_id = $1 AND event = 'password_reset_used'`, a.identity); k != 1 {
		t.Fatalf("%d password_reset_used events", k)
	}
	if k := e.count(t, `SELECT count(*) FROM auth_events WHERE identity_id = $1 AND event = 'password_changed'`, a.identity); k != 1 {
		t.Fatalf("%d password_changed events", k)
	}
}

// Every way a link can be unusable is the same refusal, and none of them writes anything.
func TestResetRefusalsAreAllTheSame(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	setup := func(t *testing.T, o acctOpts) (acct, uuid.UUID, string) {
		a := e.player(t, o)
		id, token := e.issued(t, admin, a)
		return a, id, token
	}
	cases := map[string]func(t *testing.T) string{
		"unknown token":   func(t *testing.T) string { return "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
		"malformed token": func(t *testing.T) string { return "%%% not base64 %%%" },
		"a token that was never issued": func(t *testing.T) string {
			setup(t, acctOpts{}) // the shape of a real token, not one of them
			return strings.Repeat("Q", 43)
		},
		"already used": func(t *testing.T) string {
			_, _, tok := setup(t, acctOpts{})
			if err := e.rec.Reset(e.ctx, tok, newPass, nil); err != nil {
				t.Fatal(err)
			}
			return tok
		},
		"replaced by a newer link": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.issued(t, admin, a)
			return tok
		},
		"account disabled": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, a.player)
			return tok
		},
		"identity disabled": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE auth_identities SET disabled_at = now() WHERE id = $1`, a.identity)
			return tok
		},
		"contact email changed": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE player_private_contacts SET email = 'moved@example.test' WHERE player_id = $1`, a.player)
			return tok
		},
		"contact sync failed": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE player_accounts SET contact_sync_status = 'failed' WHERE player_id = $1`, a.player)
			return tok
		},
		"another provider": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE player_accounts SET auth_provider = 'supabase' WHERE player_id = $1`, a.player)
			return tok
		},
		"the request's identity is not the account's (a Supabase era link)": func(t *testing.T) string {
			_, id, tok := setup(t, acctOpts{})
			e.exec(t, `UPDATE player_password_reset_requests SET auth_subject = $2 WHERE id = $1`, id, uuid.New())
			return tok
		},
		"the account moved to another identity": func(t *testing.T) string {
			a, _, tok := setup(t, acctOpts{})
			spare, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{Audience: store.AudiencePlayer, LoginKey: "spare-" + uuid.NewString() + "@example.test", PasswordHash: "x", PasswordScheme: store.SchemeArgon2id, Now: base})
			if err != nil {
				t.Fatal(err)
			}
			e.exec(t, `UPDATE player_accounts SET auth_subject = $2 WHERE player_id = $1`, a.player, spare.ID)
			return tok
		},
		"expired": func(t *testing.T) string {
			_, _, tok := setup(t, acctOpts{})
			e.clk.Advance(recovery.LinkLifetime)
			t.Cleanup(func() { e.clk.Advance(-recovery.LinkLifetime) })
			return tok
		},
	}
	for name, prepare := range cases {
		t.Run(name, func(t *testing.T) {
			token := prepare(t)
			before := e.snapshot(t)
			err := e.rec.Reset(e.ctx, token, newPass, nil)
			wantServiceErr(t, err, httpapi.ErrForbidden, linkGone)
			if after := e.snapshot(t); after != before {
				t.Fatalf("a refusal wrote: %+v -> %+v", before, after)
			}
		})
	}
}

// The link works for 24 hours from the review (reviewed_at + LinkLifetime), not a moment longer.
func TestResetLinkExpiry(t *testing.T) {
	e := newEnv(t)
	_, _, token, _ := e.resetFor(t, acctOpts{})
	e.clk.Advance(recovery.LinkLifetime)
	wantServiceErr(t, e.rec.Reset(e.ctx, token, newPass, nil), httpapi.ErrForbidden, linkGone)
	e.clk.Advance(-time.Second) // one second before the 24 hours are up
	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatalf("a second before the end: %v", err)
	}
}

// Issuing again starts a fresh 24 hours.
func TestResetLinkExpiryRestartsOnReissue(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	id, _ := e.issued(t, admin, a)
	e.clk.Advance(23 * time.Hour)
	res, err := e.rec.Review(e.ctx, admin, id.String(), issue())
	if err != nil {
		t.Fatal(err)
	}
	e.clk.Advance(23 * time.Hour) // 46 hours after the first, 23 after the second
	if err := e.rec.Reset(e.ctx, *res.Token, newPass, nil); err != nil {
		t.Fatalf("the reissued link: %v", err)
	}
}

// Input checks come first, in the TypeScript's order for what it checked, and never burn the link.
func TestResetValidatesBeforeBurningTheLink(t *testing.T) {
	e := newEnv(t)
	a, id, token, _ := e.resetFor(t, acctOpts{})
	want := func(err error, field, msg string) {
		t.Helper()
		wantServiceErr(t, err, httpapi.ErrInvalid, map[string]string{field: msg})
	}
	want(e.rec.Reset(e.ctx, token, "", nil), "password", "Enter a new password.")
	want(e.rec.Reset(e.ctx, "", "", nil), "password", "Enter a new password.") // the password is checked first
	want(e.rec.Reset(e.ctx, token, "short", nil), "password", "Use at least 6 characters.")
	want(e.rec.Reset(e.ctx, token, strings.Repeat("x", 1025), nil), "password", "Use 1024 characters or fewer.")
	want(e.rec.Reset(e.ctx, "unknown", "short", nil), "password", "Use at least 6 characters.") // says nothing about the token
	if r := e.request(t, id); r.digest == nil || r.consumedAt != nil {
		t.Fatalf("a refused password burned the link: %+v", r)
	}
	wantServiceErr(t, e.rec.Reset(e.ctx, "", newPass, nil), httpapi.ErrForbidden, linkGone)
	wantServiceErr(t, e.rec.Reset(e.ctx, strings.Repeat("a", 1025), newPass, nil), httpapi.ErrForbidden, linkGone)
	// 1024 characters is not too long to ask about (it is just not a token).
	wantServiceErr(t, e.rec.Reset(e.ctx, strings.Repeat("a", 1024), newPass, nil), httpapi.ErrForbidden, linkGone)
	// The same password may be used with the real link afterwards: nothing was spent.
	if err := e.rec.Reset(e.ctx, token, "exactly6", nil); err != nil {
		t.Fatalf("the link survived: %v", err)
	}
	_ = a
}

// Hashing happens for every request that gets past the input checks, whatever the token: so an unknown token costs
// what a real one does. A context that is already done fails at the hash, before any lookup.
func TestResetHashesBeforeLookingAtTheToken(t *testing.T) {
	e := newEnv(t)
	_, id, token, _ := e.resetFor(t, acctOpts{})
	ctx, cancel := context.WithCancel(e.ctx)
	cancel()
	unavailable := map[string]string{"link": "The reset could not be completed. Request another reset link."}
	for _, tok := range []string{token, "unknown-token", ""} {
		err := e.rec.Reset(ctx, tok, newPass, nil)
		if tok == "" {
			wantServiceErr(t, err, httpapi.ErrForbidden, linkGone) // an empty token is refused before any work
			continue
		}
		wantServiceErr(t, err, httpapi.ErrUnavailable, unavailable)
		var re *recovery.Error
		if !errors.As(err, &re) || re.Unwrap() == nil {
			t.Fatal("the cause is kept for the log")
		}
	}
	if r := e.request(t, id); r.digest == nil || r.consumedAt != nil {
		t.Fatalf("a failed hash burned the link: %+v", r)
	}
}

// A database failure rolls the burn back with everything else: the link survives.
func TestResetRollsBackAsOne(t *testing.T) {
	e := newEnv(t)
	a, id, token, _ := e.resetFor(t, acctOpts{})
	before := e.identityRow(t, a.identity)
	// Make the last write of the transaction fail: the password_reset_used event.
	e.exec(t, `ALTER TABLE auth_events ADD CONSTRAINT no_reset_used CHECK (event <> 'password_reset_used')`)
	err := e.rec.Reset(e.ctx, token, newPass, nil)
	wantServiceErr(t, err, httpapi.ErrUnavailable, map[string]string{"link": "The reset could not be completed. Request another reset link."})
	if r := e.request(t, id); r.digest == nil || r.consumedAt != nil {
		t.Fatalf("the burn was not rolled back: %+v", r)
	}
	if after := e.identityRow(t, a.identity); after.PasswordHash != before.PasswordHash {
		t.Fatal("the password changed")
	}
	e.exec(t, `ALTER TABLE auth_events DROP CONSTRAINT no_reset_used`)
	if err := e.rec.Reset(e.ctx, token, newPass, nil); err != nil {
		t.Fatalf("the link must survive a failed attempt: %v", err)
	}
}

// Issue and consume at once: no deadlock, and whichever commits first the player ends with one coherent state.
func TestResetRacesAReissue(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	for range 6 {
		a := e.player(t, acctOpts{})
		id, token := e.issued(t, admin, a)
		ctx, cancel := context.WithTimeout(e.ctx, 30*time.Second)
		var wg sync.WaitGroup
		var resetErr, reviewErr error
		var fresh *string
		wg.Add(2)
		go func() {
			defer wg.Done()
			resetErr = e.rec.Reset(ctx, token, newPass, nil)
		}()
		go func() {
			defer wg.Done()
			var res recovery.ReviewResult
			res, reviewErr = e.rec.Review(ctx, admin, id.String(), issue())
			fresh = res.Token
		}()
		wg.Wait()
		cancel()
		if reviewErr != nil || fresh == nil {
			t.Fatalf("review: %v", reviewErr)
		}
		ident := e.identityRow(t, a.identity)
		changed, _, _ := e.svc.Hasher().Verify(e.ctx, newPass, ident.PasswordHash)
		if resetErr == nil {
			if !changed {
				t.Fatal("reset succeeded but the password is unchanged")
			}
		} else {
			wantServiceErr(t, resetErr, httpapi.ErrForbidden, linkGone)
			if changed {
				t.Fatal("reset failed but the password changed")
			}
		}
		// Either way the player holds exactly one live link, and it is the reissued one (a reset that won burned
		// the old digest, and the reissue then wrote the new one).
		if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE player_id = $1 AND token_digest = $2`, a.player, digest(*fresh)); n != 1 {
			t.Fatalf("the reissued link is not the live one (%d)", n)
		}
		if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE player_id = $1 AND token_digest IS NOT NULL`, a.player); n != 1 {
			t.Fatalf("%d live links", n)
		}
		if bytes.Equal(digest(token), digest(*fresh)) {
			t.Fatal("same token")
		}
	}
}

// snapshot is what a refused reset must leave alone: the events, the requests' revisions and the changed passwords.
type snapshot struct{ events, revisions, changedPasswords int }

func (e *env) snapshot(t testing.TB) snapshot {
	t.Helper()
	var s snapshot
	err := e.pool.QueryRow(e.ctx, `SELECT (SELECT count(*) FROM auth_events), (SELECT coalesce(sum(revision), 0) FROM player_password_reset_requests),
	  (SELECT count(*) FROM auth_identities WHERE password_changed_at <> $1)`, base).Scan(&s.events, &s.revisions, &s.changedPasswords)
	if err != nil {
		t.Fatal(err)
	}
	return s
}
