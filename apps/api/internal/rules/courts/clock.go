package courts

import (
	"fmt"
	"time"
)

// The club zone for v1 (T6) is Asia/Manila: UTC+8 all year, no daylight saving. A fixed offset keeps the
// result the same on a server, in WebAssembly (which has no zone database) and on a phone.
var clubZone = time.FixedZone("Asia/Manila", 8*60*60)

const msPerDay int64 = 86_400_000

func clubTime(at int64) time.Time { return time.UnixMilli(at).In(clubZone) }

// floorDiv rounds toward negative infinity, like Math.floor of a division.
func floorDiv(a, b int64) int64 {
	q := a / b
	if a%b != 0 && (a < 0) != (b < 0) {
		q--
	}
	return q
}

// clubDay is the club-zone calendar day of `at`, as a day number.
func clubDay(at int64) int64 { return floorDiv(at+8*60*60*1000, msPerDay) }

// ClubDayDiff is whole club-zone days from `from` to `to` (yesterday -1, today 0, tomorrow 1).
func ClubDayDiff(from, to int64) int64 { return clubDay(to) - clubDay(from) }

// ClubTimeLabel is "9:30 PM" in the club zone.
func ClubTimeLabel(at int64) string { return clubTime(at).Format("3:04 PM") }

// WhenLabel is a mid-sentence time with its day (T4): "9:30 PM", "tomorrow 1:00 AM",
// "Sat, Nov 1 · 9:00 PM".
func WhenLabel(at, now int64) string {
	days := ClubDayDiff(now, at)
	switch days {
	case 0:
		return ClubTimeLabel(at)
	case 1:
		return "tomorrow " + ClubTimeLabel(at)
	case -1:
		return "yesterday " + ClubTimeLabel(at)
	}
	return fmt.Sprintf("%s · %s", clubTime(at).Format("Mon, Jan 2"), ClubTimeLabel(at))
}

// AtWhenLabel is "at 9:30 PM" today, otherwise [WhenLabel].
func AtWhenLabel(at, now int64) string {
	if ClubDayDiff(now, at) == 0 {
		return "at " + ClubTimeLabel(at)
	}
	return WhenLabel(at, now)
}
