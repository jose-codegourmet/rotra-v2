package license

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// RetentionMonths is how long the public pages of an expired club stay before deletion (business rules, retention).
const RetentionMonths = 6

var manila = time.FixedZone("+08:00", 8*3600)

// ManilaToday is manilaToday: today's calendar date in Manila (YYYY-MM-DD), the day license access and retention are
// measured on.
func ManilaToday(now time.Time) string { return now.In(manila).Format("2006-01-02") }

// partsOf is partsOf: year, month and day of a YYYY-MM-DD text. The text must be a valid date; the TypeScript's
// Number() of a piece that is not a number would make an Invalid Date.
func partsOf(ymd string) (y, m, d int) {
	p := strings.Split(ymd, "-")
	get := func(i, def int) int {
		if i >= len(p) {
			return def
		}
		n, err := strconv.Atoi(p[i])
		if err != nil {
			return def
		}
		return n
	}
	return get(0, 0), get(1, 1), get(2, 1)
}

// utcOf is Date.UTC(y, m - 1, d) of a calendar date, in milliseconds. Like Date.UTC, a year from 0 to 99 means
// 1900 to 1999, and a month or day out of range rolls over.
func utcOf(ymd string) int64 {
	y, m, d := partsOf(ymd)
	return utcDate(y, m, d)
}

func utcDate(y, m, d int) int64 {
	if y >= 0 && y <= 99 {
		y += 1900
	}
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC).UnixMilli()
}

// ymdOf is new Date(ms).toISOString().slice(0, 10).
func ymdOf(ms int64) string { return time.UnixMilli(ms).UTC().Format("2006-01-02") }

var calendarDateText = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// IsCalendarDate is isCalendarDate (rotra-admin.html validYmd): a real calendar date in YYYY-MM-DD form. ASCII
// digits only, as /\d/ is.
func IsCalendarDate(value string) bool {
	return calendarDateText.MatchString(value) && ymdOf(utcOf(value)) == value
}

// AddDays is addDays: the date a number of days on (or before, when negative).
func AddDays(ymd string, days int) string {
	y, m, d := partsOf(ymd)
	return ymdOf(utcDate(y, m, d+days))
}

// AddMonths is addMonths: the same day n months on, clamped to the end of a shorter month (Jan 31 + 1 is Feb 28).
func AddMonths(ymd string, months int) string {
	y, m, d := partsOf(ymd)
	lastDay := time.Date(y, time.Month(m+months+1), 0, 0, 0, 0, 0, time.UTC).Day()
	return ymdOf(utcDate(y, m+months, min(d, lastDay)))
}

// DiffDays is diffDays: whole days from a to b (negative when b is earlier).
func DiffDays(a, b string) int { return int((utcOf(b) - utcOf(a)) / 86_400_000) }

// FormatLicenseDate is formatLicenseDate (rotra-admin.html fmtYmd, en-US): 'Oct 3, 2026'.
func FormatLicenseDate(ymd string) string {
	return time.UnixMilli(utcOf(ymd)).UTC().Format("Jan 2, 2006")
}

func shortDay(ymd string) string { return time.UnixMilli(utcOf(ymd)).UTC().Format("Jan 2") }

// FormatTermRange is formatTermRange: 'Oct 3 – Nov 2, 2026', or both years when they differ.
func FormatTermRange(from, to string) string {
	if from[:4] == to[:4] {
		return shortDay(from) + " – " + FormatLicenseDate(to)
	}
	return FormatLicenseDate(from) + " – " + FormatLicenseDate(to)
}

// AddMonthsOverflow is the service's addMonths (licenses.ts): the instant with its month moved on by n and the day
// of the month kept, so a day past the end of the new month rolls into the next (Jan 31 + 1 month is Mar 3, or Mar 2
// in a leap year), exactly as Date.setUTCMonth does.
func AddMonthsOverflow(t time.Time, months int) time.Time { return t.UTC().AddDate(0, months, 0) }

// PaymentReference is nextPaymentReference: LIC- and the number of every term recorded so far, plus one, in four
// digits at least.
func PaymentReference(termsSoFar int64) string { return fmt.Sprintf("LIC-%04d", termsSoFar+1) }
