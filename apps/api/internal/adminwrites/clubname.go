package adminwrites

import (
	"context"
	"errors"
	"net/http"
	"regexp"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Club name review: PATCH /api/clubs/{clubId} (A-REQUESTS, Approve / Reject name change). Port of
// apps/admin/src/app/api/clubs/[clubId]/route.ts PATCH and reviewClubNameChange in packages/db/src/admin/clubs.ts. The
// directory read is signedin's. The route takes no revision: a stale review is the pending request's ID no longer
// matching, which is a `conflict`.

func (s *server) registerClubNames(rt *signedin.Router) {
	rt.Handle("PATCH /api/clubs/{clubId}", store.AudienceAdmin, s.admin(s.reviewClubName))
}

// looseClubID is /^[0-9a-f-]{36}$/i, the route's own check of the path.
var looseClubID = regexp.MustCompile(`^[0-9a-fA-F-]{36}$`)

const nameTaken = "A club with this name already exists."

// reviewClubName is the PATCH handler. The order is the TypeScript's: the club ID in the path (36 hex digits and
// dashes, else `not_found`), the JSON body, the decision (`approved` or `rejected`, else `invalid`), then a read of
// the club and its pending request outside any transaction (no club, or a pending request that is not the one named,
// is a `conflict`), then the review in one transaction. The answer is built from that first read: the new name when
// approved, the club's own when rejected.
//
// The review reads the request before it locks the club, and does not read it again, so two decisions on one request
// that run at once can both apply (a second audit event, the club's revision counted twice). That is the
// TypeScript's order, ported as it is and listed in the plan for the owner; internal/adminwrites tests what always
// holds.
//
// A club ID of 36 such characters that is no UUID makes the Route Handler crash (Prisma refuses it); Go answers
// `not_found`, as the directory read does.
func (s *server) reviewClubName(r *http.Request, p session.Principal) (writes.Result, error) {
	raw := r.PathValue("clubId")
	if !looseClubID.MatchString(raw) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	requestText := body.Text("requestId")
	decision := body.Text("decision")
	if decision != "approved" && decision != "rejected" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	clubID, ok := pgUUID(raw)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	read := sqlcgen.New(s.pool)
	name, err := read.GetClubName(r.Context(), clubID)
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, nil)
	}
	if err != nil {
		return writes.Result{}, err
	}
	pending, err := read.GetPendingClubNameRequest(r.Context(), clubID)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && uuid.UUID(pending.ID.Bytes).String() != requestText {
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, nil)
	}
	if err != nil {
		return writes.Result{}, err
	}
	if err := s.reviewNameChange(r.Context(), p, pending.ID, decision); err != nil {
		return writes.Result{}, err
	}
	changed := name
	if decision == "approved" {
		changed = pending.RequestedName
	}
	return writes.Result{Body: struct {
		Changed bool   `json:"changed"`
		Name    string `json:"name"`
	}{true, changed}}, nil
}

// reviewNameChange is reviewClubNameChange: in one transaction it finds the request (`not_found`), locks its club,
// answers a request that was already decided (the same decision is fine and writes nothing, another one is a
// `conflict`), and decides it. Approval rechecks that the name key is free (`conflict` on `name`), updates the
// club's name and key and counts its revision. A name another club took first loses the unique race: the same
// `conflict`.
func (s *server) reviewNameChange(ctx context.Context, p session.Principal, requestID pgtype.UUID, decision string) error {
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		req, err := q.GetClubNameChangeRequest(ctx, requestID)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		c, err := q.LockClubForWrite(ctx, req.ClubID)
		if errors.Is(err, pgx.ErrNoRows) {
			return writes.Fail(httpapi.ErrNotFound, nil)
		}
		if err != nil {
			return err
		}
		liveupdates.Note(ctx, c.ID, pgtype.UUID{}) // the club's name and the Admin lists change
		if req.State != sqlcgen.ClubNameChangeStatePending {
			if string(req.State) == decision {
				return nil
			}
			return writes.Fail(httpapi.ErrConflict, map[string]string{"request": "This request has already been decided."})
		}
		now := s.stamp()
		after := c.Name
		if decision == "approved" {
			taken, err := q.GetClubIDByNameKey(ctx, req.RequestedNameKey)
			if err == nil && taken != c.ID {
				return writes.Fail(httpapi.ErrConflict, map[string]string{"name": nameTaken})
			}
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return err
			}
			if err := q.SetClubName(ctx, sqlcgen.SetClubNameParams{ID: c.ID, Name: req.RequestedName, NameKey: req.RequestedNameKey, UpdatedAt: now}); err != nil {
				return err
			}
			after = req.RequestedName
		}
		if err := q.DecideClubNameChange(ctx, sqlcgen.DecideClubNameChangeParams{
			ID: req.ID, State: sqlcgen.ClubNameChangeState(decision), ReviewedByAdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, ReviewedAt: now,
		}); err != nil {
			return err
		}
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "club.name_change_" + decision, TargetType: "club", TargetID: uuid.UUID(c.ID.Bytes).String(),
			Metadata: map[string]any{"before": c.Name, "after": after},
		})
	})
	if writes.IsUniqueViolation(err) {
		return writes.Fail(httpapi.ErrConflict, map[string]string{"name": nameTaken})
	}
	return err
}
