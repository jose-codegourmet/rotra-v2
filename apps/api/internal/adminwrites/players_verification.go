package adminwrites

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Verification override: PATCH /api/players/{playerId}/verification (D-2026-11-16-02). Port of
// apps/admin/src/app/api/players/[playerId]/verification/route.ts PATCH and setAdminVerificationOverride in
// packages/db/src/player/account-verification.ts. The read it answers with is signedin's.

func (s *server) registerPlayers(rt *signedin.Router) {
	rt.Handle("POST /api/players", store.AudienceAdmin, s.admin(s.addPlayer))
	rt.Handle("PATCH /api/players/{playerId}", store.AudienceAdmin, s.admin(s.editPlayer))
	rt.Handle("PATCH /api/players/{playerId}/verification", store.AudienceAdmin, s.admin(s.setVerification))
}

const (
	reasonRequired = "Enter a reason."
	adminVerified  = "ROTRA Admin verified your account"
	adminVerifiedB = "You don't need to finish the verification steps."
	verifiedTarget = "/profile/verification"
)

// strictUUID is the TypeScript's UUID test (/^[0-9a-f]{8}-[0-9a-f]{4}-...$/i): 36 characters, hyphens in their places.
func strictUUID(s string) (pgtype.UUID, bool) {
	var out pgtype.UUID
	if len(s) != 36 {
		return out, false
	}
	for i := 0; i < len(s); i++ {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if s[i] != '-' {
				return out, false
			}
		} else if !isHex(s[i]) {
			return out, false
		}
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return out, false
	}
	return pgtype.UUID{Bytes: id, Valid: true}, true
}

// positiveWhole is /^[1-9]\d*$/: ASCII digits only, no sign, no leading zero, nothing around it.
func positiveWhole(s string) bool {
	if s == "" || s[0] < '1' || s[0] > '9' {
		return false
	}
	for i := 1; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// setVerification is the PATCH handler. The order is the TypeScript's: the JSON body; the player ID (a UUID, or
// `not_found`); the reason (`invalid` on `reason`); the flag (a boolean) and the revision (a positive whole number),
// both `invalid` with no fields; then one transaction that locks the player, reads the verification (not found for a
// player who is not registered or has no account), checks the revision, and returns the current verification when the
// flag already is what was asked (no write). Otherwise it sets or clears the override with the admin and the time,
// raises the revision, records the audit event, and for a set writes the player's notification.
//
// The answer carries the player's ID as the request typed it (the TypeScript passes the text on), so an upper case ID
// is answered, and audited, in upper case.
func (s *server) setVerification(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	typed := r.PathValue("playerId")
	revision := body.Text("revision")
	flag, isBool := body.Bool("verifiedByAdmin")
	reason := fields.JSTrim(body.Text("reason"))
	id, ok := strictUUID(typed)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if reason == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"reason": reasonRequired})
	}
	if !isBool || !positiveWhole(revision) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var out *signedin.AdminVerification
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if err := q.LockPlayerForWrite(ctx, id); err != nil {
			return err
		}
		current, err := signedin.ReadAdminVerification(ctx, q, id)
		if err != nil {
			return err
		}
		if current == nil {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		current.PlayerID = typed
		stored, err := strconv.ParseInt(current.Revision, 10, 64)
		if err != nil {
			return err
		}
		if err := writes.RequireRevision(stored, revision); err != nil {
			return err
		}
		if current.VerifiedByAdmin == flag {
			out = current
			return nil
		}
		now := s.stamp()
		set := sqlcgen.SetPlayerVerificationOverrideParams{ID: id, Now: now}
		action := "player.verification_override_cleared"
		if flag {
			action = "player.verification_override_set"
			set.Override = sqlcgen.NullPlayerVerificationOverride{PlayerVerificationOverride: sqlcgen.PlayerVerificationOverrideVerified, Valid: true}
			set.ByAdmin = pgtype.UUID{Bytes: p.AccountID, Valid: true}
			set.At = now
		}
		revisionNow, err := q.SetPlayerVerificationOverride(ctx, set)
		if err != nil {
			return err
		}
		auditID, err := s.recordAuditEvent(ctx, q, p.AccountID, auditEvent{
			Action: action, TargetType: "player", TargetID: typed, Metadata: map[string]any{"reason": reason},
		})
		if err != nil {
			return err
		}
		// writePlayerNotifications matches the account's player ID with the text of the request, so a player named in
		// upper case has no inbox to it and gets no notification (the TypeScript's behaviour, ported as it is).
		if flag && typed == strings.ToLower(typed) {
			noticeID, err := newUUID()
			if err != nil {
				return err
			}
			if err := q.InsertAccountNotification(ctx, sqlcgen.InsertAccountNotificationParams{
				ID: noticeID, PlayerID: id, Title: adminVerified, Body: adminVerifiedB, Target: verifiedTarget,
				SourceType: pgtype.Text{String: "admin_audit_event", Valid: true},
				SourceID:   pgtype.UUID{Bytes: auditID, Valid: true}, Now: now,
			}); err != nil {
				return err
			}
		}
		current.VerifiedByAdmin = flag
		current.Verified = flag || current.CompletedSteps == 3
		current.Revision = httpapi.ToDecimalString(revisionNow)
		out = current
		return nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: struct {
		Verification *signedin.AdminVerification `json:"verification"`
	}{out}}, nil
}
