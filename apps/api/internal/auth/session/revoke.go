package session

import (
	"context"
	"errors"
	"net/netip"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Forget drops what the Authenticator cached about sessions a transaction revoked. The *Tx hooks return it:
// call Forget once the caller's transaction has COMMITTED (never before, or a request could re-cache the
// still-active row). The non-Tx operations do it themselves.
func (s *Service) Forget(r Revoked) {
	s.authn.forgetSessions(r.SessionIDs...)
	if r.IdentityID != uuid.Nil {
		s.authn.forgetAccount(r.IdentityID)
	}
}

// revokeEvents writes one event per revoked session, reading each for its identity, audience and device.
func (s *Service) revokeEvents(ctx context.Context, q *store.Queries, ids []uuid.UUID, ev store.EventType, ip *netip.Addr, at time.Time) error {
	for _, id := range ids {
		sess, err := q.GetSession(ctx, id)
		if err != nil {
			return err
		}
		if err := q.InsertEvent(ctx, sessionEvent(sess, ev, ip, at)); err != nil {
			return err
		}
	}
	return nil
}

// revokeOne ends one session when allow says the caller may. An unknown or refused session is ErrNotFound; an
// already ended one is quietly fine (nothing is written twice). It reports whether this call revoked it.
func (s *Service) revokeOne(ctx context.Context, id uuid.UUID, allow func(store.Session) bool, reason store.RevokeReason, ev store.EventType, ip *netip.Addr) error {
	now := s.clock()
	var revoked bool
	err := s.st.InTx(ctx, func(q *store.Queries) error {
		sess, err := q.GetSession(ctx, id)
		if err != nil {
			return err
		}
		if !allow(sess) {
			return store.ErrNotFound // never reveal that the session exists
		}
		if revoked, err = q.RevokeSession(ctx, id, reason, now); err != nil || !revoked {
			return err
		}
		return q.InsertEvent(ctx, sessionEvent(sess, ev, ip, now))
	})
	if err != nil {
		return err
	}
	if revoked {
		s.authn.forgetSessions(id)
	}
	return nil
}

func anySession(store.Session) bool { return true }

// SignOut ends the caller's own session (reason sign_out, event sign_out). It is idempotent, and an unknown
// session is not an error: signing out twice must never fail the page.
func (s *Service) SignOut(ctx context.Context, sessionID uuid.UUID, ip *netip.Addr) error {
	if err := s.revokeOne(ctx, sessionID, anySession, store.ReasonSignOut, store.EventSignOut, ip); !errors.Is(err, store.ErrNotFound) {
		return err
	}
	return nil
}

// SignOutByRefresh ends the session a refresh pass belongs to, for a sign-out that arrives without a usable
// access pass (the browser was idle past the 15 minutes). The previous pass names the session too. Same reason
// and event as SignOut. Nothing is revealed: a pass that is malformed, matches no session or belongs to another
// app (aud) is quietly fine, and so is a session that already ended.
func (s *Service) SignOutByRefresh(ctx context.Context, refreshPass string, aud store.Audience, ip *netip.Addr) error {
	digest, ok := refreshDigest(refreshPass)
	if !ok {
		return nil
	}
	sess, err := s.findByDigest(ctx, digest)
	if errors.Is(err, ErrInvalidRefresh) {
		return nil
	}
	if err != nil {
		return err
	}
	ownApp := func(x store.Session) bool { return x.Audience == aud }
	if err := s.revokeOne(ctx, sess.ID, ownApp, store.ReasonSignOut, store.EventSignOut, ip); !errors.Is(err, store.ErrNotFound) {
		return err
	}
	return nil
}

// SignOutDevice ends one of the owner's other sessions from the device list (signed_out_by_owner). Only the
// session's own identity may: another identity, and an unknown session, are both ErrNotFound.
func (s *Service) SignOutDevice(ctx context.Context, ownerIdentityID, sessionID uuid.UUID, ip *netip.Addr) error {
	owns := func(sess store.Session) bool { return sess.IdentityID == ownerIdentityID }
	return s.revokeOne(ctx, sessionID, owns, store.ReasonSignedOutByOwner, store.EventSessionRevoked, ip)
}

// SignOutAsAdmin ends a session of a club on the platform owner's behalf (signed_out_by_admin). The session
// must belong to that club (ErrNotFound otherwise). The Admin's own action is recorded in admin_audit_events by
// the caller.
func (s *Service) SignOutAsAdmin(ctx context.Context, clubID, sessionID uuid.UUID, ip *netip.Addr) error {
	inClub := func(sess store.Session) bool { return sess.ClubID != nil && *sess.ClubID == clubID }
	return s.revokeOne(ctx, sessionID, inClub, store.ReasonSignedOutByAdmin, store.EventSessionRevoked, ip)
}

// revokeIdentity revokes an identity's sessions inside q's transaction and writes one session_revoked each.
func (s *Service) revokeIdentity(ctx context.Context, q *store.Queries, identityID uuid.UUID, except *uuid.UUID, reason store.RevokeReason, ip *netip.Addr, now time.Time) (Revoked, error) {
	ids, err := q.RevokeIdentitySessions(ctx, identityID, reason, now, except)
	if err != nil {
		return Revoked{}, err
	}
	if err := s.revokeEvents(ctx, q, ids, store.EventSessionRevoked, ip, now); err != nil {
		return Revoked{}, err
	}
	return Revoked{IdentityID: identityID, SessionIDs: ids}, nil
}

// inOwnTx runs a *Tx hook in its own transaction and forgets what it revoked once that committed.
func (s *Service) inOwnTx(ctx context.Context, hook func(q *store.Queries) (Revoked, error)) (int, error) {
	var rev Revoked
	err := s.st.InTx(ctx, func(q *store.Queries) (err error) {
		rev, err = hook(q)
		return err
	})
	if err != nil {
		return 0, err
	}
	s.Forget(rev)
	return len(rev.SessionIDs), nil
}

// SignOutAll ends every session of the identity (signed_out_by_owner), except one when set (the device that
// asked). It returns how many it ended.
func (s *Service) SignOutAll(ctx context.Context, identityID uuid.UUID, except *uuid.UUID, ip *netip.Addr) (int, error) {
	now := s.clock()
	return s.inOwnTx(ctx, func(q *store.Queries) (Revoked, error) {
		return s.revokeIdentity(ctx, q, identityID, except, store.ReasonSignedOutByOwner, ip, now)
	})
}

// RevokeDevice removes a Queue device and ends its sessions in one transaction (reason device_revoked): a
// device_revoked event for the device and a session_revoked for each session. It returns how many sessions it
// ended. store.ErrNotFound when the club has no such device. Repeating it changes and writes nothing.
func (s *Service) RevokeDevice(ctx context.Context, clubID, deviceID uuid.UUID, ip *netip.Addr) (int, error) {
	now := s.clock()
	return s.inOwnTx(ctx, func(q *store.Queries) (Revoked, error) {
		first, err := q.RevokeDevice(ctx, clubID, deviceID, now)
		if err != nil {
			return Revoked{}, err
		}
		ids, err := q.RevokeDeviceSessions(ctx, clubID, deviceID, store.ReasonDeviceRevoked, now)
		if err != nil {
			return Revoked{}, err
		}
		if first {
			if err := q.InsertEvent(ctx, store.NewEvent{Audience: store.AudienceClub, Event: store.EventDeviceRevoked, IP: ip, DeviceID: &deviceID, At: now}); err != nil {
				return Revoked{}, err
			}
		}
		if err := s.revokeEvents(ctx, q, ids, store.EventSessionRevoked, ip, now); err != nil {
			return Revoked{}, err
		}
		return Revoked{SessionIDs: ids}, nil
	})
}

// OnPasswordChangedTx is the password change hook for a caller that already has a transaction (the password
// reset: consume the reset row, write the new hash, revoke the sessions, one transaction). It revokes the
// identity's sessions except one (the device that changed the password; nil for a reset) with reason
// password_changed, and writes a password_changed event and a session_revoked for each. After the caller's
// transaction commits, hand the result to Forget.
func (s *Service) OnPasswordChangedTx(ctx context.Context, q *store.Queries, identityID uuid.UUID, except *uuid.UUID, ip *netip.Addr) (Revoked, error) {
	now := s.clock()
	ident, err := q.GetIdentityByID(ctx, identityID)
	if err != nil {
		return Revoked{}, err
	}
	rev, err := s.revokeIdentity(ctx, q, identityID, except, store.ReasonPasswordChanged, ip, now)
	if err != nil {
		return Revoked{}, err
	}
	err = q.InsertEvent(ctx, store.NewEvent{IdentityID: &identityID, SessionID: except, Audience: ident.Audience, Event: store.EventPasswordChanged, IP: ip, At: now})
	return rev, err
}

// OnPasswordChanged is OnPasswordChangedTx in its own transaction. It returns how many sessions it ended.
func (s *Service) OnPasswordChanged(ctx context.Context, identityID uuid.UUID, except *uuid.UUID, ip *netip.Addr) (int, error) {
	return s.inOwnTx(ctx, func(q *store.Queries) (Revoked, error) {
		return s.OnPasswordChangedTx(ctx, q, identityID, except, ip)
	})
}

// OnAccountDisabledTx revokes every session of an identity whose account was disabled (reason account_disabled,
// a session_revoked event each), inside the caller's transaction. Then hand the result to Forget.
func (s *Service) OnAccountDisabledTx(ctx context.Context, q *store.Queries, identityID uuid.UUID, ip *netip.Addr) (Revoked, error) {
	return s.revokeIdentity(ctx, q, identityID, nil, store.ReasonAccountDisabled, ip, s.clock())
}

// OnAccountDisabled is OnAccountDisabledTx in its own transaction. It returns how many sessions it ended.
func (s *Service) OnAccountDisabled(ctx context.Context, identityID uuid.UUID, ip *netip.Addr) (int, error) {
	return s.inOwnTx(ctx, func(q *store.Queries) (Revoked, error) {
		return s.OnAccountDisabledTx(ctx, q, identityID, ip)
	})
}

// RevokeAllSessions is the platform owner's emergency command (B-47: only if the refresh digests leaked): it
// ends every active session of every account (signed_out_by_admin) and every device is out on its next refresh.
// It returns how many sessions it ended. Writes stop at once on this instance; reads end within the access
// pass lifetime.
func (s *Service) RevokeAllSessions(ctx context.Context) (int64, error) {
	n, err := s.st.RevokeAllSessions(ctx, store.ReasonSignedOutByAdmin, s.clock())
	if err != nil {
		return 0, err
	}
	s.authn.forgetAll()
	return n, nil
}
