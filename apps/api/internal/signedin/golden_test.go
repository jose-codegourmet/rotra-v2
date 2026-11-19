package signedin_test

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The signed-in Player account reads, replayed against the answers of the real Player Route Handlers: see
// testdata/tools/capture-signedin-player.test.mjs (apps/api/testdata/tools).

type playerCases struct {
	Now          time.Time           `json:"now"`
	Subjects     map[string]string   `json:"subjects"`
	Passwordless []string            `json:"passwordless"`
	Reset        []string            `json:"reset"`
	Scenarios    map[string][]string `json:"scenarios"`
	Cases        []struct {
		Name     string     `json:"name"`
		Path     string     `json:"path"`
		Player   *string    `json:"player"`
		Scenario string     `json:"scenario"`
		Now      *time.Time `json:"now"`
	} `json:"cases"`
}

type goldenCase struct {
	Status      int               `json:"status"`
	Headers     map[string]string `json:"headers"`
	Body        json.RawMessage   `json:"body"`
	RawContains []string          `json:"rawContains"`
}

func readJSONFile(t *testing.T, name string, v any) {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		t.Fatalf("%s: %v", name, err)
	}
}

func TestPlayerReadsMatchRouteHandlers(t *testing.T) { replay(t, "player") }

func TestSessionReadsMatchRouteHandlers(t *testing.T) { replay(t, "sessions") }

// replay runs every case of a suite through the Go routes and compares status, headers and body with what the
// Route Handlers answered. A nil player is a visitor.
func replay(t *testing.T, suite string) {
	var cases playerCases
	readJSONFile(t, suite+".cases.json", &cases)
	golden := map[string]goldenCase{}
	readJSONFile(t, suite+".golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-signedin-player.test.mjs", len(golden), len(cases.Cases))
	}
	e := newEnv(t, cases.Now)
	e.loadSeed(t, suite+".seed.sql")
	passwordless := map[string]bool{}
	for _, s := range cases.Passwordless {
		passwordless[s] = true
	}
	e.relinkPlayers(t, passwordless)

	for _, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			e.setup(t, cases.Reset, cases.Scenarios[c.Scenario])
			now := cases.Now
			if c.Now != nil {
				now = *c.Now
			}
			e.clk.Set(now)
			r := req{path: c.Path, app: "player"}
			if c.Player != nil {
				r.bearer = e.accessPass(t, *c.Player)
			}
			rec := e.do(r)
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
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
			for _, raw := range want.RawContains {
				if !strings.Contains(rec.Body.String(), raw) {
					t.Errorf("the wire body must contain %s: %s", raw, rec.Body.String())
				}
			}
		})
	}
}
