package signedin

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The Player reads the Player writes answer with and decide on: the same account, contact request and verification
// reminder the GET routes send, shared here so a write can never disagree with a read about what the player sees. The
// writes (internal/playerwrites) call these.

// MyAccount is MyAccount on the wire: the player's own contacts, privacy switches and Google identity.
type MyAccount = accountDTO

// ReadMyAccount is readMyAccount.
func ReadMyAccount(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) (MyAccount, error) {
	return readMyAccount(ctx, q, id)
}

// OwnContactChange is a contact-change request as its own player sees it.
type OwnContactChange = contactChangeDTO

// OwnContactChangeOf is ownRequestDto for a request row.
func OwnContactChangeOf(r sqlcgen.PlayerContactChangeRequest) OwnContactChange {
	return toContactChangeDTO(sqlcgen.ListOwnContactChangesRow{
		ID: r.ID, PlayerID: r.PlayerID, Field: r.Field, OriginalValue: r.OriginalValue, ProposedValue: r.ProposedValue,
		Status: r.Status, RequestedAt: r.RequestedAt, AppliedAt: r.AppliedAt, RejectedAt: r.RejectedAt, SupersededAt: r.SupersededAt,
	})
}

// VerificationReminderUnread says whether the state-derived "Verify your ROTRA account" reminder is shown and unread: the
// player is claimed with an account, not verified, and has not marked it read (reminderFor(...)?.readAt === null).
func VerificationReminderUnread(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) (bool, error) {
	// D-2026-11-18-01: no verification reminder while Google sign-in for players is off; a missing flag or a failed read is off.
	if on, err := q.GetFeatureFlagValue(ctx, playerGoogleFlag); err != nil || !on {
		return false, nil
	}
	r, err := http.NewRequestWithContext(ctx, http.MethodGet, "/", nil)
	if err != nil {
		return false, err
	}
	v, err := readVerification(r, q, id)
	if err != nil || v == nil || v.dto.Verified {
		return false, err
	}
	return !v.reminderReadAt.Valid, nil
}

// NotificationReminderID is the ID of the state-derived reminder in the notification list (VERIFICATION_REMINDER_ID).
const NotificationReminderID = verificationReminderID

// NotificationWindow is how far back a notification is shown (NOTIFICATION_VISIBILITY_MS).
const NotificationWindow = notificationVisibility

// GoogleRequired is googleRequiredFor: after the deadline, with the flag on, a player with no Google account may only
// connect Google or sign out. The flag is read only once the deadline has passed and the player has no Google.
func GoogleRequired(ctx context.Context, pool *pgxpool.Pool, now func() time.Time, id pgtype.UUID) (bool, error) {
	r, err := http.NewRequestWithContext(ctx, http.MethodGet, "/", nil)
	if err != nil {
		return false, err
	}
	return (&server{pool: pool, now: now}).googleRequired(r, viewer{ID: id})
}

// GoogleDeadlinePassed is isGoogleDeadlinePassed(GOOGLE_SIGN_IN_DEADLINE.date): the deadline day ends at midnight in the Philippines.
func GoogleDeadlinePassed(now time.Time) bool { return !now.Before(googleDeadline) }

// GoogleRequiredMessage is GOOGLE_REQUIRED, the message of the refusal.
const GoogleRequiredMessage = googleRequiredMessage

// ReadClubInviteCode is readClubInviteCode in @rotra/data/club/invite-code: the `k` of a club link, trimmed and upper-cased
// the way JavaScript does it; ok is false when it cannot be a stored code.
func ReadClubInviteCode(value string) (string, bool) { return readClubInviteCode(value) }
