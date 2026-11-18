package session_test

import (
	"errors"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func eventsFor(e *env, t *testing.T, sid uuid.UUID, ev store.EventType) int {
	t.Helper()
	return e.count(t, `SELECT count(*) FROM auth_events WHERE session_id = $1 AND event = $2`, sid, string(ev))
}

func TestSignOut(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "out")
	iss := e.issue(t, club)
	ip := netip.MustParseAddr("192.0.2.5")
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, &ip); err != nil {
		t.Fatal(err)
	}
	s := e.session(t, iss.Session.ID)
	if !s.Revoked() || s.RevokeReason != store.ReasonSignOut {
		t.Fatalf("revoked with sign_out: %+v", s)
	}
	mustEqual(t, "sign_out events", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'sign_out' AND session_id = $1 AND identity_id = $2 AND ip = $3`,
		s.ID, club.ident.ID, ip.String()), 1)
	// Idempotent: a second sign-out and an unknown session are quietly fine and write nothing more.
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, &ip); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.SignOut(e.ctx, uuid.New(), &ip); err != nil {
		t.Fatal(err)
	}
	mustEqual(t, "sign_out events", e.events(t, store.EventSignOut), 1)
}

func TestSignOutDeviceIsOwnerOnly(t *testing.T) {
	e := newEnv(t)
	owner, stranger := e.newClub(t, "owner"), e.newClub(t, "stranger")
	mine := e.issue(t, owner)
	if err := e.svc.SignOutDevice(e.ctx, stranger.ident.ID, mine.Session.ID, nil); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("another identity cannot sign out my device: %v", err)
	}
	if err := e.svc.SignOutDevice(e.ctx, owner.ident.ID, uuid.New(), nil); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("unknown session: %v", err)
	}
	if e.session(t, mine.Session.ID).Revoked() {
		t.Fatal("a refused sign-out revokes nothing")
	}
	if err := e.svc.SignOutDevice(e.ctx, owner.ident.ID, mine.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	s := e.session(t, mine.Session.ID)
	if s.RevokeReason != store.ReasonSignedOutByOwner {
		t.Fatalf("reason: %+v", s)
	}
	mustEqual(t, "session_revoked events", eventsFor(e, t, s.ID, store.EventSessionRevoked), 1)
	if _, err := e.svc.Refresh(e.ctx, mine.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
		t.Fatalf("a signed out device cannot refresh: %v", err)
	}
	if err := e.svc.SignOutDevice(e.ctx, owner.ident.ID, mine.Session.ID, nil); err != nil {
		t.Fatalf("signing out an already ended session is fine: %v", err)
	}
}

func TestSignOutAsAdminChecksTheClub(t *testing.T) {
	e := newEnv(t)
	a, b := e.newClub(t, "club-a"), e.newClub(t, "club-b")
	sa, sb := e.issue(t, a), e.issue(t, b)
	if err := e.svc.SignOutAsAdmin(e.ctx, b.accountID, sa.Session.ID, nil); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("a session of another club: %v", err)
	}
	if err := e.svc.SignOutAsAdmin(e.ctx, a.accountID, sa.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	if s := e.session(t, sa.Session.ID); s.RevokeReason != store.ReasonSignedOutByAdmin {
		t.Fatalf("reason: %+v", s)
	}
	if e.session(t, sb.Session.ID).Revoked() {
		t.Fatal("club B untouched")
	}
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 1)
}

func TestSignOutAllKeepsTheExceptedSession(t *testing.T) {
	e := newEnv(t)
	club, other := e.newClub(t, "all"), e.newClub(t, "bystander")
	s1, s2, s3 := e.issue(t, club), e.issue(t, club), e.issue(t, club)
	bystander := e.issue(t, other)
	n, err := e.svc.SignOutAll(e.ctx, club.ident.ID, &s2.Session.ID, nil)
	if err != nil || n != 2 {
		t.Fatalf("revoked %d: %v", n, err)
	}
	for _, s := range []session.Issued{s1, s3} {
		if got := e.session(t, s.Session.ID); got.RevokeReason != store.ReasonSignedOutByOwner {
			t.Fatalf("session %v: %+v", s.Session.ID, got)
		}
	}
	if e.session(t, s2.Session.ID).Revoked() || e.session(t, bystander.Session.ID).Revoked() {
		t.Fatal("the excepted session and other accounts stay signed in")
	}
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 2)
	n, err = e.svc.SignOutAll(e.ctx, club.ident.ID, nil, nil)
	if err != nil || n != 1 {
		t.Fatalf("without an exception it ends the last one: %d %v", n, err)
	}
}

func TestRevokeDeviceRevokesItsSessionsInOneTransaction(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "dev")
	dev, other := uuid.New(), uuid.New()
	d1, d2 := e.issueOn(t, club, &dev, "Phone"), e.issueOn(t, club, &dev, "Phone")
	elsewhere := e.issueOn(t, club, &other, "Tablet")
	noDevice := e.issue(t, club)
	n, err := e.svc.RevokeDevice(e.ctx, club.accountID, dev, nil)
	if err != nil || n != 2 {
		t.Fatalf("revoked %d: %v", n, err)
	}
	d, err := e.st.GetDevice(e.ctx, club.accountID, dev)
	if err != nil || d.RevokedAt == nil {
		t.Fatalf("the device row is revoked: %+v %v", d, err)
	}
	for _, s := range []session.Issued{d1, d2} {
		if got := e.session(t, s.Session.ID); got.RevokeReason != store.ReasonDeviceRevoked {
			t.Fatalf("reason: %+v", got)
		}
		if _, err := e.svc.Refresh(e.ctx, s.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
			t.Fatalf("a revoked device cannot refresh: %v", err)
		}
	}
	if e.session(t, elsewhere.Session.ID).Revoked() || e.session(t, noDevice.Session.ID).Revoked() {
		t.Fatal("other devices stay")
	}
	mustEqual(t, "device_revoked events", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'device_revoked' AND device_id = $1`, dev), 1)
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 2)
	// The device cannot sign in again.
	if _, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: club.ident, AccountID: club.accountID, DeviceID: &dev}); !errors.Is(err, store.ErrDeviceRevoked) {
		t.Fatalf("sign-in from a revoked device: %v", err)
	}
	if n, err := e.svc.RevokeDevice(e.ctx, club.accountID, dev, nil); err != nil || n != 0 {
		t.Fatalf("revoking twice is fine: %d %v", n, err)
	}
	mustEqual(t, "enrolled plus revoked events after a repeat", e.events(t, store.EventDeviceEnrolled)+e.events(t, store.EventDeviceRevoked), 3)
	if _, err := e.svc.RevokeDevice(e.ctx, club.accountID, uuid.New(), nil); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("unknown device: %v", err)
	}
	if _, err := e.svc.RevokeDevice(e.ctx, e.newClub(t, "else").accountID, dev, nil); !errors.Is(err, session.ErrNotFound) {
		t.Fatalf("another club's device: %v", err)
	}
}

func TestOnPasswordChangedRevokesTheOtherSessions(t *testing.T) {
	e := newEnv(t)
	player := e.newPlayer(t, "pw@example.test")
	keep, a, b := e.issue(t, player), e.issue(t, player), e.issue(t, player)
	n, err := e.svc.OnPasswordChanged(e.ctx, player.ident.ID, &keep.Session.ID, nil)
	if err != nil || n != 2 {
		t.Fatalf("revoked %d: %v", n, err)
	}
	for _, s := range []session.Issued{a, b} {
		if got := e.session(t, s.Session.ID); got.RevokeReason != store.ReasonPasswordChanged {
			t.Fatalf("reason: %+v", got)
		}
		if _, err := e.svc.Refresh(e.ctx, s.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
			t.Fatalf("refresh after a password change: %v", err)
		}
	}
	if _, err := e.svc.Refresh(e.ctx, keep.RefreshPass, nil); err != nil {
		t.Fatalf("the session that changed the password stays: %v", err)
	}
	mustEqual(t, "password_changed events", e.events(t, store.EventPasswordChanged), 1)
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 2)
	// A reset (no current session) ends all of them.
	if n, err := e.svc.OnPasswordChanged(e.ctx, player.ident.ID, nil, nil); err != nil || n != 1 {
		t.Fatalf("revoked %d: %v", n, err)
	}
}

func TestOnPasswordChangedTxIsAtomicWithTheCaller(t *testing.T) {
	e := newEnv(t)
	player := e.newPlayer(t, "atomic@example.test")
	iss := e.issue(t, player)
	boom := errors.New("later step failed")
	err := e.st.InTx(e.ctx, func(q *store.Queries) error {
		if err := q.UpdatePassword(e.ctx, player.ident.ID, "another-fake-hash", store.SchemeArgon2id, base); err != nil {
			return err
		}
		if _, err := e.svc.OnPasswordChangedTx(e.ctx, q, player.ident.ID, nil, nil); err != nil {
			return err
		}
		return boom
	})
	if !errors.Is(err, boom) {
		t.Fatal(err)
	}
	if e.session(t, iss.Session.ID).Revoked() || e.events(t, store.EventPasswordChanged) != 0 {
		t.Fatal("a rollback keeps the session and writes no event")
	}
	var rev session.Revoked
	err = e.st.InTx(e.ctx, func(q *store.Queries) error {
		r, err := e.svc.OnPasswordChangedTx(e.ctx, q, player.ident.ID, nil, nil)
		rev = r
		return err
	})
	if err != nil || len(rev.SessionIDs) != 1 || rev.IdentityID != player.ident.ID {
		t.Fatalf("committed: %+v %v", rev, err)
	}
	e.svc.Forget(rev)
	if s := e.session(t, iss.Session.ID); s.RevokeReason != store.ReasonPasswordChanged {
		t.Fatalf("%+v", s)
	}
}

func TestOnAccountDisabledRevokesEverySession(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "disable")
	a, b := e.issue(t, club), e.issue(t, club)
	n, err := e.svc.OnAccountDisabled(e.ctx, club.ident.ID, nil)
	if err != nil || n != 2 {
		t.Fatalf("revoked %d: %v", n, err)
	}
	for _, s := range []session.Issued{a, b} {
		if got := e.session(t, s.Session.ID); got.RevokeReason != store.ReasonAccountDisabled {
			t.Fatalf("reason: %+v", got)
		}
	}
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 2)
	var rev session.Revoked
	e.issue(t, club)
	err = e.st.InTx(e.ctx, func(q *store.Queries) error {
		r, err := e.svc.OnAccountDisabledTx(e.ctx, q, club.ident.ID, nil)
		rev = r
		return err
	})
	if err != nil || len(rev.SessionIDs) != 1 {
		t.Fatalf("tx variant: %+v %v", rev, err)
	}
	e.svc.Forget(rev)
}

func TestRevokeAllSessionsSignsEveryDeviceOut(t *testing.T) {
	e := newEnv(t)
	club, player, admin := e.newClub(t, "ra-c"), e.newPlayer(t, "ra-p@example.test"), e.newAdmin(t, "ra-a@example.test")
	sc, sp, sa := e.issue(t, club), e.issue(t, player), e.issue(t, admin)
	auth := e.svc.Authenticator()
	if _, err := auth.Authenticate(e.ctx, sc.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatal(err)
	}
	n, err := e.svc.RevokeAllSessions(e.ctx)
	if err != nil || n != 3 {
		t.Fatalf("revoked %d: %v", n, err)
	}
	for _, s := range []session.Issued{sc, sp, sa} {
		if _, err := e.svc.Refresh(e.ctx, s.RefreshPass, nil); !errors.Is(err, session.ErrRefreshRefused) {
			t.Fatalf("every device is out on its next refresh: %v", err)
		}
	}
	mustEqual(t, "session_revoked events", e.events(t, store.EventSessionRevoked), 3)
	// The write check sees it at once, not after the cache TTL.
	if _, err := auth.Authenticate(e.ctx, sc.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("a write after revoke-all: %v", err)
	}
	if n, err := e.svc.RevokeAllSessions(e.ctx); err != nil || n != 0 {
		t.Fatalf("again: %d %v", n, err)
	}
}

func TestSignOutByRefresh(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "idle")
	iss := e.issue(t, club)
	ip := netip.MustParseAddr("192.0.2.7")
	if err := e.svc.SignOutByRefresh(e.ctx, iss.RefreshPass, store.AudienceClub, &ip); err != nil {
		t.Fatal(err)
	}
	s := e.session(t, iss.Session.ID)
	if !s.Revoked() || s.RevokeReason != store.ReasonSignOut {
		t.Fatalf("revoked with sign_out: %+v", s)
	}
	mustEqual(t, "sign_out events", e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'sign_out' AND session_id = $1 AND ip = $2`, s.ID, ip.String()), 1)
	// twice, and a refresh pass that matches nothing, are quietly fine and write nothing more
	if err := e.svc.SignOutByRefresh(e.ctx, iss.RefreshPass, store.AudienceClub, &ip); err != nil {
		t.Fatal(err)
	}
	for _, junk := range []string{"", "short", strings.Repeat("A", 43)} {
		if err := e.svc.SignOutByRefresh(e.ctx, junk, store.AudienceClub, nil); err != nil {
			t.Fatalf("%q: %v", junk, err)
		}
	}
	mustEqual(t, "sign_out events", e.events(t, store.EventSignOut), 1)
}

func TestSignOutByRefreshChecksTheApp(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newClub(t, "club"))
	if err := e.svc.SignOutByRefresh(e.ctx, iss.RefreshPass, store.AudiencePlayer, nil); err != nil {
		t.Fatal(err)
	}
	if e.session(t, iss.Session.ID).Revoked() {
		t.Fatal("a refresh pass of another app revokes nothing")
	}
	mustEqual(t, "events", e.events(t, store.EventSignOut), 0)
}

func TestSignOutByRefreshAcceptsThePreviousPass(t *testing.T) {
	e := newEnv(t)
	iss := e.issue(t, e.newClub(t, "club"))
	e.clk.Advance(time.Minute)
	if _, err := e.svc.Refresh(e.ctx, iss.RefreshPass, nil); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.SignOutByRefresh(e.ctx, iss.RefreshPass, store.AudienceClub, nil); err != nil {
		t.Fatal(err)
	}
	if !e.session(t, iss.Session.ID).Revoked() {
		t.Fatal("the previous pass names the session")
	}
}
