package recovery_test

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

// The two public routes against what the real Route Handlers answered. testdata/recovery.golden.json is captured
// by apps/api/testdata/tools/capture-recovery.test.mjs, which runs apps/player/src/app/api/auth/{password-reset,
// reset-password}/route.ts and the real @rotra/db services (Prisma) on a throwaway Postgres seeded with
// testdata/recovery.seed.sql. Every case here is answered from the same seed, in the same order.
//
// Captured: every answer of P-FORGOT (the generic acknowledgement for an eligible, a repeated, an upper-case,
// an unknown, a disabled and a sync-failed account, and the email and body validation), and every P-RESET answer
// given before Supabase is called (the empty password, a missing, oversized or unknown token, and links that
// consumeReviewedResetToken refuses: a disabled account, a failed contact sync, a changed contact email, and a link
// issued for another identity). Captured passwords are six characters or more: password.Validate runs before the
// token is looked at in Go (the TypeScript sent a short password to Supabase after burning the link).
//
// Not capturable without a live Supabase, so pinned from the TypeScript source instead (the Go tests that do it
// name the lines):
//
//	a successful reset and its {saved: true}   account-access.ts:128-130 and password-resets.ts:175-196: TestResetRoute
//	the link is burned before the provider     password-resets.ts:186-192: TestResetIsSingleUse, TestResetParallel...
//	the new password and sign-out              account-access.ts:119-121 (updateUser, signOut): TestResetSetsThePasswordAndEndsEverySession
//	the 503 copy                               account-access.ts:107-110, 122-125: TestResetRouteUnavailable
//	review: issue and decline                  password-resets.ts:98-172: review_test.go (the Admin routes are track 8)

type goldenCases struct {
	Now   time.Time `json:"now"`
	Cases []struct {
		Name    string          `json:"name"`
		Route   string          `json:"route"`
		Body    json.RawMessage `json:"body"`
		RawBody *string         `json:"rawBody"`
	} `json:"cases"`
}

type goldenCase struct {
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers"`
	Body    json.RawMessage   `json:"body"`
}

func readTestdata(t *testing.T, name string, into any) []byte {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	if into != nil {
		if err := json.Unmarshal(raw, into); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
	}
	return raw
}

func TestRoutesMatchRouteHandlers(t *testing.T) {
	var cases goldenCases
	readTestdata(t, "recovery.cases.json", &cases)
	golden := map[string]goldenCase{}
	readTestdata(t, "recovery.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-recovery.test.mjs", len(golden), len(cases.Cases))
	}
	if !cases.Now.Equal(base) {
		t.Fatalf("the cases fix %v but the Go clock is %v", cases.Now, base)
	}
	e := newEnv(t)
	e.exec(t, string(readTestdata(t, "recovery.seed.sql", nil)))

	for _, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			body := string(c.Body)
			if c.RawBody != nil {
				body = *c.RawBody
			}
			var w *httptest.ResponseRecorder
			switch c.Route {
			case "password-reset":
				w = e.forgot(body)
			case "reset-password":
				w = e.reset(body)
			default:
				t.Fatalf("route %q", c.Route)
			}
			if w.Code != want.Status {
				t.Errorf("status %d, want %d (%s)", w.Code, want.Status, w.Body.String())
			}
			for _, h := range []string{"Cache-Control", "Content-Type", "Vary"} {
				if got := w.Header().Get(h); got != want.Headers[strings.ToLower(h)] {
					t.Errorf("%s: %q, want %q", h, got, want.Headers[strings.ToLower(h)])
				}
			}
			var got, wantBody any
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
				t.Fatalf("body %q: %v", w.Body.String(), err)
			}
			if err := json.Unmarshal(want.Body, &wantBody); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, wantBody) {
				gb, _ := json.MarshalIndent(got, "", "  ")
				wb, _ := json.MarshalIndent(wantBody, "", "  ")
				t.Errorf("body\ngot:\n%s\nwant:\n%s", gb, wb)
			}
			if len(w.Result().Cookies()) != 0 {
				t.Error("no cookie on any answer")
			}
		})
	}
	// What the submits saved, as the TypeScript saved it: one pending request per address, linked only when the
	// account could be helped (none of the seed's 'supabase' accounts can, in Go).
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE status = 'pending'`); n != 4 {
		t.Fatalf("%d pending requests, want 4 (ana, nobody, dan and eve; the repeats merged)", n)
	}
	if e.count(t, `SELECT count(*) FROM auth_identities`) != 0 || e.count(t, `SELECT count(*) FROM auth_sessions`) != 0 {
		t.Fatal("no refused case may create a sign-in")
	}
}
