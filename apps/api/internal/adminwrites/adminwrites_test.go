package adminwrites_test

import (
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/adminwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestRoutesNeedAPoolAnAuthenticatorAndAHasher(t *testing.T) {
	if _, err := adminwrites.Routes(adminwrites.Deps{}); err == nil {
		t.Error("routes without a pool must be refused")
	}
	// A pool and an authenticator are not enough: Add club hashes the club's password.
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), build)
	if _, err := adminwrites.Routes(adminwrites.Deps{Pool: e.Pool, Auth: e.Service.Authenticator()}); err == nil {
		t.Error("routes without a hasher must be refused")
	}
}

// The club, license, name review and ranking settings writes are the Admin app's alone: a request of any other app, or
// of none, or without the proxy secret, is the generic 404, as a path no route has.
func TestClubWritesAreOnlyForTheAdminApp(t *testing.T) {
	e, _ := clubsEnv(t)
	bearer := e.AdminPass(t, owner)
	for _, r := range []writetest.Request{
		{Method: "POST", Path: "/api/clubs", Body: addClubBody("c2000000-0000-4000-8000-000000000601", "x.y", "password one")},
		{Method: "POST", Path: "/api/clubs/d1000000-0000-4000-8000-000000000004/licenses", Body: licenseBody("c2000000-0000-4000-8000-000000000602")},
		{Method: "PATCH", Path: "/api/clubs/d1000000-0000-4000-8000-000000000001", Body: reviewBody(lahugRequest, "approved")},
		{Method: "POST", Path: "/api/ranking-settings", Body: saveBody("c2000000-0000-4000-8000-000000000603", 2)},
	} {
		for _, app := range []string{"player", "club", ""} {
			r.App, r.Bearer = app, bearer
			if w := e.Do(r); w.Code != 404 {
				t.Errorf("%s %s as app %q: %d, want the generic 404", r.Method, r.Path, app, w.Code)
			}
		}
		r.App, r.NoSecret = "admin", true
		if w := e.Do(r); w.Code != 404 {
			t.Errorf("%s %s without the proxy secret: %d", r.Method, r.Path, w.Code)
		}
	}
	if n := count(t, e, `SELECT count(*) FROM ranking_policy_versions`); n != 2 {
		t.Errorf("%d ranking versions: a refused request must write nothing", n)
	}
	if n := count(t, e, `SELECT count(*) FROM auth_identities WHERE audience = 'club'`); n != 0 {
		t.Errorf("%d club identities: a refused request must write nothing", n)
	}
}

// The write sits on the path of the read: an added flag shows in the list, and only the Admin app has the write.
func TestAnAddedFlagShowsInTheListAndOtherAppsHaveNoWrite(t *testing.T) {
	now := time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC)
	e := writetest.NewEnv(t, now, build)
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "admin.seed.sql"), nil)
	bearer := e.AdminPass(t, owner)

	add := writetest.Request{Method: "POST", Path: "/api/feature-flags", App: "admin", Bearer: bearer,
		Body: `{"commandId":"c1000000-0000-4000-8000-000000000001","key":"cost_estimate","name":"Cost estimate","description":"Shows the estimated cost per player.","on":true}`}
	if w := e.Do(add); w.Code != 201 {
		t.Fatalf("add: %d %s", w.Code, w.Body.String())
	}
	list := e.Do(writetest.Request{Method: "GET", Path: "/api/feature-flags", App: "admin", Bearer: bearer})
	if list.Code != 200 || !strings.Contains(list.Body.String(), `"key":"cost_estimate"`) || !strings.Contains(list.Body.String(), `"value":true`) {
		t.Errorf("list: %d %s", list.Code, list.Body.String())
	}
	for _, app := range []string{"player", "club", ""} {
		add.App = app
		if w := e.Do(add); w.Code != 404 {
			t.Errorf("app %q: %d, want the generic 404", app, w.Code)
		}
	}
	add.App, add.NoSecret = "admin", true
	if w := e.Do(add); w.Code != 404 {
		t.Errorf("without the proxy secret: %d", w.Code)
	}
}
