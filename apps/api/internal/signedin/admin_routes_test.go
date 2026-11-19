package signedin_test

import (
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

func contains(s, sub string) bool { return strings.Contains(s, sub) }

const (
	ownerSubject  = "ad100000-0000-4000-8000-000000000001"
	formerSubject = "ad100000-0000-4000-8000-000000000003"
	adminAlice    = "f4000000-0000-4000-8000-000000000001"
)

func adminEnv(t *testing.T) *env {
	t.Helper()
	e := newEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC))
	e.loadSeed(t, "admin.seed.sql")
	e.relinkAdmins(t)
	return e
}

// every Admin GET the track ports, with the IDs of the admin seed.
var adminPaths = []string{
	"/api/clubs", "/api/clubs/c9000000-0000-4000-8000-000000000001", "/api/clubs/identity", "/api/players",
	"/api/players/d4000000-0000-4000-8000-000000000001", "/api/players/d4000000-0000-4000-8000-000000000001/games",
	"/api/players/d4000000-0000-4000-8000-000000000001/verification", "/api/sales", "/api/sales/clubs/c9000000-0000-4000-8000-000000000001",
	"/api/audit-events?targetType=club&targetId=c9000000-0000-4000-8000-000000000001", "/api/contact-change-requests",
	"/api/contact-change-requests/b1000000-0000-4000-8000-000000000001", "/api/password-reset-requests", "/api/feature-flags",
	"/api/ranking-settings", "/api/license-operations/e1000000-0000-4000-8000-000000000001", "/api/profile-banners", "/api/profile-characters",
}

// Only an active admin can read: no pass, a bad pass, another app's pass and an admin who left are all refused, and
// the answer does not say which.
func TestAdminReadsNeedAnActiveAdmin(t *testing.T) {
	e := adminEnv(t)
	owner := e.adminPass(t, ownerSubject)
	for _, p := range adminPaths {
		if w := e.do(req{path: p, app: "admin", bearer: owner}); w.Code != 200 {
			t.Errorf("%s as the owner: %d %s", p, w.Code, w.Body.String())
		}
		if w := e.do(req{path: p, app: "admin"}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
			t.Errorf("%s with no pass: %d %s", p, w.Code, w.Body.String())
		}
		if w := e.do(req{path: p, app: "admin", bearer: "garbage"}); w.Code != 401 {
			t.Errorf("%s with a bad pass: %d %s", p, w.Code, w.Body.String())
		}
		// A Player's pass is for another app: the Route Handler answers wrong_account.
		if w := e.do(req{path: p, app: "admin", bearer: e.adminPass(t, adminAlice)}); w.Code != 403 || errCode(t, w) != "wrong_account" {
			t.Errorf("%s with a Player pass: %d %s", p, w.Code, w.Body.String())
		}
		// An admin who left (active = false): the Route Handler answers 403 wrong_account, Go answers 401 like it does
		// for every account that can no longer sign in (deviation, see the plan).
		if w := e.do(req{path: p, app: "admin", bearer: e.adminPass(t, formerSubject)}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
			t.Errorf("%s as a former admin: %d %s", p, w.Code, w.Body.String())
		}
	}
}

// An admin who is deactivated after signing in is refused on the next read, once the cached account answer is stale.
func TestAdminReadsRefuseAnAdminDeactivatedAfterSigningIn(t *testing.T) {
	e := adminEnv(t)
	pass := e.adminPass(t, ownerSubject)
	if w := e.do(req{path: "/api/feature-flags", app: "admin", bearer: pass}); w.Code != 200 {
		t.Fatalf("active admin: %d %s", w.Code, w.Body.String())
	}
	e.setup(t, []string{`UPDATE admin_accounts SET active = false WHERE auth_subject = '` + ownerSubject + `'`})
	e.clk.Set(e.clk.Now().Add(6 * time.Second)) // the account answer is cached for 5 seconds
	if w := e.do(req{path: "/api/feature-flags", app: "admin", bearer: pass}); w.Code != 401 {
		t.Fatalf("deactivated admin: %d %s", w.Code, w.Body.String())
	}
}

// An Admin read checks the session row: a signed-out (revoked) session is refused with 401, an active one reads. The
// Player and Queue apps keep trusting a valid pass for its 15 minutes.
func TestAdminReadsCheckTheSession(t *testing.T) {
	e := adminEnv(t)
	id := uuid.MustParse(ownerSubject)
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	var account uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM admin_accounts WHERE auth_subject = $1`, id).Scan(&account); err != nil {
		t.Fatal(err)
	}
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: ident, AccountID: account, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range adminPaths {
		if w := e.do(req{path: p, app: "admin", bearer: iss.AccessPass}); w.Code != 200 {
			t.Errorf("%s with an active session: %d %s", p, w.Code, w.Body.String())
		}
	}
	if err := e.svc.SignOut(e.ctx, iss.Session.ID, nil); err != nil {
		t.Fatal(err)
	}
	for _, p := range adminPaths {
		if w := e.do(req{path: p, app: "admin", bearer: iss.AccessPass}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
			t.Errorf("%s with a revoked session: %d %s", p, w.Code, w.Body.String())
		}
	}
}

// A session row that has expired is refused too, even though the pass itself is still valid.
func TestAdminReadsRefuseAnExpiredSessionRow(t *testing.T) {
	e := adminEnv(t)
	id := uuid.MustParse(ownerSubject)
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	var account uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT id FROM admin_accounts WHERE auth_subject = $1`, id).Scan(&account); err != nil {
		t.Fatal(err)
	}
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: ident, AccountID: account, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	e.exec(t, `UPDATE auth_sessions SET expires_at = now() - interval '1 day' WHERE id = $1`, iss.Session.ID)
	if w := e.do(req{path: "/api/feature-flags", app: "admin", bearer: iss.AccessPass}); w.Code != 401 {
		t.Fatalf("an expired session row reads %d: %s", w.Code, w.Body.String())
	}
}

// The Admin paths belong to the Admin app: any other app, or none, gets the generic 404 on the ones only Admin has.
func TestAdminOnlyPathsAreNotServedToOtherApps(t *testing.T) {
	e := adminEnv(t)
	for _, p := range []string{"/api/feature-flags", "/api/clubs", "/api/clubs/identity", "/api/sales", "/api/audit-events?targetType=club&targetId=x",
		"/api/contact-change-requests", "/api/password-reset-requests", "/api/profile-banners", "/api/profile-characters",
		"/api/license-operations/e1000000-0000-4000-8000-000000000001", "/api/players/d4000000-0000-4000-8000-000000000001/verification"} {
		for _, app := range []string{"", "player", "club"} {
			if w := e.do(req{path: p, app: app, bearer: e.adminPass(t, ownerSubject)}); w.Code != 404 {
				t.Errorf("%s as app %q: %d %s", p, app, w.Code, w.Body.String())
			}
		}
	}
}

// A path the other apps share is routed per app: Player and Queue keep the public club page, Player keeps the public
// ranking settings, and Admin gets its own reads of both.
func TestSharedPathsAreRoutedPerApp(t *testing.T) {
	e := adminEnv(t)
	owner := e.adminPass(t, ownerSubject)
	club := "/api/clubs/c9000000-0000-4000-8000-000000000001"
	for _, app := range []string{"player", "club"} {
		w := e.do(req{path: club, app: app})
		if w.Code != 200 || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Errorf("club page for %s: %d %q %s", app, w.Code, w.Header().Get("Cache-Control"), w.Body.String())
		}
		if !contains(w.Body.String(), `"page"`) {
			t.Errorf("club page for %s is the public page: %s", app, w.Body.String())
		}
	}
	if w := e.do(req{path: club, app: "admin"}); w.Code != 401 {
		t.Errorf("Admin club read with no pass: %d", w.Code)
	}
	if w := e.do(req{path: club, app: "admin", bearer: owner}); w.Code != 200 || !contains(w.Body.String(), `"club"`) {
		t.Errorf("Admin club read: %d %s", w.Code, w.Body.String())
	}
	if w := e.do(req{path: club}); w.Code != 404 {
		t.Errorf("club page with no app header: %d", w.Code)
	}
	rank := "/api/ranking-settings"
	if w := e.do(req{path: rank, app: "player"}); w.Code != 200 || w.Header().Get("Cache-Control") != "public, max-age=0, must-revalidate" || !contains(w.Body.String(), `"versions"`) {
		t.Errorf("public ranking settings: %d %q %s", w.Code, w.Header().Get("Cache-Control"), w.Body.String())
	}
	if w := e.do(req{path: rank, app: "club"}); w.Code != 404 {
		t.Errorf("the Queue app has no ranking settings: %d", w.Code)
	}
	if w := e.do(req{path: rank, app: "admin"}); w.Code != 401 {
		t.Errorf("Admin ranking settings with no pass: %d", w.Code)
	}
	w := e.do(req{path: rank, app: "admin", bearer: owner})
	if w.Code != 200 || w.Header().Get("Cache-Control") != "private, no-store" || !contains(w.Body.String(), "createdByDisplayName") || !contains(w.Body.String(), "Initial settings") {
		t.Errorf("Admin ranking settings: %d %q %s", w.Code, w.Header().Get("Cache-Control"), w.Body.String())
	}
}

// main mounts the public reads and the signed-in reads on one mux: no path may be claimed twice (net/http panics), and
// the public libraries the Admin pickers use stay open with no pass.
func TestPublicAndSignedInReadsShareOneMux(t *testing.T) {
	e := adminEnv(t)
	limiter := httpapi.NewRateLimiter(1_000_000, nil)
	register, err := signedin.Register(signedin.Deps{Pool: e.pool, Auth: e.svc.Authenticator(), Now: e.clk.Now, Limiter: limiter})
	if err != nil {
		t.Fatal(err)
	}
	pub := publicreads.Register(publicreads.Deps{Pool: e.pool, Limiter: limiter, Now: e.clk.Now})
	e.handler = httpapi.NewHandler(httpapi.Deps{Logger: slog.New(slog.DiscardHandler), Pinger: e.pool, Readiness: httpapi.NewReadiness(), ProxySecret: secret}, pub, register)
	for _, p := range []string{"/api/profile-banners/shown", "/api/profile-characters/shown", "/api/profile-characters/a/image"} {
		if w := e.do(req{path: p, app: "admin"}); w.Code != 200 {
			t.Errorf("%s: %d %s", p, w.Code, w.Body.String())
		}
	}
	// and the shared paths still answer per app
	if w := e.do(req{path: "/api/clubs/c9000000-0000-4000-8000-000000000001", app: "player"}); w.Code != 200 {
		t.Errorf("club page: %d %s", w.Code, w.Body.String())
	}
	if w := e.do(req{path: "/api/feature-flags", app: "admin", bearer: e.adminPass(t, ownerSubject)}); w.Code != 200 {
		t.Errorf("flags: %d %s", w.Code, w.Body.String())
	}
}

// An ID the database cannot read is a 404 here; the Route Handlers crash with a 500 (a Prisma uuid error) on the
// ones below, which the capture cannot record (deviation, see the plan).
func TestMalformedIDsAreNotFoundWhereTheRouteHandlerCrashes(t *testing.T) {
	e := adminEnv(t)
	owner := e.adminPass(t, ownerSubject)
	for _, p := range []string{
		"/api/players/not-a-uuid", "/api/license-operations/not-a-uuid", "/api/clubs/------------------------------------",
		"/api/clubs/zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
	} {
		if w := e.do(req{path: p, app: "admin", bearer: owner}); w.Code != 404 || errCode(t, w) != "not_found" {
			t.Errorf("%s: %d %s", p, w.Code, w.Body.String())
		}
	}
}

// A server with no recovery service leaves the password-reset list out: the Admin app gets the generic 404.
func TestPasswordResetListIsLeftOutWithoutTheRecoveryService(t *testing.T) {
	e := adminEnv(t)
	pass := e.adminPass(t, ownerSubject)
	if w := e.do(req{path: "/api/password-reset-requests", app: "admin", bearer: pass}); w.Code != 200 {
		t.Fatalf("with the service: %d %s", w.Code, w.Body.String())
	}
	e.handler = e.noResets
	if w := e.do(req{path: "/api/password-reset-requests", app: "admin", bearer: pass}); w.Code != 404 {
		t.Fatalf("without it: %d %s", w.Code, w.Body.String())
	}
}
