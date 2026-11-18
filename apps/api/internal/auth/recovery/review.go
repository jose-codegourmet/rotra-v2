package recovery

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Admin audit actions (recordAudit in password-resets.ts) and their target type.
const (
	auditIssued     = "player.password_reset_link_issued"
	auditDeclined   = "player.password_reset_declined"
	auditTargetType = "password_reset_request"
)

// tokenBytes is the size of a reset token before encoding.
const tokenBytes = 32

// ReviewInput is the Admin's decision on a request.
type ReviewInput struct {
	// Action is "issue" or "decline".
	Action string
	// OwnershipVerified must be true to issue: the Admin has checked who is asking, out of band.
	OwnershipVerified bool
}

// ReviewResult is what Review answers: the one-time link token on an issue, null on a decline. The token is shown
// to the Admin once; only its SHA-256 is stored.
type ReviewResult struct {
	Token *string `json:"token"`
}

// newToken makes a reset token: 32 random bytes as unpadded base64url, and its stored digest.
func newToken(rnd io.Reader) (token string, digest []byte, err error) {
	var b [tokenBytes]byte
	if _, err := io.ReadFull(rnd, b[:]); err != nil {
		return "", nil, fmt.Errorf("recovery: reading random bytes: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(b[:])
	return token, digestOf(token), nil
}

// digestOf is the stored form of a token: SHA-256 of its UTF-8 bytes (digest() in password-resets.ts).
func digestOf(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

// parseID reads a canonical UUID in either case (the TypeScript's pattern is case-insensitive). uuid.Parse alone
// also takes braces, a urn: prefix and no hyphens.
func parseID(s string) (uuid.UUID, bool) {
	if len(s) != 36 || strings.Count(s, "-") != 4 {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// Review issues a link or declines a request (reviewPasswordResetRequest). The caller has authenticated the
// Admin (adminID); nothing here checks that the Admin is active.
//
// One transaction, locking the player row and then the request row (Reset locks in the same order). Where the
// TypeScript reserved an issuance lease and then called the provider outside a transaction, issuing is now one
// step: the earlier links of the player are revoked, the new token's digest is stored, and the audit rows are
// written together. Two Admins issuing at once run one after the other and the later link wins; the 60 second
// "a link is being generated" refusal has nothing left to protect and is gone.
//
// Refusals are *Error: invalid (id, action, ownership), not_found, conflict (the request is declined, a decline
// of a request that is not pending, an account that cannot be helped).
func (r *Recovery) Review(ctx context.Context, adminID uuid.UUID, id string, in ReviewInput) (ReviewResult, error) {
	rid, ok := parseID(id)
	if !ok || (in.Action != "issue" && in.Action != "decline") {
		return ReviewResult{}, refuse(httpapi.ErrInvalid, "", "")
	}
	issuing := in.Action == "issue"
	if issuing && !in.OwnershipVerified {
		return ReviewResult{}, refuse(httpapi.ErrInvalid, "ownership", msgOwnership)
	}
	var token string
	var digest []byte
	if issuing {
		var err error
		if token, digest, err = newToken(rand.Reader); err != nil {
			return ReviewResult{}, err
		}
	}
	now := r.clock()
	err := r.st.InTxWith(ctx, func(tx pgx.Tx, sq *store.Queries) error {
		q := sqlcgen.New(tx)
		// Lock order: the player row, then the request row.
		playerID, err := q.GetResetRequestPlayer(ctx, pgUUID(rid))
		if errors.Is(err, pgx.ErrNoRows) {
			return refuse(httpapi.ErrNotFound, "", "")
		}
		if err != nil {
			return err
		}
		if playerID.Valid {
			if _, err := q.LockResetPlayer(ctx, playerID); err != nil {
				return err
			}
		}
		if _, err := q.LockResetRequest(ctx, pgUUID(rid)); err != nil {
			return err
		}
		req, err := q.GetResetRequest(ctx, pgUUID(rid))
		if err != nil {
			return err
		}
		if req.Status == sqlcgen.PasswordResetRequestStatusDeclined || (!issuing && req.Status != sqlcgen.PasswordResetRequestStatusPending) {
			return refuse(httpapi.ErrConflict, "", "")
		}
		admin := pgUUID(adminID)
		at := pgtype.Timestamptz{Time: now, Valid: true}
		if !issuing {
			if err := q.DeclineResetRequest(ctx, sqlcgen.DeclineResetRequestParams{AdminID: admin, Now: at, ID: pgUUID(rid)}); err != nil {
				return err
			}
			return r.audit(ctx, q, adminID, auditDeclined, rid, now)
		}
		a := accountFrom(req.ContactEmail, req.AuthProvider, req.AuthSubject, req.AccountDisabledAt, req.ContactSyncStatus, req.IdentityUsable)
		if !a.eligible(req.Email) || !req.PlayerID.Valid {
			return refuse(httpapi.ErrConflict, "account", msgAccount)
		}
		// Revoke the player's earlier links (and any lease the TypeScript left), then issue this one.
		if err := q.RevokePlayerResetLinks(ctx, sqlcgen.RevokePlayerResetLinksParams{Now: at, PlayerID: req.PlayerID}); err != nil {
			return err
		}
		n, err := q.IssueResetRequest(ctx, sqlcgen.IssueResetRequestParams{
			AdminID: admin, Now: at, AuthSubject: a.subject, Digest: digest, ID: pgUUID(rid),
		})
		if err != nil {
			return err
		}
		if n != 1 {
			return refuse(httpapi.ErrConflict, "", "")
		}
		if err := r.audit(ctx, q, adminID, auditIssued, rid, now); err != nil {
			return err
		}
		identityID := uuidOf(a.subject)
		return sq.InsertEvent(ctx, store.NewEvent{IdentityID: &identityID, Audience: store.AudiencePlayer, Event: store.EventPasswordResetIssued, At: now})
	})
	if err != nil {
		return ReviewResult{}, asRefusal(err)
	}
	if !issuing {
		return ReviewResult{}, nil
	}
	return ReviewResult{Token: &token}, nil
}

// audit is recordAudit: one admin_audit_events row in the caller's transaction. No token, email or password is
// ever put in it.
func (r *Recovery) audit(ctx context.Context, q *sqlcgen.Queries, adminID uuid.UUID, action string, target uuid.UUID, now time.Time) error {
	return q.InsertAdminAudit(ctx, sqlcgen.InsertAdminAuditParams{
		ID: pgUUID(store.NewID()), ActorAdminID: pgUUID(adminID), Action: action, TargetType: auditTargetType,
		TargetID: target.String(), Now: pgtype.Timestamptz{Time: now, Valid: true},
	})
}

// asRefusal keeps a refusal as it is and wraps anything else with the package name.
func asRefusal(err error) error {
	var re *Error
	if errors.As(err, &re) {
		return re
	}
	return fmt.Errorf("recovery: %w", err)
}
