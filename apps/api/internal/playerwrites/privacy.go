package playerwrites

import (
	"context"
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// The privacy switches: POST /api/me/profile-visibility, /api/me/directory-visibility, /api/me/phone-privacy. Ports of the Route Handlers in apps/player/src/app/api/me/** and of setProfileVisibility,
// setHiddenFromDirectory and setPhonePrivacy in packages/db/src/player/profile.ts.
//
// Each reads the player's row WITHOUT a lock, and checks the expected revision only when the value changes (so a switch that
// is already as asked answers 200 whatever revision was sent, and a stale one that changes nothing is not a conflict). Two
// switches changed at once can both read the same revision and both write: the TypeScript does the same (see the track's
// deviations log); the revision goes up once for each.

func (s *server) registerPrivacy(rt *signedin.Router) {
	rt.Handle("POST /api/me/profile-visibility", store.AudiencePlayer, s.player(s.setProfileVisibility))
	rt.Handle("POST /api/me/directory-visibility", store.AudiencePlayer, s.player(s.setDirectoryVisibility))
	rt.Handle("POST /api/me/phone-privacy", store.AudiencePlayer, s.player(s.setPhonePrivacy))
}

// accountAnswer is `{ account }`: readMyAccount after the commit.
type accountAnswer struct {
	Account signedin.MyAccount `json:"account"`
}

// switchTx runs one privacy switch: it reads the player, calls change to say whether the value changes (and write it), and
// answers with the account as it stands after the commit.
func (s *server) switchTx(r *http.Request, p session.Principal, change func(ctx context.Context, q *sqlcgen.Queries, row sqlcgen.GetPlayerPrivacyRow) error) (writes.Result, error) {
	id := self(p)
	err := writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := q.GetPlayerPrivacy(ctx, id)
		if err != nil {
			return err // findUniqueOrThrow: an unexpected failure, a 500
		}
		return change(ctx, q, row)
	})
	if err != nil {
		return writes.Result{}, err
	}
	account, err := s.account(r.Context(), id)
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: accountAnswer{account}}, nil
}

// setProfileVisibility is P-PROFILE-PRIVACY · Profile visibility (D-2026-11-12-01), under the loaded account revision.
func (s *server) setProfileVisibility(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	var level sqlcgen.ProfileVisibility
	switch v := body.Text("profileVisibility"); sqlcgen.ProfileVisibility(v) {
	case sqlcgen.ProfileVisibilityPublic, sqlcgen.ProfileVisibilityPrivate, sqlcgen.ProfileVisibilityAlwaysPrivate:
		level = sqlcgen.ProfileVisibility(v)
	default:
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	return s.switchTx(r, p, func(ctx context.Context, q *sqlcgen.Queries, row sqlcgen.GetPlayerPrivacyRow) error {
		if row.ProfileVisibility == level {
			return nil
		}
		if err := writes.RequireRevision(row.Revision, expected); err != nil {
			return err
		}
		return q.SetPlayerProfileVisibility(ctx, sqlcgen.SetPlayerProfileVisibilityParams{Visibility: level, Now: s.stamp(), ID: self(p)})
	})
}

// setDirectoryVisibility is P-PROFILE-PRIVACY · Hide me from Player Information, under the loaded account revision.
func (s *server) setDirectoryVisibility(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	hidden, ok := body.Bool("hiddenFromDirectory")
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	return s.switchTx(r, p, func(ctx context.Context, q *sqlcgen.Queries, row sqlcgen.GetPlayerPrivacyRow) error {
		if row.HiddenFromDirectory == hidden {
			return nil
		}
		if err := writes.RequireRevision(row.Revision, expected); err != nil {
			return err
		}
		return q.SetPlayerHiddenFromDirectory(ctx, sqlcgen.SetPlayerHiddenFromDirectoryParams{Hidden: hidden, Now: s.stamp(), ID: self(p)})
	})
}

// setPhonePrivacy is P-PHONE-PRIVACY · Hide my phone from clubs, under the loaded account revision.
func (s *server) setPhonePrivacy(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	hidden, ok := body.Bool("phoneHidden")
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	expected := body.Text("expectedRevision")
	return s.switchTx(r, p, func(ctx context.Context, q *sqlcgen.Queries, row sqlcgen.GetPlayerPrivacyRow) error {
		if row.HidePhoneFromClubs == hidden {
			return nil
		}
		if err := writes.RequireRevision(row.Revision, expected); err != nil {
			return err
		}
		return q.SetPlayerPhoneHidden(ctx, sqlcgen.SetPlayerPhoneHiddenParams{Hidden: hidden, Now: s.stamp(), ID: self(p)})
	})
}
