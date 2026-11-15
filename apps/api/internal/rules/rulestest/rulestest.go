// Package rulestest runs the shared JSON cases (packages/rule-cases/cases/v<n>) through a version of the
// rules registry. Test support only; production code never imports it.
package rulestest

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rulecases"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
)

// Totals is what a run covered.
type Totals struct {
	Files int
	Cases int
}

// RunArea runs every case file of cases/v<version>/<area> through rules.For(version) with strict input
// decoding (a field the Go structs lack fails the case). It fails when a case file has no runner or a
// runner of the area has no case file, so a rule cannot be added on one side only.
func RunArea(t *testing.T, version int, area string) Totals {
	t.Helper()
	rs, err := rules.For(version)
	if err != nil {
		t.Fatal(err)
	}
	root, err := rulecases.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	runners := rs.Runners(true)
	rulesInArea, problems, err := inspect(root, version, area, runners)
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range problems {
		t.Error(p)
	}
	var totals Totals
	for _, rule := range rulesInArea {
		f, err := rulecases.Load(root, area, rule)
		if err != nil {
			continue // already reported by inspect
		}
		totals.Files++
		totals.Cases += len(f.Cases)
		run := runners[area+"/"+rule]
		t.Run(rule, func(t *testing.T) { rulecases.Run(t, area, rule, rulecases.Runner(run)) })
	}
	return totals
}

// inspect lists the rules that have both a case file and a runner, and the problems it finds: a file
// that does not load, names another version, or has no runner, and a runner with no file.
func inspect(root string, version int, area string, runners map[string]rules.Runner) (ok []string, problems []string, err error) {
	dir := filepath.Join(root, "packages", "rule-cases", "cases", fmt.Sprintf("v%d", version), area)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, nil, err
	}
	haveFile := map[string]bool{}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		rule := strings.TrimSuffix(e.Name(), ".json")
		key := area + "/" + rule
		haveFile[key] = true
		f, loadErr := rulecases.Load(root, area, rule)
		if loadErr != nil {
			problems = append(problems, loadErr.Error())
			continue
		}
		if f.Version != version {
			problems = append(problems, fmt.Sprintf("%s: file says version %d, folder is v%d", key, f.Version, version))
		}
		if _, has := runners[key]; !has {
			problems = append(problems, key+": case file has no runner")
			continue
		}
		ok = append(ok, rule)
	}
	var extra []string
	for key := range runners {
		if strings.HasPrefix(key, area+"/") && !haveFile[key] {
			extra = append(extra, key+": runner has no case file")
		}
	}
	sort.Strings(extra) // map order must not decide the report
	return ok, append(problems, extra...), nil
}
