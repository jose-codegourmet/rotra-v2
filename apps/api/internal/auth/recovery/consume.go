package recovery

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/netip"
	"unicode/utf16"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// maxTokenUnits bounds a token the way consumeReviewedResetToken does (1024 UTF-16 code units).
const maxTokenUnits = 1024

// errLinkGone ends the reset transaction with the one refusal for every unusable link.
var errLinkGone = refuse(httpapi.ErrForbidden, "link", msgLinkUsed)

// Reset sets a new password from a reviewed link (resetPassword and consumeReviewedResetToken). The player is left
// signed out: no session is issued, and every session the player had is ended.
//
// In order: the password is checked (empty, then password.Validate), then the token's size, then the password is
// hashed, then ONE transaction does the rest. The checks and the hash come before the token is looked at, so a
// weak password never spends the link and an unknown token costs what a real one does. The transaction locks the
// player row and then the request row (Review locks in the same order), looks the request up by the token's
// digest, and refuses unless everything holds: the request is issued and unused, within LinkLifetime of its
// review, the account is eligible and is the identity the link was issued for. It then burns the link (single
// use, atomically), writes the new hash, ends the sessions (reason password_changed) and writes the events.
//
// Every unusable link (unknown, malformed, used, replaced, expired, wrong or changed account) is the same
// refusal, forbidden with fields.link. A failure to hash or to write is `unavailable`, and the link is not spent.
func (r *Recovery) Reset(ctx context.Context, token, newPassword string, ip *netip.Addr) error {
	if newPassword == "" {
		return refuse(httpapi.ErrInvalid, "password", msgNewPassword)
	}
	if err := password.Validate(newPassword); err != nil {
		return refuse(httpapi.ErrInvalid, "password", password.Message(err))
	}
	if token == "" || len(utf16.Encode([]rune(token))) > maxTokenUnits {
		return errLinkGone
	}
	hash, err := r.svc.Hasher().Hash(ctx, newPassword)
	if err != nil {
		return r.resetUnavailable(err)
	}
	digest := digestOf(token)
	now := r.clock()
	var revoked session.Revoked
	err = r.st.InTxWith(ctx, func(tx pgx.Tx, sq *store.Queries) error {
		q := sqlcgen.New(tx)
		// Lock order: the player row, then the request row. The player is read without a lock first.
		found, err := q.FindResetRequestByDigest(ctx, digest)
		if errors.Is(err, pgx.ErrNoRows) {
			return errLinkGone
		}
		if err != nil {
			return err
		}
		if found.PlayerID.Valid {
			if _, err := q.LockResetPlayer(ctx, found.PlayerID); err != nil {
				return err
			}
		}
		if _, err := q.LockResetRequest(ctx, found.ID); err != nil {
			return err
		}
		req, err := q.GetResetRequest(ctx, found.ID)
		if err != nil {
			return err
		}
		a := accountFrom(req.ContactEmail, req.AuthProvider, req.AuthSubject, req.AccountDisabledAt, req.ContactSyncStatus, req.IdentityUsable)
		switch {
		case subtle.ConstantTimeCompare(req.TokenDigest, digest) != 1, // burned or replaced while we waited
			req.Status != sqlcgen.PasswordResetRequestStatusIssued,
			req.ConsumedAt.Valid,
			!req.PlayerID.Valid,
			!a.eligible(req.Email),
			!req.RequestSubject.Valid || req.RequestSubject != a.subject, // a link issued for another identity
			!req.ReviewedAt.Valid || !now.Before(req.ReviewedAt.Time.Add(LinkLifetime)):
			return errLinkGone
		}
		n, err := q.BurnResetToken(ctx, sqlcgen.BurnResetTokenParams{
			Now: pgtype.Timestamptz{Time: now, Valid: true}, ID: req.ID, Digest: digest,
		})
		if err != nil {
			return err
		}
		if n != 1 {
			return errLinkGone
		}
		identityID := uuidOf(a.subject)
		if err := sq.UpdatePassword(ctx, identityID, hash, store.SchemeArgon2id, now); err != nil {
			return err
		}
		if revoked, err = r.svc.OnPasswordChangedTx(ctx, sq, identityID, nil, ip); err != nil {
			return err
		}
		return sq.InsertEvent(ctx, store.NewEvent{IdentityID: &identityID, Audience: store.AudiencePlayer, Event: store.EventPasswordResetUsed, IP: ip, At: now})
	})
	if err != nil {
		var re *Error
		if errors.As(err, &re) {
			return re
		}
		return r.resetUnavailable(err)
	}
	// Committed: the sessions are gone, so drop what the authenticator cached about them.
	r.svc.Forget(revoked)
	return nil
}

// resetUnavailable is the answer when the reset could not be done for a reason that is not the caller's. The
// TypeScript used it for a provider outage; here it covers the hasher and the database. Nothing was spent: the
// whole transaction rolled back, so the same link may be tried again (the copy is the TypeScript's and is more
// pessimistic than it needs to be).
func (r *Recovery) resetUnavailable(err error) error {
	r.log.Error("a password reset failed", "error", err.Error())
	return &Error{Code: httpapi.ErrUnavailable, Fields: map[string]string{"link": msgResetUnavailable}, Err: err}
}
