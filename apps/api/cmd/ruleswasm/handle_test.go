package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rulecases"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
)

type got struct {
	OK     bool            `json:"ok"`
	Result json.RawMessage `json:"result"`
	Error  string          `json:"error"`
}

func parse(t *testing.T, s string) got {
	t.Helper()
	var g got
	if err := json.Unmarshal([]byte(s), &g); err != nil {
		t.Fatalf("reply is not JSON: %v\n%s", err, s)
	}
	return g
}

const courts1 = `{"version":1,"rule":"match/courtsNeeded","input":{"match":{"format":"fun_5v5"}}}`

func TestCallRunsARule(t *testing.T) {
	g := parse(t, Call(courts1))
	if !g.OK || string(g.Result) != "2" {
		t.Fatalf("%+v", g)
	}
}

func TestCallErrorsComeBackAsOkFalse(t *testing.T) {
	cases := map[string]string{
		"not json":            `{`,
		"unknown version":     `{"version":9,"rule":"match/courtsNeeded","input":{}}`,
		"version missing":     `{"rule":"match/courtsNeeded","input":{}}`,
		"unknown rule":        `{"version":1,"rule":"match/nope","input":{}}`,
		"input not an object": `{"version":1,"rule":"match/courtsNeeded","input":"x"}`,
		"clock without now":   `{"version":1,"rule":"courts/courtOpen","input":{"court":{}}}`,
	}
	for name, req := range cases {
		g := parse(t, Call(req))
		if g.OK || g.Error == "" {
			t.Errorf("%s: want ok:false with a message, got %+v", name, g)
		}
	}
	if g := parse(t, Call(`{"version":1,"rule":"match/courtsNeeded"}`)); g.OK == false && g.Error == "" {
		t.Error("an error always carries a message")
	}
}

func TestUnknownInputFieldsAreIgnoredOnTheWire(t *testing.T) {
	g := parse(t, Call(`{"version":1,"rule":"match/courtsNeeded","input":{"match":{"format":"singles","somethingNew":1},"extra":true}}`))
	if !g.OK || string(g.Result) != "1" {
		t.Fatalf("%+v", g)
	}
}

func TestANullResultIsStillOk(t *testing.T) {
	g := parse(t, Call(`{"version":1,"rule":"courts/sessionEndError","now":1,"input":{"startedAt":null,"scheduledStartAt":0,"endAt":3600000,"courts":[]}}`))
	if !g.OK || string(g.Result) != "null" {
		t.Fatalf("%+v", g)
	}
}

func TestAutoFillPlacementsIsOneBatchedCall(t *testing.T) {
	// The rule field is ignored: this export always fills courts.
	req := `{"version":1,"rule":"match/canPlace","now":1000,"input":{"roster":[],"matches":[],"courts":[{"id":"c1","label":"Court 1","startsAt":0,"openUntil":null,"removedAt":null}]}}`
	g := parse(t, AutoFillPlacements(req))
	if !g.OK || string(g.Result) != "[]" {
		t.Fatalf("%+v", g)
	}
}

func TestVersions(t *testing.T) {
	if got := versions(); got != "[1]" {
		t.Errorf("versions = %s", got)
	}
}

func panicResolver(version int) (map[string]rules.Runner, error) {
	if version == 0 {
		return nil, errors.New("retired")
	}
	return map[string]rules.Runner{
		"boom": func(json.RawMessage, *int64) (any, error) { panic("forced panic") },
		"fine": func(json.RawMessage, *int64) (any, error) { return "still alive", nil },
		"nan":  func(json.RawMessage, *int64) (any, error) { return func() {}, nil },
		"err":  func(json.RawMessage, *int64) (any, error) { return nil, errors.New("no good") },
	}, nil
}

// G10: a panic returns an error and the next call still works.
func TestAPanicIsRecoveredAndTheNextCallStillWorks(t *testing.T) {
	h := newHandler(panicResolver)
	g := parse(t, h.call(`{"version":1,"rule":"boom"}`, ""))
	if g.OK || !strings.Contains(g.Error, "forced panic") {
		t.Fatalf("want a recovered panic, got %+v", g)
	}
	g = parse(t, h.call(`{"version":1,"rule":"fine"}`, ""))
	if !g.OK || string(g.Result) != `"still alive"` {
		t.Fatalf("the call after a panic must work: %+v", g)
	}
	for _, rule := range []string{"nan", "err"} {
		if g := parse(t, h.call(`{"version":1,"rule":"`+rule+`"}`, "")); g.OK {
			t.Errorf("%s must fail: %+v", rule, g)
		}
	}
	if g := parse(t, h.call(`{"version":0,"rule":"fine"}`, "")); g.OK || !strings.Contains(g.Error, "retired") {
		t.Errorf("a resolver error reaches the caller: %+v", g)
	}
}

func TestRunnersAreCachedPerVersion(t *testing.T) {
	calls := 0
	h := newHandler(func(v int) (map[string]rules.Runner, error) { calls++; return panicResolver(v) })
	for i := 0; i < 3; i++ {
		h.call(`{"version":1,"rule":"fine"}`, "")
	}
	if calls != 1 {
		t.Errorf("resolver ran %d times, want 1", calls)
	}
}

// Every committed case, through the JSON envelope and the non-strict wire decoding.
func TestEveryCaseThroughTheEnvelope(t *testing.T) {
	root, err := rulecases.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	files, err := filepath.Glob(filepath.Join(root, "packages", "rule-cases", "cases", "v1", "*", "*.json"))
	if err != nil || len(files) != 40 {
		t.Fatalf("%d case files, %v", len(files), err)
	}
	total := 0
	for _, path := range files {
		area := filepath.Base(filepath.Dir(path))
		rule := strings.TrimSuffix(filepath.Base(path), ".json")
		f, err := rulecases.Load(root, area, rule)
		if err != nil {
			t.Fatal(err)
		}
		for _, c := range f.Cases {
			total++
			req, _ := json.Marshal(Envelope{Version: 1, Rule: area + "/" + rule, Now: c.Now, Input: c.Input})
			g := parse(t, Call(string(req)))
			if !g.OK {
				t.Errorf("%s/%s %q: %s", area, rule, c.Name, g.Error)
				continue
			}
			if !sameJSON(t, c.Expected, g.Result) {
				t.Errorf("%s/%s %q: got %s, want %s", area, rule, c.Name, g.Result, c.Expected)
			}
		}
	}
	if total != 256 {
		t.Errorf("%d cases, want 256", total)
	}
}

func sameJSON(t *testing.T, a, b []byte) bool {
	t.Helper()
	var x, y any
	for _, p := range []struct {
		raw  []byte
		into *any
	}{{a, &x}, {b, &y}} {
		dec := json.NewDecoder(bytes.NewReader(p.raw))
		dec.UseNumber()
		if err := dec.Decode(p.into); err != nil {
			t.Fatal(fmt.Errorf("%w: %s", err, p.raw))
		}
	}
	return reflect.DeepEqual(x, y)
}
