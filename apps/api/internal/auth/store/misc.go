package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// InsertEvent appends an auth_events row. It never takes an email, username or password.
func (q *Queries) InsertEvent(ctx context.Context, in NewEvent) error {
	return wrap("insert event", q.q.InsertAuthEvent(ctx, sqlcgen.InsertAuthEventParams{
		IdentityID: pgUUIDp(in.IdentityID), SessionID: pgUUIDp(in.SessionID), Audience: string(in.Audience),
		Event: string(in.Event), Ip: in.IP, DeviceID: pgUUIDp(in.DeviceID), At: pgTime(in.At),
	}))
}

// UpsertAttempt counts one attempt in a window and returns the count including this one. It is one
// statement: call it on the Store (not inside the sign-in transaction), so the count survives a rollback.
func (q *Queries) UpsertAttempt(ctx context.Context, scope RateScope, subject string, action RateAction, windowStart time.Time) (int, error) {
	n, err := q.q.UpsertAuthRateLimit(ctx, sqlcgen.UpsertAuthRateLimitParams{
		Scope: string(scope), Subject: subject, Action: string(action), WindowStart: pgTime(windowStart),
	})
	if err != nil {
		return 0, wrap("upsert attempt", err)
	}
	return int(n), nil
}

// AttemptCount reads one window's count without counting anything (0 when there is no row). The sign-in
// uses it to see whether an account is already over its wrong-password limit.
func (q *Queries) AttemptCount(ctx context.Context, scope RateScope, subject string, action RateAction, windowStart time.Time) (int, error) {
	n, err := q.q.GetAuthRateLimitAttempts(ctx, sqlcgen.GetAuthRateLimitAttemptsParams{
		Scope: string(scope), Subject: subject, Action: string(action), WindowStart: pgTime(windowStart),
	})
	if err != nil {
		return 0, wrap("read attempts", err)
	}
	return int(n), nil
}

// DeleteExpiredWindows removes every counter window that started before the cutoff.
func (q *Queries) DeleteExpiredWindows(ctx context.Context, before time.Time) (int64, error) {
	n, err := q.q.DeleteExpiredAuthRateLimits(ctx, pgTime(before))
	return n, wrap("delete expired windows", err)
}

// DeleteExpiredWindowsFor removes one subject's windows that started before the cutoff: the sign-in request
// prunes the subject it just counted, so no scheduled job is needed (B-07).
func (q *Queries) DeleteExpiredWindowsFor(ctx context.Context, scope RateScope, subject string, before time.Time) (int64, error) {
	n, err := q.q.DeleteExpiredAuthRateLimitsForSubject(ctx, sqlcgen.DeleteExpiredAuthRateLimitsForSubjectParams{
		Scope: string(scope), Subject: subject, Before: pgTime(before),
	})
	return n, wrap("delete expired windows for subject", err)
}

func deviceFrom(r sqlcgen.Device) Device {
	d := Device{ID: fromPgUUID(r.ID), ClubID: fromPgUUID(r.ClubID), Label: r.Label,
		RegisteredAt: fromPgTime(r.RegisteredAt), RevokedAt: fromPgTimep(r.RevokedAt), Revision: r.Revision}
	if r.RevokeReason.Valid {
		s := r.RevokeReason.String
		d.RevokeReason = &s
	}
	return d
}

// GetDevice reads one device of a club.
func (q *Queries) GetDevice(ctx context.Context, clubID, deviceID uuid.UUID) (Device, error) {
	r, err := q.q.GetDeviceForClub(ctx, sqlcgen.GetDeviceForClubParams{ClubID: pgUUID(clubID), ID: pgUUID(deviceID)})
	if err != nil {
		return Device{}, wrap("get device", err)
	}
	return deviceFrom(r), nil
}

// DefaultDeviceLabel is the label of a device enrolled without one (same as registerDevice).
const DefaultDeviceLabel = "This device"

// EnrollDevice registers a browser on the club the way registerDevice does today: a new id is inserted;
// an id that already belongs to this club returns the stored row untouched (created is false); an id that
// belongs to another club is ErrDeviceOtherClub (not_found) and a revoked one is ErrDeviceRevoked
// (forbidden). Safe under concurrent calls: exactly one caller creates the row.
func (q *Queries) EnrollDevice(ctx context.Context, clubID, deviceID uuid.UUID, label string, now time.Time) (d Device, created bool, err error) {
	label = strings.TrimSpace(label)
	if label == "" {
		label = DefaultDeviceLabel
	}
	row, err := q.q.InsertDeviceIfNew(ctx, sqlcgen.InsertDeviceIfNewParams{
		ID: pgUUID(deviceID), ClubID: pgUUID(clubID), Label: label, Now: pgTime(now),
	})
	if err == nil {
		return deviceFrom(row), true, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Device{}, false, wrap("enroll device", err)
	}
	existing, err := q.q.GetDeviceByID(ctx, pgUUID(deviceID))
	if err != nil {
		return Device{}, false, wrap("enroll device", err)
	}
	if fromPgUUID(existing.ClubID) != clubID {
		return Device{}, false, ErrDeviceOtherClub
	}
	if existing.RevokedAt.Valid {
		return Device{}, false, ErrDeviceRevoked
	}
	return deviceFrom(existing), false, nil
}

// RevokeDevice marks a device removed. It is idempotent: true only for the call that revoked it, and the
// first revoke's time stays. ErrNotFound when the club has no such device. Revoking the device's sessions
// is RevokeDeviceSessions, in the same transaction.
func (q *Queries) RevokeDevice(ctx context.Context, clubID, deviceID uuid.UUID, at time.Time) (bool, error) {
	n, err := q.q.RevokeDeviceRow(ctx, sqlcgen.RevokeDeviceRowParams{At: pgTime(at), ClubID: pgUUID(clubID), ID: pgUUID(deviceID)})
	if err != nil {
		return false, wrap("revoke device", err)
	}
	if n > 0 {
		return true, nil
	}
	if _, err := q.q.GetDeviceForClub(ctx, sqlcgen.GetDeviceForClubParams{ClubID: pgUUID(clubID), ID: pgUUID(deviceID)}); err != nil {
		return false, wrap("revoke device", err)
	}
	return false, nil
}
