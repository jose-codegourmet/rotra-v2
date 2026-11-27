package queuewrites

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the club's own name change request (apps/queue/src/app/api/club/name-change/route.ts, requestClubNameChange and
// cancelClubNameChange in packages/db/src/admin/clubs.ts). Admin reviews it (adminwrites/clubname.go).

func (s *server) registerClubNameChange(rt *signedin.Router) {
	rt.Handle("POST /api/club/name-change", store.AudienceClub, s.club(s.requestNameChange))
	rt.Handle("DELETE /api/club/name-change", store.AudienceClub, s.club(s.cancelNameChange))
}

// nameChange is nameChangeDto on the wire.
type nameChange struct {
	ID            string  `json:"id"`
	ClubID        string  `json:"clubId"`
	RequestedName string  `json:"requestedName"`
	RequestedAt   string  `json:"requestedAt"`
	State         string  `json:"state"`
	ReviewedAt    *string `json:"reviewedAt"`
}

func nameChangeOf(id, club pgtype.UUID, name string, at pgtype.Timestamptz, state sqlcgen.ClubNameChangeState, reviewed pgtype.Timestamptz) nameChange {
	d := nameChange{ID: id.String(), ClubID: club.String(), RequestedName: name, RequestedAt: httpapi.ToIso(at.Time), State: string(state)}
	if reviewed.Valid {
		iso := httpapi.ToIso(reviewed.Time)
		d.ReviewedAt = &iso
	}
	return d
}

// requestNameChange is POST /api/club/name-change, Q-CLUB Request name change. One pending request per club; repeat-safe on commandId.
func (s *server) requestNameChange(r *http.Request, clubID pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	commandText := body.Text("commandId")
	if commandText == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"commandId": "Reload and try again."})
	}
	if err := s.entitled(r.Context(), clubID); err != nil {
		return writes.Result{}, err
	}
	name := fields.JSTrim(body.Text("name"))
	if name == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter a club name."})
	}
	commandID, err := parseRowID(commandText)
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), clubID, func(t *txn) (any, error) {
		existing, err := t.q.GetClubNameChangeByCommand(t.ctx, commandID)
		if err == nil {
			if existing.ClubID != clubID {
				return nil, writes.Fail(httpapi.ErrNotFound, nil)
			}
			return map[string]any{"request": nameChangeOf(existing.ID, existing.ClubID, existing.RequestedName, existing.RequestedAt, existing.State, existing.ReviewedAt)}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		key := club.NameKey(name)
		taken, err := t.q.GetOtherClubByNameKey(t.ctx, key)
		if err == nil && taken != clubID {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"name": "A club with this name already exists."})
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		id, err := uuid.NewV7() // Prisma's uuid(7) default
		if err != nil {
			return nil, err
		}
		row, err := t.q.InsertClubNameChange(t.ctx, sqlcgen.InsertClubNameChangeParams{
			ID: pgtype.UUID{Bytes: id, Valid: true}, ClubID: clubID, RequestedName: name, RequestedNameKey: key, Now: t.stamp(), CommandID: commandID,
		})
		if err != nil {
			var pg *pgconn.PgError
			if errors.As(err, &pg) && pg.Code == "23505" {
				return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"name": "This club already has a pending name change."})
			}
			return nil, err
		}
		return map[string]any{"request": nameChangeOf(row.ID, row.ClubID, row.RequestedName, row.RequestedAt, row.State, row.ReviewedAt)}, nil
	})
	return writes.Result{Body: out}, err
}

// cancelNameChange is DELETE /api/club/name-change: the club's own pending request becomes cancelled. With nothing pending it changes nothing.
func (s *server) cancelNameChange(r *http.Request, clubID pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), clubID); err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), clubID, func(t *txn) (any, error) {
		if _, err := t.q.LockClub(t.ctx, clubID); err != nil {
			return nil, err
		}
		n, err := t.q.CancelPendingClubNameChange(t.ctx, sqlcgen.CancelPendingClubNameChangeParams{Now: t.stamp(), ClubID: clubID})
		if err != nil {
			return nil, err
		}
		return map[string]any{"cancelled": n > 0}, nil
	})
	return writes.Result{Body: out}, err
}
