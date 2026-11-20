package queuewrites

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// The session helpers every later Queue write is built on (lock, access, state, revision, close stale requests, minimum), tested
// through two probe routes: one that checks the expected revision inside rosterCommand, one that only locks and reads.

func probe(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	s := &server{pool: pool, auth: auth, log: log, now: now}
	rt := signedin.NewRouter()
	rt.Handle("POST /api/probe/{sessionId}/revision", store.AudienceClub, s.club(func(r *http.Request, club pgtype.UUID) (writes.Result, error) {
		body, err := writes.ReadBody(r)
		if err != nil {
			return writes.Result{}, err
		}
		out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
			if err := requireRevision(t.sess.Revision, body.Text("expectedRevision")); err != nil {
				return nil, err
			}
			return map[string]any{"revision": t.sess.Revision}, nil
		})
		return writes.Result{Body: out}, err
	}))
	rt.Handle("POST /api/probe/{sessionId}/locked", store.AudienceClub, s.club(func(r *http.Request, club pgtype.UUID) (writes.Result, error) {
		out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
			return map[string]any{"state": string(t.sess.State), "revision": t.sess.Revision}, nil
		})
		return writes.Result{Body: out}, err
	}))
	return rt.Mount
}

const (
	smashSubject  = "c7000000-0000-4000-8000-000000000001"
	lapsedSubject = "c7000000-0000-4000-8000-000000000002"
	s1            = "a3000000-0000-4000-8000-000000000001"
	s4            = "a3000000-0000-4000-8000-000000000004"
	s7            = "a3000000-0000-4000-8000-000000000007"
	s8            = "a3000000-0000-4000-8000-000000000008"
)

func probeEnv(t *testing.T) *writetest.Env {
	t.Helper()
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), probe)
	e.Clubs = true
	e.Reseed(t, writetest.ReadSeed(t, "testdata", "queue.seed.sql"), nil)
	return e
}

func post(e *writetest.Env, t *testing.T, who, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	return e.Do(writetest.Request{Method: "POST", Path: path, App: "club", Bearer: e.ClubPass(t, who), Body: body})
}

func errorOf(t *testing.T, w *httptest.ResponseRecorder) (code string, fields map[string]string) {
	t.Helper()
	var m struct {
		Error struct {
			Code   string            `json:"code"`
			Fields map[string]string `json:"fields"`
		} `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("not JSON: %s", w.Body)
	}
	return m.Error.Code, m.Error.Fields
}

func revisionOf(t *testing.T, e *writetest.Env, id string) int64 {
	t.Helper()
	var r int64
	if err := e.Pool.QueryRow(e.Ctx, `SELECT revision FROM queue_sessions WHERE id = $1`, id).Scan(&r); err != nil {
		t.Fatal(err)
	}
	return r
}

// The expected revision is checked against the locked row: a stale one is the 409 every command answers, one that is no number is
// 422 on `revision`, and a successful roster command bumps the revision so the same expectation is stale afterwards.
func TestExpectedRevisionIsCheckedUnderTheLock(t *testing.T) {
	e := probeEnv(t)
	path := "/api/probe/" + s1 + "/revision"
	if w := post(e, t, smashSubject, path, `{"expectedRevision":"4"}`); w.Code != 409 {
		t.Fatalf("stale: %d %s", w.Code, w.Body)
	} else if code, _ := errorOf(t, w); code != "conflict" {
		t.Errorf("code %q", code)
	}
	if revisionOf(t, e, s1) != 5 {
		t.Error("a refused command must not change the revision")
	}
	code := func(body string) (int, string, map[string]string) {
		w := post(e, t, smashSubject, path, body)
		c, f := errorOf(t, w)
		return w.Code, c, f
	}
	if status, c, f := code(`{"expectedRevision":"five"}`); status != 422 || c != "invalid" || f["revision"] != writes.RevisionNotWhole {
		t.Errorf("not a number: %d %s %v", status, c, f)
	}
	if status, c, _ := code(`{}`); status != 409 || c != "conflict" { // a missing revision reads as "" which BigInt takes as 0
		t.Errorf("missing: %d %s", status, c)
	}
	if w := post(e, t, smashSubject, path, `{"expectedRevision":"5"}`); w.Code != 200 {
		t.Fatalf("current: %d %s", w.Code, w.Body)
	}
	if got := revisionOf(t, e, s1); got != 6 {
		t.Errorf("revision %d, want 6 after one roster command", got)
	}
	if w := post(e, t, smashSubject, path, `{"expectedRevision":"5"}`); w.Code != 409 {
		t.Errorf("the same expectation is stale now: %d", w.Code)
	}
	// BigInt reads white space, a sign and a hex literal.
	if w := post(e, t, smashSubject, path, `{"expectedRevision":" 0x6 "}`); w.Code != 200 {
		t.Errorf("hex with white space: %d %s", w.Code, w.Body)
	}
}

// Two commands with the same expected revision at the same moment: the lock makes one of them see the other's bump.
func TestConcurrentCommandsWithTheSameExpectedRevision(t *testing.T) {
	e := probeEnv(t)
	req := func() writetest.Request {
		return writetest.Request{Method: "POST", Path: "/api/probe/" + s1 + "/revision", App: "club", Bearer: e.ClubPass(t, smashSubject), Body: `{"expectedRevision":"5"}`}
	}
	got := e.DoAll([]writetest.Request{req(), req(), req()})
	var codes []int
	for _, w := range got {
		codes = append(codes, w.Code)
	}
	sort.Ints(codes)
	if codes[0] != 200 || codes[1] != 409 || codes[2] != 409 {
		t.Errorf("statuses %v, want one 200 and two 409", codes)
	}
	if revisionOf(t, e, s1) != 6 {
		t.Errorf("revision %d, want 6", revisionOf(t, e, s1))
	}
}

// The lock refuses another club's session and an unknown or malformed one; a lapsed club is refused unless the session is live and
// started under a licence term; rosterCommand wants a prepared or active session, inSession takes any state.
func TestSessionAccessAndState(t *testing.T) {
	e := probeEnv(t)
	check := func(name, who, path string, status int, want string) {
		t.Helper()
		w := post(e, t, who, path, `{"expectedRevision":"1"}`)
		if w.Code != status {
			t.Errorf("%s: %d %s, want %d", name, w.Code, w.Body, status)
			return
		}
		if want != "" {
			if c, _ := errorOf(t, w); c != want {
				t.Errorf("%s: code %q, want %q", name, c, want)
			}
		}
	}
	check("another club's session", lapsedSubject, "/api/probe/"+s1+"/locked", 404, "not_found")
	check("unknown", smashSubject, "/api/probe/a3000000-0000-4000-8000-0000000000ff/locked", 404, "not_found")
	check("malformed", smashSubject, "/api/probe/nope/locked", 404, "not_found")
	check("lapsed prepared", lapsedSubject, "/api/probe/"+s7+"/locked", 403, "entitlement_required")
	check("lapsed live under a term", lapsedSubject, "/api/probe/"+s8+"/locked", 200, "")
	check("closed session for inSession", smashSubject, "/api/probe/"+s4+"/locked", 200, "")
	check("closed session for rosterCommand", smashSubject, "/api/probe/"+s4+"/revision", 422, "invalid")
	w := post(e, t, smashSubject, "/api/probe/"+s4+"/revision", `{"expectedRevision":"1"}`)
	if _, f := errorOf(t, w); f["state"] != "This session is closed." {
		t.Errorf("state field %v", f)
	}
}

// rosterCommand closes the match requests that name someone who is not present, and keeps the others.
func TestRosterCommandClosesStaleMatchRequests(t *testing.T) {
	e := probeEnv(t)
	const live = "a3000000-0000-4000-8000-000000000003"
	if w := post(e, t, smashSubject, "/api/probe/"+live+"/revision", `{"expectedRevision":"12"}`); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	rows, err := e.Pool.Query(e.Ctx, `SELECT id::text || ' ' || status::text || ' ' || revision::text FROM session_match_requests ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			t.Fatal(err)
		}
		got = append(got, s)
	}
	want := []string{
		"a3700000-0000-4000-8000-000000000001 closed 2", // Hal asks for Ivy, who is away
		"a3700000-0000-4000-8000-000000000002 closed 2", // Ivy, who is away, asks
		"a3700000-0000-4000-8000-000000000003 open 1",   // Jo asks for Hal, both here
		"a3700000-0000-4000-8000-000000000004 closed 2", // already closed, untouched
	}
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("request %d: %q, want %q", i, got[i], want[i])
		}
	}
}

func TestMapDatabaseError(t *testing.T) {
	pg := func(code string) error { return &pgconn.PgError{Code: code} }
	cases := []struct {
		name string
		in   error
		want httpapi.ErrorCode
	}{
		{"unique", pg("23505"), httpapi.ErrConflict},
		{"exclusion", pg("23P01"), httpapi.ErrConflict},
		{"foreign key", pg("23503"), httpapi.ErrInvalid},
		{"missing row", pgx.ErrNoRows, httpapi.ErrNotFound},
		{"wrapped missing row", errors.Join(errors.New("x"), pgx.ErrNoRows), httpapi.ErrNotFound},
		{"a service error passes", writes.Fail(httpapi.ErrForbidden, nil), httpapi.ErrForbidden},
	}
	for _, c := range cases {
		var se *writes.Error
		if got := mapDatabaseError(c.in); !errors.As(got, &se) || se.Code != c.want {
			t.Errorf("%s: %v, want %s", c.name, got, c.want)
		}
	}
	other := pg("40001")
	if got := mapDatabaseError(other); got != other {
		t.Errorf("an unexpected database error must pass through: %v", got)
	}
}

func TestRoutesNeedAPoolAndAnAuthenticator(t *testing.T) {
	if _, err := Routes(Deps{}); err == nil {
		t.Error("Routes without a pool and an authenticator must fail")
	}
}
