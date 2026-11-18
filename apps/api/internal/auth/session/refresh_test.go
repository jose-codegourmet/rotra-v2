package session_test

import (
	"bytes"
	"errors"
	"net/netip"
	"sync"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

func TestRefreshRotatesAndExtends(t *testing.T) {
	for _, aud := range []store.Audience{store.AudienceClub, store.AudiencePlayer} {
		t.Run(string(aud), func(t *testing.T) {
			e := newEnv(t)
			a := e.accountFor(t, aud, "rot@example.test")
			iss := e.issue(t, a)
			eventsBefore := e.count(t, `SELECT count(*) FROM auth_events`)
			e.clk.Advance(2 * time.Hour)
			ip := netip.MustParseAddr("198.51.100.4")
			got, err := e.svc.Refresh(e.ctx, iss.RefreshPass, &ip)
			if err != nil {
				t.Fatal(err)
			}
			if !got.Rotated || got.RefreshPass == "" || got.RefreshPass == iss.RefreshPass {
				t.Fatalf("a current pass rotates: %+v", got)
			}
			claims, err := e.verifier.Verify(got.AccessPass, pass.Audience(aud), e.clk.Now())
			if err != nil || claims.SessionID != iss.Session.ID.String() {
				t.Fatalf("the new access pass is for the same session: %+v %v", claims, err)
			}
			mustEqual(t, "access expiry", got.AccessExpiresAt, e.clk.Now().Add(15*time.Minute))
			mustEqual(t, "extended expiry", got.RefreshExpiresAt, e.clk.Now().Add(30*24*time.Hour))
			s := e.session(t, iss.Session.ID)
			if !bytes.Equal(s.RefreshDigest, digestOf(got.RefreshPass)) || !bytes.Equal(s.PreviousRefreshDigest, digestOf(iss.RefreshPass)) {
				t.Fatal("digests must rotate: current is the new one, previous the old one")
			}
			mustEqual(t, "stored expiry", s.ExpiresAt, e.clk.Now().Add(30*24*time.Hour))
			mustEqual(t, "refreshed_at", *s.RefreshedAt, e.clk.Now())
			mustEqual(t, "last_seen", s.LastSeenAt, e.clk.Now())
			mustEqual(t, "last_ip", *s.LastIP, ip)
			mustEqual(t, "a routine refresh writes no event (B-34)", e.count(t, `SELECT count(*) FROM auth_events`), eventsBefore)
			if got.Session.ID != iss.Session.ID || !bytes.Equal(got.Session.RefreshDigest, s.RefreshDigest) {
				t.Fatal("the returned session is the rotated row")
			}
		})
	}
}

func TestRefreshAdminIsNotExtended(t *testing.T) {
	e := newEnv(t)
	adm := e.newAdmin(t, "admin@example.test")
	iss := e.issue(t, adm)
	e.clk.Advance(5 * time.Hour)
	got, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil)
	if err != nil {
		t.Fatal(err)
	}
	mustEqual(t, "expiry stays", got.RefreshExpiresAt, base.Add(12*time.Hour))
	mustEqual(t, "stored expiry stays", e.session(t, iss.Session.ID).ExpiresAt, base.Add(12*time.Hour))
	e.clk.Set(base.Add(12*time.Hour + time.Second))
	if _, err := e.svc.Refresh(e.ctx, got.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
		t.Fatalf("after 12 hours the admin session is over: %v", err)
	}
}

func TestRefreshRefusesExpiredSession(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "old")
	iss := e.issue(t, club)
	e.clk.Advance(30*24*time.Hour + time.Second)
	if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
		t.Fatalf("got %v", err)
	}
}

func TestRefreshWithinGraceGivesAccessPassOnly(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "grace")
	iss := e.issue(t, club)
	e.clk.Advance(time.Hour)
	first, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil)
	if err != nil {
		t.Fatal(err)
	}
	before := e.session(t, iss.Session.ID)
	events := e.count(t, `SELECT count(*) FROM auth_events`)

	e.clk.Advance(29 * time.Second)
	got, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil) // the previous pass, 29 s after the rotation
	if err != nil {
		t.Fatalf("the previous pass inside the grace window must work: %v", err)
	}
	if got.RefreshPass != "" || got.Rotated {
		t.Fatalf("grace gives no new refresh pass: %+v", got)
	}
	if _, err := e.verifier.Verify(got.AccessPass, pass.AudienceClub, e.clk.Now()); err != nil {
		t.Fatalf("grace gives a working access pass: %v", err)
	}
	mustEqual(t, "access expiry", got.AccessExpiresAt, e.clk.Now().Add(15*time.Minute))
	after := e.session(t, iss.Session.ID)
	if after.Revoked() || !bytes.Equal(after.RefreshDigest, before.RefreshDigest) || !bytes.Equal(after.PreviousRefreshDigest, before.PreviousRefreshDigest) ||
		!after.ExpiresAt.Equal(before.ExpiresAt) || !after.RefreshedAt.Equal(*before.RefreshedAt) || !after.LastSeenAt.Equal(before.LastSeenAt) {
		t.Fatalf("grace leaves the session untouched:\nbefore %+v\n after %+v", before, after)
	}
	mustEqual(t, "no event", e.count(t, `SELECT count(*) FROM auth_events`), events)
	// The newest pass still works afterwards.
	if _, err := e.svc.Refresh(e.ctx, first.RefreshPass, nil); err != nil {
		t.Fatalf("the current pass still refreshes: %v", err)
	}
}

func TestRefreshReuseAfterGraceRevokesAndKeepsTheRecord(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "thief")
	iss := e.issue(t, club)
	rotated, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil)
	if err != nil {
		t.Fatal(err)
	}
	e.clk.Advance(31 * time.Second)
	ip := netip.MustParseAddr("192.0.2.66")
	if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, &ip); !errors.Is(err, session.ErrRefreshReused) {
		t.Fatalf("a retired pass after the window is reuse: %v", err)
	}
	// The revoke and its event must have committed although an error came back.
	s := e.session(t, iss.Session.ID)
	if !s.Revoked() || s.RevokeReason != store.ReasonRefreshReused {
		t.Fatalf("session must be revoked as refresh_reused: %+v", s)
	}
	mustEqual(t, "refresh_reused events", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'refresh_reused' AND session_id = $1 AND identity_id = $2 AND ip = $3`,
		s.ID, club.ident.ID, ip.String()), 1)
	if _, err := e.svc.Refresh(e.ctx, rotated.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
		t.Fatalf("the honest holder is signed out too, as designed: %v", err)
	}
}

func TestRefreshUnknownPassRevokesNothing(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "stranger")
	iss := e.issue(t, club)
	for name, tok := range map[string]string{
		"well formed but unknown": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
		"empty":                   "",
		"short":                   "abc",
		"spaces":                  "AAAAAAAAAAAAAAAAAAAAAAAA AAAAAAAAAAAAAAAAAAA",
		"too long":                iss.RefreshPass + "A",
		"padded":                  iss.RefreshPass + "=",
	} {
		if _, err := e.svc.Refresh(e.ctx, tok, nil); !errors.Is(err, session.ErrInvalidRefresh) {
			t.Errorf("%s: %v", name, err)
		}
	}
	if e.session(t, iss.Session.ID).Revoked() {
		t.Fatal("a stranger's guess must not sign anyone out")
	}
	mustEqual(t, "refresh_reused events", e.events(t, store.EventRefreshReused), 0)
}

func TestRefreshPassOlderThanThePreviousIsInvalidNotReuse(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "two")
	iss := e.issue(t, club)
	r1, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Refresh(e.ctx, r1.RefreshPass, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil); !errors.Is(err, session.ErrInvalidRefresh) {
		t.Fatalf("got %v", err)
	}
	if e.session(t, iss.Session.ID).Revoked() {
		t.Fatal("only the previous pass is remembered, so older ones are unknown, not reuse")
	}
}

func TestRefreshRefusesRevokedSession(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "revoked")
	iss := e.issue(t, club)
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
		t.Fatalf("a revoked session refuses the next refresh: %v", err)
	}
}

func TestRefreshRefusesAndRevokesWhenTheAccountCannotSignIn(t *testing.T) {
	cases := map[string]struct {
		aud  store.Audience
		kill func(e *env, t *testing.T, a acct)
	}{
		"club account disabled": {store.AudienceClub, func(e *env, t *testing.T, a acct) {
			e.exec(t, `UPDATE club_accounts SET disabled_at = now() WHERE club_id = $1`, a.accountID)
		}},
		"club account not provisioned": {store.AudienceClub, func(e *env, t *testing.T, a acct) {
			e.exec(t, `UPDATE club_accounts SET provisioned_at = NULL WHERE club_id = $1`, a.accountID)
		}},
		"player account disabled": {store.AudiencePlayer, func(e *env, t *testing.T, a acct) {
			e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, a.accountID)
		}},
		"admin inactive": {store.AudienceAdmin, func(e *env, t *testing.T, a acct) {
			e.exec(t, `UPDATE admin_accounts SET active = false WHERE id = $1`, a.accountID)
		}},
		"identity locked": {store.AudienceClub, func(e *env, t *testing.T, a acct) {
			if err := e.st.SetIdentityDisabled(e.ctx, a.ident.ID, ptr(base), base); err != nil {
				t.Fatal(err)
			}
		}},
		"account unlinked": {store.AudiencePlayer, func(e *env, t *testing.T, a acct) {
			e.exec(t, `UPDATE player_accounts SET auth_provider = 'supabase' WHERE player_id = $1`, a.accountID)
		}},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			a := e.accountFor(t, c.aud, "dis@example.test")
			iss := e.issue(t, a)
			c.kill(e, t, a)
			if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
				t.Fatalf("got %v", err)
			}
			s := e.session(t, iss.Session.ID)
			if !s.Revoked() || s.RevokeReason != store.ReasonAccountDisabled {
				t.Fatalf("the refusal must commit a revoke with reason account_disabled: %+v", s)
			}
			mustEqual(t, "session_revoked events", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'session_revoked' AND session_id = $1`, s.ID), 1)
		})
	}
}

// Two tabs and a page load refreshing together must never sign the device out (B-29).
func TestRefreshConcurrentWithTheSamePassNeverSignsTheDeviceOut(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "tabs")
	iss := e.issue(t, club)
	e.clk.Advance(time.Hour)
	const n = 12
	var (
		wg      sync.WaitGroup
		start   = make(chan struct{})
		results = make([]session.Refreshed, n)
		errs    = make([]error, n)
	)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			results[i], errs[i] = e.svc.Refresh(e.ctx, iss.RefreshPass, nil)
		}()
	}
	close(start)
	wg.Wait()
	rotated := 0
	var newest string
	for i := range results {
		if errs[i] != nil {
			t.Fatalf("refresh %d failed: %v", i, errs[i])
		}
		if _, err := e.verifier.Verify(results[i].AccessPass, pass.AudienceClub, e.clk.Now()); err != nil {
			t.Fatalf("refresh %d: %v", i, err)
		}
		if results[i].Rotated {
			rotated++
			newest = results[i].RefreshPass
		} else if results[i].RefreshPass != "" {
			t.Fatalf("a grace answer carries no refresh pass")
		}
	}
	mustEqual(t, "rotations", rotated, 1)
	s := e.session(t, iss.Session.ID)
	if s.Revoked() || !bytes.Equal(s.PreviousRefreshDigest, digestOf(iss.RefreshPass)) || !bytes.Equal(s.RefreshDigest, digestOf(newest)) {
		t.Fatalf("exactly one rotation: %+v", s)
	}
	mustEqual(t, "refresh_reused events", e.events(t, store.EventRefreshReused), 0)
}

func TestRefreshIsRateLimitedPerSessionAndPerIP(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) {
		c.Limits.RefreshSession = config.AuthLimit{Max: 2, Window: time.Minute}
		c.Limits.RefreshIP = config.AuthLimit{Max: 3, Window: time.Minute}
	})
	club := e.newClub(t, "lim")
	iss := e.issue(t, club)
	ip := netip.MustParseAddr("203.0.113.1")
	cur := iss.RefreshPass
	for i := 0; i < 2; i++ {
		r, err := e.svc.Refresh(e.ctx, cur, &ip)
		if err != nil {
			t.Fatalf("refresh %d: %v", i, err)
		}
		cur = r.RefreshPass
	}
	_, err := e.svc.Refresh(e.ctx, cur, &ip)
	var rl *session.RateLimitedError
	if !errors.Is(err, session.ErrRateLimited) || !errors.As(err, &rl) || rl.RetryAfterSeconds() < 1 {
		t.Fatalf("the third refresh of one session in a minute is limited: %v", err)
	}
	// Per IP: another session from the same IP is also limited once the IP budget is spent.
	other := e.issue(t, e.newClub(t, "lim2"))
	if _, err := e.svc.Refresh(e.ctx, other.RefreshPass, &ip); !errors.Is(err, session.ErrRateLimited) {
		t.Fatalf("the IP budget (3) is spent: %v", err)
	}
	e.clk.Advance(time.Minute)
	if _, err := e.svc.Refresh(e.ctx, other.RefreshPass, &ip); err != nil {
		t.Fatalf("a new window allows again: %v", err)
	}
}
