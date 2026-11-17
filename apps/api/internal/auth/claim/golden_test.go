package claim_test

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

// The claim routes against what the real Route Handlers answered. testdata/claim.golden.json is captured by
// apps/api/testdata/tools/capture-claim.test.mjs, which runs apps/player/src/app/api/claim/[token]/route.ts and
// the real @rotra/db services (Prisma) on a throwaway Postgres seeded with testdata/claim.seed.sql, at the fixed
// instant of claim.cases.json. Every case here is answered from the same seed.
//
// Captured: the whole link read (GET), and every POST answer that the TypeScript gives before it creates the
// Supabase login: the body, the typed phone, the email, the empty password, and the link and branch refusals of
// completeClaim and completeRecordClaim. Captured passwords are six characters or more: the policy of
// password.Validate is new in Go (the TypeScript sent a weak password to Supabase), see its own tests.
//
// Not capturable without a live Supabase, so pinned from the TypeScript source instead (the Go tests that do it
// name the lines):
//
//	a successful claim and its answer       account-access.ts:70-78 (firstName, session.account), claim.ts:282-375
//	                                        (completeRecordClaim) and 385-450 (completeClaim): TestPostRecordClaim,
//	                                        TestPostPlayerClaim, TestPostPlayerClaimWithoutContact
//	a retry after success                   claim.ts:298 and 401-402; sign-in failure copy account-access.ts:13:
//	                                        TestPostRetryAfterSuccess, TestPostRetryNeedsThePassword
//	the details rules                       profile.ts:225-233 (name, experience): TestPostInvalidDetailsWriteNothing
//	                                        and internal/player/profile
//	linking other clubs' records by phone   claim.ts:369: TestPostRecordClaim

type goldenCases struct {
	Now   time.Time `json:"now"`
	Cases []struct {
		Name    string          `json:"name"`
		Method  string          `json:"method"`
		Token   string          `json:"token"`
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

func TestClaimRoutesMatchRouteHandlers(t *testing.T) {
	var cases goldenCases
	readTestdata(t, "claim.cases.json", &cases)
	golden := map[string]goldenCase{}
	readTestdata(t, "claim.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-claim.test.mjs", len(golden), len(cases.Cases))
	}
	if !cases.Now.Equal(base) {
		t.Fatalf("the cases fix %v but the Go clock is %v", cases.Now, base)
	}
	e := newEnv(t)
	e.exec(t, string(readTestdata(t, "claim.seed.sql", nil)))

	for _, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			var w *httptest.ResponseRecorder
			switch {
			case c.Method == "POST" && c.RawBody != nil:
				w = e.post(c.Token, *c.RawBody)
			case c.Method == "POST":
				w = e.post(c.Token, string(c.Body))
			default:
				w = e.get(c.Token)
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
			if w.Code >= 400 && len(w.Result().Cookies()) != 0 {
				t.Error("a refusal must set no cookie")
			}
		})
	}
	if e.count(t, `SELECT count(*) FROM auth_identities`) != 0 {
		t.Fatal("no refused case may create a sign-in")
	}
}
