package adminwrites_test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

// Two adds that run at once. Some of these races have no single answer in the Route Handler either: whether the
// loser is a retry, a taken name or a lost unique race depends on when its transaction looks, so the golden file
// does not pin them (see the cases generator). What always holds is checked here, many times over.

const (
	owner      = "ad100000-0000-4000-8000-000000000001"
	secondUser = "ad100000-0000-4000-8000-000000000002"
)

func addBody(command, key, name string) string {
	return `{"commandId":"` + command + `","key":"` + key + `","name":"` + name + `","description":"Shows the estimated cost per player."}`
}

func raceEnv(t *testing.T) (*writetest.Env, func()) {
	t.Helper()
	var cf writetest.CaseFile
	writetest.ReadJSON(t, "testdata", "flags.cases.json", &cf)
	e := writetest.NewEnv(t, cf.Now, build)
	seed := writetest.ReadSeed(t, "testdata", cf.Seed)
	return e, func() { e.Reseed(t, seed, nil) }
}

func (r race) add(e *writetest.Env, who string, bodies ...string) []*httptest.ResponseRecorder {
	reqs := make([]writetest.Request, len(bodies))
	for i, b := range bodies {
		reqs[i] = writetest.Request{Method: "POST", Path: "/api/feature-flags", App: "admin", Bearer: e.AdminPass(r.t, who), Body: b}
	}
	return e.DoAll(reqs)
}

type race struct{ t *testing.T }

func count(t *testing.T, e *writetest.Env, sql string, args ...any) (n int) {
	t.Helper()
	if err := e.Pool.QueryRow(e.Ctx, sql, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// Two adds of the same command and key: one flag, one audit event. The other answer is a conflict on the key (the
// unique race, or the key and name together) or the same flag again (a retry that looked after the first committed).
func TestRaceOfTheSameCommandAndKey(t *testing.T) {
	e, reset := raceEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		const command = "c1000000-0000-4000-8000-000000000066"
		got := race{t}.add(e, owner, addBody(command, "cost_estimate", "Cost"), addBody(command, "cost_estimate", "Cost"), addBody(command, "cost_estimate", "Cost"))
		created := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				created++
				if !strings.Contains(w.Body.String(), `"key":"cost_estimate"`) {
					t.Fatalf("round %d: %s", round, w.Body.String())
				}
			case 409:
				// The key, alone (the unique race) or with the name (the loser listed the flags after the first committed).
				if !strings.Contains(w.Body.String(), `"key":"That key is already used."`) {
					t.Fatalf("round %d: %s", round, w.Body.String())
				}
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if created == 0 {
			t.Fatalf("round %d: nobody created the flag", round)
		}
		if n := count(t, e, `SELECT count(*) FROM feature_flags WHERE key = 'cost_estimate'`); n != 1 {
			t.Fatalf("round %d: %d flags", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE source_command_id = $1`, command); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Two adds of one name under different keys: the unique name index lets one in. The loser is a conflict, on the name
// when it looked after the first committed and on the key when it lost the unique race.
func TestRaceOfTheSameName(t *testing.T) {
	e, reset := raceEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		got := race{t}.add(e, owner,
			addBody("c1000000-0000-4000-8000-000000000064", "zeta_one", "Zeta"),
			addBody("c1000000-0000-4000-8000-000000000065", "zeta_two", "Zeta"))
		codes := []int{got[0].Code, got[1].Code}
		if (codes[0] != 201 || codes[1] != 409) && (codes[0] != 409 || codes[1] != 201) {
			t.Fatalf("round %d: statuses %v", round, codes)
		}
		for _, w := range got {
			if w.Code == 409 && !strings.Contains(w.Body.String(), "taken") && !strings.Contains(w.Body.String(), "already") {
				t.Fatalf("round %d: %s", round, w.Body.String())
			}
		}
		if n := count(t, e, `SELECT count(*) FROM feature_flags WHERE name = 'Zeta'`); n != 1 {
			t.Fatalf("round %d: %d flags", round, n)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'flag.created' AND target_id LIKE 'zeta%'`); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Two adds of one command under different keys. The Route Handler looks the command up again before it appends the
// audit event (recordAudit), so whether the second add is refused on the unique command index or finds the first
// add's event and goes through without one depends on timing. Either way: one audit event for the command, the
// first add's flag, and no answer but 201 and 409.
func TestRaceOfTheSameCommandUnderTwoKeys(t *testing.T) {
	e, reset := raceEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		const command = "c1000000-0000-4000-8000-000000000067"
		got := race{t}.add(e, owner, addBody(command, "zeta_one", "Zeta one"), addBody(command, "zeta_two", "Zeta two"))
		created := 0
		for _, w := range got {
			switch w.Code {
			case 201:
				created++
			case 409:
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if created == 0 {
			t.Fatalf("round %d: nobody created a flag", round)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE source_command_id = $1`, command); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
	}
}

// Three switches of one flag under one revision, by two admins: one wins, two are stale, one audit event.
func TestSwitchesOfOneFlagByTwoAdminsLeaveOneAuditEvent(t *testing.T) {
	e, reset := raceEnv(t)
	for round := 0; round < 12; round++ {
		reset()
		body := `{"on":false,"expectedRevision":"4"}`
		reqs := []writetest.Request{
			{Method: "PATCH", Path: "/api/feature-flags/sessions_beta", App: "admin", Bearer: e.AdminPass(t, owner), Body: body},
			{Method: "PATCH", Path: "/api/feature-flags/sessions_beta", App: "admin", Bearer: e.AdminPass(t, secondUser), Body: body},
			{Method: "PATCH", Path: "/api/feature-flags/sessions_beta", App: "admin", Bearer: e.AdminPass(t, owner), Body: body},
		}
		ok, stale := 0, 0
		for _, w := range e.DoAll(reqs) {
			switch w.Code {
			case 200:
				ok++
			case 409:
				stale++
			default:
				t.Fatalf("round %d: status %d %s", round, w.Code, w.Body.String())
			}
		}
		if ok != 1 || stale != 2 {
			t.Fatalf("round %d: %d changed, %d stale", round, ok, stale)
		}
		if n := count(t, e, `SELECT count(*) FROM admin_audit_events WHERE action = 'flag.changed'`); n != 1 {
			t.Fatalf("round %d: %d audit events", round, n)
		}
		if n := count(t, e, `SELECT revision FROM feature_flags WHERE key = 'sessions_beta'`); n != 5 {
			t.Fatalf("round %d: revision %d", round, n)
		}
	}
}
