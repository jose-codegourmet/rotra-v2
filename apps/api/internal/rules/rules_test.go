package rules_test

import (
	"path/filepath"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rulecases"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/rulestest"
)

// Every committed v1 case file runs through rules.For(1): 47 files, 421 cases? (plan, "Case counts", plus the two shared-position cases of Q23.4, the scoring-mode cases of Q22.3 the no-ties standings case of Q26.5, and the match name and win chance rules).
func TestEveryV1CaseFilePassesThroughForOne(t *testing.T) {
	root, err := rulecases.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	onDisk, err := filepath.Glob(filepath.Join(root, "packages", "rule-cases", "cases", "v1", "*", "*.json"))
	if err != nil {
		t.Fatal(err)
	}
	var total rulestest.Totals
	for _, area := range []string{"match", "courts", "roster", "courtfill"} {
		got := rulestest.RunArea(t, 1, area)
		total.Files += got.Files
		total.Cases += got.Cases
	}
	// Files whose Go copy follows (rulecases.GoCopyPending) are on disk but not run here.
	if want := len(onDisk) - len(rulecases.GoCopyPending); total.Files != want {
		t.Errorf("ran %d case files, %d are on disk: an area has no test", total.Files, want)
	}
	if total.Files != 48 || total.Cases != 424 {
		t.Errorf("ran %d files and %d cases, want 48 and 424", total.Files, total.Cases)
	}
}

func TestForUnknownVersion(t *testing.T) {
	for _, v := range []int{0, 2, -1} {
		if _, err := rules.For(v); err == nil {
			t.Errorf("version %d must be an error", v)
		}
	}
	if got := rules.Versions(); len(got) != 1 || got[0] != 1 {
		t.Errorf("live versions = %v, want [1]", got)
	}
}

func TestRunnersAreOnePerRuleAndFollowTheRuleset(t *testing.T) {
	rs, err := rules.For(1)
	if err != nil {
		t.Fatal(err)
	}
	if n := len(rs.Runners(true)); n != 48 {
		t.Errorf("%d runners, want 48", n)
	}
	// A later version that changes one rule changes what its runner returns.
	rs.CourtsNeeded = func(model.Format) int { return 9 }
	got, err := rs.Runners(false)["match/courtsNeeded"]([]byte(`{"match":{"format":"singles"}}`), nil)
	if err != nil || got != 9 {
		t.Fatalf("a swapped function must flow through the runner: %v %v", got, err)
	}
}
