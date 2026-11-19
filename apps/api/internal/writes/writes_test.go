package writes_test

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

var (
	now   = time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC)
	stamp = pgtype.Timestamptz{Time: now, Valid: true}
)

// probe builds one route behind the real pass check: its command is whatever the test passes in.
func probe(cmd writes.Command) writetest.Build {
	return func(_ *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, _ func() time.Time) func(*http.ServeMux) {
		rt := signedin.NewRouter()
		rt.Handle("POST /api/probe", store.AudienceAdmin, auth.Require(store.AudienceAdmin, session.ModeWrite)(writes.Handle(log, cmd)))
		return rt.Mount
	}
}

const admin = "ad100000-0000-4000-8000-000000000001"

// probeEnv is a migrated database with one active admin signed in.
func probeEnv(t *testing.T, cmd writes.Command) (*writetest.Env, string) {
	t.Helper()
	e := writetest.NewEnv(t, now, probe(cmd))
	e.Exec(t, `INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES ('ad000000-0000-4000-8000-000000000001', 'supabase', $1, true, 'Owner', now())`, admin)
	e.RelinkAdmins(t)
	return e, e.AdminPass(t, admin)
}

func TestHandleWritesTheResultAsAPrivateResponse(t *testing.T) {
	var saw string
	e, bearer := probeEnv(t, func(r *http.Request, p session.Principal) (writes.Result, error) {
		saw = p.AccountID.String()
		return writes.Result{Status: http.StatusCreated, Body: map[string]string{"ok": "yes"}}, nil
	})
	w := e.Do(writetest.Request{Method: "POST", Path: "/api/probe", App: "admin", Bearer: bearer})
	if w.Code != 201 || strings.TrimSpace(w.Body.String()) != `{"ok":"yes"}` {
		t.Errorf("%d %q", w.Code, w.Body.String())
	}
	if w.Header().Get("Cache-Control") != "private, no-store" || w.Header().Get("Vary") != "Cookie" {
		t.Errorf("headers %v", w.Header())
	}
	if saw != "ad000000-0000-4000-8000-000000000001" {
		t.Errorf("the command saw account %q", saw)
	}
	// Signed out, or for another app, the command never runs.
	if w := e.Do(writetest.Request{Method: "POST", Path: "/api/probe", App: "admin"}); w.Code != 401 {
		t.Errorf("signed out: %d", w.Code)
	}
	if w := e.Do(writetest.Request{Method: "POST", Path: "/api/probe", App: "player", Bearer: bearer}); w.Code != 404 {
		t.Errorf("another app: %d", w.Code)
	}
}

func TestHandleAnswersAnErrorWithItsStatusAndHidesTheRest(t *testing.T) {
	for _, c := range []struct {
		err    error
		status int
		part   string
	}{
		{writes.Fail(httpapi.ErrConflict, nil), 409, `"code":"conflict"`},
		{writes.Fail(httpapi.ErrInvalid, map[string]string{"key": "bad"}), 422, `"fields":{"key":"bad"}`},
		{errors.New("secret detail"), 500, `"code":"internal"`},
	} {
		e, bearer := probeEnv(t, func(*http.Request, session.Principal) (writes.Result, error) { return writes.Result{}, c.err })
		w := e.Do(writetest.Request{Method: "POST", Path: "/api/probe", App: "admin", Bearer: bearer})
		if w.Code != c.status || !strings.Contains(w.Body.String(), c.part) || strings.Contains(w.Body.String(), "secret") {
			t.Errorf("%v: %d %s", c.err, w.Code, w.Body.String())
		}
	}
}

func TestHandleWithoutAPrincipalIsNotServed(t *testing.T) {
	// The pass check is the caller's. If it was left out, the write is refused rather than run as nobody.
	h := writes.Handle(nil, func(*http.Request, session.Principal) (writes.Result, error) {
		t.Error("the command must not run")
		return writes.Result{}, nil
	})
	rec := &recorder{header: http.Header{}}
	h.ServeHTTP(rec, mustRequest(t))
	if rec.status != 401 {
		t.Errorf("status %d", rec.status)
	}
}

func TestInTxCommitsAndRollsBack(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	ctx := context.Background()
	flag := func(q *sqlcgen.Queries, key string) error {
		return q.InsertFeatureFlag(ctx, sqlcgen.InsertFeatureFlagParams{Key: key, Name: key, Description: "d", CreatedAt: stamp})
	}
	count := func() int {
		var n int
		if err := pool.QueryRow(ctx, `SELECT count(*) FROM feature_flags WHERE key IN ('kept_one','dropped_one')`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if err := writes.InTx(ctx, pool, func(_ context.Context, q *sqlcgen.Queries) error { return flag(q, "kept_one") }); err != nil || count() != 1 {
		t.Fatalf("commit: %v, %d rows", err, count())
	}
	boom := errors.New("boom")
	err := writes.InTx(ctx, pool, func(_ context.Context, q *sqlcgen.Queries) error {
		if err := flag(q, "dropped_one"); err != nil {
			return err
		}
		return boom
	})
	if !errors.Is(err, boom) || count() != 1 {
		t.Fatalf("rollback: %v, %d rows", err, count())
	}
}

func TestInTxFinishesForAClientThatLeftAndShowsUniqueViolations(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	left, cancel := context.WithCancel(context.Background())
	cancel() // the client left before the write began: the write still finishes
	err := writes.InTx(left, pool, func(_ context.Context, q *sqlcgen.Queries) error {
		bg := context.Background()
		if err := q.InsertFeatureFlag(bg, sqlcgen.InsertFeatureFlagParams{Key: "dup_key", Name: "dup", Description: "d", CreatedAt: stamp}); err != nil {
			return err
		}
		return q.InsertFeatureFlag(bg, sqlcgen.InsertFeatureFlagParams{Key: "dup_key", Name: "other", Description: "d", CreatedAt: stamp})
	})
	if !writes.IsUniqueViolation(err) {
		t.Fatalf("want a unique violation, got %v", err)
	}
	if writes.IsUniqueViolation(errors.New("x")) || writes.IsUniqueViolation(nil) {
		t.Error("only a unique violation counts")
	}
	if err := writes.InTx(left, pool, func(_ context.Context, q *sqlcgen.Queries) error {
		return q.InsertFeatureFlag(context.Background(), sqlcgen.InsertFeatureFlagParams{Key: "late_one", Name: "late", Description: "d", CreatedAt: stamp})
	}); err != nil {
		t.Errorf("a cancelled request must not cancel the write: %v", err)
	}
}
