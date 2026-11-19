package signedin_test

import (
	"net/http"
	"regexp"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

const (
	smashSubject    = "c7000000-0000-4000-8000-000000000001"
	birdieSubject   = "c7000000-0000-4000-8000-000000000002"
	disabledSubject = "c7000000-0000-4000-8000-000000000006"
)

func queueEnv(t *testing.T) *env {
	t.Helper()
	e := newEnv(t, time.Date(2026, 11, 19, 4, 0, 0, 0, time.UTC))
	e.loadSeed(t, "queue.seed.sql")
	e.relinkClubs(t)
	e.relinkAdmins(t)
	return e
}

// every Queue GET the track ports, with the IDs of the queue seed.
var queuePaths = []string{
	"/api/club", "/api/club/invite", "/api/club/players", "/api/club/players/c6000000-0000-4000-8000-000000000021",
	"/api/club/players/c6000000-0000-4000-8000-000000000001/delete-impact", "/api/club/players/c6000000-0000-4000-8000-000000000001/year-stats",
	"/api/players?q=alice@example.test", "/api/inventory", "/api/venues", "/api/license", "/api/sessions",
	"/api/sessions/a3000000-0000-4000-8000-000000000001", "/api/sessions/a3000000-0000-4000-8000-000000000001/roster",
	"/api/sessions/a3000000-0000-4000-8000-000000000001/matches", "/api/sessions/a3000000-0000-4000-8000-000000000001/cost",
	"/api/sessions/a3000000-0000-4000-8000-000000000001/payments", "/api/sessions/a3000000-0000-4000-8000-000000000004/results",
	"/api/sessions/a3000000-0000-4000-8000-000000000001/requests",
}

// Only a provisioned, enabled club account reads, and only through the Queue app: another app's header, no pass, a bad
// pass, an Admin pass and a disabled club are all refused.
func TestQueueReadsNeedAClubAccount(t *testing.T) {
	e := queueEnv(t)
	smash := e.clubPass(t, smashSubject)
	for _, p := range queuePaths {
		if w := e.do(req{path: p, app: "club", bearer: smash}); w.Code != 200 {
			t.Errorf("%s as Smash Club: %d %s", p, w.Code, w.Body.String())
		}
		if w := e.do(req{path: p, app: "club"}); w.Code != 401 || errCode(t, w) != "unauthenticated" {
			t.Errorf("%s with no pass: %d %s", p, w.Code, w.Body.String())
		}
		if w := e.do(req{path: p, app: "club", bearer: "garbage"}); w.Code != 401 {
			t.Errorf("%s with a bad pass: %d %s", p, w.Code, w.Body.String())
		}
		// An Admin pass is for another app.
		if w := e.do(req{path: p, app: "club", bearer: e.adminPass(t, ownerSubject)}); w.Code != 403 || errCode(t, w) != "wrong_account" {
			t.Errorf("%s with an Admin pass: %d %s", p, w.Code, w.Body.String())
		}
		// A club pass does not open the Admin app, and the Player app has none of these paths with a club handler.
		if w := e.do(req{path: p, app: "admin", bearer: smash}); w.Code == 200 {
			t.Errorf("%s answered an Admin request from a club pass", p)
		}
		if w := e.do(req{path: p, app: "", bearer: smash}); w.Code != 404 {
			t.Errorf("%s with no app header: %d, want the generic 404", p, w.Code)
		}
	}
	// A disabled club cannot sign in (the Route Handler answers wrong_account; Go answers like any account that cannot).
	if w := e.do(req{path: "/api/club", app: "club", bearer: e.clubPass(t, disabledSubject)}); w.Code != 401 {
		t.Errorf("a disabled club: %d %s", w.Code, w.Body.String())
	}
}

// The first read of a club that has no invite code makes one, keeps it on later reads and counts it as one change.
func TestQueueClubReadMakesTheInviteCodeOnce(t *testing.T) {
	e := queueEnv(t)
	pass := e.clubPass(t, birdieSubject)
	var before int64
	var stampedBefore time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT revision, updated_at FROM clubs WHERE id = 'c9000000-0000-4000-8000-000000000002'`).Scan(&before, &stampedBefore); err != nil {
		t.Fatal(err)
	}
	shape := regexp.MustCompile(`^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$`)
	var codes []string
	for _, p := range []string{"/api/club/invite", "/api/club", "/api/club/invite"} {
		w := e.do(req{path: p, app: "club", bearer: pass})
		if w.Code != 200 {
			t.Fatalf("%s: %d %s", p, w.Code, w.Body.String())
		}
		m, _ := decodeJSON(t, w.Body.Bytes()).(map[string]any)
		if club, ok := m["club"].(map[string]any); ok {
			m = club
		}
		code, _ := m["inviteCode"].(string)
		if !shape.MatchString(code) {
			t.Fatalf("%s: invite code %q", p, code)
		}
		codes = append(codes, code)
	}
	if codes[0] != codes[1] || codes[1] != codes[2] {
		t.Errorf("the code changed between reads: %v", codes)
	}
	var stored string
	var after int64
	var stamped time.Time
	if err := e.pool.QueryRow(e.ctx, `SELECT invite_code, revision, updated_at FROM clubs WHERE id = 'c9000000-0000-4000-8000-000000000002'`).Scan(&stored, &after, &stamped); err != nil {
		t.Fatal(err)
	}
	if stored != codes[0] || after != before+1 {
		t.Errorf("stored %q revision %d -> %d, want %q and one bump", stored, before, after, codes[0])
	}
	// The write stamps updated_at like Prisma's @updatedAt.
	if !stamped.After(stampedBefore) {
		t.Errorf("updated_at %v was not stamped after %v", stamped, stampedBefore)
	}
}

// A club reads only its own data: another club's player, session and venue ids answer as an unknown id does.
func TestQueueReadsStayInsideTheClub(t *testing.T) {
	e := queueEnv(t)
	birdie := e.clubPass(t, birdieSubject)
	smashSession := "/api/sessions/a3000000-0000-4000-8000-000000000001"
	for _, tail := range []string{"", "/roster", "/matches", "/cost", "/payments", "/results", "/requests"} {
		// Birdie Club's licence lapsed: the entitlement refusal comes only after the club's own lookup, so a session of
		// another club is not found, never forbidden.
		if w := e.do(req{path: smashSession + tail, app: "club", bearer: birdie}); w.Code != 404 || errCode(t, w) != "not_found" {
			t.Errorf("%s: %d %s", smashSession+tail, w.Code, w.Body.String())
		}
	}
	w := e.do(req{path: "/api/club/players/c6000000-0000-4000-8000-000000000021/year-stats", app: "club", bearer: birdie})
	if w.Code != 404 {
		t.Errorf("another club's player: %d %s", w.Code, w.Body.String())
	}
	if w := e.do(req{path: "/api/sessions", app: "club", bearer: birdie}); w.Code != 200 {
		t.Fatalf("sessions: %d", w.Code)
	} else if got := w.Body.String(); contains(got, "a3000000-0000-4000-8000-000000000001") {
		t.Errorf("Birdie Club's list holds another club's session: %s", got)
	}
}

// A pass that expired answers the distinct 401 so the client refreshes once.
func TestQueueReadsAskForARefreshWhenThePassExpired(t *testing.T) {
	e := queueEnv(t)
	pass := e.clubPass(t, smashSubject)
	e.clk.Set(e.clk.Now().Add(time.Hour))
	w := e.do(req{path: "/api/club", app: "club", bearer: pass})
	if w.Code != 401 || errCode(t, w) != "expired" {
		t.Errorf("an expired pass: %d %s", w.Code, w.Body.String())
	}
}

// The Queue routes mount on the one mux beside the public reads and the sign-in routes the API serves: a pattern that
// two registrations share would panic at startup.
func TestQueueRoutesMountBesideTheOtherRoutes(t *testing.T) {
	e := queueEnv(t)
	resets, err := recovery.New(recovery.Deps{Pool: e.pool, Service: e.svc, Store: e.st, Clock: e.clk.Now})
	if err != nil {
		t.Fatal(err)
	}
	register, err := signedin.Register(signedin.Deps{Pool: e.pool, Auth: e.svc.Authenticator(), PasswordResets: resets, Limiter: httpapi.NewRateLimiter(1_000_000, nil)})
	if err != nil {
		t.Fatal(err)
	}
	public := publicreads.Register(publicreads.Deps{Pool: e.pool, Limiter: httpapi.NewRateLimiter(1_000_000, nil)})
	mux := http.NewServeMux()
	for _, mount := range []func(*http.ServeMux){public, resets.Routes(), register} {
		mount(mux) // a duplicate pattern panics here
	}
}
