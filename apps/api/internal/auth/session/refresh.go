package session

import (
	"bytes"
	"context"
	"errors"
	"net/netip"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// refreshOutcome is what a refresh transaction decided. Refusals are outcomes, not errors, because the
// revokes and events they write must commit: Store.InTx rolls back whenever its function returns an error.
type refreshOutcome struct {
	res     Refreshed
	err     error
	revoked bool
}

// Refresh exchanges a refresh pass for a new access pass.
//
//   - The current pass rotates: new refresh pass and access pass; club and player sessions are extended by
//     their full lifetime, Admin sessions keep their 12 hours. A routine refresh writes no auth_events row (B-34).
//   - The previous pass within the grace window of its rotation (B-29) gets a new access pass only: Refreshed.
//     RefreshPass is empty, the refresh cookie must be left alone, and the session is not touched. This is what
//     makes two tabs and a page load refreshing together safe.
//   - The previous pass after the window is reuse: the session is revoked (refresh_reused, with its event) and
//     ErrRefreshReused returned.
//   - A pass that matches nothing is ErrInvalidRefresh and revokes nothing.
//   - A revoked or expired session, or an identity or account that may no longer sign in, is ErrRefreshRefused
//     (and an account that cannot sign in revokes the session as account_disabled).
//
// The session row is locked FOR UPDATE, so concurrent refreshes of one session run one after another and each
// sees the other's rotation. Rate limits are applied per client IP and per session; ip may be nil.
func (s *Service) Refresh(ctx context.Context, refreshPass string, ip *netip.Addr) (Refreshed, error) {
	clientIP := ""
	if ip != nil {
		clientIP = ip.String()
	}
	if err := s.limiter.CheckRefreshIP(ctx, clientIP); err != nil {
		return Refreshed{}, err
	}
	digest, ok := refreshDigest(refreshPass)
	if !ok {
		return Refreshed{}, ErrInvalidRefresh
	}
	sess, err := s.findByDigest(ctx, digest)
	if err != nil {
		return Refreshed{}, err
	}
	if err := s.limiter.CheckRefreshSession(ctx, sess.ID); err != nil {
		return Refreshed{}, err
	}
	var out refreshOutcome
	now := s.clock()
	err = s.st.InTx(ctx, func(q *store.Queries) (err error) {
		out, err = s.refreshLocked(ctx, q, sess.ID, digest, ip, now)
		return err
	})
	if err != nil {
		return Refreshed{}, err
	}
	if out.revoked {
		s.authn.forgetSessions(sess.ID)
	}
	return out.res, out.err
}

// findByDigest finds the session a pass belongs to, current digest first, then previous. This read is outside
// the lock; refreshLocked re-checks the digest on the locked row.
func (s *Service) findByDigest(ctx context.Context, digest []byte) (store.Session, error) {
	sess, err := s.st.FindSessionByRefreshDigest(ctx, digest)
	if errors.Is(err, store.ErrNotFound) {
		sess, err = s.st.FindSessionByPreviousDigest(ctx, digest)
	}
	if errors.Is(err, store.ErrNotFound) {
		return store.Session{}, ErrInvalidRefresh
	}
	return sess, err
}

func (s *Service) refreshLocked(ctx context.Context, q *store.Queries, id uuid.UUID, digest []byte, ip *netip.Addr, now time.Time) (refreshOutcome, error) {
	cur, err := q.GetSessionForUpdate(ctx, id)
	if errors.Is(err, store.ErrNotFound) {
		return refreshOutcome{err: ErrInvalidRefresh}, nil
	}
	if err != nil {
		return refreshOutcome{}, err
	}
	isCurrent := bytes.Equal(cur.RefreshDigest, digest)
	isPrevious := !isCurrent && len(cur.PreviousRefreshDigest) > 0 && bytes.Equal(cur.PreviousRefreshDigest, digest)
	switch {
	case !isCurrent && !isPrevious:
		// Rotated again between the lookup and the lock: the pass is now older than the previous one.
		return refreshOutcome{err: ErrInvalidRefresh}, nil
	case cur.Revoked() || !now.Before(cur.ExpiresAt):
		return refreshOutcome{err: ErrRefreshRefused}, nil
	}
	if isPrevious && (cur.RefreshedAt == nil || now.After(cur.RefreshedAt.Add(s.tuning.RefreshGrace))) {
		if err := s.revokeWithEvent(ctx, q, cur, store.ReasonRefreshReused, store.EventRefreshReused, ip, now); err != nil {
			return refreshOutcome{}, err
		}
		return refreshOutcome{err: ErrRefreshReused, revoked: true}, nil
	}
	acct, err := loadSessionAccount(ctx, q, cur)
	if errors.Is(err, errAccountUnavailable) {
		if err := s.revokeWithEvent(ctx, q, cur, store.ReasonAccountDisabled, store.EventSessionRevoked, ip, now); err != nil {
			return refreshOutcome{}, err
		}
		return refreshOutcome{err: ErrRefreshRefused, revoked: true}, nil
	}
	if err != nil {
		return refreshOutcome{}, err
	}
	if isPrevious { // inside the grace window: an access pass only, the session stays exactly as it is
		access, exp, err := s.accessFor(cur, acct.id, now)
		if err != nil {
			return refreshOutcome{}, err
		}
		return refreshOutcome{res: Refreshed{Session: cur, AccessPass: access, AccessExpiresAt: exp, RefreshExpiresAt: cur.ExpiresAt}}, nil
	}
	token, newDigest, err := newRefreshPass()
	if err != nil {
		return refreshOutcome{}, err
	}
	rot := store.Rotation{ID: cur.ID, NewDigest: newDigest, Now: now, IP: ip}
	if ExtendsOnUse(cur.Audience) {
		exp := now.Add(RefreshLifetime(cur.Audience))
		rot.ExpiresAt = &exp
	}
	if err := q.RotateRefresh(ctx, rot); err != nil {
		return refreshOutcome{}, err
	}
	updated, err := q.GetSession(ctx, cur.ID)
	if err != nil {
		return refreshOutcome{}, err
	}
	access, exp, err := s.accessFor(updated, acct.id, now)
	if err != nil {
		return refreshOutcome{}, err
	}
	return refreshOutcome{res: Refreshed{
		Session: updated, AccessPass: access, AccessExpiresAt: exp,
		RefreshPass: token, RefreshExpiresAt: updated.ExpiresAt, Rotated: true,
	}}, nil
}

// revokeWithEvent revokes one session and writes its event in the caller's transaction.
func (s *Service) revokeWithEvent(ctx context.Context, q *store.Queries, sess store.Session, reason store.RevokeReason, ev store.EventType, ip *netip.Addr, now time.Time) error {
	revoked, err := q.RevokeSession(ctx, sess.ID, reason, now)
	if err != nil || !revoked {
		return err
	}
	return q.InsertEvent(ctx, sessionEvent(sess, ev, ip, now))
}

// sessionEvent is an event about one session.
func sessionEvent(sess store.Session, ev store.EventType, ip *netip.Addr, at time.Time) store.NewEvent {
	return store.NewEvent{IdentityID: &sess.IdentityID, SessionID: &sess.ID, Audience: sess.Audience, Event: ev, IP: ip, DeviceID: sess.DeviceID, At: at}
}
