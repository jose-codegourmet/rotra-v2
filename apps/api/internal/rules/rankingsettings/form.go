package rankingsettings

import (
	"math"
	"strconv"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// Input is the ranking settings draft as typed in the form: whole numbers as text, so invalid text is kept as typed.
type Input struct{ Assessment, Performance, Threshold string }

// Field keys of a refused form draft (RankingSettingsErrors).
const (
	FormAssessment  = "assessment"
	FormPerformance = "performance"
	FormThreshold   = "threshold"
	FormTotal       = "total"
)

// ParseWholeNumber is parseWholeNumber: the text as a whole number when it is only digits (surrounding white space
// is allowed), else ok is false. A number beyond 2^53 - 1 is not whole here either.
func ParseWholeNumber(value string) (int64, bool) {
	text := fields.JSTrim(value)
	if text == "" {
		return 0, false
	}
	for i := 0; i < len(text); i++ {
		if text[i] < '0' || text[i] > '9' { // /^\d+$/ is ASCII digits only
			return 0, false
		}
	}
	// Number(text) is a double: a long run of digits rounds, and is safe only up to 2^53 - 1.
	f, err := strconv.ParseFloat(text, 64)
	if err != nil || f > 1<<53-1 || math.IsInf(f, 0) {
		return 0, false
	}
	return int64(f), true
}

// FormErrors is rankingSettingsErrors (rotra-admin.html cfgCheck): each weight a whole percentage 0 to 100, the two
// adding up to exactly 100 (checked only once both weights are valid), and the requirement a whole number from 1
// to 40. Whole percentages only, so a displayed 100% is always a stored 100%.
func FormErrors(in Input) map[string]string {
	errs := map[string]string{}
	assessment, aOK := ParseWholeNumber(in.Assessment)
	performance, pOK := ParseWholeNumber(in.Performance)
	threshold, tOK := ParseWholeNumber(in.Threshold)
	if !aOK || assessment > 100 {
		errs[FormAssessment] = WeightError
	}
	if !pOK || performance > 100 {
		errs[FormPerformance] = WeightError
	}
	if _, bad := errs[FormAssessment]; !bad {
		if _, bad := errs[FormPerformance]; !bad {
			if total := assessment + performance; total != 100 {
				errs[FormTotal] = WeightTotalError(float64(total))
			}
		}
	}
	if !tOK || threshold < 1 || threshold > ThresholdMax {
		errs[FormThreshold] = ThresholdError
	}
	return errs
}

// FormValues is what rankingSettingsField parses a valid draft to: whole numbers.
type FormValues struct {
	AssessmentPercent, PerformancePercent, RecentStandardMatchThreshold int64
}

// ParseForm is rankingSettingsField: the parsed draft, or the errors (keyed like FormErrors) when it is not valid.
func ParseForm(in Input) (FormValues, map[string]string) {
	if errs := FormErrors(in); len(errs) > 0 {
		return FormValues{}, errs
	}
	a, _ := ParseWholeNumber(in.Assessment)
	p, _ := ParseWholeNumber(in.Performance)
	t, _ := ParseWholeNumber(in.Threshold)
	return FormValues{a, p, t}, nil
}
