package session

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// errAccountUnavailable: the identity or its account may no longer sign in (disabled, not provisioned, missing).
var errAccountUnavailable = errors.New("session: account cannot sign in")

// accountRef is an identity's account: the club id, the player id or the Admin id, and for a club also the club.
type accountRef struct {
	id     uuid.UUID
	clubID *uuid.UUID
}

// accountReader is the part of the store account lookups need. *store.Store and *store.Queries both satisfy it.
type accountReader interface {
	ClubAccountBySubject(ctx context.Context, subject uuid.UUID) (store.ClubAccount, error)
	PlayerAccountBySubject(ctx context.Context, subject uuid.UUID) (store.PlayerAccount, error)
	AdminAccountBySubject(ctx context.Context, subject uuid.UUID) (store.AdminAccount, error)
}

// loadAccount finds the account linked to an identity (auth_provider 'rotra', auth_subject = identity id) and
// checks the account tables allow it to sign in: club provisioned and not disabled, player not disabled, Admin
// active. errAccountUnavailable otherwise; any other error is a database failure.
func loadAccount(ctx context.Context, r accountReader, aud store.Audience, identityID uuid.UUID) (accountRef, error) {
	var ref accountRef
	var ok bool
	var err error
	switch aud {
	case store.AudienceClub:
		var a store.ClubAccount
		if a, err = r.ClubAccountBySubject(ctx, identityID); err == nil {
			id := a.ClubID
			ref, ok = accountRef{id: id, clubID: &id}, a.CanSignIn()
		}
	case store.AudiencePlayer:
		var a store.PlayerAccount
		if a, err = r.PlayerAccountBySubject(ctx, identityID); err == nil {
			ref, ok = accountRef{id: a.PlayerID}, a.CanSignIn()
		}
	case store.AudienceAdmin:
		var a store.AdminAccount
		if a, err = r.AdminAccountBySubject(ctx, identityID); err == nil {
			ref, ok = accountRef{id: a.ID}, a.CanSignIn()
		}
	default:
		return accountRef{}, fmt.Errorf("session: unknown audience %q", aud)
	}
	if errors.Is(err, store.ErrNotFound) || (err == nil && !ok) {
		return accountRef{}, errAccountUnavailable
	}
	return ref, err
}

// sessionAccountReader adds the identity read a refresh needs.
type sessionAccountReader interface {
	accountReader
	GetIdentityByID(ctx context.Context, id uuid.UUID) (store.Identity, error)
}

// loadSessionAccount is loadAccount for a session's identity, which must not be locked either.
func loadSessionAccount(ctx context.Context, r sessionAccountReader, sess store.Session) (accountRef, error) {
	ident, err := r.GetIdentityByID(ctx, sess.IdentityID)
	if errors.Is(err, store.ErrNotFound) || (err == nil && ident.DisabledAt != nil) {
		return accountRef{}, errAccountUnavailable
	}
	if err != nil {
		return accountRef{}, err
	}
	return loadAccount(ctx, r, sess.Audience, sess.IdentityID)
}

// authnReader is what the Authenticator reads.
type authnReader interface {
	accountReader
	GetSession(ctx context.Context, id uuid.UUID) (store.Session, error)
}

type accountEntry struct {
	ref accountRef
	ok  bool
}

type sessionEntry struct {
	identityID uuid.UUID
	revoked    bool
	expiresAt  time.Time
}

// Authenticator checks the pass on each request. Reads trust a valid access pass for up to its 15 minutes;
// writes also check that the session row is not revoked or expired, through a short cache (B-27, B-62).
type Authenticator struct {
	verifier *pass.Verifier
	r        authnReader
	now      func() time.Time
	log      *slog.Logger
	accounts *ttlCache[accountEntry]
	sessions *ttlCache[sessionEntry]
}

func newAuthenticator(r authnReader, v *pass.Verifier, ttl time.Duration, now func() time.Time, log *slog.Logger) *Authenticator {
	return &Authenticator{
		verifier: v, r: r, now: now, log: log,
		accounts: newTTLCache[accountEntry](ttl, now), sessions: newTTLCache[sessionEntry](ttl, now),
	}
}

// Authenticate verifies the access pass for the audience (pinned per call: a club pass never opens the Admin
// app), loads the account by its link to the identity and checks it can sign in, and in ModeWrite and ModeSessionRead checks the
// session. It returns one of ErrExpired, ErrUnauthenticated, ErrWrongAccount, ErrSessionRevoked, or an
// unexpected database error.
//
// A pass signed by a key that was since removed from the key set also returns ErrExpired: the client refreshes
// and nobody is signed out (B-47). The refresh pass is a database digest, not signed with that key.
//
// An account that cannot sign in is ErrUnauthenticated: for the client it is "not signed in", and its refresh
// will be refused.
func (a *Authenticator) Authenticate(ctx context.Context, token string, aud store.Audience, mode Mode) (Principal, error) {
	claims, err := a.verifier.Verify(token, pass.Audience(aud), a.now())
	switch {
	case errors.Is(err, pass.ErrExpired), errors.Is(err, pass.ErrUnknownKey):
		return Principal{}, ErrExpired
	case errors.Is(err, pass.ErrWrongAudience):
		return Principal{}, ErrWrongAccount
	case err != nil:
		return Principal{}, ErrUnauthenticated
	}
	identityID, err1 := uuid.Parse(claims.Subject)
	sessionID, err2 := uuid.Parse(claims.SessionID)
	accountID, err3 := uuid.Parse(claims.AccountID)
	if err1 != nil || err2 != nil || err3 != nil {
		return Principal{}, ErrUnauthenticated
	}
	ref, err := a.account(ctx, aud, identityID)
	if err != nil {
		return Principal{}, err
	}
	if ref.id != accountID || (aud == store.AudienceClub && (ref.clubID == nil || ref.clubID.String() != claims.ClubID)) {
		return Principal{}, ErrUnauthenticated // the identity now belongs to another account than the pass names
	}
	if mode == ModeWrite || mode == ModeSessionRead {
		if err := a.checkSession(ctx, sessionID, identityID); err != nil {
			return Principal{}, err
		}
	}
	return Principal{IdentityID: identityID, SessionID: sessionID, Audience: aud, AccountID: ref.id, ClubID: ref.clubID}, nil
}

func (a *Authenticator) account(ctx context.Context, aud store.Audience, identityID uuid.UUID) (accountRef, error) {
	e, ok := a.accounts.get(identityID)
	if !ok {
		started := a.accounts.epoch()
		ref, err := loadAccount(ctx, a.r, aud, identityID)
		switch {
		case errors.Is(err, errAccountUnavailable):
			e = accountEntry{}
		case err != nil:
			return accountRef{}, err
		default:
			e = accountEntry{ref: ref, ok: true}
		}
		a.accounts.put(identityID, e, started)
	}
	if !e.ok {
		return accountRef{}, ErrUnauthenticated
	}
	return e.ref, nil
}

func (a *Authenticator) checkSession(ctx context.Context, sessionID, identityID uuid.UUID) error {
	if e, ok := a.sessions.get(sessionID); ok {
		switch {
		case e.identityID != identityID:
			return ErrUnauthenticated
		case e.revoked:
			return ErrSessionRevoked
		case a.now().Before(e.expiresAt):
			return nil
		}
		// A cached expiry may predate a refresh that extended the session: ask the database.
	}
	started := a.sessions.epoch()
	sess, err := a.r.GetSession(ctx, sessionID)
	if errors.Is(err, store.ErrNotFound) {
		return ErrSessionRevoked
	}
	if err != nil {
		return err
	}
	if sess.IdentityID != identityID {
		return ErrUnauthenticated
	}
	a.sessions.put(sessionID, sessionEntry{identityID: identityID, revoked: sess.Revoked(), expiresAt: sess.ExpiresAt}, started)
	if sess.Revoked() || !a.now().Before(sess.ExpiresAt) {
		return ErrSessionRevoked
	}
	return nil
}

// forgetSessions drops cached answers for sessions this instance just revoked.
func (a *Authenticator) forgetSessions(ids ...uuid.UUID) { a.sessions.delete(ids...) }

// forgetAccount drops the cached account answer for an identity.
func (a *Authenticator) forgetAccount(identityID uuid.UUID) { a.accounts.delete(identityID) }

// forgetAll drops everything (revoke all sessions).
func (a *Authenticator) forgetAll() {
	a.sessions.clear()
	a.accounts.clear()
}
