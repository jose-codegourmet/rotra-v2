package courtfill_test

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/rulestest"
)

// Shared cases: packages/rule-cases/cases/v1/courtfill/*.json, through rules.For(1). The TypeScript rules pass the same files.
func TestSharedCases(t *testing.T) {
	rulestest.RunArea(t, 1, "courtfill")
}
