package signedin

import (
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// googleRequiredMessage is GOOGLE_REQUIRED in packages/db/src/player/google-gate.ts.
const googleRequiredMessage = "Connect a Google account to keep using ROTRA."

// playerGoogleFlag is PLAYER_GOOGLE_SIGN_IN_FLAG.
const playerGoogleFlag = "player_google_sign_in"

// googleDeadline is GOOGLE_SIGN_IN_DEADLINE.date as isGoogleDeadlinePassed reads it: the day ends at midnight
// in the Philippines (UTC+8), after the whole day has passed.
var googleDeadline = time.Date(2026, 12, 31, 0, 0, 0, 0, time.FixedZone("PHT", 8*3600)).Add(24 * time.Hour)

// viewer is the signed-in Player a read runs for.
type viewer struct {
	ID pgtype.UUID
}

// playerRead is the body of a Player read: it returns the JSON body (status 200) or an error.
type playerRead func(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error)

// playerOption tunes one Player route.
type playerOption func(*playerRoute)

type playerRoute struct{ allowWithoutGoogle bool }

// withoutGoogle lets a player with no Google account past the deadline gate: the connect screen and the
// leaderboard need these routes (handleAccountRequest's allowWithoutGoogle).
func withoutGoogle(o *playerRoute) { o.allowWithoutGoogle = true }

// player is handleAccountRequest('player', ...): the pass is checked for the Player app, the account is
// loaded from the pass, the deadline gate runs, then fn reads on one snapshot.
func (s *server) player(fn playerRead, opts ...playerOption) http.Handler {
	var route playerRoute
	for _, o := range opts {
		o(&route)
	}
	run := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := session.PrincipalFrom(r.Context())
		if !ok {
			httpapi.WriteError(w, httpapi.ErrUnauthenticated, nil)
			return
		}
		who := viewer{ID: pgtype.UUID{Bytes: p.AccountID, Valid: true}}
		if !route.allowWithoutGoogle {
			required, err := s.googleRequired(r, who)
			if err != nil {
				s.write(w, r, err)
				return
			}
			if required {
				httpapi.WriteError(w, httpapi.ErrForbidden, map[string]string{"google": googleRequiredMessage})
				return
			}
		}
		var body any
		err := readTx(r.Context(), s.pool, func(q *sqlcgen.Queries) (err error) {
			body, err = fn(r, q, who)
			return err
		})
		if err != nil {
			s.write(w, r, err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	})
	return s.auth.Require(store.AudiencePlayer, session.ModeRead)(run)
}

// googleRequired is googleRequiredFor: after the deadline, with the flag on, a player with no Google account
// may only connect Google or sign out. The flag is read only once the deadline has passed and the player has
// no Google.
func (s *server) googleRequired(r *http.Request, who viewer) (bool, error) {
	q := sqlcgen.New(s.pool)
	google, err := q.GetPlayerGoogleEmail(r.Context(), who.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	if google.Valid || s.now().Before(googleDeadline) {
		return false, nil
	}
	return s.flagOn(r, playerGoogleFlag), nil
}

// flagOn is readPlayerFeatureFlag: a fresh read; a missing flag or a failed read is off.
func (s *server) flagOn(r *http.Request, key string) bool {
	on, err := sqlcgen.New(s.pool).GetFeatureFlagValue(r.Context(), key)
	return err == nil && on
}

// optionalViewer is the signed-in player of a request that a visitor may make too, or false for a visitor.
func optionalViewer(r *http.Request) (viewer, bool) {
	p, ok := session.PrincipalFrom(r.Context())
	if !ok {
		return viewer{}, false
	}
	return viewer{ID: pgtype.UUID{Bytes: p.AccountID, Valid: true}}, true
}

// visitorOrPlayer wraps a read open to visitors (handleVisitorRequest): the pass is optional.
func (s *server) visitorOrPlayer(fn func(r *http.Request, q *sqlcgen.Queries, who *viewer) (any, error)) http.Handler {
	run := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var who *viewer
		if v, ok := optionalViewer(r); ok {
			who = &v
		}
		var body any
		err := readTx(r.Context(), s.pool, func(q *sqlcgen.Queries) (err error) {
			body, err = fn(r, q, who)
			return err
		})
		if err != nil {
			s.write(w, r, err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	})
	return s.auth.Optional(store.AudiencePlayer)(run)
}
