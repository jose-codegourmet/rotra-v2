package rankingsettings

import (
	"math"
	"strconv"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Copy and limits of the rules. The words are the form's (@rotra/schema/ranking-settings).
const (
	WeightError = "Use a whole number from 0 to 100."
	// ThresholdMax is the most recent standard matches the leaderboard can require (product owner, 2026-10-30).
	ThresholdMax   = 40
	ThresholdError = "Use a whole number from 1 to 40."
	// BasisPointsTotal is what the two weights always add up to (100%).
	BasisPointsTotal = 10000
)

// Field keys of a refused draft, as the service answers them (RankingDraftErrors).
const (
	FieldAssessment  = "assessmentWeightBp"
	FieldPerformance = "performanceWeightBp"
	FieldTotal       = "total"
	FieldThreshold   = "recentStandardMatchThreshold"
)

// Draft is a save in the stored units: basis points and a match count. NaN is a value that was not a number.
type Draft struct {
	AssessmentWeightBp, PerformanceWeightBp, RecentStandardMatchThreshold float64
	ChangeNote                                                            string
}

// WeightTotalError is rankingWeightTotalError: it names what the two weights add up to, in percent as JavaScript
// prints the number (99.99, not 99.990000).
func WeightTotalError(total float64) string {
	return "The two weights add up to " + jsNumber(total) + "%. They must total exactly 100%."
}

// jsNumber is Number.prototype.toString for the values a total can be: the shortest text that reads back as the
// same number, with no exponent below 1e21.
func jsNumber(f float64) string { return strconv.FormatFloat(f, 'f', -1, 64) }

// jsRound is Math.round: halves go up, toward positive infinity.
func jsRound(x float64) float64 {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return x
	}
	r := math.Floor(x)
	if x-r >= 0.5 {
		r++
	}
	return r
}

// PercentToBasisPoints is percentToBasisPoints: 70 is 7000. Rounded, so a whole percentage always maps to whole
// basis points.
//
// The product is converted explicitly: Go may fuse a multiplication into the subtraction that follows it (on arm64),
// which skips the rounding JavaScript does, and 0.015 * 100 would then round down.
func PercentToBasisPoints(percent float64) float64 { return jsRound(float64(percent * 100)) }

// BasisPointsToPercent is basisPointsToPercent: 7000 is 70.
func BasisPointsToPercent(basisPoints float64) float64 { return basisPoints / 100 }

func isWeight(v float64) bool { return isInteger(v) && v >= 0 && v <= BasisPointsTotal }

// isInteger is Number.isInteger.
func isInteger(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) && v == math.Trunc(v) }

// Validate is validateRankingDraft: each weight a whole number of basis points from 0 to 10000, the two adding up
// to exactly 10000 (checked only once both are valid), and the requirement a whole number from 1 to 40. The map
// is empty when the draft is fine.
func Validate(d Draft) map[string]string {
	errs := map[string]string{}
	if !isWeight(d.AssessmentWeightBp) {
		errs[FieldAssessment] = WeightError
	}
	if !isWeight(d.PerformanceWeightBp) {
		errs[FieldPerformance] = WeightError
	}
	if len(errs) == 0 {
		if total := d.AssessmentWeightBp + d.PerformanceWeightBp; total != BasisPointsTotal {
			errs[FieldTotal] = WeightTotalError(BasisPointsToPercent(total))
		}
	}
	if t := d.RecentStandardMatchThreshold; !isInteger(t) || t < 1 || t > ThresholdMax {
		errs[FieldThreshold] = ThresholdError
	}
	return errs
}

// Version is one saved ranking settings version. Versions are append-only, so a result can say which settings
// produced it.
type Version struct {
	Version                      int
	AssessmentWeightBp           int
	PerformanceWeightBp          int
	RecentStandardMatchThreshold int
	// EffectiveAt is an ISO time with the Manila offset.
	EffectiveAt    string
	CreatedByEmail string
	ChangeNote     string
}

// Settings is the shape Player Information, Queue and Admin players read, from one version.
type Settings struct {
	AssessmentWeightPercent float64
	MatchRequirement        int
}

// Effective is effectiveRankingVersion: the newest version is in effect. ok is false for an empty history (the
// TypeScript throws).
func Effective(versions []Version) (v Version, ok bool) {
	for i, e := range versions {
		if i == 0 || e.Version > v.Version {
			v, ok = e, true
		}
	}
	return v, ok
}

// SettingsOf is rankingSettingsOf.
func SettingsOf(v Version) Settings {
	return Settings{AssessmentWeightPercent: BasisPointsToPercent(float64(v.AssessmentWeightBp)), MatchRequirement: v.RecentStandardMatchThreshold}
}

// DiffRow is one line of the Save configuration review.
type DiffRow struct {
	Label    string
	From, To float64
	Unit     string
}

// DiffRows is diffRows: every setting, changed or not, as percentages and matches.
func DiffRows(effective Version, d Draft) []DiffRow {
	return []DiffRow{
		{"Club assessment", BasisPointsToPercent(float64(effective.AssessmentWeightBp)), BasisPointsToPercent(d.AssessmentWeightBp), "%"},
		{"Match performance", BasisPointsToPercent(float64(effective.PerformanceWeightBp)), BasisPointsToPercent(d.PerformanceWeightBp), "%"},
		{"Leaderboard requirement", float64(effective.RecentStandardMatchThreshold), d.RecentStandardMatchThreshold, " matches"},
	}
}

// manila is the fixed offset of Manila (no daylight saving), so no time zone data is needed.
var manila = time.FixedZone("+08:00", 8*3600)

// ManilaIsoString is manilaIsoString: epoch milliseconds as an ISO time with the Manila offset, without
// fractions: 2026-01-05T09:00:00+08:00.
func ManilaIsoString(milliseconds int64) string {
	return time.UnixMilli(milliseconds).In(manila).Format("2006-01-02T15:04:05") + "+08:00"
}

// NextVersion is nextRankingPolicyVersion: the version a save appends after effective, never an edit of an older
// one. A blank change note is left out.
func NextVersion(effective Version, d Draft, createdByEmail string, atMilliseconds int64) Version {
	return Version{
		Version:                      effective.Version + 1,
		AssessmentWeightBp:           int(d.AssessmentWeightBp),
		PerformanceWeightBp:          int(d.PerformanceWeightBp),
		RecentStandardMatchThreshold: int(d.RecentStandardMatchThreshold),
		EffectiveAt:                  ManilaIsoString(atMilliseconds),
		CreatedByEmail:               createdByEmail,
		ChangeNote:                   fields.JSTrim(d.ChangeNote),
	}
}
