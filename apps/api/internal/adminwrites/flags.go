package adminwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/featureflag"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Feature flag writes: POST /api/feature-flags (A-ADD-FLAG, Add flag) and PATCH /api/feature-flags/{key} (D-FLAG,
// Turn on / Turn off). Ports of apps/admin/src/app/api/feature-flags/**/route.ts and createFeatureFlag and
// setFeatureFlag in packages/db/src/admin/configuration.ts. The list read is signedin's.

func (s *server) registerFlags(rt *signedin.Router) {
	rt.Handle("POST /api/feature-flags", store.AudienceAdmin, s.admin(s.createFlag))
	rt.Handle("PATCH /api/feature-flags/{key}", store.AudienceAdmin, s.admin(s.setFlag))
}

// flagDTO is flagDto: the admin who acted shows by display name, never an ID.
type flagDTO struct {
	Key                  string `json:"key"`
	Name                 string `json:"name"`
	Description          string `json:"description"`
	Value                bool   `json:"value"`
	CreatedAt            string `json:"createdAt"`
	CreatedByDisplayName string `json:"createdByDisplayName"`
	UpdatedAt            string `json:"updatedAt"`
	UpdatedByDisplayName string `json:"updatedByDisplayName"`
	Revision             string `json:"revision"`
}

func flagBody(f sqlcgen.GetAdminFeatureFlagRow) struct {
	Flag flagDTO `json:"flag"`
} {
	return struct {
		Flag flagDTO `json:"flag"`
	}{flagDTO{
		Key: f.Key, Name: f.Name, Description: f.Description, Value: f.Value,
		CreatedAt: httpapi.ToIso(f.CreatedAt.Time), CreatedByDisplayName: f.CreatedByName.String,
		UpdatedAt: httpapi.ToIso(f.UpdatedAt.Time), UpdatedByDisplayName: f.UpdatedByName.String,
		Revision: httpapi.ToDecimalString(f.Revision),
	}}
}

// createFlag is the POST handler and createFeatureFlag. The order is the TypeScript's: the JSON body, then the
// format rules (`invalid`), then in one transaction the command lookup (a retried add answers the same flag), then
// the taken name or key (`conflict`). A name or key another add took first, or a command another add used first,
// loses the unique race: that is the same `conflict` on the key.
func (s *server) createFlag(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	on, _ := body.Bool("on") // `value: body.on === true`
	in := featureflag.Trim(featureflag.Input{Name: body.Text("name"), Key: body.Text("key"), Description: body.Text("description"), On: on})
	if errs := featureflag.Errors(in, nil); len(errs) > 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, errs)
	}
	// The TypeScript sends a command id that is no UUID to Postgres, which refuses it: an unexpected 500. Go answers
	// `invalid` with no fields instead (a logged deviation).
	command, ok := pgUUID(body.Text("commandId"))
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var out any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		done, err := q.GetAdminAuditEventByCommand(ctx, command)
		switch {
		case err == nil:
			// findUniqueOrThrow: an event of another kind of target is a missing flag, an unexpected 500.
			f, err := q.GetAdminFeatureFlag(ctx, done.TargetID)
			if err != nil {
				return err
			}
			out = flagBody(f)
			return nil
		case !errors.Is(err, pgx.ErrNoRows):
			return err
		}
		existing, err := q.ListFeatureFlagIdentities(ctx)
		if err != nil {
			return err
		}
		known := make([]featureflag.Identity, len(existing))
		for i, e := range existing {
			known[i] = featureflag.Identity{Name: e.Name, Key: e.Key}
		}
		if errs := featureflag.Errors(in, known); len(errs) > 0 {
			return writes.Fail(httpapi.ErrConflict, errs)
		}
		admin := pgtype.UUID{Bytes: p.AccountID, Valid: true}
		if err := q.InsertFeatureFlag(ctx, sqlcgen.InsertFeatureFlagParams{
			Key: in.Key, Name: in.Name, Description: in.Description, Value: in.On, CreatedByAdminID: admin, CreatedAt: s.stamp(),
		}); err != nil {
			return err
		}
		f, err := q.GetAdminFeatureFlag(ctx, in.Key)
		if err != nil {
			return err
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "flag.created", TargetType: "feature_flag", TargetID: f.Key, SourceCommandID: command,
			Metadata: map[string]any{"value": f.Value},
		}); err != nil {
			return err
		}
		out = flagBody(f)
		return nil
	})
	if writes.IsUniqueViolation(err) {
		// A concurrent add of the same key or exact name lost the unique race.
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"key": featureflag.KeyTaken})
	}
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

// setFlag is the PATCH handler and setFeatureFlag. The order is the TypeScript's: the JSON body, `on` must be a
// boolean (`invalid`), then in one transaction the row lock (a missing flag is `not_found`), the revision (a stale
// or unreadable one, even when the value already matches), and only then the no-op: a switch to the value the flag
// has writes nothing, records nothing and answers the flag as it is.
func (s *server) setFlag(r *http.Request, p session.Principal) (writes.Result, error) {
	key := r.PathValue("key")
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	on, isBool := body.Bool("on")
	if !isBool {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	var out any
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if _, err := q.LockFeatureFlag(ctx, key); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return writes.Fail(httpapi.ErrNotFound, nil)
			}
			return err
		}
		flag, err := q.GetAdminFeatureFlag(ctx, key)
		if err != nil {
			return err
		}
		if err := writes.RequireRevision(flag.Revision, expected); err != nil {
			return err
		}
		if flag.Value == on {
			out = flagBody(flag)
			return nil
		}
		if err := q.SetFeatureFlagValue(ctx, sqlcgen.SetFeatureFlagValueParams{
			Key: key, Value: on, UpdatedByAdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, UpdatedAt: s.stamp(),
		}); err != nil {
			return err
		}
		if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "flag.changed", TargetType: "feature_flag", TargetID: flag.Key,
			Metadata: map[string]any{"before": flag.Value, "after": on},
		}); err != nil {
			return err
		}
		updated, err := q.GetAdminFeatureFlag(ctx, key)
		if err != nil {
			return err
		}
		out = flagBody(updated)
		return nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: out}, nil
}
