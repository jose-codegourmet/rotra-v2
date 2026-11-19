package writetest

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"reflect"
	"slices"
	"sort"
	"strings"
	"testing"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// Replay runs the cases of dir/<name>.cases.json against the routes build registers and compares them with
// dir/<name>.golden.json: each answer (status, headers, body) and the rows the steps left behind.
//
// Every case starts from the seed: the seed file is also the reset, so a case never sees what an earlier one
// wrote. The seed must start by deleting what it inserts. A scenario's statements run after it.
func Replay(t *testing.T, dir, name string, build Build) {
	t.Helper()
	var cf CaseFile
	ReadJSON(t, dir, name+".cases.json", &cf)
	golden := Golden{}
	ReadJSON(t, dir, name+".golden.json", &golden)
	if len(golden) != len(cf.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun the capture (see capture-writes-base.mjs)", len(golden), len(cf.Cases))
	}
	if _, ok := cf.Scenarios["base"]; !ok {
		t.Fatal(`the cases file needs the scenario "base"`)
	}
	seed := ReadSeed(t, dir, cf.Seed)
	e := NewEnv(t, cf.Now, build)
	e.Players = cf.App == "player"
	for _, c := range cf.Cases {
		t.Run(c.Name, func(t *testing.T) {
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			scenario, ok := cf.Scenarios[c.Scenario]
			if !ok {
				t.Fatalf("no scenario %q", c.Scenario)
			}
			e.Reseed(t, seed, scenario)
			now := cf.Now
			if c.Now != nil {
				now = *c.Now
			}
			e.Clock.Set(now)
			if len(want.Steps) != len(c.Steps) {
				t.Fatalf("%d golden steps for %d steps", len(want.Steps), len(c.Steps))
			}
			for i, s := range c.Steps {
				compareStep(t, fmt.Sprintf("step %d", i+1), e.runStep(t, cf.App, s), want.Steps[i], s)
			}
			compareDB(t, e, cf.Snapshot, c.Redact, want.DB)
		})
	}
}

// answer is what a request got, in the form the golden file keeps it.
type answer struct {
	status  int
	headers map[string]string
	body    []byte
}

// request builds the request of a step. It signs the account in first, so the pass is issued at the case's instant.
func (e *Env) request(t *testing.T, app string, s Step) Request {
	r := Request{Method: s.Method, Path: s.Path, App: app}
	if s.Who != nil {
		if app == "player" {
			r.Bearer = e.PlayerPass(t, *s.Who)
		} else {
			r.Bearer = e.AdminPass(t, *s.Who)
		}
	}
	switch {
	case s.RawBody != nil:
		r.Body = *s.RawBody
	case len(s.Body) > 0:
		r.Body = string(s.Body)
	}
	return r
}

func toAnswer(w *httptest.ResponseRecorder) answer {
	headers := map[string]string{}
	for k := range w.Header() {
		if strings.EqualFold(k, httpapi.RequestIDHeader) {
			continue // the Go server adds a request id; the Route Handler does not
		}
		headers[strings.ToLower(k)] = w.Header().Get(k)
	}
	return answer{status: w.Code, headers: headers, body: w.Body.Bytes()}
}

// stepAnswer is one step's answer: one request's, or the sorted answers of a parallel step.
type stepAnswer struct {
	one      answer
	parallel []answer
}

func (e *Env) runStep(t *testing.T, app string, s Step) stepAnswer {
	t.Helper()
	if len(s.Parallel) == 0 {
		return stepAnswer{one: toAnswer(e.Do(e.request(t, app, s)))}
	}
	// Sign everyone in first, then release every request at once.
	reqs := make([]Request, len(s.Parallel))
	for i, p := range s.Parallel {
		reqs[i] = e.request(t, app, p)
	}
	out := make([]answer, len(reqs))
	for i, w := range e.DoAll(reqs) {
		out[i] = toAnswer(w)
	}
	return stepAnswer{parallel: out}
}

// normalize redacts a body and returns it decoded; the golden body is decoded the same way.
func normalize(t *testing.T, label string, body []byte, redact []string) any {
	t.Helper()
	v, err := decode(body)
	if err != nil {
		t.Fatalf("%s: body is not JSON: %q (%v)", label, body, err)
	}
	if err := RedactPaths(v, redact); err != nil {
		t.Errorf("%s: %v", label, err)
	}
	return v
}

func compareStep(t *testing.T, label string, got stepAnswer, want GoldenStep, s Step) {
	t.Helper()
	if len(s.Parallel) > 0 {
		compareParallel(t, label, got.parallel, want.Parallel, s)
		return
	}
	compareOne(t, label, got.one, want, s)
}

func compareOne(t *testing.T, label string, got answer, want GoldenStep, s Step) {
	t.Helper()
	if s.GoExpects != nil {
		var m struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		_ = json.Unmarshal(got.body, &m)
		if got.status != s.GoExpects.Status || m.Error.Code != s.GoExpects.Code {
			t.Errorf("%s: status %d code %q, want %d %q (the TypeScript answered %d)", label, got.status, m.Error.Code, s.GoExpects.Status, s.GoExpects.Code, want.Status)
		}
		return
	}
	if got.status != want.Status {
		t.Errorf("%s: status %d, want %d (%s)", label, got.status, want.Status, got.body)
	}
	if !reflect.DeepEqual(got.headers, want.Headers) {
		t.Errorf("%s: headers %v, want %v", label, got.headers, want.Headers)
	}
	g, w := normalize(t, label, got.body, s.Redact), normalize(t, label+" (golden)", want.Body, nil)
	if !reflect.DeepEqual(g, w) {
		t.Errorf("%s: body\n got %s\nwant %s", label, canonical(g), canonical(w))
	}
}

// compareParallel compares the answers of requests sent together as a set: which request got which answer is not
// decided, so each side is sorted by status, then by body.
func compareParallel(t *testing.T, label string, got []answer, want []GoldenStep, s Step) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%s: %d answers, %d golden", label, len(got), len(want))
	}
	type item struct {
		status int
		body   string
	}
	var g, w []item
	hits := make([]int, len(s.Redact))
	for _, a := range got {
		v, err := decode(a.body)
		if err != nil {
			t.Fatalf("%s: body is not JSON: %q (%v)", label, a.body, err)
		}
		for k, path := range s.Redact {
			n, err := redactAt(v, strings.Split(path, "."))
			if err != nil {
				t.Errorf("%s: redacting %q: %v", label, path, err)
			}
			hits[k] += n
		}
		g = append(g, item{a.status, canonical(v)})
	}
	for k, n := range hits {
		if n == 0 {
			t.Errorf("%s: redacting %q: no answer has a value there", label, s.Redact[k])
		}
	}
	for _, a := range want {
		w = append(w, item{a.Status, canonical(normalize(t, label+" (golden)", a.Body, nil))})
	}
	less := func(x []item) func(i, j int) bool {
		return func(i, j int) bool {
			if x[i].status != x[j].status {
				return x[i].status < x[j].status
			}
			return x[i].body < x[j].body
		}
	}
	sort.Slice(g, less(g))
	sort.Slice(w, less(w))
	if !reflect.DeepEqual(g, w) {
		t.Errorf("%s: answers\n got %v\nwant %v", label, g, w)
	}
}

func canonical(v any) string {
	b, _ := json.Marshal(v) // map keys are sorted, so equal documents print equal
	return string(b)
}

// compareDB reads the snapshot and compares it with the golden rows.
func compareDB(t *testing.T, e *Env, specs []SnapshotSpec, extra map[string][]string, want map[string][]json.RawMessage) {
	t.Helper()
	got := Snapshot(t, e, specs, extra)
	for _, spec := range specs {
		var w []any
		for _, raw := range want[spec.Name] {
			v, err := decode(raw)
			if err != nil {
				t.Fatalf("golden %s: %v", spec.Name, err)
			}
			w = append(w, v)
		}
		if w == nil {
			w = []any{}
		}
		if !reflect.DeepEqual(got[spec.Name], w) {
			t.Errorf("rows of %s\n got %s\nwant %s", spec.Name, canonical(got[spec.Name]), canonical(w))
		}
	}
}

// Snapshot runs each spec's SQL (time zone UTC) and returns its rows decoded, with the spec's columns redacted and
// the case's extra ones (by spec name).
func Snapshot(t testing.TB, e *Env, specs []SnapshotSpec, extra map[string][]string) map[string][]any {
	t.Helper()
	conn, err := e.Pool.Acquire(e.Ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if _, err := conn.Exec(e.Ctx, `SET TIME ZONE 'UTC'`); err != nil {
		t.Fatal(err)
	}
	for name := range extra {
		if !slices.ContainsFunc(specs, func(s SnapshotSpec) bool { return s.Name == name }) {
			t.Fatalf("the case redacts the unknown snapshot %q", name)
		}
	}
	out := map[string][]any{}
	for _, spec := range specs {
		rows, err := conn.Query(e.Ctx, `SELECT to_jsonb(t)::text FROM (`+spec.SQL+`) t`)
		if err != nil {
			t.Fatalf("snapshot %s: %v", spec.Name, err)
		}
		list := []any{}
		for rows.Next() {
			var text string
			if err := rows.Scan(&text); err != nil {
				t.Fatalf("snapshot %s: %v", spec.Name, err)
			}
			v, err := decode([]byte(text))
			if err != nil {
				t.Fatalf("snapshot %s: %v", spec.Name, err)
			}
			list = append(list, v)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			t.Fatalf("snapshot %s: %v", spec.Name, err)
		}
		if err := RedactColumns(list, append(append([]string{}, spec.Redact...), extra[spec.Name]...)); err != nil {
			t.Fatalf("snapshot %s: %v", spec.Name, err)
		}
		out[spec.Name] = list
	}
	return out
}
