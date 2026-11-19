package writetest_test

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func TestMain(m *testing.M) { testpg.Main(m) }

// probe is a route of its own: it renames the signed-in admin and answers a generated id, or refuses.
func probe(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, _ func() time.Time) func(*http.ServeMux) {
	rt := signedin.NewRouter()
	rename := writes.Handle(log, func(r *http.Request, p session.Principal) (writes.Result, error) {
		body, err := writes.ReadBody(r)
		if err != nil {
			return writes.Result{}, err
		}
		if body.Text("name") == "" {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter a name."})
		}
		if _, err := pool.Exec(r.Context(), `UPDATE admin_accounts SET display_name = $2 WHERE id = $1`, p.AccountID, body.Text("name")); err != nil {
			return writes.Result{}, err
		}
		return writes.Result{Body: map[string]any{"ok": true, "id": "generated-" + body.Text("name"), "list": []any{map[string]any{"id": "x"}, map[string]any{"id": "y"}}}}, nil
	})
	rt.Handle("POST /api/rename", store.AudienceAdmin, auth.Require(store.AudienceAdmin, session.ModeWrite)(rename))
	return rt.Mount
}

const seed = `
DELETE FROM admin_accounts;
INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'supabase', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now());
`

const cases = `{
  "now": "2026-11-19T04:00:00.000Z", "app": "admin", "seed": "seed.sql",
  "scenarios": {"base": [], "renamed": ["UPDATE admin_accounts SET display_name = 'Scenario'"]},
  "snapshot": [{"name": "admins", "sql": "SELECT display_name, id FROM admin_accounts ORDER BY id", "redact": ["id"]}],
  "cases": [
    {"name": "rename", "scenario": "base", "steps": [
      {"method": "POST", "path": "/api/rename", "who": "ad100000-0000-4000-8000-000000000001", "body": {"name": "Ada"}, "redact": ["id", "list.*.id"]},
      {"method": "POST", "path": "/api/rename", "who": "ad100000-0000-4000-8000-000000000001", "rawBody": "not json"},
      {"method": "POST", "path": "/api/rename", "body": {"name": "Ada"}},
      {"method": "POST", "path": "/api/rename", "who": "ad100000-0000-4000-8000-000000000001", "body": {}, "goExpects": {"status": 422, "code": "invalid"}}
    ]},
    {"name": "race", "scenario": "renamed", "now": "2026-11-20T04:00:00.000Z", "steps": [
      {"redact": ["id"], "parallel": [
        {"method": "POST", "path": "/api/rename", "who": "ad100000-0000-4000-8000-000000000001", "body": {"name": "A"}},
        {"method": "POST", "path": "/api/rename", "who": "ad100000-0000-4000-8000-000000000001", "body": {"name": "B"}}]}
    ], "redact": {"admins": ["display_name"]}}
  ]
}`

const hdr = `{"cache-control": "private, no-store", "content-type": "application/json", "vary": "Cookie"}`

const golden = `{
  "rename": {"steps": [
    {"status": 200, "headers": ` + hdr + `, "body": {"ok": true, "id": "<redacted>", "list": [{"id": "<redacted>"}, {"id": "<redacted>"}]}},
    {"status": 422, "headers": ` + hdr + `, "body": {"error": {"code": "invalid", "message": "Check the details and try again."}}},
    {"status": 401, "headers": ` + hdr + `, "body": {"error": {"code": "unauthenticated", "message": "Sign in to continue."}}},
    {"status": 422, "headers": ` + hdr + `, "body": {"error": {"code": "invalid", "message": "Check the details and try again.", "fields": {"name": "Enter a name."}}}}
  ], "db": {"admins": [{"display_name": "Ada", "id": "<redacted>"}]}},
  "race": {"steps": [
    {"parallel": [
      {"status": 200, "headers": ` + hdr + `, "body": {"ok": true, "id": "<redacted>", "list": [{"id": "x"}, {"id": "y"}]}},
      {"status": 200, "headers": ` + hdr + `, "body": {"ok": true, "id": "<redacted>", "list": [{"id": "x"}, {"id": "y"}]}}]}
  ], "db": {"admins": [{"display_name": "<redacted>", "id": "<redacted>"}]}}
}`

// The harness runs a case file end to end against a route of its own.
func TestReplayRunsACaseFile(t *testing.T) {
	dir := t.TempDir()
	for name, content := range map[string]string{"seed.sql": seed, "probe.cases.json": cases, "probe.golden.json": golden} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	writetest.Replay(t, dir, "probe", probe)
}

func TestRedactPaths(t *testing.T) {
	doc := func() any {
		return map[string]any{"a": map[string]any{"b": "x", "n": nil}, "list": []any{map[string]any{"id": "1"}, map[string]any{"id": "2"}, nil}}
	}
	v := doc()
	if err := writetest.RedactPaths(v, []string{"a.b", "list.*.id"}); err != nil {
		t.Fatal(err)
	}
	want := map[string]any{"a": map[string]any{"b": writetest.Redacted, "n": nil}, "list": []any{map[string]any{"id": writetest.Redacted}, map[string]any{"id": writetest.Redacted}, nil}}
	if !reflect.DeepEqual(v, want) {
		t.Errorf("redacted %v", v)
	}
	for _, bad := range []string{"a.missing", "a.n", "nope", "list.id", "a.b.c", "list.*.x"} {
		if err := writetest.RedactPaths(doc(), []string{bad}); err == nil {
			t.Errorf("%q must be an error: it names nothing", bad)
		}
	}
	// A whole array element can be redacted, and null elements stay.
	v = doc()
	if err := writetest.RedactPaths(v, []string{"list.*"}); err != nil {
		t.Fatal(err)
	}
	if l := v.(map[string]any)["list"].([]any); l[0] != writetest.Redacted || l[2] != nil {
		t.Errorf("list %v", l)
	}
}

func TestRedactColumns(t *testing.T) {
	rows := []any{map[string]any{"id": "1", "at": nil}, map[string]any{"id": "2", "at": "t"}}
	if err := writetest.RedactColumns(rows, []string{"id", "at"}); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(rows, []any{map[string]any{"id": writetest.Redacted, "at": nil}, map[string]any{"id": writetest.Redacted, "at": writetest.Redacted}}) {
		t.Errorf("rows %v", rows)
	}
	if err := writetest.RedactColumns(rows, []string{"nope"}); err == nil || !strings.Contains(err.Error(), "nope") {
		t.Errorf("a column no row has must be an error: %v", err)
	}
	if err := writetest.RedactColumns([]any{"not a row"}, []string{"id"}); err == nil {
		t.Error("a row that is not an object must be an error")
	}
	if err := writetest.RedactColumns(nil, []string{"id"}); err != nil {
		t.Errorf("an empty table has nothing to redact: %v", err)
	}
}

func TestSnapshotReadsRowsInUTCAndKeepsBigintsExact(t *testing.T) {
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), probe)
	e.Reseed(t, seed, nil)
	got := writetest.Snapshot(t, e, []writetest.SnapshotSpec{
		{Name: "n", SQL: `SELECT 9007199254740993::bigint::text AS big, TIMESTAMPTZ '2026-11-19 12:00:00+08' AS at, 1.5::numeric AS price`},
		{Name: "none", SQL: `SELECT 1 AS x WHERE false`},
	}, nil)
	row := got["n"][0].(map[string]any)
	if row["big"] != "9007199254740993" || row["at"] != "2026-11-19T04:00:00+00:00" || row["price"].(interface{ String() string }).String() != "1.5" {
		t.Errorf("row %v", row)
	}
	if len(got["none"]) != 0 || got["none"] == nil {
		t.Errorf("an empty result is an empty list: %v", got["none"])
	}
}

func TestDoAllAndSigningIn(t *testing.T) {
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), probe)
	e.Reseed(t, seed, nil)
	e.Reseed(t, seed, nil) // the identities are made once and the second load keeps them
	bearer := e.AdminPass(t, "ad100000-0000-4000-8000-000000000001")
	if bearer == "" || e.AdminPass(t, "ad100000-0000-4000-8000-0000000000ff") != "" {
		t.Fatal("a known admin gets a pass, an unknown subject none")
	}
	var reqs []writetest.Request
	for i := 0; i < 5; i++ {
		reqs = append(reqs, writetest.Request{Method: "POST", Path: "/api/rename", App: "admin", Bearer: bearer, Body: `{"name":"N"}`})
	}
	reqs = append(reqs, writetest.Request{Method: "POST", Path: "/api/rename", App: "admin", Bearer: bearer, Body: `{"name":"N"}`, NoSecret: true})
	got := e.DoAll(reqs)
	for i, w := range got[:5] {
		if w.Code != 200 {
			t.Errorf("request %d: %d", i, w.Code)
		}
	}
	if got[5].Code != 404 {
		t.Errorf("without the proxy secret the route is not served: %d", got[5].Code)
	}
	e.Clock.Set(time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC))
	if e.Clock.Now().Year() != 2027 {
		t.Error("the clock moves")
	}
}

const playerSeed = `
DELETE FROM player_accounts; DELETE FROM player_private_contacts; DELETE FROM players;
DELETE FROM auth_identities WHERE audience = 'player';
SET LOCAL session_replication_role = replica;
INSERT INTO players (id, full_name, profile_state, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'Ann', 'claimed', now()),
  ('d4000000-0000-4000-8000-000000000002', 'Ben', 'claimed', now()),
  ('d4000000-0000-4000-8000-000000000003', 'Cy', 'claimed', now());
INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', '+639175550001', 'ann@example.test', now()),
  ('d4000000-0000-4000-8000-000000000002', '+639175550002', NULL, now());
INSERT INTO player_accounts (player_id, auth_provider, auth_subject, claimed_at, contact_sync_version, updated_at) VALUES
  ('d4000000-0000-4000-8000-000000000001', 'supabase', 'f4000000-0000-4000-8000-000000000001', now(), 1, now()),
  ('d4000000-0000-4000-8000-000000000002', 'supabase', 'f4000000-0000-4000-8000-000000000002', now(), 1, now()),
  ('d4000000-0000-4000-8000-000000000003', 'rotra', 'f4000000-0000-4000-8000-000000000003', now(), 1, now());
INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at, created_at, updated_at, revision) VALUES
  ('f4000000-0000-4000-8000-000000000003', 'player', 'cy-own-login', 'kept', 'argon2id', now(), now(), now(), 1);
`

// The accounts of a Player case file become Go sign-in identities after every load of the seed: one per account that has none,
// the contact email (lower case) as the login or "player-<id>" without one, and the provider 'rotra'. An identity the seed
// made keeps its login and hash.
func TestRelinkPlayersAndPlayerPass(t *testing.T) {
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), probe)
	e.Players = true
	for i := 0; i < 2; i++ { // the second load keeps the identities
		e.Reseed(t, playerSeed, nil)
		rows, err := e.Pool.Query(e.Ctx, `SELECT login_key || ' ' || password_hash FROM auth_identities WHERE audience = 'player' ORDER BY id`)
		if err != nil {
			t.Fatal(err)
		}
		var got []string
		for rows.Next() {
			var s string
			if err := rows.Scan(&s); err != nil {
				t.Fatal(err)
			}
			got = append(got, s)
		}
		rows.Close()
		want := []string{"ann@example.test fake-hash-for-tests", "player-d4000000-0000-4000-8000-000000000002 fake-hash-for-tests", "cy-own-login kept"}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("identities %q, want %q", got, want)
		}
		var providers int
		if err := e.Pool.QueryRow(e.Ctx, `SELECT count(*) FROM player_accounts WHERE auth_provider = 'rotra'`).Scan(&providers); err != nil || providers != 3 {
			t.Fatalf("%d accounts are linked to the Go sign-in: %v", providers, err)
		}
	}
	for _, subject := range []string{"f4000000-0000-4000-8000-000000000001", "f4000000-0000-4000-8000-000000000003"} {
		if e.PlayerPass(t, subject) == "" {
			t.Errorf("%s gets no pass", subject)
		}
	}
	if e.PlayerPass(t, "f4000000-0000-4000-8000-0000000000ff") != "" {
		t.Error("a subject with no identity has no pass")
	}
}
