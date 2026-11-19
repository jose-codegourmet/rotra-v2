package playerwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Notifications: PATCH /api/me/notifications (mark all read) and PATCH /api/me/notifications/{notificationId} (mark one read).
// Ports of the Route Handlers in apps/player/src/app/api/me/notifications/** and of markPlayerNotificationsRead in
// packages/db/src/player/notifications.ts. Reading a notification writes no notification and no audit event.

func (s *server) registerNotifications(rt *signedin.Router) {
	rt.Handle("PATCH /api/me/notifications", store.AudiencePlayer, s.player(s.markAllRead))
	// The Next route has no PATCH for /api/me/notifications/unread-count (its static GET segment wins and the verb is 405);
	// here the segment is a notification ID like any other and answers not_found (see the track's deviations log).
	rt.Handle("PATCH /api/me/notifications/{notificationId}", store.AudiencePlayer, s.player(s.markOneRead))
}

type okAnswer struct {
	OK bool `json:"ok"`
}

// ownPlayer is requireOwnPlayer: the body's player ID, compared as typed, must be the signed-in player's own. Another's, an
// ID in capitals and a missing one all look the same to a caller probing: not_found.
func ownPlayer(body writes.Body, p session.Principal) error {
	if body.Text("playerId") != p.AccountID.String() {
		return writes.Fail(httpapi.ErrNotFound, nil)
	}
	return nil
}

func (s *server) markAllRead(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := ownPlayer(body, p); err != nil {
		return writes.Result{}, err
	}
	if err := s.markRead(r.Context(), self(p), nil); err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: okAnswer{true}}, nil
}

func (s *server) markOneRead(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := ownPlayer(body, p); err != nil {
		return writes.Result{}, err
	}
	id := r.PathValue("notificationId")
	if err := s.markRead(r.Context(), self(p), &id); err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: okAnswer{true}}, nil
}

// markRead is markPlayerNotificationsRead: a player's first mark wins across retries, including the state-derived reminder.
// one is the notification ID (nil for all of them); the reminder's ID marks the account's reminder only.
func (s *server) markRead(ctx context.Context, player pgtype.UUID, one *string) error {
	now := s.stamp()
	since := pgtype.Timestamptz{Time: now.Time.Add(-signedin.NotificationWindow), Valid: true}
	return writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if one == nil || *one != signedin.NotificationReminderID {
			var target pgtype.UUID
			if one != nil {
				id, ok := parseUUID(*one)
				if !ok {
					return writes.Fail(httpapi.ErrNotFound, nil)
				}
				target = id
			}
			changed, err := q.MarkMyNotificationsRead(ctx, sqlcgen.MarkMyNotificationsReadParams{Now: now, PlayerID: player, Since: since, ID: target})
			if err != nil {
				return err
			}
			if one != nil {
				if changed == 0 {
					if _, err := q.FindVisibleNotification(ctx, sqlcgen.FindVisibleNotificationParams{PlayerID: player, Since: since, ID: target}); errors.Is(err, pgx.ErrNoRows) {
						return writes.Fail(httpapi.ErrNotFound, nil)
					} else if err != nil {
						return err
					}
				}
				return nil
			}
		}
		unread, err := signedin.VerificationReminderUnread(ctx, q, player)
		if err != nil || !unread {
			return err
		}
		return q.MarkVerificationReminderRead(ctx, sqlcgen.MarkVerificationReminderReadParams{Now: now, PlayerID: player})
	})
}
