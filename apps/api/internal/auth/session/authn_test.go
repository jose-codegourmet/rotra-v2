package session_test

import (
	"crypto/ed25519"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/config"
)

func TestAuthenticateGivesThePrincipal(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	for _, aud := range audiences {
		a := e.accountFor(t, aud, "who@example.test")
		iss := e.issue(t, a)
		for _, mode := range []session.Mode{session.ModeRead, session.ModeWrite} {
			p, err := auth.Authenticate(e.ctx, iss.AccessPass, aud, mode)
			if err != nil {
				t.Fatalf("%s mode %d: %v", aud, mode, err)
			}
			want := session.Principal{IdentityID: a.ident.ID, SessionID: iss.Session.ID, Audience: aud, AccountID: a.accountID}
			if aud == store.AudienceClub {
				want.ClubID = &a.accountID
			}
			if p.IdentityID != want.IdentityID || p.SessionID != want.SessionID || p.Audience != want.Audience || p.AccountID != want.AccountID ||
				(p.ClubID == nil) != (want.ClubID == nil) || (p.ClubID != nil && *p.ClubID != *want.ClubID) {
				t.Fatalf("%s principal: %+v want %+v", aud, p, want)
			}
		}
	}
}

func TestAuthenticateRejectsBadPasses(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	club := e.newClub(t, "bad")
	iss := e.issue(t, club)
	tampered := iss.AccessPass[:len(iss.AccessPass)-2] + "AA"
	if tampered == iss.AccessPass {
		tampered = iss.AccessPass[:len(iss.AccessPass)-2] + "BB"
	}
	for name, c := range map[string]struct {
		token string
		aud   store.Audience
		want  error
	}{
		"empty":           {"", store.AudienceClub, session.ErrUnauthenticated},
		"garbage":         {"not.a.pass", store.AudienceClub, session.ErrUnauthenticated},
		"tampered":        {tampered, store.AudienceClub, session.ErrUnauthenticated},
		"another app":     {iss.AccessPass, store.AudienceAdmin, session.ErrWrongAccount},
		"another app (2)": {iss.AccessPass, store.AudiencePlayer, session.ErrWrongAccount},
	} {
		if _, err := auth.Authenticate(e.ctx, c.token, c.aud, session.ModeRead); !errors.Is(err, c.want) {
			t.Errorf("%s: got %v, want %v", name, err, c.want)
		}
	}
}

func TestAuthenticateExpiredAccessPassIsDistinct(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	iss := e.issue(t, e.newClub(t, "exp"))
	e.clk.Advance(14*time.Minute + 59*time.Second)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatalf("still valid a second before: %v", err)
	}
	e.clk.Advance(time.Second)
	_, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead)
	if !errors.Is(err, session.ErrExpired) || errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("expiry is its own error, so the API can answer the expired 401: %v", err)
	}
}

// B-47: with two keys published both are accepted; once the old key is removed its passes come back as
// "expired" so the client refreshes silently, and the refresh pass (a database digest) still works.
func TestKeyRotationNobodyIsSignedOut(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "rot")
	oldIss := e.issue(t, club)
	oldKey := e.key
	newKey, err := pass.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	oldPub, newPub := oldKey.Public().(ed25519.PublicKey), newKey.Public().(ed25519.PublicKey)

	both, err := pass.NewKeySet(newPub, oldPub) // swap: sign with the new key, still accept the old
	if err != nil {
		t.Fatal(err)
	}
	e.svc = e.buildService(t, newKey, both)
	if _, err := e.svc.Authenticator().Authenticate(e.ctx, oldIss.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatalf("with both keys published, the old pass still works: %v", err)
	}
	fresh := e.issue(t, e.newClub(t, "rot2"))
	if _, err := e.svc.Authenticator().Authenticate(e.ctx, fresh.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatalf("a pass from the new key works: %v", err)
	}

	onlyNew, err := pass.NewKeySet(newPub) // the old key is removed
	if err != nil {
		t.Fatal(err)
	}
	e.svc = e.buildService(t, newKey, onlyNew)
	_, err = e.svc.Authenticator().Authenticate(e.ctx, oldIss.AccessPass, store.AudienceClub, session.ModeRead)
	if !errors.Is(err, session.ErrExpired) {
		t.Fatalf("a pass from a removed key must read as expired, so it refreshes: %v", err)
	}
	got, err := e.svc.Refresh(e.ctx, oldIss.RefreshPass, nil)
	if err != nil {
		t.Fatalf("the refresh pass is not tied to the signing key: %v", err)
	}
	if _, err := e.svc.Authenticator().Authenticate(e.ctx, got.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatalf("the refreshed pass is signed by the new key: %v", err)
	}
}

func TestAuthenticateChecksTheAccountOnEveryRequest(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.RevocationCacheTTL = 0 })
	auth := e.svc.Authenticator()
	club := e.newClub(t, "acct")
	iss := e.issue(t, club)
	e.exec(t, `UPDATE club_accounts SET disabled_at = now() WHERE club_id = $1`, club.accountID)
	for _, mode := range []session.Mode{session.ModeRead, session.ModeWrite} {
		if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, mode); !errors.Is(err, session.ErrUnauthenticated) {
			t.Fatalf("a disabled club account, mode %d: %v", mode, err)
		}
	}
	e.exec(t, `UPDATE club_accounts SET disabled_at = NULL WHERE club_id = $1`, club.accountID)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatal(err)
	}
	e.exec(t, `UPDATE club_accounts SET auth_provider = 'supabase' WHERE club_id = $1`, club.accountID)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("unlinked account: %v", err)
	}
	e.exec(t, `UPDATE club_accounts SET auth_provider = 'rotra' WHERE club_id = $1`, club.accountID)
	// The pass names an account; if the identity now points at another one, the pass is no good.
	other := e.newClub(t, "acct2")
	e.exec(t, `UPDATE club_accounts SET auth_subject = $1 WHERE club_id = $2`, uuid.New(), club.accountID)
	e.exec(t, `UPDATE club_accounts SET auth_subject = $1 WHERE club_id = $2`, club.ident.ID, other.accountID)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("an identity re-linked to another club: %v", err)
	}
}

func TestPlayerAndAdminAccountChecks(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.RevocationCacheTTL = 0 })
	auth := e.svc.Authenticator()
	p, a := e.newPlayer(t, "ap@example.test"), e.newAdmin(t, "aa@example.test")
	ip, ia := e.issue(t, p), e.issue(t, a)
	e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, p.accountID)
	e.exec(t, `UPDATE admin_accounts SET active = false WHERE id = $1`, a.accountID)
	if _, err := auth.Authenticate(e.ctx, ip.AccessPass, store.AudiencePlayer, session.ModeRead); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("disabled player: %v", err)
	}
	if _, err := auth.Authenticate(e.ctx, ia.AccessPass, store.AudienceAdmin, session.ModeRead); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("inactive admin: %v", err)
	}
}

func TestWritesCheckTheSessionRowThroughACache(t *testing.T) {
	e := newEnv(t) // TTL 5 s
	auth := e.svc.Authenticator()
	iss := e.issue(t, e.newClub(t, "cache"))
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatal(err)
	}
	// Revoked behind this instance's back (another instance, or a manual fix): the cache hides it for the TTL.
	e.exec(t, `UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'sign_out' WHERE id = $1`, iss.Session.ID)
	e.clk.Advance(4 * time.Second)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatalf("inside the TTL the cached answer is used: %v", err)
	}
	e.clk.Advance(2 * time.Second)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("after the TTL a write is refused: %v", err)
	}
	// Reads trust the pass: no session lookup, so a revoked session still reads until the pass expires.
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatalf("reads trust the pass for up to its lifetime: %v", err)
	}
	e.clk.Advance(15 * time.Minute)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); !errors.Is(err, session.ErrExpired) {
		t.Fatalf("and then the read fails as expired: %v", err)
	}
}

func TestWriteChecksAreImmediateWithNoCache(t *testing.T) {
	e := newEnv(t, func(c *config.AuthTuning) { c.RevocationCacheTTL = 0 })
	auth := e.svc.Authenticator()
	iss := e.issue(t, e.newClub(t, "nocache"))
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatal(err)
	}
	e.exec(t, `UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'sign_out' WHERE id = $1`, iss.Session.ID)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("TTL 0 checks every write: %v", err)
	}
}

func TestRevokeByThisInstanceInvalidatesTheCacheAtOnce(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	club := e.newClub(t, "inproc")
	dev := e.issue(t, club)
	other := e.issue(t, club)
	for _, s := range []session.Issued{dev, other} {
		if _, err := auth.Authenticate(e.ctx, s.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
			t.Fatal(err)
		}
	}
	if err := e.svc.SignOut(e.ctx, dev.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := auth.Authenticate(e.ctx, dev.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("sign-out is felt by the next write, without waiting for the TTL: %v", err)
	}
	if _, err := auth.Authenticate(e.ctx, other.AccessPass, store.AudienceClub, session.ModeWrite); err != nil {
		t.Fatalf("other sessions are unaffected: %v", err)
	}
	if n, err := e.svc.OnPasswordChanged(e.ctx, club.ident.ID, nil, nil); err != nil || n != 1 {
		t.Fatalf("%d %v", n, err)
	}
	if _, err := auth.Authenticate(e.ctx, other.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("a password change is felt at once too: %v", err)
	}
}

func TestAccountDisabledHookIsFeltAtOnce(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	club := e.newClub(t, "hook")
	iss := e.issue(t, club)
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); err != nil {
		t.Fatal(err)
	}
	e.exec(t, `UPDATE club_accounts SET disabled_at = now() WHERE club_id = $1`, club.accountID)
	if _, err := e.svc.OnAccountDisabled(e.ctx, club.ident.ID, nil); err != nil {
		t.Fatal(err)
	}
	if _, err := auth.Authenticate(e.ctx, iss.AccessPass, store.AudienceClub, session.ModeRead); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("the cached account answer was dropped: %v", err)
	}
}

func TestWriteRefusesASessionPastItsExpiry(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	adm := e.newAdmin(t, "late@example.test")
	e.issue(t, adm) // session ends at +12 h
	late := base.Add(12*time.Hour - 10*time.Second)
	e.clk.Set(late)
	claims := pass.Claims{Subject: adm.ident.ID.String(), SessionID: e.issueSessionID(t, adm), Audience: pass.AudienceAdmin, AccountID: adm.accountID.String()}
	token, err := e.signer.Sign(claims, late)
	if err != nil {
		t.Fatal(err)
	}
	e.clk.Set(base.Add(12*time.Hour + 5*time.Second)) // the pass lives on (15 min), the session has ended
	if _, err := auth.Authenticate(e.ctx, token, store.AudienceAdmin, session.ModeRead); err != nil {
		t.Fatalf("a read still passes: %v", err)
	}
	if _, err := auth.Authenticate(e.ctx, token, store.AudienceAdmin, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
		t.Fatalf("a write after the session ended: %v", err)
	}
}

// issueSessionID makes a second session for a and returns its id, expiring 12 h after base.
func (e *env) issueSessionID(t *testing.T, a acct) string {
	t.Helper()
	saved := e.clk.Now()
	e.clk.Set(base)
	defer e.clk.Set(saved)
	return e.issue(t, a).Session.ID.String()
}

func TestWriteRefusesAPassWhoseSessionBelongsToAnotherIdentity(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	a, b := e.newClub(t, "ida"), e.newClub(t, "idb")
	sb := e.issue(t, b)
	token, err := e.signer.Sign(pass.Claims{Subject: a.ident.ID.String(), SessionID: sb.Session.ID.String(), Audience: pass.AudienceClub,
		AccountID: a.accountID.String(), ClubID: a.accountID.String()}, base)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := auth.Authenticate(e.ctx, token, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrUnauthenticated) {
		t.Fatalf("a session id that is not this identity's: %v", err)
	}
}

func TestAuthenticateConcurrentWithRevokeIsRaceFree(t *testing.T) {
	e := newEnv(t)
	auth := e.svc.Authenticator()
	club := e.newClub(t, "race")
	var sessions []session.Issued
	for i := 0; i < 6; i++ {
		sessions = append(sessions, e.issue(t, club))
	}
	var wg sync.WaitGroup
	for _, s := range sessions {
		wg.Add(2)
		go func() {
			defer wg.Done()
			for i := 0; i < 20; i++ {
				_, _ = auth.Authenticate(e.ctx, s.AccessPass, store.AudienceClub, session.ModeWrite)
			}
		}()
		go func() {
			defer wg.Done()
			_ = e.svc.SignOut(e.ctx, s.Session.ID, nil)
		}()
	}
	wg.Wait()
	for _, s := range sessions {
		if _, err := auth.Authenticate(e.ctx, s.AccessPass, store.AudienceClub, session.ModeWrite); !errors.Is(err, session.ErrSessionRevoked) {
			t.Fatalf("after the sign-out nothing may linger in the cache: %v", err)
		}
	}
}
