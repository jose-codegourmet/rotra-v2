package match

import "fmt"

// Expected finish (Q27.6, D-2026-11-23-08): where a match stands against its scoring mode's expected
// length. An estimate from time only. (TypeScript expectedFinish in @rotra/schema/scoring.)

// FinishingSoonMinutes is how many minutes before the typical length Finishing soon starts.
const FinishingSoonMinutes = 3

// The phases of an expected finish.
const (
	PhaseNotStarted = "notStarted"
	PhaseMid        = "mid"
	PhaseSoon       = "soon"
	PhaseAny        = "any"
	PhaseLong       = "long"
)

// ExpectedFinish is one match's standing: the phase, the expected minutes left (the full typical
// length when not started, 0 from the typical length on), the Playing court card's line and the same
// wording in lowercase for a draft's "Waits for Court 2 · …" line.
type ExpectedFinish struct {
	Phase       string `json:"phase"`
	MinutesLeft int    `json:"minutesLeft"`
	Text        string `json:"text"`
	Tag         string `json:"tag"`
}

// ExpectedFinishOf is the expected finish of a match. scoring is the session's stored mode (missing or
// unknown reads as 16/31); minutesPlayed is whole minutes since Start match, or nil for a Getting
// ready match, which counts the full typical length. With p minutes played: p < typical − 3 is Ends in
// about N min (N at least 1); typical − 3 ≤ p < typical is Finishing soon; typical ≤ p < long is Could
// end any time (deuce modes add " · may be in deuce"); p ≥ long is Running long.
func ExpectedFinishOf(scoring *string, minutesPlayed *int64) ExpectedFinish {
	m := ScoringOf(scoring)
	if minutesPlayed == nil {
		return ExpectedFinish{PhaseNotStarted, m.Typical, "Not started yet", "not started yet"}
	}
	played := max(0, int(*minutesPlayed))
	left := max(0, m.Typical-played)
	switch {
	case played < m.Typical-FinishingSoonMinutes:
		n := max(1, left)
		return ExpectedFinish{PhaseMid, left, fmt.Sprintf("Ends in about %d min", n), fmt.Sprintf("ends in about %d min", n)}
	case played < m.Typical:
		return ExpectedFinish{PhaseSoon, left, "Finishing soon", "finishing soon"}
	case played < m.Long:
		text := "Could end any time"
		if m.Deuce {
			text += " · may be in deuce"
		}
		return ExpectedFinish{PhaseAny, 0, text, "could end any time"}
	}
	return ExpectedFinish{PhaseLong, 0, "Running long", "running long"}
}
