package signedin

import (
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// GET /api/me/notifications and /api/me/notifications/unread-count. Ports of
// packages/db/src/player/notifications.ts and @rotra/data/player-notifications/rules.

const (
	// notificationVisibility is NOTIFICATION_VISIBILITY_MS: 90 days.
	notificationVisibility = 90 * 24 * time.Hour
	// verificationReminderID is VERIFICATION_REMINDER_ID.
	verificationReminderID = "ann-google"
	// googleDeadlineLabel is GOOGLE_SIGN_IN_DEADLINE.label, the way copy writes the date.
	googleDeadlineLabel = "December 31, 2026"
)

type notificationDTO struct {
	ID        string  `json:"id"`
	Kind      string  `json:"kind"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	Target    string  `json:"target"`
	CreatedAt string  `json:"createdAt"`
	ReadAt    *string `json:"readAt"`
	Pinned    bool    `json:"pinned"`
}

func (s *server) visibleSince() pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: s.now().Add(-notificationVisibility), Valid: true}
}

// reminderFor is the state-derived "Verify your ROTRA account" reminder, or nil when the account is verified
// (or has no verification facts).
func (s *server) reminderFor(r *http.Request, q *sqlcgen.Queries, who viewer) (*notificationDTO, error) {
	v, err := readVerification(r, q, who.ID)
	if err != nil || v == nil || v.dto.Verified {
		return nil, err
	}
	return &notificationDTO{
		ID: verificationReminderID, Kind: "announce", Title: "Verify your ROTRA account",
		Body: fmt.Sprintf("Connect Google, have your phone on file and use your Google email, by %s. %d of 3 done.",
			googleDeadlineLabel, v.dto.CompletedSteps),
		Target: "/profile/verification", CreatedAt: httpapi.ToIso(s.now().Add(-time.Minute)),
		ReadAt: isoPtr(v.reminderReadAt), Pinned: true,
	}, nil
}

func (s *server) myNotifications() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		ctx := r.Context()
		rows, err := q.ListMyNotifications(ctx, sqlcgen.ListMyNotificationsParams{PlayerID: who.ID, CreatedAt: s.visibleSince()})
		if err != nil {
			return nil, err
		}
		var clubIDs []pgtype.UUID
		for _, row := range rows {
			if row.Kind != sqlcgen.PlayerNotificationKindClub {
				continue
			}
			// target.slice('/clubs/'.length) must be a UUID; anything else can name no club.
			if id, ok := parseUUIDString(row.Target[min(len("/clubs/"), len(row.Target)):]); ok {
				clubIDs = append(clubIDs, id)
			}
		}
		clubTargets := map[string]bool{}
		if len(clubIDs) > 0 {
			member, err := q.ListMyClubMembershipIDs(ctx, sqlcgen.ListMyClubMembershipIDsParams{PlayerID: who.ID, Column2: clubIDs})
			if err != nil {
				return nil, err
			}
			for _, id := range member {
				clubTargets["/clubs/"+id.String()] = true
			}
		}
		list := make([]notificationDTO, 0, len(rows)+1)
		for _, row := range rows {
			target := row.Target
			if row.Kind == sqlcgen.PlayerNotificationKindClub && !clubTargets[target] {
				target = "/players/" + who.ID.String()
			}
			list = append(list, notificationDTO{
				ID: row.ID.String(), Kind: string(row.Kind), Title: row.Title, Body: row.Body, Target: target,
				CreatedAt: httpapi.ToIso(row.CreatedAt.Time), ReadAt: isoPtr(row.ReadAt),
			})
		}
		reminder, err := s.reminderFor(r, q, who)
		if err != nil {
			return nil, err
		}
		if reminder != nil {
			list = append([]notificationDTO{*reminder}, list...)
		}
		return struct {
			PlayerID      string            `json:"playerId"`
			Notifications []notificationDTO `json:"notifications"`
		}{who.ID.String(), list}, nil
	})
}

func (s *server) myUnreadCount() http.Handler {
	return s.player(func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
		n, err := q.CountMyUnreadNotifications(r.Context(), sqlcgen.CountMyUnreadNotificationsParams{PlayerID: who.ID, CreatedAt: s.visibleSince()})
		if err != nil {
			return nil, err
		}
		reminder, err := s.reminderFor(r, q, who)
		if err != nil {
			return nil, err
		}
		if reminder != nil && reminder.ReadAt == nil {
			n++
		}
		return struct {
			PlayerID    string `json:"playerId"`
			UnreadCount int64  `json:"unreadCount"`
		}{who.ID.String(), n}, nil
	})
}
