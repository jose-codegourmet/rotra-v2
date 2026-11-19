package adminwrites

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The application of an approved contact change (applyContactChange, reconcileContactChange and markFailed in
// contact-change.ts). It is safe to call again after any failure, duplicate delivery or lost response:
//
//  1. Stage: mark the request applying (the attempt counted) and the account's sync status with it, in a short transaction.
//  2. Outside any transaction, set the login at the provider. A provider error marks the request failed with a code.
//  3. Reconcile: read the login back; only when it holds the proposed value does one transaction change the private contact,
//     mark the account in sync and set the request applied.
//
// The provider. The TypeScript calls Supabase Auth; Go has none (go-sign-in's deviations log), so the login of a player is its
// sign-in identity in auth_identities, which the account's auth_subject points at. Its login key is the contact email:
//   - an email update sets the login key (a key another login has is refused, as the provider refuses a taken email:
//     provider_rejected; an account with no identity is provider_unavailable), and reading the login back answers the key;
//   - a phone is no part of an identity, so there is nothing to set and nothing to read: a phone update is done once the
//     identity is found, and the read-back finds the proposed phone. A check of an approved phone change therefore applies it,
//     where the provider of the TypeScript, never told, would answer provider_not_applied. This is the one answer that differs
//     (pinned in contacts_test.go; the golden cases never read back a phone that was not updated first).
//
// The login is changed in its own transaction, as the provider is called outside one in the TypeScript, so a change that stops
// between the login and the contact is left as it is for Check and Retry, as there.

// providerError is a ProviderError of the TypeScript: a failure code the request keeps.
type providerError struct{ code string }

func (e *providerError) Error() string { return e.code }

const (
	providerUnavailable = "provider_unavailable"
	providerRejected    = "provider_rejected"
)

// login is what the provider holds for a subject: nil email is an email that is not set, as the provider's null.
type login struct{ email *string }

// readLogin is provider.readLogin: the login of the subject, or nil when there is none (a missing identity, or one that is not
// a player's).
func (s *server) readLogin(ctx context.Context, subject pgtype.UUID) (*login, error) {
	identity, err := s.st.GetIdentityByID(ctx, uuid.UUID(subject.Bytes))
	if errors.Is(err, store.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if identity.Audience != store.AudiencePlayer {
		return nil, nil
	}
	return &login{email: &identity.LoginKey}, nil
}

// updateLogin is provider.updateLogin for one field. A repeat for a login that already has the value is done.
func (s *server) updateLogin(ctx context.Context, subject pgtype.UUID, field sqlcgen.ContactChangeField, value string) error {
	id := uuid.UUID(subject.Bytes)
	identity, err := s.st.GetIdentityByID(ctx, id)
	if errors.Is(err, store.ErrNotFound) || (err == nil && identity.Audience != store.AudiencePlayer) {
		return &providerError{providerUnavailable}
	}
	if err != nil {
		return err
	}
	if field == sqlcgen.ContactChangeFieldPhone || identity.LoginKey == value {
		return nil
	}
	err = s.st.InTx(ctx, func(q *store.Queries) error {
		return q.ChangeLoginKey(ctx, id, value, s.now())
	})
	if errors.Is(err, store.ErrLoginKeyTaken) {
		return &providerError{providerRejected}
	}
	return err
}

// accountOf is the player's account, nil for a player with none (an unclaimed person has no sign-in).
func accountOf(ctx context.Context, q *sqlcgen.Queries, playerID pgtype.UUID) (*sqlcgen.GetPlayerAccountForEditRow, error) {
	account, err := q.GetPlayerAccountForEdit(ctx, playerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// detached is the context the application steps run on. The Route Handler finishes a change it has started when the browser
// leaves, so the steps between the transactions (the login, the read-back) must not stop with the request either; the
// transactions already do (writes.InTx), and a bound keeps a stuck step from holding a worker.
func detached(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
}

// applySaved runs the application after a saved approval or a retry. A failure that is not the provider's own (the provider
// path already marks the request failed) still ends as failed, so the approval is never hidden behind an error; Retry
// resumes. Only when even that cannot be written does the first error go on.
func (s *server) applySaved(ctx context.Context, p session.Principal, id pgtype.UUID) error {
	err := s.applyContact(ctx, p, id)
	if err == nil {
		return nil
	}
	if s.markFailed(ctx, id, "application_error") != nil {
		return err
	}
	return nil
}

// notReady is the refusal of an application of a request nobody approved.
func notReady() error {
	return writes.Fail(httpapi.ErrInvalid, map[string]string{"request": contactchange.MsgNotReady})
}

func inApplication(status sqlcgen.ContactChangeStatus) bool {
	return status == sqlcgen.ContactChangeStatusApproved || status == sqlcgen.ContactChangeStatusApplying || status == sqlcgen.ContactChangeStatusFailed
}

// applyContact is applyContactChange.
func (s *server) applyContact(ctx context.Context, p session.Principal, id pgtype.UUID) error {
	var staged sqlcgen.PlayerContactChangeRequest
	var account *sqlcgen.GetPlayerAccountForEditRow
	alreadyApplied := false
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := lockRequest(ctx, q, id.String()); err != nil {
			return err
		}
		request, err := q.GetContactRequest(ctx, id)
		if err != nil {
			return err
		}
		if request.Status == sqlcgen.ContactChangeStatusApplied {
			alreadyApplied = true
			return nil
		}
		if !inApplication(request.Status) {
			return notReady()
		}
		if account, err = accountOf(ctx, q, request.PlayerID); err != nil {
			return err
		}
		now := s.stamp()
		if staged, err = q.StageContactApplication(ctx, sqlcgen.StageContactApplicationParams{Now: now, ID: id}); err != nil {
			return err
		}
		if account != nil {
			return q.SetAccountSyncStatus(ctx, sqlcgen.SetAccountSyncStatusParams{Status: sqlcgen.PlayerContactSyncStatusApplying, Now: now, PlayerID: staged.PlayerID})
		}
		return nil
	})
	if err != nil || alreadyApplied {
		return err
	}
	if account != nil && !staged.ProviderAppliedAt.Valid {
		if err := s.updateLogin(ctx, account.AuthSubject, staged.Field, staged.ProposedValue); err != nil {
			var pe *providerError
			if errors.As(err, &pe) {
				return s.markFailed(ctx, id, pe.code)
			}
			return err
		}
	}
	return s.reconcile(ctx, p, id)
}

// markFailed is markFailed: the request failed with a code (an applied one stays applied), and the account's sync status with it.
func (s *server) markFailed(ctx context.Context, id pgtype.UUID, code string) error {
	return writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := lockRequest(ctx, q, id.String()); err != nil {
			return err
		}
		request, err := q.GetContactRequest(ctx, id)
		if err != nil {
			return err
		}
		if request.Status == sqlcgen.ContactChangeStatusApplied {
			return nil
		}
		now := s.stamp()
		if _, err := q.FailContactRequest(ctx, sqlcgen.FailContactRequestParams{FailureCode: pgtype.Text{String: code, Valid: true}, Now: now, ID: id}); err != nil {
			return err
		}
		// updateMany: a player with no account has no status to change.
		return q.SetAccountSyncStatus(ctx, sqlcgen.SetAccountSyncStatusParams{Status: sqlcgen.PlayerContactSyncStatusFailed, Now: now, PlayerID: request.PlayerID})
	})
}

// reconcile is reconcileContactChange: it marks the request applied only when the login and the contact agree. An unclaimed
// player has no login, so only the private contact changes. A login that holds neither the original nor the proposed value
// was changed some other way and fails closed.
func (s *server) reconcile(ctx context.Context, p session.Principal, id pgtype.UUID) error {
	q := sqlcgen.New(s.pool)
	request, err := q.GetContactRequest(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return err
	}
	if request.Status == sqlcgen.ContactChangeStatusApplied {
		return nil
	}
	// Only an approved change may write contacts; a pending or declined one must never apply.
	if !inApplication(request.Status) {
		return notReady()
	}
	account, err := accountOf(ctx, q, request.PlayerID)
	if err != nil {
		return err
	}
	if account != nil {
		read, err := s.readLogin(ctx, account.AuthSubject)
		if err != nil {
			return err
		}
		if code := readBackFailure(request, read); code != "" {
			return s.markFailed(ctx, id, code)
		}
	}
	collided := false
	err = writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := lockRequest(ctx, q, id.String()); err != nil {
			return err
		}
		current, err := q.GetContactRequest(ctx, id)
		if err != nil {
			return err
		}
		if current.Status == sqlcgen.ContactChangeStatusApplied {
			return nil
		}
		// The provider may already hold the value: fail (retryable), never leave it applying.
		if taken, err := collides(ctx, q, current.PlayerID, current.Field, current.ProposedValue); err != nil {
			return err
		} else if taken {
			collided = true
			return nil
		}
		now := s.stamp()
		var revision int64
		if current.Field == sqlcgen.ContactChangeFieldEmail {
			revision, err = q.SetContactEmail(ctx, sqlcgen.SetContactEmailParams{Email: pgtype.Text{String: current.ProposedValue, Valid: true}, Now: now, PlayerID: current.PlayerID})
		} else {
			revision, err = q.SetContactPhone(ctx, sqlcgen.SetContactPhoneParams{Phone: current.ProposedValue, Now: now, PlayerID: current.PlayerID})
		}
		if err != nil {
			return err
		}
		if account != nil {
			if err := q.SetAccountSynced(ctx, sqlcgen.SetAccountSyncedParams{Version: revision, Now: now, PlayerID: current.PlayerID}); err != nil {
				return err
			}
		}
		if _, err := q.ApplyContactRequest(ctx, sqlcgen.ApplyContactRequestParams{Now: now, ID: current.ID}); err != nil {
			return err
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.contact_change_applied", TargetType: "player", TargetID: current.PlayerID.String(),
			Metadata: map[string]any{"requestId": current.ID.String(), "field": string(current.Field)},
		})
	})
	if writes.IsUniqueViolation(err) {
		return s.markFailed(ctx, id, "contact_collision")
	}
	if err != nil {
		return err
	}
	if collided {
		return s.markFailed(ctx, id, "contact_collision")
	}
	return nil
}

// readBackFailure is the failure code when the login read back does not hold the proposed value, "" when it does. JavaScript
// compares the value it read (undefined for no login) with the original, so no login is never "not applied".
func readBackFailure(request sqlcgen.PlayerContactChangeRequest, read *login) string {
	if request.Field == sqlcgen.ContactChangeFieldPhone {
		// A phone is no part of the login (see above): a login that exists holds the proposed phone.
		if read != nil {
			return ""
		}
		return "provider_mismatch"
	}
	if read != nil && read.email != nil && *read.email == request.ProposedValue {
		return ""
	}
	if read != nil && request.OriginalValue.Valid == (read.email != nil) && (read.email == nil || *read.email == request.OriginalValue.String) {
		return "provider_not_applied"
	}
	return "provider_mismatch"
}
