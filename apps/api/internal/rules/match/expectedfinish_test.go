package match

import "testing"

func TestExpectedFinishOf(t *testing.T) {
	two := int64(12)
	k := "21x3nd"
	if got := ExpectedFinishOf(nil, nil); got.Phase != PhaseNotStarted || got.MinutesLeft != 15 {
		t.Errorf("nil mode, not started: %+v", got)
	}
	if got := ExpectedFinishOf(nil, &two); got.Phase != PhaseSoon || got.MinutesLeft != 3 {
		t.Errorf("12 min of 16/31: %+v", got)
	}
	long := int64(30)
	if got := ExpectedFinishOf(&k, &long); got.Phase != PhaseLong || got.Text != "Running long" {
		t.Errorf("21x3nd at 30: %+v", got)
	}
	neg := int64(-2)
	if got := ExpectedFinishOf(&k, &neg); got.MinutesLeft != 25 || got.Phase != PhaseMid {
		t.Errorf("negative minutes read as zero: %+v", got)
	}
}
