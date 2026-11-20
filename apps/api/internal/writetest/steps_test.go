package writetest_test

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// A Queue (club) probe: it reads the club's name, and renames the club under the clock it is built with.
func clubProbe(pool *pgxpool.Pool, auth *session.Authenticator, log *slog.Logger, now func() time.Time) func(*http.ServeMux) {
	rt := signedin.NewRouter()
	club := func(h func(r *http.Request, id string, at time.Time) (writes.Result, error)) http.Handler {
		return auth.Require(store.AudienceClub, session.ModeWrite)(writes.Handle(log, func(r *http.Request, p session.Principal) (writes.Result, error) {
			return h(r, p.AccountID.String(), now())
		}))
	}
	rt.Handle("POST /api/club-note", store.AudienceClub, club(func(r *http.Request, id string, _ time.Time) (writes.Result, error) {
		var name string
		if err := pool.QueryRow(r.Context(), `SELECT name FROM clubs WHERE id = $1`, id).Scan(&name); err != nil {
			return writes.Result{}, err
		}
		return writes.Result{Body: map[string]any{"club": map[string]any{"id": id, "name": name}, "ids": []any{"x", "y"}}}, nil
	}))
	rt.Handle("PATCH /api/club-note/{id}", store.AudienceClub, club(func(r *http.Request, id string, at time.Time) (writes.Result, error) {
		if r.PathValue("id") != id {
			return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
		}
		body, err := writes.ReadBody(r)
		if err != nil {
			return writes.Result{}, err
		}
		if _, err := pool.Exec(r.Context(), `UPDATE clubs SET name = $2, updated_at = $3 WHERE id = $1`, id, body.Text("name"), at); err != nil {
			return writes.Result{}, err
		}
		return writes.Result{Body: map[string]any{"club": map[string]any{"id": id, "name": body.Text("name")}}}, nil
	}))
	return rt.Mount
}

const clubSeed = `
BEGIN;
SET LOCAL session_replication_role = replica;
DELETE FROM club_accounts; DELETE FROM clubs;
INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, created_at, updated_at, revision) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'Smash', 'smash', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Cebu', 'free', 'c8000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-09-01 00:00:00+00', 1),
  ('c9000000-0000-4000-8000-000000000002', 'Other', 'other', (SELECT id FROM location_codes WHERE country_code = 'PH' AND city_code = 'CEB'), 'Cebu', 'free', 'c8000000-0000-4000-8000-000000000002', TIMESTAMPTZ '2026-09-01 00:00:00+00', TIMESTAMPTZ '2026-09-01 00:00:00+00', 1);
INSERT INTO club_accounts (club_id, username, auth_provider, auth_subject, provisioned_at, disabled_at, updated_at) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'smash', 'supabase', 'c7000000-0000-4000-8000-000000000001', TIMESTAMPTZ '2026-09-01 01:00:00+00', NULL, TIMESTAMPTZ '2026-09-01 01:00:00+00');
COMMIT;
`

const clubCases = `{
  "now": "2026-11-19T04:00:00.000Z", "app": "club", "seed": "seed.sql", "snapshotDiff": true,
  "scenarios": {"base": []},
  "snapshot": [{"name": "clubs", "sql": "SELECT id, name, updated_at FROM clubs ORDER BY id"}],
  "cases": [
    {"name": "save_and_substitute", "scenario": "base", "steps": [
      {"method": "POST", "path": "/api/club-note", "who": "c7000000-0000-4000-8000-000000000001", "save": {"cid": "club.id", "cname": "club.name", "second": "ids.1"}, "snapshot": true},
      {"method": "PATCH", "path": "/api/club-note/{{cid}}", "who": "c7000000-0000-4000-8000-000000000001", "now": "2026-11-19T04:30:00.000Z", "body": {"name": "{{cname}} {{second}}"}, "snapshot": true},
      {"method": "PATCH", "path": "/api/club-note/c9000000-0000-4000-8000-000000000002", "who": "c7000000-0000-4000-8000-000000000001", "now": "2026-11-19T05:00:00.000Z", "rawBody": "{\"name\":\"{{cname}}\"}"}
    ]}
  ]
}`

const clubGolden = `{
  "save_and_substitute": {"steps": [
    {"status": 200, "headers": ` + hdr + `, "body": {"club": {"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash"}, "ids": ["x", "y"]},
     "db": {"clubs": [], "clubs (removed)": []}},
    {"status": 200, "headers": ` + hdr + `, "body": {"club": {"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash y"}},
     "db": {"clubs": [{"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash y", "updated_at": "2026-11-19T04:30:00+00:00"}],
            "clubs (removed)": [{"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash", "updated_at": "2026-09-01T00:00:00+00:00"}]}},
    {"status": 404, "headers": ` + hdr + `, "body": {"error": {"code": "not_found", "message": "Not found."}}}
  ], "db": {"clubs": [{"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash y", "updated_at": "2026-11-19T04:30:00+00:00"}],
            "clubs (removed)": [{"id": "c9000000-0000-4000-8000-000000000001", "name": "Smash", "updated_at": "2026-09-01T00:00:00+00:00"}]}}
}`

// A Queue (club) case file: the club account signs in, a step saves values of its answer for the next one (`save`, `{{name}}`),
// a step moves the clock (`now`) and pins the rows after it (`snapshot`), and only the rows that changed are pinned (`snapshotDiff`).
func TestReplayRunsAClubCaseFileWithSavesClockAndDiff(t *testing.T) {
	dir := t.TempDir()
	for name, content := range map[string]string{"seed.sql": clubSeed, "club.cases.json": clubCases, "club.golden.json": clubGolden} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	writetest.Replay(t, dir, "club", clubProbe)
}

func TestPathStringAndSubstitute(t *testing.T) {
	doc := map[string]any{"a": map[string]any{"b": []any{"x", map[string]any{"n": jsonNumber("42")}}}, "z": nil, "t": true}
	for path, want := range map[string]string{"a.b.0": "x", "a.b.1.n": "42"} {
		if got, ok := writetest.PathString(doc, path); !ok || got != want {
			t.Errorf("%s = %q %v, want %q", path, got, ok, want)
		}
	}
	for _, path := range []string{"a.b.2", "a.b.-1", "a.b.x", "a.c", "z", "t", "a.b.0.q", "a.b"} {
		if got, ok := writetest.PathString(doc, path); ok {
			t.Errorf("%s = %q, want not found", path, got)
		}
	}
	vars := map[string]string{"id": "1", "n": "two"}
	if got, err := writetest.Substitute("/a/{{id}}/{{n}}/{{id}}", vars); err != nil || got != "/a/1/two/1" {
		t.Errorf("substitute: %q %v", got, err)
	}
	for _, bad := range []string{"{{missing}}", "x {{id}} {{nope}}"} {
		if _, err := writetest.Substitute(bad, vars); err == nil {
			t.Errorf("%q must be an error", bad)
		}
	}
	// Text that is not a placeholder is left as it is, as the capture leaves it.
	if got, err := writetest.Substitute("{{id", vars); err != nil || got != "{{id" {
		t.Errorf("an unterminated brace: %q %v", got, err)
	}
	if got, err := writetest.Substitute("{{ id }} {{a-b}} {}", vars); err != nil || got != "{{ id }} {{a-b}} {}" {
		t.Errorf("not a word: %q %v", got, err)
	}
	if got, err := writetest.Substitute("no placeholders", nil); err != nil || got != "no placeholders" {
		t.Errorf("plain text: %q %v", got, err)
	}
}

func TestRelinkClubsAndClubPass(t *testing.T) {
	e := writetest.NewEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC), clubProbe)
	e.Clubs = true
	for i := 0; i < 2; i++ { // the second load keeps the identities
		e.Reseed(t, clubSeed, nil)
	}
	if e.ClubPass(t, "c7000000-0000-4000-8000-000000000001") == "" {
		t.Error("the club account gets a pass")
	}
	if e.ClubPass(t, "c7000000-0000-4000-8000-0000000000ff") != "" {
		t.Error("a subject with no identity has no pass")
	}
	e.Exec(t, `DELETE FROM club_accounts`)
	if e.ClubPass(t, "c7000000-0000-4000-8000-000000000001") != "" {
		t.Error("an identity whose account row is gone has no pass")
	}
}

// jsonNumber is a decoded JSON number as the harness reads bodies (UseNumber).
func jsonNumber(s string) json.Number { return json.Number(s) }
