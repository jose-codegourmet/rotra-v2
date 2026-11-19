// Package contactwrites is what the Player's own contact-change request and the owner's request for a player share: the
// `submit` of packages/db/src/player/contact-change.ts. The Player app (POST /api/account/contact-change, internal/playerwrites)
// and the Admin app (POST /api/contact-change-requests, internal/adminwrites) both call Submit, so the two can never disagree
// about what a request holds or when it is refused.
package contactwrites

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Source says who enters the request: the player (source app, no admin) or the owner for the player.
type Source struct {
	// Owner is true when an admin enters the request; Admin is then that admin's account.
	Owner bool
	Admin pgtype.UUID
}

// MapOpen is the TypeScript's mapOpen: a unique index that refuses a request (one in flight per player, one reserved value,
// one request per command) is "a contact change is already open"; anything else goes on.
func MapOpen(err error) error {
	if writes.IsUniqueViolation(err) {
		return writes.Fail(httpapi.ErrConflict, map[string]string{"request": contactchange.MsgOpen})
	}
	return err
}

// Collides is `collides`: the value belongs to a contact of another player.
func Collides(ctx context.Context, q *sqlcgen.Queries, playerID pgtype.UUID, field sqlcgen.ContactChangeField, value string) (bool, error) {
	var owner pgtype.UUID
	var err error
	if field == sqlcgen.ContactChangeFieldPhone {
		owner, err = q.GetContactPlayerByPhone(ctx, value)
	} else {
		owner, err = q.GetContactPlayerByEmail(ctx, pgtype.Text{String: value, Valid: true})
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return owner != playerID, nil
}

// Submit is `submit`: a repeat of the command answers the request it made (`not_found` for another player's), else the value
// is normalized, the player's contact read, the checks run and the request created, in the caller's transaction. The caller
// maps a unique violation with MapOpen. now is the clock the row is stamped with.
func Submit(ctx context.Context, q *sqlcgen.Queries, now pgtype.Timestamptz, playerID, commandID pgtype.UUID, field, value string, src Source) (sqlcgen.PlayerContactChangeRequest, error) {
	repeated, err := q.GetContactRequestByCommand(ctx, commandID)
	if err == nil {
		if repeated.PlayerID != playerID {
			return repeated, writes.Fail(httpapi.ErrNotFound, nil)
		}
		return repeated, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return repeated, err
	}
	proposed, msg := contactchange.Normalize(field, value)
	if msg != "" {
		return repeated, writes.Fail(httpapi.ErrInvalid, map[string]string{"value": msg})
	}
	contact, err := q.GetPrivateContactOfPlayer(ctx, playerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return repeated, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return repeated, err
	}
	original := contact.Email
	if field == contactchange.FieldPhone {
		original = pgtype.Text{String: contact.PhoneE164, Valid: true}
	}
	if original.Valid && original.String == proposed {
		return repeated, writes.Fail(httpapi.ErrInvalid, map[string]string{"value": contactchange.SameWord(field, src.Owner)})
	}
	taken, err := Collides(ctx, q, playerID, sqlcgen.ContactChangeField(field), proposed)
	if err != nil {
		return repeated, err
	}
	if taken {
		return repeated, writes.Fail(httpapi.ErrConflict, map[string]string{"value": contactchange.TakenWord(field, src.Owner)})
	}
	id, err := uuid.NewV7() // Prisma's uuid(7) default
	if err != nil {
		return repeated, err
	}
	params := sqlcgen.InsertContactRequestParams{
		ID: pgtype.UUID{Bytes: id, Valid: true}, PlayerID: playerID, Field: sqlcgen.ContactChangeField(field),
		Source: sqlcgen.ContactChangeSourceApp, Proposed: proposed, Original: original,
		OriginalRevision: contact.Revision, Now: now, CommandID: commandID,
	}
	if src.Owner {
		params.Source, params.AdminID = sqlcgen.ContactChangeSourceOwner, src.Admin
	}
	return q.InsertContactRequest(ctx, params)
}
