package adminwrites_test

import (
	"strings"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/adminwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestRoutesNeedAPoolAndAnAuthenticator(t *testing.T) {
	if _, err := adminwrites.Routes(adminwrites.Deps{}); err == nil {
		t.Error("routes without a pool must be refused")
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
