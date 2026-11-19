package rankingsettings_test

import (
	"reflect"
	"testing"

	rs "github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/rankingsettings"
)

// Ported from packages/schema/src/ranking-settings.test.ts.

func in(a, p string, t ...string) rs.Input {
	th := "10"
	if len(t) > 0 {
		th = t[0]
	}
	return rs.Input{Assessment: a, Performance: p, Threshold: th}
}

// 'ranking weights sum to 100': accepts (5 rows), parses the agreed 70 / 30, rejects 70 / 40 on the total, rejects
// three totals.
func TestWeightsSumToOneHundred(t *testing.T) {
	for _, c := range [][2]string{{"70", "30"}, {"100", "0"}, {"0", "100"}, {"50", "50"}, {" 70 ", "30"}} {
		if errs := rs.FormErrors(in(c[0], c[1])); len(errs) != 0 {
			t.Errorf("%v: %v", c, errs)
		}
	}
	got, errs := rs.ParseForm(in("70", "30"))
	if errs != nil || got != (rs.FormValues{AssessmentPercent: 70, PerformancePercent: 30, RecentStandardMatchThreshold: 10}) {
		t.Errorf("parse: %+v %v", got, errs)
	}
	if got, want := rs.FormErrors(in("70", "40")), map[string]string{"total": rs.WeightTotalError(110)}; !reflect.DeepEqual(got, want) {
		t.Errorf("70 / 40: %v", got)
	}
	if rs.WeightTotalError(110) != "The two weights add up to 110%. They must total exactly 100%." {
		t.Error("copy")
	}
	for _, c := range []struct {
		a, p  string
		total float64
	}{{"60", "30", 90}, {"0", "0", 0}, {"100", "100", 200}} {
		if got, want := rs.FormErrors(in(c.a, c.p)), map[string]string{"total": rs.WeightTotalError(c.total)}; !reflect.DeepEqual(got, want) {
			t.Errorf("%v: %v", c, got)
		}
	}
}

// 'ranking weights are whole percentages': nine bad texts, and the total only once both weights are valid.
func TestWeightsAreWholePercentages(t *testing.T) {
	for _, a := range []string{"70.5", "69.9", "7e1", "-10", "101", "", " ", "abc", "0x46", "٧٠", "7_0", "+70", "99999999999999999999"} {
		if got, want := rs.FormErrors(in(a, "30")), map[string]string{"assessment": rs.WeightError}; !reflect.DeepEqual(got, want) {
			t.Errorf("assessment %q: %v", a, got)
		}
	}
	want := map[string]string{"assessment": rs.WeightError, "performance": rs.WeightError}
	if got := rs.FormErrors(in("70.5", "29.5")); !reflect.DeepEqual(got, want) {
		t.Errorf("both: %v", got)
	}
}

// 'leaderboard requirement': accepts three, says the range, rejects seven (as an issue on `threshold`).
func TestLeaderboardRequirement(t *testing.T) {
	for _, th := range []string{"1", "10", "40"} {
		if errs := rs.FormErrors(in("70", "30", th)); len(errs) != 0 {
			t.Errorf("%s: %v", th, errs)
		}
	}
	if rs.ThresholdError != "Use a whole number from 1 to 40." {
		t.Error("copy")
	}
	for _, th := range []string{"0", "-1", "2.5", "", "ten", "41", "100"} {
		_, errs := rs.ParseForm(in("70", "30", th))
		if want := map[string]string{"threshold": rs.ThresholdError}; !reflect.DeepEqual(errs, want) {
			t.Errorf("%q: %v", th, errs)
		}
	}
}

func TestParseWholeNumber(t *testing.T) {
	for in, want := range map[string]int64{"0": 0, " 12 ": 12, "007": 7, "9007199254740991": 1<<53 - 1, " 7 ": 7} {
		if got, ok := rs.ParseWholeNumber(in); !ok || got != want {
			t.Errorf("%q: %d %v", in, got, ok)
		}
	}
	for _, in := range []string{"9007199254740992", "1e3", "1.0", "", "-0"} {
		if _, ok := rs.ParseWholeNumber(in); ok {
			t.Errorf("%q must be refused", in)
		}
	}
}
