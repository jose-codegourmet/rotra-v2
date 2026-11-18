package store

import (
	"context"
	"net/netip"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

func sessionFrom(r sqlcgen.AuthSession) Session {
	return Session{
		ID: fromPgUUID(r.ID), IdentityID: fromPgUUID(r.IdentityID), Audience: Audience(r.Audience),
		ClubID: fromPgUUIDp(r.ClubID), DeviceID: fromPgUUIDp(r.DeviceID), DeviceLabel: r.DeviceLabel,
		RefreshDigest: r.RefreshDigest, PreviousRefreshDigest: r.PreviousRefreshDigest,
		RefreshedAt: fromPgTimep(r.RefreshedAt), CreatedIP: r.CreatedIp, LastIP: r.LastIp,
		LastSeenAt: fromPgTime(r.LastSeenAt), ExpiresAt: fromPgTime(r.ExpiresAt),
		RevokedAt: fromPgTimep(r.RevokedAt), RevokeReason: RevokeReason(r.RevokeReason.String),
		CreatedAt: fromPgTime(r.CreatedAt),
	}
}

func reasonText(r RevokeReason) pgtype.Text { return pgtype.Text{String: string(r), Valid: true} }

// InsertSession creates a session. The device, when given, must already be enrolled for the same club
// (the composite foreign key refuses another club's device).
func (q *Queries) InsertSession(ctx context.Context, in NewSession) (Session, error) {
	r, err := q.q.InsertAuthSession(ctx, sqlcgen.InsertAuthSessionParams{
		ID: pgUUID(idOrNew(in.ID)), IdentityID: pgUUID(in.IdentityID), Audience: string(in.Audience),
		ClubID: pgUUIDp(in.ClubID), DeviceID: pgUUIDp(in.DeviceID), DeviceLabel: in.DeviceLabel,
		RefreshDigest: in.RefreshDigest, CreatedIp: in.CreatedIP, Now: pgTime(in.Now), ExpiresAt: pgTime(in.ExpiresAt),
	})
	if err != nil {
		return Session{}, wrap("insert session", err)
	}
	return sessionFrom(r), nil
}

// GetSession reads a session by id (revoked ones too).
func (q *Queries) GetSession(ctx context.Context, id uuid.UUID) (Session, error) {
	r, err := q.q.GetAuthSession(ctx, pgUUID(id))
	if err != nil {
		return Session{}, wrap("get session", err)
	}
	return sessionFrom(r), nil
}

// GetSessionForUpdate reads a session and locks its row until the transaction ends. Use it inside
// Store.InTx: a concurrent refresh of the same session waits for the first to finish.
func (q *Queries) GetSessionForUpdate(ctx context.Context, id uuid.UUID) (Session, error) {
	r, err := q.q.GetAuthSessionForUpdate(ctx, pgUUID(id))
	if err != nil {
		return Session{}, wrap("lock session", err)
	}
	return sessionFrom(r), nil
}

// FindSessionByRefreshDigest finds the session whose current refresh digest this is.
func (q *Queries) FindSessionByRefreshDigest(ctx context.Context, digest []byte) (Session, error) {
	r, err := q.q.FindAuthSessionByRefreshDigest(ctx, digest)
	if err != nil {
		return Session{}, wrap("find session by refresh digest", err)
	}
	return sessionFrom(r), nil
}

// FindSessionByPreviousDigest finds the session whose retired (previous) refresh digest this is: the reuse
// check of B-29.
func (q *Queries) FindSessionByPreviousDigest(ctx context.Context, digest []byte) (Session, error) {
	r, err := q.q.FindAuthSessionByPreviousDigest(ctx, digest)
	if err != nil {
		return Session{}, wrap("find session by previous digest", err)
	}
	return sessionFrom(r), nil
}

// RotateRefresh moves the current digest to previous and stores the new one. ErrNotFound when the session
// does not exist or is revoked.
func (q *Queries) RotateRefresh(ctx context.Context, in Rotation) error {
	n, err := q.q.RotateAuthSessionRefresh(ctx, sqlcgen.RotateAuthSessionRefreshParams{
		NewDigest: in.NewDigest, Now: pgTime(in.Now), ExpiresAt: pgTimep(in.ExpiresAt), Ip: in.IP, ID: pgUUID(in.ID),
	})
	return rowsOrNotFound("rotate refresh", n, err)
}

// TouchLastSeen records activity, at most once per TouchInterval. It reports whether it wrote.
func (q *Queries) TouchLastSeen(ctx context.Context, id uuid.UUID, now time.Time, ip *netip.Addr) (bool, error) {
	n, err := q.q.TouchAuthSession(ctx, sqlcgen.TouchAuthSessionParams{
		Now: pgTime(now), Ip: ip, ID: pgUUID(id), StaleBefore: pgTime(now.Add(-TouchInterval)),
	})
	if err != nil {
		return false, wrap("touch session", err)
	}
	return n > 0, nil
}

// RevokeSession ends a session. It is idempotent: it reports true only for the call that revoked it, and
// the first revoke's time and reason stay. An unknown id is false, not an error.
func (q *Queries) RevokeSession(ctx context.Context, id uuid.UUID, reason RevokeReason, at time.Time) (bool, error) {
	n, err := q.q.RevokeAuthSession(ctx, sqlcgen.RevokeAuthSessionParams{At: pgTime(at), Reason: reasonText(reason), ID: pgUUID(id)})
	if err != nil {
		return false, wrap("revoke session", err)
	}
	return n > 0, nil
}

// RevokeIdentitySessions ends every active session of an identity, except one when except is set (the
// device that changed the password). It returns the ids it revoked, for the events.
func (q *Queries) RevokeIdentitySessions(ctx context.Context, identityID uuid.UUID, reason RevokeReason, at time.Time, except *uuid.UUID) ([]uuid.UUID, error) {
	ids, err := q.q.RevokeAuthSessionsByIdentity(ctx, sqlcgen.RevokeAuthSessionsByIdentityParams{
		At: pgTime(at), Reason: reasonText(reason), IdentityID: pgUUID(identityID), ExceptID: pgUUIDp(except),
	})
	if err != nil {
		return nil, wrap("revoke identity sessions", err)
	}
	return uuidsFrom(ids), nil
}

// RevokeDeviceSessions ends every active session on one device of a club. It returns the ids it revoked.
func (q *Queries) RevokeDeviceSessions(ctx context.Context, clubID, deviceID uuid.UUID, reason RevokeReason, at time.Time) ([]uuid.UUID, error) {
	ids, err := q.q.RevokeAuthSessionsByDevice(ctx, sqlcgen.RevokeAuthSessionsByDeviceParams{
		At: pgTime(at), Reason: reasonText(reason), ClubID: pgUUID(clubID), DeviceID: pgUUID(deviceID),
	})
	if err != nil {
		return nil, wrap("revoke device sessions", err)
	}
	return uuidsFrom(ids), nil
}

// ListActiveSessionsByIdentity lists an identity's sessions that are neither revoked nor expired at now,
// newest activity first.
func (q *Queries) ListActiveSessionsByIdentity(ctx context.Context, identityID uuid.UUID, now time.Time) ([]Session, error) {
	rows, err := q.q.ListActiveAuthSessionsByIdentity(ctx, sqlcgen.ListActiveAuthSessionsByIdentityParams{
		IdentityID: pgUUID(identityID), Now: pgTime(now),
	})
	if err != nil {
		return nil, wrap("list sessions by identity", err)
	}
	out := make([]Session, len(rows))
	for i, r := range rows {
		out[i] = sessionFrom(r)
	}
	return out, nil
}

// ListActiveSessionsByClub lists a club's active sessions with their device, newest activity first.
func (q *Queries) ListActiveSessionsByClub(ctx context.Context, clubID uuid.UUID, now time.Time) ([]ClubSession, error) {
	rows, err := q.q.ListActiveAuthSessionsByClub(ctx, sqlcgen.ListActiveAuthSessionsByClubParams{ClubID: pgUUID(clubID), Now: pgTime(now)})
	if err != nil {
		return nil, wrap("list sessions by club", err)
	}
	out := make([]ClubSession, len(rows))
	for i, r := range rows {
		out[i] = ClubSession{Session: sessionFrom(r.AuthSession), DeviceRevokedAt: fromPgTimep(r.DeviceRevokedAt)}
		if r.DeviceCurrentLabel.Valid {
			label := r.DeviceCurrentLabel.String
			out[i].DeviceLabelCurrent = &label
		}
	}
	return out, nil
}

// RevokeAllSessions ends every active session of every identity ("revoke all sessions", B-47) and writes
// one session_revoked event for each, in one statement. It returns how many sessions it revoked.
func (q *Queries) RevokeAllSessions(ctx context.Context, reason RevokeReason, at time.Time) (int64, error) {
	n, err := q.q.RevokeAllAuthSessions(ctx, sqlcgen.RevokeAllAuthSessionsParams{At: pgTime(at), Reason: reasonText(reason)})
	if err != nil {
		return 0, wrap("revoke all sessions", err)
	}
	return n, nil
}
