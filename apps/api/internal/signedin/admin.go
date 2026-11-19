package signedin

import (
	"context"
	"math"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Admin app's GET reads: ports of apps/admin/src/app/api/**/route.ts and packages/db/src/admin/*.ts. Every one
// runs behind the pass check of the Admin app, which lets only an active admin account through
// (handleAccountRequest('admin', ...)).

// PasswordResetReader lists the Admin's password-reset requests; the recovery service is one.
type PasswordResetReader interface {
	ReadRequests(ctx context.Context, page int) (recovery.Page, error)
}

// adminRead is the body of an Admin read: it returns the JSON body (status 200) or an error.
type adminRead func(r *http.Request, q *sqlcgen.Queries) (any, error)

// admin is handleAccountRequest('admin', ...): the pass is checked for the Admin app, then fn reads on one snapshot.
func (s *server) admin(fn adminRead) http.Handler {
	run := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body any
		err := readTx(r.Context(), s.pool, func(q *sqlcgen.Queries) (err error) {
			body, err = fn(r, q)
			return err
		})
		if err != nil {
			s.write(w, r, err)
			return
		}
		httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
	})
	return s.auth.Require(store.AudienceAdmin, session.ModeSessionRead)(run)
}

// registerAdmin adds the Admin app's reads. A path that another app answers too (clubs, ranking settings, players)
// is routed per app, so the public handler keeps serving the apps that had it.
func (s *server) registerAdmin(rt *Router) {
	admin := store.AudienceAdmin
	rt.Handle("GET /api/feature-flags", admin, s.admin(s.adminFlags))
	rt.Handle("GET /api/ranking-settings", admin, s.admin(s.adminRankingSettings))
	rt.Handle("GET /api/clubs/identity", admin, s.admin(s.adminClubIdentity))
	rt.Handle("GET /api/license-operations/{commandId}", admin, s.admin(s.adminLicenseOperation))
	rt.Handle("GET /api/profile-banners", admin, s.admin(s.adminBanners))
	rt.Handle("GET /api/profile-characters", admin, s.admin(s.adminCharacters))
	rt.Handle("GET /api/clubs", admin, s.admin(s.adminClubs))
	rt.Handle("GET /api/clubs/{clubId}", admin, s.admin(s.adminClub))
	rt.Handle("GET /api/sales", admin, s.admin(s.adminSales))
	rt.Handle("GET /api/sales/clubs/{clubId}", admin, s.admin(s.adminClubSales))
	rt.Handle("GET /api/players", admin, s.admin(s.adminPlayers))
	rt.Handle("GET /api/players/{playerId}", admin, s.admin(s.adminPlayer))
	rt.Handle("GET /api/players/{playerId}/games", admin, s.admin(s.adminPlayerGames))
	rt.Handle("GET /api/players/{playerId}/verification", admin, s.admin(s.adminPlayerVerification))
	rt.Handle("GET /api/contact-change-requests", admin, s.admin(s.adminContactRequests))
	rt.Handle("GET /api/contact-change-requests/{requestId}", admin, s.admin(s.adminContactRequest))
	rt.Handle("GET /api/audit-events", admin, s.admin(s.adminAuditEvents))
	if s.resets != nil {
		rt.Handle("GET /api/password-reset-requests", admin, s.adminPasswordResets())
	}
}

// ---- small JavaScript-faithful helpers the Admin reads share ----

// jsRound is Math.round: half rounds up, toward +Infinity, also for negatives (Go's math.Round goes away from zero).
func jsRound(x float64) int64 { return int64(math.Floor(x + 0.5)) }

// moneyOrNil is toMoney: integer minor units and the currency, null stays null.
func moneyOrNil(minor pgtype.Int4, currency string) *httpapi.Money {
	if !minor.Valid {
		return nil
	}
	return &httpapi.Money{AmountMinor: int64(minor.Int32), Currency: currency}
}

// peso is the Sales DTO money: centavos in Philippine pesos.
func peso(minor int64) httpapi.Money { return httpapi.Money{AmountMinor: minor, Currency: "PHP"} }

// dateOnly is a @db.Date as YYYY-MM-DD, or nil.
func dateOnly(d pgtype.Date) *string {
	if !d.Valid {
		return nil
	}
	s := httpapi.ToDateOnly(d.Time)
	return &s
}

// isoOrEmpty is toIsoOrNull(...) ?? ”.
func isoOrEmpty(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return httpapi.ToIso(t.Time)
}

// manila is Asia/Manila: UTC+8 all year, so a fixed zone is the same as the named one.
var manila = time.FixedZone("PHT", 8*3600)

// manilaToday is manilaToday(): the calendar day in Manila, as YYYY-MM-DD.
func manilaToday(t time.Time) string { return t.In(manila).Format("2006-01-02") }

// uuidKey is a UUID as the ID the database reads: the 8-4-4-4-12 form in either case (a Postgres uuid ignores case).
func uuidKey(s string) (pgtype.UUID, bool) { return parseUUIDString(s) }

// stringsOrEmpty keeps an empty list a JSON array, never null.
func stringsOrEmpty(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
