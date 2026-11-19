package adminwrites

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	authpassword "github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The email and the password of a registered player, changed by an Admin edit (player-edit-email.ts, and
// setPlayerPasswordByAdmin in auth/supabase-provider-admin.ts). The TypeScript changes them at Supabase Auth; Go has no
// provider (go-sign-in's deviations log), so the player's sign-in is the identity in auth_identities that the account's
// auth_subject points at: its login key is the contact email, its password is an argon2id hash from the shared hasher.
//
// Email: the TypeScript stages the change (a pending row, the account marked applying), moves the login at the provider,
// then applies it (contact, account, the row, the player revision, the event). Here the staging is the same, and the
// provider step is the login key of the identity, changed in the SAME transaction as the contact row, so the two never
// disagree: a key another sign-in has refuses the change like a provider that rejects the email (the row is marked failed
// and the account is back in sync), and nothing else is written.
//
// Password: the hash is computed before the transaction. The new hash replaces the old one, every session of the identity
// ends (reason password_changed, as after a reset; the TypeScript left the provider's sessions alone), and the player's
// revision and the audit event go in the same transaction. A password longer than the shared password rules allow
// (1024 characters) cannot be hashed and is a warning, like a provider that refuses it.

// errLoginTaken is a sign-in that already has the proposed email.
var errLoginTaken = errors.New("the login key is taken")

// emailStage is what the staging transaction hands on.
type emailStage struct {
	operation sqlcgen.InsertEmailEditRow
	account   sqlcgen.GetPlayerAccountForEditRow
	noop      bool
}

// saveEmail is saveAdminPlayerEmail: it reconciles one staged Admin email update and never claims success until the login
// and the contact agree. It returns true when the contact has the email now (also when it already had it), false when the
// change could not be confirmed, and an error when it could not be applied.
func (s *server) saveEmail(ctx context.Context, p session.Principal, id pgtype.UUID, typed, email, reason, revision, operationID string) (bool, error) {
	proposed := strings.ToLower(strings.TrimSpace(email))
	stage, err := s.stageEmail(ctx, p, id, proposed, revision)
	if err != nil {
		return false, err
	}
	if stage.noop {
		return true, nil
	}
	// The login: it must exist and still be the one that goes with the email the change started from (or already be the
	// new one). Anything else is a login that diverged, which is left staged for a person to reconcile.
	identity, err := s.st.GetIdentityByID(ctx, uuid.UUID(stage.account.AuthSubject.Bytes))
	if err != nil || identity.Audience != store.AudiencePlayer {
		return false, nil
	}
	original := strings.ToLower(strings.TrimSpace(stage.operation.OriginalEmail.String))
	if identity.LoginKey != original && identity.LoginKey != proposed {
		return false, nil
	}
	applied, err := s.applyEmail(ctx, p, id, typed, stage, identity, proposed, reason, operationID)
	if errors.Is(err, errLoginTaken) {
		// The provider's rejection: the change is over, the account is back in sync.
		_ = writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
			now := s.stamp()
			if err := q.MarkEmailEditFailed(ctx, sqlcgen.MarkEmailEditFailedParams{Now: now, ID: stage.operation.ID}); err != nil {
				return err
			}
			return q.SetAccountSyncStatus(ctx, sqlcgen.SetAccountSyncStatusParams{Status: sqlcgen.PlayerContactSyncStatusInSync, Now: now, PlayerID: id})
		})
		return false, nil
	}
	if err != nil {
		return false, nil // the outcome is unknown: the reservation stays for reconciliation
	}
	return applied, nil
}

// stageEmail is the first transaction of the TypeScript's saveAdminPlayerEmail: under the player's lock and revision it
// refuses what cannot be staged (a failed sync, an earlier change for another email, a change of the contact in flight,
// an email another player has), does nothing when the contact has the email already, and otherwise records the pending
// change and marks the account applying.
func (s *server) stageEmail(ctx context.Context, p session.Principal, id pgtype.UUID, proposed, revision string) (emailStage, error) {
	var stage emailStage
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		stored, err := q.LockPlayerRevision(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		if err := writes.RequireRevision(stored, revision); err != nil {
			return err
		}
		contact, err := q.GetPrivateContactOfPlayer(ctx, id)
		if err != nil {
			return err
		}
		account, err := q.GetPlayerAccountForEdit(ctx, id)
		if err != nil {
			return err
		}
		if account.ContactSyncStatus == sqlcgen.PlayerContactSyncStatusFailed {
			return invalid("email", "Resolve the existing contact sync failure first.")
		}
		pending, err := q.GetPendingEmailEdit(ctx, id)
		hasPending := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if hasPending && pending.ProposedEmail != proposed {
			return writes.Fail(httpapi.ErrConflict, map[string]string{"email": "Resolve the earlier email change before changing it again."})
		}
		if _, err := q.FindInFlightRequest(ctx, sqlcgen.FindInFlightRequestParams{PlayerID: id}); err == nil {
			return writes.Fail(httpapi.ErrConflict, map[string]string{"email": "Resolve the active contact change first."})
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if owner, err := q.GetContactPlayerByEmail(ctx, pgtype.Text{String: proposed, Valid: true}); err == nil {
			if owner != id {
				return invalid("email", emailLinked)
			}
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if !hasPending && contact.Email.Valid && contact.Email.String == proposed {
			stage.noop = true
			return nil
		}
		now := s.stamp()
		if hasPending {
			stage.operation = sqlcgen.InsertEmailEditRow(pending)
		} else {
			opID, err := newUUID()
			if err != nil {
				return err
			}
			if stage.operation, err = q.InsertEmailEdit(ctx, sqlcgen.InsertEmailEditParams{
				ID: opID, PlayerID: id, AdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, OriginalEmail: contact.Email,
				ProposedEmail: proposed, ContactRevision: contact.Revision, Now: now,
			}); err != nil {
				return err
			}
		}
		stage.account = account
		return q.SetAccountSyncStatus(ctx, sqlcgen.SetAccountSyncStatusParams{Status: sqlcgen.PlayerContactSyncStatusApplying, Now: now, PlayerID: id})
	})
	return stage, err
}

// applyEmail is the last transaction of saveAdminPlayerEmail, with the login key of the identity changed in it. It writes
// nothing (and reports false) when the contact no longer has the email the change started from. Otherwise it supersedes
// the pending email requests, moves the contact and the account to the new email, marks the change applied, raises the
// player's revision and records the event.
func (s *server) applyEmail(ctx context.Context, p session.Principal, id pgtype.UUID, typed string, stage emailStage, identity store.Identity, proposed, reason, operationID string) (bool, error) {
	applied := false
	ctx = context.WithoutCancel(ctx)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	err := s.st.InTxWith(ctx, func(tx pgx.Tx, sq *store.Queries) error {
		q := sqlcgen.New(tx)
		contact, err := q.GetPrivateContactOfPlayer(ctx, id)
		if err != nil {
			return err
		}
		if contact.Email != stage.operation.OriginalEmail {
			return nil
		}
		now := s.stamp()
		if err := s.supersedeRequests(ctx, q, p, id, sqlcgen.ContactChangeFieldEmail, now); err != nil {
			return err
		}
		version, err := q.SetContactEmail(ctx, sqlcgen.SetContactEmailParams{Email: pgtype.Text{String: proposed, Valid: true}, Now: now, PlayerID: id})
		if err != nil {
			return err
		}
		if err := q.SetAccountSynced(ctx, sqlcgen.SetAccountSyncedParams{Version: version, Now: now, PlayerID: id}); err != nil {
			return err
		}
		if err := q.MarkEmailEditApplied(ctx, sqlcgen.MarkEmailEditAppliedParams{Now: now, ID: stage.operation.ID}); err != nil {
			return err
		}
		player, err := q.BumpPlayerRevision(ctx, sqlcgen.BumpPlayerRevisionParams{Now: now, ID: id})
		if err != nil {
			return err
		}
		var nickname any
		if player.Nickname.Valid {
			nickname = player.Nickname.String
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.profile_updated", TargetType: "player", TargetID: typed,
			Metadata: map[string]any{
				"before":  map[string]any{"name": player.FullName, "nickname": nickname},
				"after":   map[string]any{"name": player.FullName, "nickname": nickname},
				"changed": []string{adminplayer.FieldEmail}, "reason": reason, "operationId": operationID,
			},
		}); err != nil {
			return err
		}
		// The sign-in of the player: its login key is the email.
		if identity.LoginKey != proposed {
			if err := sq.ChangeLoginKey(ctx, identity.ID, proposed, now.Time); errors.Is(err, store.ErrLoginKeyTaken) {
				return errLoginTaken
			} else if err != nil {
				return err
			}
		}
		applied = true
		return nil
	})
	return applied, err
}

// savePassword is the password step: the account of the player must exist (the TypeScript throws not_found, which is a
// warning), the new hash replaces the old, the sessions of the identity end, and the player's revision and the event go in
// one transaction. The event names no password and no hash.
func (s *server) savePassword(ctx context.Context, p session.Principal, id pgtype.UUID, typed, password, reason, name, operationID string) error {
	account, err := sqlcgen.New(s.pool).GetPlayerAccountForEdit(ctx, id)
	if err != nil {
		return err
	}
	// The hash cost has a ceiling (the shared password rules); the floor is the form's (8 characters as JavaScript counts).
	if err := authpassword.Validate(password); errors.Is(err, authpassword.ErrTooLong) {
		return err
	}
	hash, err := s.hasher.Hash(ctx, password)
	if err != nil {
		return err
	}
	ctx = context.WithoutCancel(ctx)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	identityID := uuid.UUID(account.AuthSubject.Bytes)
	return s.st.InTxWith(ctx, func(tx pgx.Tx, sq *store.Queries) error {
		q := sqlcgen.New(tx)
		identity, err := sq.GetIdentityByID(ctx, identityID)
		if err != nil {
			return err
		}
		if identity.Audience != store.AudiencePlayer {
			return errors.New("the account's sign-in is not a player's")
		}
		now := s.stamp()
		if err := sq.UpdatePassword(ctx, identityID, hash, store.SchemeArgon2id, now.Time); err != nil {
			return err
		}
		if err := endSessions(ctx, sq, identity, now.Time); err != nil {
			return err
		}
		if _, err := q.BumpPlayerRevision(ctx, sqlcgen.BumpPlayerRevisionParams{Now: now, ID: id}); err != nil {
			return err
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.password_set", TargetType: "player", TargetID: typed,
			Metadata: map[string]any{"reason": reason, "name": name, "changed": []string{adminplayer.FieldPass}, "operationId": operationID},
		})
	})
}

// endSessions ends every session of the identity (reason password_changed) with a session_revoked event each, and records
// password_changed, as session.Service.OnPasswordChangedTx does after a reset. The authenticator's cache is not told (the
// service is not reachable from here): a revoked session is refused on writes within the cache's lifetime and its pass
// expires with its own lifetime.
func endSessions(ctx context.Context, sq *store.Queries, identity store.Identity, at time.Time) error {
	ids, err := sq.RevokeIdentitySessions(ctx, identity.ID, store.ReasonPasswordChanged, at, nil)
	if err != nil {
		return err
	}
	for _, id := range ids {
		sess, err := sq.GetSession(ctx, id)
		if err != nil {
			return err
		}
		if err := sq.InsertEvent(ctx, store.NewEvent{IdentityID: &identity.ID, SessionID: &id, Audience: sess.Audience, Event: store.EventSessionRevoked, DeviceID: sess.DeviceID, At: at}); err != nil {
			return err
		}
	}
	return sq.InsertEvent(ctx, store.NewEvent{IdentityID: &identity.ID, Audience: identity.Audience, Event: store.EventPasswordChanged, At: at})
}
