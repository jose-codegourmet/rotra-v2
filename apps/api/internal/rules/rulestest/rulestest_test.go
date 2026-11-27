package rulestest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
)

func TestRunAreaCountsFilesAndCases(t *testing.T) {
	got := RunArea(t, 1, "roster")
	if got.Files != 4 || got.Cases != 34 {
		t.Errorf("roster: %+v, want 4 files and 34 cases", got)
	}
}

func write(t *testing.T, root, area, name, body string) {
	t.Helper()
	dir := filepath.Join(root, "packages", "rule-cases", "cases", "v1", area)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, name+".json"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestInspectReportsAFileWithoutARunnerAndARunnerWithoutAFile(t *testing.T) {
	root := t.TempDir()
	one := `{"kind":"rule","rule":"%s","version":%d,"cases":[{"name":"x","input":1,"expected":1}]}`
	write(t, root, "a", "ok", strings.Replace(strings.Replace(one, "%s", "ok", 1), "%d", "1", 1))
	write(t, root, "a", "orphan", strings.Replace(strings.Replace(one, "%s", "orphan", 1), "%d", "1", 1))
	write(t, root, "a", "oldver", strings.Replace(strings.Replace(one, "%s", "oldver", 1), "%d", "2", 1))
	write(t, root, "a", "broken", `{`)
	write(t, root, "a", "notes.txt", "")
	noop := func(json.RawMessage, *int64) (any, error) { return nil, nil }
	runners := map[string]rules.Runner{"a/ok": noop, "a/oldver": noop, "a/gone": noop, "b/other": noop}
	ok, problems, err := inspect(root, 1, "a", runners)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(ok, ",") != "oldver,ok" && strings.Join(ok, ",") != "ok,oldver" {
		t.Errorf("rules with both a file and a runner: %v", ok)
	}
	want := []string{"orphan: case file has no runner", "oldver: file says version 2", "gone: runner has no case file", "broken"}
	joined := strings.Join(problems, "\n")
	for _, w := range want {
		if !strings.Contains(joined, w) {
			t.Errorf("missing problem %q in:\n%s", w, joined)
		}
	}
	if strings.Contains(joined, "b/other") {
		t.Error("a runner of another area is not this area's problem")
	}
	if _, _, err := inspect(root, 1, "missing", runners); err == nil {
		t.Error("an area without a folder must fail")
	}
}
