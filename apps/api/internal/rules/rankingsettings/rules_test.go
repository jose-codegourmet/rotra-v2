package rankingsettings_test

import (
	"math"
	"reflect"
	"testing"

	rs "github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/rankingsettings"
)

// Ported from packages/data/src/ranking-settings/rankingSettings.rules.test.ts (the Vitest cases are named in each
// comment; an it.each counts as one case per row).

func draft(a, p float64, t ...float64) rs.Draft {
	th := 10.0
	if len(t) > 0 {
		th = t[0]
	}
	return rs.Draft{AssessmentWeightBp: a, PerformanceWeightBp: p, RecentStandardMatchThreshold: th}
}

var version1 = rs.Version{Version: 1, AssessmentWeightBp: 7000, PerformanceWeightBp: 3000, RecentStandardMatchThreshold: 10,
	EffectiveAt: "2026-01-05T09:00:00+08:00", CreatedByEmail: "owner@rotra.example"}

// describe('basis points'): the it.each rows, 'round-trips every whole percentage' and 'rounds float noise'.
func TestBasisPoints(t *testing.T) {
	for _, c := range [][2]float64{{70, 7000}, {30, 3000}, {0, 0}, {100, 10000}, {70.5, 7050}} {
		if got := rs.PercentToBasisPoints(c[0]); got != c[1] {
			t.Errorf("%v%% = %v basis points, want %v", c[0], got, c[1])
		}
		if got := rs.BasisPointsToPercent(c[1]); got != c[0] {
			t.Errorf("%v basis points = %v%%, want %v", c[1], got, c[0])
		}
	}
	for p := 0.0; p <= 100; p++ {
		if got := rs.BasisPointsToPercent(rs.PercentToBasisPoints(p)); got != p {
			t.Errorf("round trip of %v gave %v", p, got)
		}
	}
	if got := rs.PercentToBasisPoints(0.29 * 100); got != 2900 {
		t.Errorf("float noise: %v", got)
	}
}

// Math.round rounds halves toward positive infinity (-2.5 is -2, not -3), and keeps NaN.
func TestPercentToBasisPointsRoundsLikeMathRound(t *testing.T) {
	for in, want := range map[float64]float64{0.005: 1, 0.015: 2, -0.025: -2, 0.0049999999999999: 0, 1e-9: 0} {
		if got := rs.PercentToBasisPoints(in); got != want {
			t.Errorf("PercentToBasisPoints(%v) = %v, want %v", in, got, want)
		}
	}
	if got := rs.PercentToBasisPoints(math.NaN()); !math.IsNaN(got) {
		t.Errorf("NaN: %v", got)
	}
	if got := rs.PercentToBasisPoints(math.Inf(1)); !math.IsInf(got, 1) {
		t.Errorf("+Inf: %v", got)
	}
}

// describe('validateRankingDraft'): accepts (4 rows), rejects 70 / 40 on the total only, rejects a weight (4 values x 2
// fields), accepts a requirement (3 rows), rejects a requirement (5 rows).
func TestValidate(t *testing.T) {
	for _, c := range [][2]float64{{7000, 3000}, {10000, 0}, {0, 10000}, {7050, 2950}} {
		if errs := rs.Validate(draft(c[0], c[1])); len(errs) != 0 {
			t.Errorf("%v / %v: %v", c[0], c[1], errs)
		}
	}
	if got, want := rs.Validate(draft(7000, 4000)), map[string]string{"total": rs.WeightTotalError(110)}; !reflect.DeepEqual(got, want) {
		t.Errorf("70 / 40: %v", got)
	}
	for _, w := range []float64{-1, 10001, 70.5, math.NaN()} {
		if got, want := rs.Validate(draft(w, 3000)), map[string]string{"assessmentWeightBp": rs.WeightError}; !reflect.DeepEqual(got, want) {
			t.Errorf("assessment %v: %v", w, got)
		}
		if got, want := rs.Validate(draft(7000, w)), map[string]string{"performanceWeightBp": rs.WeightError}; !reflect.DeepEqual(got, want) {
			t.Errorf("performance %v: %v", w, got)
		}
	}
	for _, th := range []float64{1, 10, 40} {
		if errs := rs.Validate(draft(7000, 3000, th)); len(errs) != 0 {
			t.Errorf("requirement %v: %v", th, errs)
		}
	}
	for _, th := range []float64{0, -1, 2.5, 41, 100} {
		if got, want := rs.Validate(draft(7000, 3000, th)), map[string]string{"recentStandardMatchThreshold": rs.ThresholdError}; !reflect.DeepEqual(got, want) {
			t.Errorf("requirement %v: %v", th, got)
		}
	}
}

// The service sends every wrong value at once, with infinities and NaN as the JSON numbers of a bad request.
func TestValidateReportsEveryWrongField(t *testing.T) {
	got := rs.Validate(rs.Draft{AssessmentWeightBp: math.NaN(), PerformanceWeightBp: math.Inf(1), RecentStandardMatchThreshold: math.Inf(-1)})
	want := map[string]string{"assessmentWeightBp": rs.WeightError, "performanceWeightBp": rs.WeightError, "recentStandardMatchThreshold": rs.ThresholdError}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("%v", got)
	}
}

// The total reads like the number JavaScript prints, captured from the Route Handler (99.99, 100.01, 12.34...).
func TestWeightTotalErrorPrintsLikeJavaScript(t *testing.T) {
	for total, want := range map[float64]string{110: "110", 99.99: "99.99", 100.01: "100.01", 0: "0", 200: "200", 0.02: "0.02", 69.12: "69.12", 90: "90"} {
		if got, w := rs.WeightTotalError(total), "The two weights add up to "+want+"%. They must total exactly 100%."; got != w {
			t.Errorf("%v: %q", total, got)
		}
	}
	if rs.WeightTotalError(110) != "The two weights add up to 110%. They must total exactly 100%." {
		t.Error("copy")
	}
}

// describe('versions'): the newest wins whatever the order, an empty history is refused, the reader shape.
func TestVersions(t *testing.T) {
	v2 := version1
	v2.Version, v2.RecentStandardMatchThreshold = 2, 12
	for _, in := range [][]rs.Version{{version1, v2}, {v2, version1}} {
		if got, ok := rs.Effective(in); !ok || got != v2 {
			t.Errorf("effective of %v: %v %v", in, got, ok)
		}
	}
	if _, ok := rs.Effective(nil); ok {
		t.Error("an empty history must be refused")
	}
	if got, want := rs.SettingsOf(version1), (rs.Settings{AssessmentWeightPercent: 70, MatchRequirement: 10}); got != want {
		t.Errorf("settings: %v", got)
	}
}

// 'appends version + 1 with the Manila time, leaving the old version untouched'.
func TestNextVersion(t *testing.T) {
	before := version1
	d := draft(6000, 4000, 12)
	d.ChangeNote = "  "
	next := rs.NextVersion(version1, d, "owner@rotra.example", 1793274720000) // 2026-10-29T19:52:00+08:00
	want := rs.Version{Version: 2, AssessmentWeightBp: 6000, PerformanceWeightBp: 4000, RecentStandardMatchThreshold: 12,
		EffectiveAt: "2026-10-29T19:52:00+08:00", CreatedByEmail: "owner@rotra.example"}
	if next != want {
		t.Errorf("next: %+v", next)
	}
	if version1 != before {
		t.Error("the old version changed")
	}
	d.ChangeNote = "\t Raise it \n"
	if got := rs.NextVersion(version1, d, "x", 0).ChangeNote; got != "Raise it" {
		t.Errorf("note: %q", got)
	}
}

// 'formats any instant with the Manila offset'.
func TestManilaIsoString(t *testing.T) {
	for ms, want := range map[int64]string{1767574800000: "2026-01-05T09:00:00+08:00", 1798749000000: "2027-01-01T04:30:00+08:00"} {
		if got := rs.ManilaIsoString(ms); got != want {
			t.Errorf("%d: %s, want %s", ms, got, want)
		}
	}
}

// describe('diffRows').
func TestDiffRows(t *testing.T) {
	want := []rs.DiffRow{{"Club assessment", 70, 60, "%"}, {"Match performance", 30, 40, "%"}, {"Leaderboard requirement", 10, 10, " matches"}}
	if got := rs.DiffRows(version1, draft(6000, 4000, 10)); !reflect.DeepEqual(got, want) {
		t.Errorf("%v", got)
	}
}
