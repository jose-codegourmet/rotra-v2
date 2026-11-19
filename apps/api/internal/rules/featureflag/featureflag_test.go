package featureflag_test

import (
	"reflect"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/featureflag"
)

// Ported from packages/data/src/feature-flag/featureFlag.rules.test.ts: the 'addFeatureFlagErrors' cases (15 Vitest
// cases: accepts a complete flag; the name rules; a taken name; 7 refused keys; 3 accepted keys; a required and a
// taken key; the description) and 'trimFeatureFlagInput' (1). The audit summaries, newFeatureFlag,
// switchedFeatureFlag and withPlaceholderFlag are mock-store code with no Go twin.

func input(mod func(*featureflag.Input)) featureflag.Input {
	in := featureflag.Input{Name: "Session cost estimate", Key: "session_cost_estimate", Description: "Shows the estimated cost per player before the session starts."}
	if mod != nil {
		mod(&in)
	}
	return in
}

var existing = []featureflag.Identity{{Name: "Session cost estimate", Key: "session_cost_estimate"}}

const badKey = "Use 3 to 40 lowercase letters, numbers and underscores, starting with a letter."

func TestAcceptsACompleteUniqueFlag(t *testing.T) {
	if got := featureflag.Errors(input(nil), nil); len(got) != 0 {
		t.Errorf("errors %v", got)
	}
	other := input(func(i *featureflag.Input) { i.Name, i.Key = "Other", "other_flag" })
	if got := featureflag.Errors(other, existing); len(got) != 0 {
		t.Errorf("errors %v", got)
	}
}

func TestNameRules(t *testing.T) {
	for name, want := range map[string]string{
		"":                      "Enter a name.",
		strings.Repeat("a", 51): "Keep the name under 50 characters.",
		strings.Repeat("😀", 26): "Keep the name under 50 characters.", // 52 UTF-16 units, 26 code points
		strings.Repeat("a", 50): "",
		strings.Repeat("😀", 25): "", // exactly 50 units
	} {
		got := featureflag.Errors(input(func(i *featureflag.Input) { i.Name = name }), nil)["name"]
		if got != want {
			t.Errorf("name %.12q...: %q, want %q", name, got, want)
		}
	}
}

func TestRefusesATakenNameIgnoringCaseAndAccents(t *testing.T) {
	got := featureflag.Errors(input(func(i *featureflag.Input) { i.Name, i.Key = "SÉSSION cost Estimate", "other_flag" }), existing)
	if !reflect.DeepEqual(got, map[string]string{"name": featureflag.NameTaken}) {
		t.Errorf("errors %v", got)
	}
}

func TestKeyFormat(t *testing.T) {
	for _, key := range []string{"ab", "1abc", "_abc", "Abc", "has-dash", "has space", "a" + strings.Repeat("b", 40), "ábc", "abç"} {
		if got := featureflag.Errors(input(func(i *featureflag.Input) { i.Key = key }), nil)["key"]; got != badKey {
			t.Errorf("key %q: %q", key, got)
		}
	}
	for _, key := range []string{"abc", "a_1", "a" + strings.Repeat("b", 39)} {
		if got := featureflag.Errors(input(func(i *featureflag.Input) { i.Key = key }), nil)["key"]; got != "" {
			t.Errorf("key %q refused: %q", key, got)
		}
	}
}

func TestRequiresAKeyAndRefusesATakenOne(t *testing.T) {
	if got := featureflag.Errors(input(func(i *featureflag.Input) { i.Key = "" }), nil)["key"]; got != "Enter a key." {
		t.Errorf("key %q", got)
	}
	got := featureflag.Errors(input(func(i *featureflag.Input) { i.Name = "Other" }), existing)
	if !reflect.DeepEqual(got, map[string]string{"key": featureflag.KeyTaken}) {
		t.Errorf("errors %v", got)
	}
}

func TestDescriptionNeedsTenCharacters(t *testing.T) {
	short := input(func(i *featureflag.Input) { i.Description = "Too short" })
	if got := featureflag.Errors(short, nil)["description"]; got != "Describe what the flag does, so it is clear when to use it." {
		t.Errorf("description %q", got)
	}
	if got := featureflag.Errors(input(func(i *featureflag.Input) { i.Description = "Long enough" }), nil); len(got) != 0 {
		t.Errorf("errors %v", got)
	}
}

func TestTrimKeepsTheValueAndUsesTheJavaScriptWhiteSpace(t *testing.T) {
	got := featureflag.Trim(featureflag.Input{Name: "  Name ", Key: " key_one ", Description: " Does. ", On: true})
	if got != (featureflag.Input{Name: "Name", Key: "key_one", Description: "Does.", On: true}) {
		t.Errorf("trimmed %+v", got)
	}
	// U+FEFF is white space to JavaScript, so a name of only that is empty after the trim.
	if got := featureflag.Trim(featureflag.Input{Name: "\ufeff"}); got.Name != "" {
		t.Errorf("name %q", got.Name)
	}
}
