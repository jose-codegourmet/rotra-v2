package signedin_test

import (
	"reflect"
	"strings"
	"testing"
	"time"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Admin reads, replayed against the answers of the real Admin Route Handlers: see
// testdata/tools/capture-signedin-admin.test.mjs (apps/api/testdata/tools).

type adminCases struct {
	Now       time.Time           `json:"now"`
	Scenarios map[string][]string `json:"scenarios"`
	Cases     []struct {
		Name     string     `json:"name"`
		Path     string     `json:"path"`
		Who      *string    `json:"who"`
		Scenario string     `json:"scenario"`
		Now      *time.Time `json:"now"`
		// GoExpects is where Go answers differently from the Route Handler on purpose (see the deviations log).
		GoExpects *struct {
			Status int    `json:"status"`
			Code   string `json:"code"`
		} `json:"goExpects"`
	} `json:"cases"`
}

func TestAdminReadsMatchRouteHandlers(t *testing.T) {
	var cases adminCases
	readJSONFile(t, "admin.cases.json", &cases)
	golden := map[string]goldenCase{}
	readJSONFile(t, "admin.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-signedin-admin.test.mjs", len(golden), len(cases.Cases))
	}
	e := newEnv(t, cases.Now)
	e.loadSeed(t, "admin.seed.sql")
	e.relinkAdmins(t)
	seed := readSeed(t, "admin.seed.sql")

	dirty := false
	for _, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			// The seed is also the reset: a case with a scenario, and the one after it, start from a fresh load.
			if dirty || c.Scenario != "base" {
				e.exec(t, seed)
				e.relinkAdmins(t)
				e.setup(t, cases.Scenarios[c.Scenario])
			}
			dirty = c.Scenario != "base"
			now := cases.Now
			if c.Now != nil {
				now = *c.Now
			}
			e.clk.Set(now)
			r := req{path: c.Path, app: "admin"}
			if c.Who != nil {
				r.bearer = e.adminPass(t, *c.Who)
			}
			rec := e.do(r)
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			if c.GoExpects != nil {
				if rec.Code != c.GoExpects.Status || errCode(t, rec) != c.GoExpects.Code {
					t.Errorf("status %d code %q, want %d %q", rec.Code, errCode(t, rec), c.GoExpects.Status, c.GoExpects.Code)
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
			if !reflect.DeepEqual(decodeJSON(t, rec.Body.Bytes()), decodeJSON(t, want.Body)) {
				t.Errorf("body\n got %s\nwant %s", rec.Body.Bytes(), want.Body)
			}
		})
	}
}
