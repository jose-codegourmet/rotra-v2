package adminwrites_test

import (
	"net/http/httptest"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// clubsEnv is a test environment on testdata/clubs.seed.sql, and what puts it back to that seed: for the tests of
// races and of the rows the golden files do not pin (the clubs group of cases shares one seed).
func clubsEnv(t *testing.T) (*writetest.Env, func()) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "ranking.cases.json", &cf)
	e := writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	reset := func() { e.Reseed(t, seed, nil) }
	reset()
	return e, reset
}

// sendAll sends the same kind of request once per body, all at the same moment, each signed in as who.
func sendAll(t *testing.T, e *writetest.Env, who, method, path string, bodies ...string) []*httptest.ResponseRecorder {
	t.Helper()
	reqs := make([]writetest.Request, len(bodies))
	for i, b := range bodies {
		reqs[i] = writetest.Request{Method: method, Path: path, App: "admin", Bearer: e.AdminPass(t, who), Body: b}
	}
	return e.DoAll(reqs)
}

// requests builds two PATCH requests to different paths, each signed in as the owner.
func requests(t *testing.T, e *writetest.Env, pathA, bodyA, pathB, bodyB string) []writetest.Request {
	t.Helper()
	return []writetest.Request{
		{Method: "PATCH", Path: pathA, App: "admin", Bearer: e.AdminPass(t, owner), Body: bodyA},
		{Method: "PATCH", Path: pathB, App: "admin", Bearer: e.AdminPass(t, owner), Body: bodyB},
	}
}

// sendBoth sends two requests to different paths at the same moment, each signed in as the owner.
func sendBoth(t *testing.T, e *writetest.Env, pathA, bodyA, pathB, bodyB string) []*httptest.ResponseRecorder {
	t.Helper()
	return e.DoAll([]writetest.Request{
		{Method: "POST", Path: pathA, App: "admin", Bearer: e.AdminPass(t, owner), Body: bodyA},
		{Method: "POST", Path: pathB, App: "admin", Bearer: e.AdminPass(t, owner), Body: bodyB},
	})
}
