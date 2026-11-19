package signedin_test

import (
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Queue reads, replayed against the answers of the real Queue Route Handlers: see
// testdata/tools/capture-signedin-queue.test.mjs (apps/api/testdata/tools).

type queueCases struct {
	Now       time.Time           `json:"now"`
	Scenarios map[string][]string `json:"scenarios"`
	Cases     []struct {
		Name     string     `json:"name"`
		Path     string     `json:"path"`
		Who      *string    `json:"who"`
		Scenario string     `json:"scenario"`
		Now      *time.Time `json:"now"`
		// Redact lists the dot-separated paths of random values (a freshly made invite code).
		Redact []string `json:"redact"`
		// NoDrive marks a case the capture ran with driveFinalizationJobs switched off (see queue_finalization.go).
		NoDrive bool `json:"noDrive"`
		// GoGolden names the case whose golden Go must match when the Route Handler's own answer (this case's golden) is
		// the one the job drive produced. Differs says the two goldens are not equal: the drive made a visible change.
		GoGolden string `json:"goGolden"`
		Differs  bool   `json:"differs"`
		// GoExpects is where Go answers differently from the Route Handler on purpose (see the deviations log).
		GoExpects *struct {
			Status int    `json:"status"`
			Code   string `json:"code"`
		} `json:"goExpects"`
	} `json:"cases"`
}

var inviteShape = regexp.MustCompile(`^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$`)

// redact checks the shape of a random string at path and replaces it, as the capture did.
func redact(t *testing.T, body any, path string) {
	t.Helper()
	keys := strings.Split(path, ".")
	at, _ := body.(map[string]any)
	for _, k := range keys[:len(keys)-1] {
		at, _ = at[k].(map[string]any)
	}
	last := keys[len(keys)-1]
	v, _ := at[last].(string)
	if !inviteShape.MatchString(v) {
		t.Fatalf("%s is %q, want 10 characters of the invite alphabet", path, v)
	}
	at[last] = "<random>"
}

func TestQueueReadsMatchRouteHandlers(t *testing.T) {
	var cases queueCases
	readJSONFile(t, "queue.cases.json", &cases)
	golden := map[string]goldenCase{}
	readJSONFile(t, "queue.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-signedin-queue.test.mjs", len(golden), len(cases.Cases))
	}
	e := newEnv(t, cases.Now)
	e.loadSeed(t, "queue.seed.sql")
	e.relinkClubs(t)
	seed := readSeed(t, "queue.seed.sql")

	dirty := false
	for _, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			// The seed is also the reset: a case with a scenario, and the one after it, start from a fresh load.
			if dirty || c.Scenario != "base" {
				e.exec(t, seed)
				e.relinkClubs(t)
				e.setup(t, cases.Scenarios[c.Scenario])
			}
			dirty = c.Scenario != "base"
			now := cases.Now
			if c.Now != nil {
				now = *c.Now
			}
			e.clk.Set(now)
			r := req{path: c.Path, app: "club"}
			if c.Who != nil {
				r.bearer = e.clubPass(t, *c.Who)
			}
			rec := e.do(r)
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			if c.GoGolden != "" {
				undriven, ok := golden[c.GoGolden]
				if !ok {
					t.Fatalf("no golden for %s", c.GoGolden)
				}
				if c.Differs && reflect.DeepEqual(decodeJSON(t, want.Body), decodeJSON(t, undriven.Body)) {
					t.Errorf("the job drive changed nothing here: %s and %s are equal, so the case pins no difference", c.Name, c.GoGolden)
				}
				want = undriven
			}
			if c.GoExpects != nil {
				if rec.Code != c.GoExpects.Status || errCode(t, rec) != c.GoExpects.Code {
					t.Errorf("status %d code %q, want %d %q (%s)", rec.Code, errCode(t, rec), c.GoExpects.Status, c.GoExpects.Code, rec.Body.String())
				}
				return
			}
			if rec.Code != want.Status {
				t.Errorf("status %d, want %d (%s)", rec.Code, want.Status, rec.Body.String())
			}
			got := map[string]string{}
			for k := range rec.Header() {
				if strings.EqualFold(k, httpapi.RequestIDHeader) {
					continue // the Go server adds a request id; the Route Handler does not
				}
				got[strings.ToLower(k)] = rec.Header().Get(k)
			}
			if !reflect.DeepEqual(got, want.Headers) {
				t.Errorf("headers %v, want %v", got, want.Headers)
			}
			gotBody := decodeJSON(t, rec.Body.Bytes())
			for _, path := range c.Redact {
				redact(t, gotBody, path)
			}
			wantBody := decodeJSON(t, want.Body)
			// The TypeScript sets no order on guest-review candidates (the database's own, which differs between
			// machines), so both sides are put in id order before they are compared.
			sortCandidates(gotBody)
			sortCandidates(wantBody)
			if !reflect.DeepEqual(gotBody, wantBody) {
				g, _ := json.Marshal(gotBody)
				t.Errorf("body\n got %s\nwant %s", g, want.Body)
			}
		})
	}
}

// sortCandidates puts every "candidates" list in clubPlayerId order, anywhere in a decoded body.
func sortCandidates(v any) {
	switch x := v.(type) {
	case map[string]any:
		for k, child := range x {
			if list, ok := child.([]any); ok && k == "candidates" {
				sort.SliceStable(list, func(i, j int) bool {
					a, _ := list[i].(map[string]any)
					b, _ := list[j].(map[string]any)
					return fmt.Sprint(a["clubPlayerId"]) < fmt.Sprint(b["clubPlayerId"])
				})
			}
			sortCandidates(child)
		}
	case []any:
		for _, child := range x {
			sortCandidates(child)
		}
	}
}
