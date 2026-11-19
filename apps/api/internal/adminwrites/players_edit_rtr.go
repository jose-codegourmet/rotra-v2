package adminwrites

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/adminplayer"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The RTR ID change of an Admin edit (D-2026-11-16-04, player-rtr-id.ts and replaceRtrId in player/shared-entry.ts): the
// registration place or date changed, so the RTR ID follows both and keeps its number, and every record that holds the old
// string takes the new one in the same transaction, with no alias for the old one.

// saveRegisteredRtrID is saveRegisteredRtrId: the RTR ID part of a registered player's edit, after the profile fields
// saved. One transaction locks the player, checks that the player still has the RTR ID the form was loaded with (`conflict`
// on `registrationDate` if not), replaces the string everywhere, raises the revision and records one event.
func (s *server) saveRegisteredRtrID(ctx context.Context, p session.Principal, id pgtype.UUID, typed string, plan *adminplayer.RtrPlan, reason, name, operationID string) error {
	return writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := q.LockPlayerRevision(ctx, id); errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		} else if err != nil {
			return err
		}
		held, err := q.GetPlayerAllocationRtrID(ctx, id)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err != nil || held != plan.From {
			return writes.Fail(httpapi.ErrConflict, map[string]string{"registrationDate": msgPlayerChanged})
		}
		now := s.stamp()
		if err := s.applyRtrIDChange(ctx, q, plan, now); err != nil {
			return err
		}
		if _, err := q.BumpPlayerRevision(ctx, sqlcgen.BumpPlayerRevisionParams{Now: now, ID: id}); err != nil {
			return err
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.profile_updated", TargetType: "player", TargetID: typed,
			Metadata: map[string]any{
				"after": map[string]any{"name": name}, "changed": []string{adminplayer.FieldRtrID}, "reason": reason,
				"rtrId": plan.RtrID, "operationId": operationID,
			},
		})
	})
}

// applyRtrIDChange is applyRtrIdChange and replaceRtrId in the caller's transaction: the place must be a founding location
// ROTRA knows (`invalid` on `registrationPlace`); the new RTR ID, or the same number at the same place and day, must not
// belong to another record (`conflict` on `registrationDate`); the counter of the place and day is raised to at least the
// number so it is never handed out again; the open shared entries and the allocations that hold the old string take the new
// one (an entry's revision goes up). The allocation table is append-only except for this, which its trigger allows only
// while the transaction-local setting is on.
func (s *server) applyRtrIDChange(ctx context.Context, q *sqlcgen.Queries, plan *adminplayer.RtrPlan, now pgtype.Timestamptz) error {
	place, err := q.GetLocationByCodes(ctx, sqlcgen.GetLocationByCodesParams{CountryCode: plan.CountryCode, CityCode: plan.CityCode})
	if errors.Is(err, pgx.ErrNoRows) {
		return invalid("registrationPlace", msgPlaceChoose)
	}
	if err != nil {
		return err
	}
	day, err := time.Parse("2006-01-02", plan.SyncDate)
	if err != nil {
		return err
	}
	syncDate := pgtype.Date{Time: day, Valid: true}
	sequence := int32(plan.Sequence)
	taken, err := q.RtrIDIsTakenElsewhere(ctx, sqlcgen.RtrIDIsTakenElsewhereParams{RtrID: plan.RtrID, LocationID: place.ID, SyncDate: syncDate, Sequence: sequence, FromRtrID: plan.From})
	if err != nil {
		return err
	}
	if taken.Bool {
		return writes.Fail(httpapi.ErrConflict, map[string]string{"registrationDate": adminplayer.MsgRtrIDTaken})
	}
	if err := q.RaiseRtrCounter(ctx, sqlcgen.RaiseRtrCounterParams{LocationID: place.ID, SyncDate: syncDate, Sequence: sequence}); err != nil {
		return err
	}
	if _, err := q.MoveSharedEntriesRtrID(ctx, sqlcgen.MoveSharedEntriesRtrIDParams{
		RtrID: plan.RtrID, LocationID: place.ID, CountryCode: place.CountryCode, CityCode: place.CityCode, SyncDate: syncDate, Now: now, FromRtrID: plan.From,
	}); err != nil {
		return err
	}
	if err := q.AllowRtrIDChange(ctx, "on"); err != nil {
		return err
	}
	if _, err := q.MoveAllocationsRtrID(ctx, sqlcgen.MoveAllocationsRtrIDParams{
		RtrID: plan.RtrID, LocationID: place.ID, CountryCode: place.CountryCode, CityCode: place.CityCode, SyncDate: syncDate, FromRtrID: plan.From,
	}); err != nil {
		return err
	}
	return q.AllowRtrIDChange(ctx, "off")
}
