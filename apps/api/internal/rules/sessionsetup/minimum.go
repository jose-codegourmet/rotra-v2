package sessionsetup

import "math"

// This file ports sessionMinutes, playersPerGame and estimateMinimum of packages/data/src/queue-session/queueSession.rules.ts:
// the calculated minimum games a prepared session shows, recomputed whenever its courts, length or roster change.
// The arithmetic is floating point as in JavaScript: operands are variables and keep the TypeScript's order, so Go does
// not fold or reorder anything.

// Minutes is sessionMinutes: the length in minutes of a session given its start and end as epoch milliseconds; an end that
// is not after the start is the next day.
func Minutes(startMs, endMs int64) float64 {
	start, end := float64(startMs), float64(endMs)
	if !(end > start) {
		end += 86400000
	}
	return (end - start) / 60000
}

// PlayersPerGame is playersPerGame: 10/3 when singles and doubles are both allowed, 4 for doubles alone, 2 otherwise.
func PlayersPerGame(singles, doubles bool) float64 {
	switch {
	case singles && doubles:
		ten, three := 10.0, 3.0
		return ten / three
	case doubles:
		return 4
	}
	return 2
}

// MinimumInput is what estimateMinimum reads.
type MinimumInput struct {
	Courts       int64
	Minutes      float64
	Players      int64
	AllowSingles bool
	AllowDoubles bool
}

// MinimumEstimate is the low and high expected games each, and the courts that can be used.
type MinimumEstimate struct {
	Low, High int64
	Usable    int64
}

// EstimateMinimum is estimateMinimum.
func EstimateMinimum(in MinimumInput) MinimumEstimate {
	n := math.Max(1, float64(in.Players))
	per := PlayersPerGame(in.AllowSingles, in.AllowDoubles)
	usable := math.Max(1, math.Min(float64(in.Courts), math.Floor(n/per)))
	twenty, fifteen := 20.0, 15.0
	return MinimumEstimate{
		Low:    int64(math.Floor((usable * math.Floor(in.Minutes/twenty) * per) / n)),
		High:   int64(math.Floor((usable * math.Floor(in.Minutes/fifteen) * per) / n)),
		Usable: int64(usable),
	}
}
