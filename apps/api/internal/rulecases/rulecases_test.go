package rulecases

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeCase(t *testing.T, root, area, rule, body string) {
	t.Helper()
	dir := filepath.Join(root, "packages", "rule-cases", "cases", "v1", area)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, rule+".json"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

const sample = `{"kind":"rule","rule":"double","version":1,"cases":[
 {"name":"two","input":{"n":2},"expected":4},
 {"name":"clocked","now":1794564000000,"input":{"n":1},"expected":2}]}`

func TestLoadReadsCasesAndOptionalNow(t *testing.T) {
	root := t.TempDir()
	writeCase(t, root, "match", "double", sample)
	f, err := Load(root, "match", "double")
	if err != nil {
		t.Fatal(err)
	}
	if f.Rule != "double" || f.Version != 1 || len(f.Cases) != 2 {
		t.Fatalf("%+v", f)
	}
	if f.Cases[0].Now != nil {
		t.Error("first case has no now")
	}
	if f.Cases[1].Now == nil || *f.Cases[1].Now != 1794564000000 {
		t.Errorf("now = %v", f.Cases[1].Now)
	}
	if f.Cases[0].Name != "two" || string(f.Cases[0].Expected) != "4" {
		t.Errorf("%+v", f.Cases[0])
	}
}

func TestLoadErrors(t *testing.T) {
	root := t.TempDir()
	if _, err := Load(root, "match", "missing"); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("missing file: %v", err)
	}
	writeCase(t, root, "match", "bad", `{not json`)
	if _, err := Load(root, "match", "bad"); err == nil {
		t.Error("bad JSON must fail")
	}
	writeCase(t, root, "match", "empty", `{"kind":"rule","rule":"empty","version":1,"cases":[]}`)
	if _, err := Load(root, "match", "empty"); err == nil || !strings.Contains(err.Error(), "no cases") {
		t.Errorf("empty case file must fail: %v", err)
	}
	writeCase(t, root, "match", "wrongkind", `{"kind":"command","rule":"wrongkind","version":1,"cases":[{"name":"x","input":1,"expected":1}]}`)
	if _, err := Load(root, "match", "wrongkind"); err == nil {
		t.Error("a command file is not a rule file")
	}
	writeCase(t, root, "match", "other", `{"kind":"rule","rule":"somethingelse","version":1,"cases":[{"name":"x","input":1,"expected":1}]}`)
	if _, err := Load(root, "match", "other"); err == nil {
		t.Error("file name and rule must agree")
	}
}

func TestRepoRootFindsTheMonorepo(t *testing.T) {
	root, err := RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "packages", "rule-cases", "cases")); err != nil {
		t.Fatalf("root %s: %v", root, err)
	}
}

func TestRepoRootFrom(t *testing.T) {
	root := t.TempDir()
	writeCase(t, root, "match", "double", sample)
	deep := filepath.Join(root, "apps", "api", "internal", "x")
	if err := os.MkdirAll(deep, 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := repoRootFrom(deep)
	if err != nil || got != root {
		t.Fatalf("%s %v", got, err)
	}
	if _, err := repoRootFrom(t.TempDir()); err == nil {
		t.Error("no cases directory above: must fail")
	}
}

func TestCompare(t *testing.T) {
	ok := []struct {
		want string
		got  any
	}{
		{`4`, 4}, {`4`, 4.0}, {`"a"`, "a"}, {`null`, nil}, {`true`, true},
		{`{"a":[1,2],"b":null}`, map[string]any{"b": nil, "a": []int{1, 2}}},
		{`[["k",1]]`, [][]any{{"k", 1}}},
	}
	for _, c := range ok {
		if err := compare(json.RawMessage(c.want), c.got); err != nil {
			t.Errorf("%s vs %v: %v", c.want, c.got, err)
		}
	}
	bad := []struct {
		want string
		got  any
	}{{`4`, 5}, {`"a"`, "b"}, {`null`, 0}, {`[1,2]`, []int{2, 1}}, {`{"a":1}`, map[string]int{"a": 2}}}
	for _, c := range bad {
		if err := compare(json.RawMessage(c.want), c.got); err == nil {
			t.Errorf("%s vs %v should differ", c.want, c.got)
		}
	}
	if err := compare(json.RawMessage(`1`), func() {}); err == nil {
		t.Error("unserializable result must fail")
	}
}

func TestRunPassesInputAndNowToTheRule(t *testing.T) {
	root := t.TempDir()
	writeCase(t, root, "match", "double", sample)
	var seenNow []*int64
	failures := RunFrom(t, root, "match", "double", func(input json.RawMessage, now *int64) (any, error) {
		var in struct{ N int }
		if err := json.Unmarshal(input, &in); err != nil {
			return nil, err
		}
		seenNow = append(seenNow, now)
		return in.N * 2, nil
	})
	if len(failures) != 0 {
		t.Fatalf("%v", failures)
	}
	if len(seenNow) != 2 || seenNow[0] != nil || *seenNow[1] != 1794564000000 {
		t.Fatalf("now not passed through: %v", seenNow)
	}
}

func TestRunReportsMismatchAndError(t *testing.T) {
	root := t.TempDir()
	writeCase(t, root, "match", "double", sample)
	failures := RunFrom(t, root, "match", "double", func(json.RawMessage, *int64) (any, error) { return 99, nil })
	if len(failures) != 2 {
		t.Fatalf("a wrong rule must fail every case: %v", failures)
	}
	failures = RunFrom(t, root, "match", "double", func(json.RawMessage, *int64) (any, error) { return nil, errors.New("boom") })
	if len(failures) != 2 || !strings.Contains(failures[0], "boom") {
		t.Fatalf("%v", failures)
	}
}

func TestEveryCommittedRuleFileLoads(t *testing.T) {
	root, err := RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	files, err := filepath.Glob(filepath.Join(root, filepath.FromSlash(casesDir), "*", "*.json"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no case files found: %v", err)
	}
	for _, path := range files {
		area := filepath.Base(filepath.Dir(path))
		rule := strings.TrimSuffix(filepath.Base(path), ".json")
		if _, err := Load(root, area, rule); err != nil {
			t.Errorf("%s/%s: %v", area, rule, err)
		}
	}
}

func TestRunOverTheRealTree(t *testing.T) {
	// courtsNeeded is the simplest committed rule: one input field, no clock.
	Run(t, "match", "courtsNeeded", func(input json.RawMessage, now *int64) (any, error) {
		var in struct {
			Match struct{ Format string } `json:"match"`
		}
		if err := json.Unmarshal(input, &in); err != nil {
			return nil, err
		}
		if now != nil {
			return nil, errors.New("courtsNeeded reads no clock")
		}
		if in.Match.Format == "fun_5v5" {
			return 2, nil
		}
		return 1, nil
	})
}
