package queuewrites_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Two visitors' retries of one request id at the same moment: the TypeScript reads the request before it locks the session, so the second can
// run into the unique key and answer 409; Go locks first, so the second finds the request. Either way there is one request.
func TestRaceVisitorRetryOfOneRequest(t *testing.T) {
	e := writetest.NewEnv(t, clock, buildVisitor("race-secret"))
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	join := func() writetest.Request {
		return writetest.Request{
			Method: "POST", Path: "/api/public-sessions/prep-open/join-request", App: "club",
			Body: `{"requestId":"a3400000-0000-4000-8000-000000000101","name":"Vic","statedBand":"beginner"}`,
		}
	}
	ok := 0
	for _, w := range e.DoAll([]writetest.Request{join(), join(), join()}) {
		switch w.Code {
		case 200:
			ok++
			if w.Header().Get("Set-Cookie") == "" {
				t.Error("an answer without the receipt cookie")
			}
		case 409:
		default:
			t.Errorf("answered %d: %s", w.Code, w.Body)
		}
	}
	if ok == 0 {
		t.Error("nobody got the request")
	}
	if n := count(t, e, `SELECT count(*)::int FROM session_join_requests WHERE id = 'a3400000-0000-4000-8000-000000000101'`); n != 1 {
		t.Errorf("%d requests with that id", n)
	}
}
